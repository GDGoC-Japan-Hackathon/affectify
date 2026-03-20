package service

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

var ErrAnalysisReportNotFound = errors.New("analysis report not found")

type AnalysisService struct {
	userRepository *repository.UserRepository
	projectRepo    *repository.ProjectRepository
	variantRepo    *repository.VariantRepository
	reviewRepo     *repository.ReviewRepository
}

func NewAnalysisService(db *gorm.DB, userRepository *repository.UserRepository) *AnalysisService {
	return &AnalysisService{
		userRepository: userRepository,
		projectRepo:    repository.NewProjectRepository(db),
		variantRepo:    repository.NewVariantRepository(db),
		reviewRepo:     repository.NewReviewRepository(db),
	}
}

func (s *AnalysisService) GetAnalysisReport(ctx context.Context, firebaseUID string, variantID int64) (*entity.AnalysisReport, error) {
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, variantID); err != nil {
		return nil, err
	}

	report, err := s.reviewRepo.FindLatestAnalysisReportByVariantID(ctx, variantID)
	if err != nil {
		return nil, err
	}
	if report == nil {
		return nil, ErrAnalysisReportNotFound
	}
	if report.ReviewJobID != nil {
		latestApply, err := s.reviewRepo.FindLatestSucceededReviewApplyJobByReviewJobID(ctx, *report.ReviewJobID)
		if err != nil {
			return nil, err
		}
		if latestApply != nil {
			return nil, ErrAnalysisReportNotFound
		}
	}

	return report, nil
}

func (s *AnalysisService) RunAnalysis(ctx context.Context, firebaseUID string, variantID int64) (*entity.AnalysisReport, error) {
	return s.GetAnalysisReport(ctx, firebaseUID, variantID)
}

func (s *AnalysisService) requireVariantAccess(ctx context.Context, firebaseUID string, variantID int64) (*entity.Variant, *entity.User, error) {
	requester, err := s.userRepository.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}
	if requester == nil {
		return nil, nil, ErrUserNotFound
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
