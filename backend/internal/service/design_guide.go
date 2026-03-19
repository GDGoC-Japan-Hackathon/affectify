package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

var ErrDesignGuideForbidden = errors.New("design guide forbidden")

type DesignGuideSummaryDetail struct {
	Guide      *entity.DesignGuide
	Creator    *entity.User
	LikeCount  int32
	LikedByMe  bool
}

type DesignGuideDetail struct {
	Guide      *entity.DesignGuide
	Creator    *entity.User
	LikeCount  int32
	LikedByMe  bool
}

type ListDesignGuidesInput struct {
	Query         string
	CreatedByMe   bool
	LikedByMe     bool
	Visibility    string
	OnlyTemplates bool
}

type CreateDesignGuideInput struct {
	Name        string
	Description string
	Content     string
	Visibility  string
	IsTemplate  bool
}

type UpdateDesignGuideInput struct {
	ID          int64
	Name        string
	Description string
	Content     string
	Visibility  string
	IsTemplate  bool
}

type DesignGuideService struct {
	userRepo        *repository.UserRepository
	designGuideRepo *repository.DesignGuideRepository
}

func NewDesignGuideService(db *gorm.DB, userRepo *repository.UserRepository) *DesignGuideService {
	return &DesignGuideService{
		userRepo:        userRepo,
		designGuideRepo: repository.NewDesignGuideRepository(db),
	}
}

func (s *DesignGuideService) ListDesignGuides(ctx context.Context, firebaseUID string, input ListDesignGuidesInput) ([]DesignGuideSummaryDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	guides, err := s.designGuideRepo.List(ctx, repository.ListDesignGuidesFilter{
		UserID:        requester.ID,
		Query:         input.Query,
		CreatedByMe:   input.CreatedByMe,
		LikedByMe:     input.LikedByMe,
		Visibility:    input.Visibility,
		OnlyTemplates: input.OnlyTemplates,
	})
	if err != nil {
		return nil, err
	}

	return s.attachDesignGuideSummaries(ctx, requester.ID, guides)
}

func (s *DesignGuideService) GetDesignGuide(ctx context.Context, firebaseUID string, id int64) (*DesignGuideDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	guide, err := s.designGuideRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, ErrDesignGuideNotFound
	}
	if guide.CreatedBy != requester.ID && guide.Visibility != entity.DesignGuideVisibilityPublic {
		return nil, ErrDesignGuideForbidden
	}

	details, err := s.attachDesignGuideDetails(ctx, requester.ID, []entity.DesignGuide{*guide})
	if err != nil {
		return nil, err
	}
	if len(details) == 0 {
		return nil, ErrDesignGuideNotFound
	}
	return &details[0], nil
}

func (s *DesignGuideService) CreateDesignGuide(ctx context.Context, firebaseUID string, input CreateDesignGuideInput) (*DesignGuideDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	var description *string
	if input.Description != "" {
		description = &input.Description
	}

	visibility := entity.DesignGuideVisibility(input.Visibility)
	if visibility == "" {
		visibility = entity.DesignGuideVisibilityPrivate
	}

	guide := &entity.DesignGuide{
		Name:        input.Name,
		Description: description,
		Content:     input.Content,
		Visibility:  visibility,
		IsTemplate:  input.IsTemplate,
		CreatedBy:   requester.ID,
	}
	if err := s.designGuideRepo.Create(ctx, guide); err != nil {
		return nil, err
	}

	return s.GetDesignGuide(ctx, firebaseUID, guide.ID)
}

func (s *DesignGuideService) UpdateDesignGuide(ctx context.Context, firebaseUID string, input UpdateDesignGuideInput) (*DesignGuideDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	guide, err := s.designGuideRepo.FindByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if guide == nil {
		return nil, ErrDesignGuideNotFound
	}
	if guide.CreatedBy != requester.ID {
		return nil, ErrDesignGuideForbidden
	}

	guide.Name = input.Name
	if input.Description == "" {
		guide.Description = nil
	} else {
		guide.Description = &input.Description
	}
	guide.Content = input.Content
	if input.Visibility != "" {
		guide.Visibility = entity.DesignGuideVisibility(input.Visibility)
	}
	guide.IsTemplate = input.IsTemplate

	if err := s.designGuideRepo.Save(ctx, guide); err != nil {
		return nil, err
	}

	return s.GetDesignGuide(ctx, firebaseUID, guide.ID)
}

