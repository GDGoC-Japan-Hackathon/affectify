package service

import (
	"context"
	"errors"
	"strings"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/reviewai"
)

var (
	ErrReviewJobNotFound = errors.New("review job not found")
	ErrFeedbackNotFound  = errors.New("review feedback not found")
)

type ListReviewFeedbacksInput struct {
	VariantID   int64
	ReviewJobID *int64
	OnlyOpen    bool
}

type ResolveReviewFeedbackInput struct {
	FeedbackID int64
	Resolution string
	Status     string
}

type RateReviewFeedbackInput struct {
	FeedbackID int64
	Reaction   string
}

type ReviewFeedbackBundle struct {
	Feedbacks     []entity.ReviewFeedback
	Targets       []entity.ReviewFeedbackTarget
	UserReactions map[int64]string
}

type ReviewService struct {
	db             *gorm.DB
	userRepository *repository.UserRepository
	projectRepo    *repository.ProjectRepository
	reviewRepo     *repository.ReviewRepository
	variantRepo    *repository.VariantRepository
	jobDispatcher  JobDispatcher
	reviewAI       *reviewai.Client
}

func NewReviewService(db *gorm.DB, userRepository *repository.UserRepository, jobDispatcher JobDispatcher) *ReviewService {
	return &ReviewService{
		db:             db,
		userRepository: userRepository,
		projectRepo:    repository.NewProjectRepository(db),
		reviewRepo:     repository.NewReviewRepository(db),
		variantRepo:    repository.NewVariantRepository(db),
		jobDispatcher:  jobDispatcher,
		reviewAI:       reviewai.NewClient(config.LoadVertexAIConfig()),
	}
}

func (s *ReviewService) CreateReviewJob(ctx context.Context, firebaseUID string, variantID int64) (*entity.ReviewJob, error) {
	variant, requester, err := s.requireVariantAccess(ctx, firebaseUID, variantID)
	if err != nil {
		return nil, err
	}

	job := &entity.ReviewJob{
		VariantID:   variant.ID,
		RequestedBy: requester.ID,
		Status:      entity.JobStatusQueued,
	}
	if err := s.reviewRepo.CreateReviewJob(ctx, job); err != nil {
		return nil, err
	}
	if s.jobDispatcher != nil {
		if err := s.jobDispatcher.DispatchReviewJob(ctx, job.ID); err != nil {
			message := err.Error()
			job.Status = entity.JobStatusFailed
			job.ErrorMessage = &message
			_ = s.reviewRepo.SaveReviewJob(ctx, job)
			return nil, err
		}
	}

	return job, nil
}

func (s *ReviewService) GetReviewJob(ctx context.Context, firebaseUID string, id int64) (*entity.ReviewJob, error) {
	job, err := s.reviewRepo.FindReviewJobByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, ErrReviewJobNotFound
	}
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, job.VariantID); err != nil {
		return nil, err
	}
	return job, nil
}

func (s *ReviewService) ListReviewFeedbacks(
	ctx context.Context,
	firebaseUID string,
	input ListReviewFeedbacksInput,
) (*ReviewFeedbackBundle, error) {
	_, requester, err := s.requireVariantAccess(ctx, firebaseUID, input.VariantID)
	if err != nil {
		return nil, err
	}

	reviewJobID := input.ReviewJobID
	if reviewJobID == nil {
		latest, err := s.reviewRepo.FindLatestReviewJobByVariantID(ctx, input.VariantID)
		if err != nil {
			return nil, err
		}
		if latest == nil {
			return &ReviewFeedbackBundle{}, nil
		}
		reviewJobID = &latest.ID
	}

	feedbacks, err := s.reviewRepo.ListFeedbacksByVariantAndJob(ctx, input.VariantID, *reviewJobID, input.OnlyOpen)
	if err != nil {
		return nil, err
	}
	if len(feedbacks) == 0 {
		return &ReviewFeedbackBundle{}, nil
	}

	feedbackIDs := make([]int64, 0, len(feedbacks))
	for _, feedback := range feedbacks {
		feedbackIDs = append(feedbackIDs, feedback.ID)
	}

	targets, err := s.reviewRepo.ListFeedbackTargetsByFeedbackIDs(ctx, feedbackIDs)
	if err != nil {
		return nil, err
	}

	reactions, err := s.reviewRepo.FindFeedbackReactionsByUser(ctx, requester.ID, feedbackIDs)
	if err != nil {
		return nil, err
	}

	return &ReviewFeedbackBundle{
		Feedbacks:     feedbacks,
		Targets:       targets,
		UserReactions: reactions,
	}, nil
}

