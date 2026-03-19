package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type JobWorkerService struct {
	db *gorm.DB
}

func NewJobWorkerService(db *gorm.DB) *JobWorkerService {
	return &JobWorkerService{db: db}
}

func (s *JobWorkerService) RunGraphBuildJob(ctx context.Context, jobID int64) error {
	var job entity.GraphBuildJob
	if err := s.db.WithContext(ctx).First(&job, jobID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGraphBuildJobNotFound
		}
		return err
	}

	return s.runGraphBuild(ctx, &job)
}

func (s *JobWorkerService) RunLayoutJob(ctx context.Context, jobID int64) error {
	var job entity.LayoutJob
	if err := s.db.WithContext(ctx).First(&job, jobID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrLayoutJobNotFound
		}
		return err
	}

	return s.runLayout(ctx, &job)
}

func (s *JobWorkerService) RunReviewJob(ctx context.Context, jobID int64) error {
	var job entity.ReviewJob
	if err := s.db.WithContext(ctx).First(&job, jobID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrReviewJobNotFound
		}
		return err
	}

	return s.runReview(ctx, &job)
}

func (s *JobWorkerService) runGraphBuild(ctx context.Context, job *entity.GraphBuildJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.db.WithContext(ctx).Save(job).Error; err != nil {
		return err
	}

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var variant entity.Variant
		if err := tx.First(&variant, job.VariantID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrVariantNotFound
			}
			return err
		}

		variant.LastImportedAt = (*entity.Time)(&now)
		return tx.Save(&variant).Error
	}); err != nil {
		return s.failGraphBuild(ctx, job, err)
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.db.WithContext(ctx).Save(job).Error
}

func (s *JobWorkerService) runLayout(ctx context.Context, job *entity.LayoutJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.db.WithContext(ctx).Save(job).Error; err != nil {
		return err
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.db.WithContext(ctx).Save(job).Error
}

func (s *JobWorkerService) runReview(ctx context.Context, job *entity.ReviewJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.db.WithContext(ctx).Save(job).Error; err != nil {
		return err
	}

	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var variant entity.Variant
		if err := tx.First(&variant, job.VariantID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrVariantNotFound
			}
			return err
		}

		variant.LastReviewedAt = (*entity.Time)(&now)
		if err := tx.Save(&variant).Error; err != nil {
			return err
		}

		if job.Status == entity.JobStatusQueued {
			report := &entity.AnalysisReport{
				VariantID:    variant.ID,
				ReviewJobID:  &job.ID,
				OverallScore: 0,
				Summary:      nil,
				ReportData:   []byte(`{"status":"placeholder"}`),
				AnalyzedAt:   entity.Time(now),
			}
			if err := tx.Create(report).Error; err != nil {
				return err
			}
		}

		return nil
	}); err != nil {
		return s.failReview(ctx, job, err)
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.db.WithContext(ctx).Save(job).Error
}

func (s *JobWorkerService) failGraphBuild(ctx context.Context, job *entity.GraphBuildJob, cause error) error {
	now := time.Now()
	message := cause.Error()
	job.Status = entity.JobStatusFailed
	job.ErrorMessage = &message
	job.FinishedAt = (*entity.Time)(&now)
	if err := s.db.WithContext(ctx).Save(job).Error; err != nil {
		return fmt.Errorf("graph build failed: %w (additionally failed to persist job error: %v)", cause, err)
	}
	return cause
}

func (s *JobWorkerService) failReview(ctx context.Context, job *entity.ReviewJob, cause error) error {
	now := time.Now()
	message := cause.Error()
	job.Status = entity.JobStatusFailed
	job.ErrorMessage = &message
	job.FinishedAt = (*entity.Time)(&now)
	if err := s.db.WithContext(ctx).Save(job).Error; err != nil {
		return fmt.Errorf("review failed: %w (additionally failed to persist job error: %v)", cause, err)
	}
	return cause
}