func (s *DesignGuideService) DeleteDesignGuide(ctx context.Context, firebaseUID string, id int64) error {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return err
	}

	guide, err := s.designGuideRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}
	if guide == nil {
		return ErrDesignGuideNotFound
	}
	if guide.CreatedBy != requester.ID {
		return ErrDesignGuideForbidden
	}

	deleted, err := s.designGuideRepo.DeleteByID(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrDesignGuideNotFound
	}
	return nil
}

func (s *DesignGuideService) LikeDesignGuide(ctx context.Context, firebaseUID string, designGuideID int64) error {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return err
	}
	guide, err := s.designGuideRepo.FindByID(ctx, designGuideID)
	if err != nil {
		return err
	}
	if guide == nil {
		return ErrDesignGuideNotFound
	}

	existing, err := s.designGuideRepo.FindLike(ctx, designGuideID, requester.ID)
	if err != nil {
		return err
	}
	if existing != nil {
		return nil
	}

	return s.designGuideRepo.CreateLike(ctx, &entity.DesignGuideLike{
		DesignGuideID: designGuideID,
		UserID:        requester.ID,
	})
}

func (s *DesignGuideService) UnlikeDesignGuide(ctx context.Context, firebaseUID string, designGuideID int64) error {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return err
	}

	existing, err := s.designGuideRepo.FindLike(ctx, designGuideID, requester.ID)
	if err != nil {
		return err
	}
	if existing == nil {
		return nil
	}
	return s.designGuideRepo.DeleteLikeByID(ctx, existing.ID)
}

func (s *DesignGuideService) requireUser(ctx context.Context, firebaseUID string) (*entity.User, error) {
	user, err := s.userRepo.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *DesignGuideService) attachDesignGuideSummaries(ctx context.Context, requesterID int64, guides []entity.DesignGuide) ([]DesignGuideSummaryDetail, error) {
	if len(guides) == 0 {
		return []DesignGuideSummaryDetail{}, nil
	}

	guideIDs := make([]int64, 0, len(guides))
	userIDs := make([]int64, 0, len(guides))
	for _, guide := range guides {
		guideIDs = append(guideIDs, guide.ID)
		userIDs = append(userIDs, guide.CreatedBy)
	}

	creatorByID, err := s.designGuideRepo.FindCreatorsByIDs(ctx, userIDs)
	if err != nil {
		return nil, err
	}
	likeCountByGuideID, err := s.designGuideRepo.CountLikesByGuideIDs(ctx, guideIDs)
	if err != nil {
		return nil, err
	}
	likedByGuideID, err := s.designGuideRepo.FindLikedGuideIDsByUser(ctx, requesterID, guideIDs)
	if err != nil {
		return nil, err
	}

	details := make([]DesignGuideSummaryDetail, 0, len(guides))
	for i := range guides {
		guide := guides[i]
		details = append(details, DesignGuideSummaryDetail{
			Guide:     &guide,
			Creator:   creatorByID[guide.CreatedBy],
			LikeCount: likeCountByGuideID[guide.ID],
			LikedByMe: likedByGuideID[guide.ID],
		})
	}
	return details, nil
}

func (s *DesignGuideService) attachDesignGuideDetails(ctx context.Context, requesterID int64, guides []entity.DesignGuide) ([]DesignGuideDetail, error) {
	summaries, err := s.attachDesignGuideSummaries(ctx, requesterID, guides)
	if err != nil {
		return nil, err
	}

	details := make([]DesignGuideDetail, 0, len(summaries))
	for i := range summaries {
		summary := summaries[i]
		details = append(details, DesignGuideDetail{
			Guide:     summary.Guide,
			Creator:   summary.Creator,
			LikeCount: summary.LikeCount,
			LikedByMe: summary.LikedByMe,
		})
	}
	return details, nil
}