func (s *ReviewService) ListReviewFeedbackChats(
	ctx context.Context,
	firebaseUID string,
	feedbackID int64,
) ([]entity.ReviewFeedbackChat, error) {
	if _, _, err := s.requireFeedbackAccess(ctx, firebaseUID, feedbackID); err != nil {
		return nil, err
	}

	chats, err := s.reviewRepo.ListFeedbackChatsByFeedbackID(ctx, feedbackID)
	if err != nil {
		return nil, err
	}

	return chats, nil
}

func (s *ReviewService) AppendReviewFeedbackChat(
	ctx context.Context,
	firebaseUID string,
	feedbackID int64,
	content string,
) ([]entity.ReviewFeedbackChat, *entity.ReviewFeedback, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}
	feedback, _, err := s.requireFeedbackAccess(ctx, firebaseUID, feedbackID)
	if err != nil {
		return nil, nil, err
	}

	chat := &entity.ReviewFeedbackChat{
		FeedbackID: feedbackID,
		Role:       entity.ChatRoleUser,
		Content:    content,
		CreatedBy:  &requester.ID,
	}
	if err := s.reviewRepo.CreateFeedbackChat(ctx, chat); err != nil {
		return nil, nil, err
	}

	replyContent := buildAIReviewReply(feedback, content)
	if s.reviewAI != nil && s.reviewAI.Enabled() {
		files, filesErr := s.variantRepo.ListFilesByVariantID(ctx, feedback.VariantID)
		nodes, nodesErr := s.variantRepo.ListNodesByVariantID(ctx, feedback.VariantID)
		edges, edgesErr := s.variantRepo.ListEdgesByVariantID(ctx, feedback.VariantID)
		guide, guideErr := s.variantRepo.FindDesignGuideByVariantID(ctx, feedback.VariantID)
		if filesErr == nil && nodesErr == nil && edgesErr == nil && guideErr == nil {
			aiReply, aiErr := s.reviewAI.GenerateChatReply(ctx, reviewai.ChatInput{
				Guide:       guide,
				Files:       files,
				Nodes:       nodes,
				Edges:       edges,
				Feedback:    feedback,
				UserMessage: content,
			})
			if aiErr == nil && strings.TrimSpace(aiReply) != "" {
				replyContent = aiReply
			}
		}
	}

	reply := &entity.ReviewFeedbackChat{
		FeedbackID: feedbackID,
		Role:       entity.ChatRoleAI,
		Content:    replyContent,
	}
	if err := s.reviewRepo.CreateFeedbackChat(ctx, reply); err != nil {
		return nil, nil, err
	}

	chats, err := s.ListReviewFeedbackChats(ctx, firebaseUID, feedbackID)
	if err != nil {
		return nil, nil, err
	}

	return chats, feedback, nil
}

func buildAIReviewReply(feedback *entity.ReviewFeedback, userMessage string) string {
	base := feedback.Suggestion
	if base == "" {
		base = "まずは指摘箇所の責務と依存関係を整理してください。"
	}

	if feedback.AIRecommendation == nil {
		return "補足ありがとうございます。現状では、" + base
	}
	if *feedback.AIRecommendation == entity.FeedbackResolutionUpdateDesignGuide {
		return "設計書側の意図を先に明文化すると議論しやすくなります。" + base
	}
	if *feedback.AIRecommendation == entity.FeedbackResolutionFixCode {
		return "コード側の依存や責務の切り方を確認してください。" + base
	}
	if strings.TrimSpace(userMessage) != "" {
		return "設計書とコードの両方を見直すのが良さそうです。" + base
	}
	return "設計書とコードの両方に改善余地があります。" + base
}

