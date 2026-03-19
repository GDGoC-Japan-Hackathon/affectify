package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/analyzer"
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

	// Fetch variant to get source root URI
	var variant entity.Variant
	if err := s.db.WithContext(ctx).First(&variant, job.VariantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.failGraphBuild(ctx, job, ErrVariantNotFound)
		}
		return s.failGraphBuild(ctx, job, err)
	}

	if variant.SourceRootURI == nil || *variant.SourceRootURI == "" {
		// No source to analyze — succeed immediately
		finished := time.Now()
		job.Status = entity.JobStatusSucceeded
		job.FinishedAt = (*entity.Time)(&finished)
		return s.db.WithContext(ctx).Save(job).Error
	}

	// Run the analyzer
	p := analyzer.New(*variant.SourceRootURI)
	result, err := p.Parse()
	if err != nil {
		return s.failGraphBuild(ctx, job, fmt.Errorf("analyzer: %w", err))
	}

	// Persist results in a transaction
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Delete previous data for this variant (edges first due to FK)
		if err := tx.Where("variant_id = ?", job.VariantID).Delete(&entity.Edge{}).Error; err != nil {
			return err
		}
		if err := tx.Where("variant_id = ?", job.VariantID).Delete(&entity.Node{}).Error; err != nil {
			return err
		}
		if err := tx.Where("variant_id = ?", job.VariantID).Delete(&entity.VariantFile{}).Error; err != nil {
			return err
		}

		// Insert VariantFiles and build path→ID map
		fileIDMap := make(map[string]int64)
		for i, f := range result.Files {
			lang := "go"
			pkgName := f.PackageName

			importsJSON, err := json.Marshal(f.Imports)
			if err != nil {
				return err
			}

			vf := &entity.VariantFile{
				VariantID:    job.VariantID,
				Path:         f.FilePath,
				Language:     &lang,
				PackageName:  &pkgName,
				Imports:      datatypes.JSON(importsJSON),
				IsVisible:    true,
				DisplayOrder: int32(i),
			}
			if err := tx.Create(vf).Error; err != nil {
				return err
			}
			fileIDMap[f.FilePath] = vf.ID
		}

		// Insert Nodes and build parsedID→DB ID map
		nodeIDMap := make(map[string]int64)
		for _, n := range result.Nodes {
			sig := n.Signature
			recv := n.Receiver
			code := n.CodeText

			var fileID *int64
			if id, ok := fileIDMap[n.FilePath]; ok {
				fileID = &id
			}

			node := &entity.Node{
				VariantID:     job.VariantID,
				VariantFileID: fileID,
				Kind:          entity.NodeKind(n.Kind),
				Title:         n.Title,
				Signature:     &sig,
				Receiver:      &recv,
				CodeText:      &code,
				PositionX:     n.X,
				PositionY:     n.Y,
			}
			if err := tx.Create(node).Error; err != nil {
				return err
			}
			nodeIDMap[n.ID] = node.ID
		}

		// Insert Edges
		for _, e := range result.Edges {
			fromID, ok1 := nodeIDMap[e.FromID]
			toID, ok2 := nodeIDMap[e.ToID]
			if !ok1 || !ok2 {
				continue
			}
			edge := &entity.Edge{
				VariantID:  job.VariantID,
				FromNodeID: fromID,
				ToNodeID:   toID,
				Kind:       entity.EdgeKind(e.Kind),
				Style:      entity.EdgeStyle(e.Style),
			}
			if err := tx.Create(edge).Error; err != nil {
				return err
			}
		}

		// Update variant
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
