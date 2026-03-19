package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
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

type ReviewFeedbackBundle struct {
	Feedbacks []entity.ReviewFeedback
	Targets   []entity.ReviewFeedbackTarget
}

type ReviewService struct {
	db             *gorm.DB
	userRepository *repository.UserRepository
	jobDispatcher  JobDispatcher
}

func NewReviewService(db *gorm.DB, userRepository *repository.UserRepository, jobDispatcher JobDispatcher) *ReviewService {
	return &ReviewService{
		db:             db,
		userRepository: userRepository,
		jobDispatcher:  jobDispatcher,
	}
}

func (s *ReviewService) CreateReviewJob(ctx context.Context, firebaseUID string, variantID int64) (*entity.ReviewJob, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	var variant entity.Variant
	if err := s.db.WithContext(ctx).First(&variant, variantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrVariantNotFound
		}
		return nil, err
	}

	job := &entity.ReviewJob{
		VariantID:   variantID,
		RequestedBy: requester.ID,
		Status:      entity.JobStatusQueued,
	}
	if err := s.db.WithContext(ctx).Create(job).Error; err != nil {
		return nil, err
	}
	if s.jobDispatcher != nil {
		if err := s.jobDispatcher.DispatchReviewJob(ctx, job.ID); err != nil {
			message := err.Error()
			job.Status = entity.JobStatusFailed
			job.ErrorMessage = &message
			_ = s.db.WithContext(ctx).Save(job).Error
			return nil, err
		}
	}

	return job, nil
}

func (s *ReviewService) GetReviewJob(ctx context.Context, id int64) (*entity.ReviewJob, error) {
	var job entity.ReviewJob
	if err := s.db.WithContext(ctx).First(&job, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrReviewJobNotFound
		}
		return nil, err
	}

	return &job, nil
}

func (s *ReviewService) ListReviewFeedbacks(ctx context.Context, input ListReviewFeedbacksInput) (*ReviewFeedbackBundle, error) {
	reviewJobID := input.ReviewJobID
	if reviewJobID == nil {
		var latest entity.ReviewJob
		err := s.db.WithContext(ctx).
			Where("variant_id = ?", input.VariantID).
			Order("created_at DESC, id DESC").
			First(&latest).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &ReviewFeedbackBundle{}, nil
			}
			return nil, err
		}
		reviewJobID = &latest.ID
	}

	query := s.db.WithContext(ctx).
		Where("variant_id = ? AND review_job_id = ?", input.VariantID, *reviewJobID).
		Order("display_order ASC, created_at ASC, id ASC")
	if input.OnlyOpen {
		query = query.Where("status = ?", entity.FeedbackStatusOpen)
	}

	var feedbacks []entity.ReviewFeedback
	if err := query.Find(&feedbacks).Error; err != nil {
		return nil, err
	}
	if len(feedbacks) == 0 {
		return &ReviewFeedbackBundle{}, nil
	}

	feedbackIDs := make([]int64, 0, len(feedbacks))
	for _, feedback := range feedbacks {
		feedbackIDs = append(feedbackIDs, feedback.ID)
	}

	var targets []entity.ReviewFeedbackTarget
	if err := s.db.WithContext(ctx).
		Where("feedback_id IN ?", feedbackIDs).
		Order("id ASC").
		Find(&targets).Error; err != nil {
		return nil, err
	}

	return &ReviewFeedbackBundle{
		Feedbacks: feedbacks,
		Targets:   targets,
	}, nil
}

func (s *ReviewService) ListReviewFeedbackChats(ctx context.Context, feedbackID int64) ([]entity.ReviewFeedbackChat, error) {
	if _, err := s.getFeedback(ctx, feedbackID); err != nil {
		return nil, err
	}

	var chats []entity.ReviewFeedbackChat
	if err := s.db.WithContext(ctx).
		Where("feedback_id = ?", feedbackID).
		Order("created_at ASC, id ASC").
		Find(&chats).Error; err != nil {
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
	feedback, err := s.getFeedback(ctx, feedbackID)
	if err != nil {
		return nil, nil, err
	}

	chat := &entity.ReviewFeedbackChat{
		FeedbackID: feedbackID,
		Role:       entity.ChatRoleUser,
		Content:    content,
		CreatedBy:  &requester.ID,
	}
	if err := s.db.WithContext(ctx).Create(chat).Error; err != nil {
		return nil, nil, err
	}

	chats, err := s.ListReviewFeedbackChats(ctx, feedbackID)
	if err != nil {
		return nil, nil, err
	}

	return chats, feedback, nil
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

	var feedback entity.ReviewFeedback
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&feedback, input.FeedbackID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrFeedbackNotFound
			}
			return err
		}

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

	return &feedback, nil
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
	var feedback entity.ReviewFeedback
	if err := s.db.WithContext(ctx).First(&feedback, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrFeedbackNotFound
		}
		return nil, err
	}

	return &feedback, nil
}