func (s *ReviewService) ResolveReviewFeedback(
	ctx context.Context,
	firebaseUID string,
	input ResolveReviewFeedbackInput,
) (*entity.ReviewFeedback, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	feedback, _, err := s.requireFeedbackAccess(ctx, firebaseUID, input.FeedbackID)
	if err != nil {
		return nil, err
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if input.Resolution != "" {
			resolution := entity.FeedbackResolution(input.Resolution)
			feedback.Resolution = &resolution
		}
		if input.Status != "" {
			feedback.Status = entity.FeedbackStatus(input.Status)
		}

		if err := tx.Save(&feedback).Error; err != nil {
			return err
		}

		actionType := entity.FeedbackActionTypeResolve
		switch feedback.Status {
		case entity.FeedbackStatusDismissed:
			actionType = entity.FeedbackActionTypeDismiss
		case entity.FeedbackStatusOpen:
			actionType = entity.FeedbackActionTypeUnresolve
		}

		action := &entity.ReviewFeedbackAction{
			FeedbackID: feedback.ID,
			ActionType: actionType,
			Resolution: feedback.Resolution,
			ActedBy:    requester.ID,
		}
		return tx.Create(action).Error
	})
	if err != nil {
		return nil, err
	}

	return feedback, nil
}

func (s *ReviewService) RateReviewFeedback(
	ctx context.Context,
	firebaseUID string,
	input RateReviewFeedbackInput,
) (*entity.ReviewFeedback, string, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, "", err
	}
	feedback, _, err := s.requireFeedbackAccess(ctx, firebaseUID, input.FeedbackID)
	if err != nil {
		return nil, "", err
	}

	reaction := input.Reaction
	if reaction != "good" && reaction != "bad" {
		return nil, "", errors.New("invalid feedback reaction")
	}

	record := &entity.ReviewFeedbackReaction{
		FeedbackID: feedback.ID,
		UserID:     requester.ID,
		Reaction:   reaction,
	}
	if err := s.reviewRepo.UpsertFeedbackReaction(ctx, record); err != nil {
		return nil, "", err
	}

	return feedback, reaction, nil
}

func (s *ReviewService) requireUser(ctx context.Context, firebaseUID string) (*entity.User, error) {
	user, err := s.userRepository.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (s *ReviewService) getFeedback(ctx context.Context, id int64) (*entity.ReviewFeedback, error) {
	feedback, err := s.reviewRepo.FindFeedbackByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if feedback == nil {
		return nil, ErrFeedbackNotFound
	}
	return feedback, nil
}

func (s *ReviewService) requireVariantAccess(
	ctx context.Context,
	firebaseUID string,
	variantID int64,
) (*entity.Variant, *entity.User, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}

	variant, err := s.variantRepo.FindByID(ctx, variantID)
	if err != nil {
		return nil, nil, err
	}
	if variant == nil {
		return nil, nil, ErrVariantNotFound
	}

	hasAccess, err := s.projectRepo.HasAccess(ctx, variant.ProjectID, requester.ID)
	if err != nil {
		return nil, nil, err
	}
	if !hasAccess {
		return nil, nil, ErrForbidden
	}

	return variant, requester, nil
}

func (s *ReviewService) requireFeedbackAccess(
	ctx context.Context,
	firebaseUID string,
	feedbackID int64,
) (*entity.ReviewFeedback, *entity.User, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}

	feedback, err := s.getFeedback(ctx, feedbackID)
	if err != nil {
		return nil, nil, err
	}

	variant, err := s.variantRepo.FindByID(ctx, feedback.VariantID)
	if err != nil {
		return nil, nil, err
	}
	if variant == nil {
		return nil, nil, ErrVariantNotFound
	}
	hasAccess, err := s.projectRepo.HasAccess(ctx, variant.ProjectID, requester.ID)
	if err != nil {
		return nil, nil, err
	}
	if !hasAccess {
		return nil, nil, ErrForbidden
	}

	return feedback, requester, nil
}
