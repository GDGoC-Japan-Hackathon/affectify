package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/graphbuild"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type JobWorkerService struct {
	variantRepo *repository.VariantRepository
	reviewRepo  *repository.ReviewRepository
}

func NewJobWorkerService(db *gorm.DB) *JobWorkerService {
	return &JobWorkerService{
		variantRepo: repository.NewVariantRepository(db),
		reviewRepo:  repository.NewReviewRepository(db),
	}
}

func (s *JobWorkerService) RunGraphBuildJob(ctx context.Context, jobID int64) error {
	job, err := s.variantRepo.FindGraphBuildJobByID(ctx, jobID)
	if err != nil {
		return err
	}
	if job == nil {
		return ErrGraphBuildJobNotFound
	}
	return s.runGraphBuild(ctx, job)
}

func (s *JobWorkerService) RunLayoutJob(ctx context.Context, jobID int64) error {
	job, err := s.variantRepo.FindLayoutJobByID(ctx, jobID)
	if err != nil {
		return err
	}
	if job == nil {
		return ErrLayoutJobNotFound
	}
	return s.runLayout(ctx, job)
}

func (s *JobWorkerService) RunReviewJob(ctx context.Context, jobID int64) error {
	job, err := s.reviewRepo.FindReviewJobByID(ctx, jobID)
	if err != nil {
		return err
	}
	if job == nil {
		return ErrReviewJobNotFound
	}
	return s.runReview(ctx, job)
}

func (s *JobWorkerService) runGraphBuild(ctx context.Context, job *entity.GraphBuildJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.variantRepo.SaveGraphBuildJob(ctx, job); err != nil {
		return err
	}

	if err := s.syncGraph(ctx, job.VariantID, now); err != nil {
		return s.failGraphBuild(ctx, job, err)
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.variantRepo.SaveGraphBuildJob(ctx, job)
}

func (s *JobWorkerService) syncGraph(ctx context.Context, variantID int64, importedAt time.Time) error {
	variant, err := s.variantRepo.FindByID(ctx, variantID)
	if err != nil {
		return err
	}
	if variant == nil {
		return ErrVariantNotFound
	}
	if variant.SourceRootURI == nil || *variant.SourceRootURI == "" {
		return errors.New("variant source_root_uri is empty")
	}

	localDir, files, err := s.materializeVariantSource(ctx, *variant.SourceRootURI)
	if err != nil {
		return err
	}

	board, err := graphbuild.NewParser(localDir).Parse()
	if err != nil {
		return err
	}

	return s.variantRepo.SyncParsedGraph(ctx, variantID, importedAt, files, board)
}

func (s *JobWorkerService) materializeVariantSource(ctx context.Context, sourceRootURI string) (string, []string, error) {
	bucketName, prefix, err := parseGCSURI(sourceRootURI)
	if err != nil {
		return "", nil, err
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", nil, err
	}
	defer client.Close()

	localDir, err := os.MkdirTemp("", "whitecoder-variant-*")
	if err != nil {
		return "", nil, err
	}

	query := &storage.Query{Prefix: prefix}
	it := client.Bucket(bucketName).Objects(ctx, query)
	var files []string
	for {
		attrs, err := it.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return "", nil, err
		}
		if strings.HasSuffix(attrs.Name, "/") {
			continue
		}

		relPath := strings.TrimPrefix(attrs.Name, prefix)
		relPath = strings.TrimPrefix(relPath, "/")
		if relPath == "" {
			continue
		}

		targetPath := filepath.Join(localDir, relPath)
		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return "", nil, err
		}

		reader, err := client.Bucket(bucketName).Object(attrs.Name).NewReader(ctx)
		if err != nil {
			return "", nil, err
		}
		data, readErr := io.ReadAll(reader)
		closeErr := reader.Close()
		if readErr != nil {
			return "", nil, readErr
		}
		if closeErr != nil {
			return "", nil, closeErr
		}

		if err := os.WriteFile(targetPath, data, 0o644); err != nil {
			return "", nil, err
		}

		files = append(files, filepath.ToSlash(relPath))
	}

	slices.Sort(files)
	return localDir, files, nil
}

func parseGCSURI(uri string) (string, string, error) {
	const prefix = "gs://"
	if !strings.HasPrefix(uri, prefix) {
		return "", "", fmt.Errorf("unsupported source_root_uri: %s", uri)
	}

	path := strings.TrimPrefix(uri, prefix)
	parts := strings.SplitN(path, "/", 2)
	if len(parts) == 0 || parts[0] == "" {
		return "", "", fmt.Errorf("invalid gs uri: %s", uri)
	}

	bucket := parts[0]
	objectPrefix := ""
	if len(parts) == 2 {
		objectPrefix = strings.TrimPrefix(parts[1], "/")
	}
	if objectPrefix != "" && !strings.HasSuffix(objectPrefix, "/") {
		objectPrefix += "/"
	}
	return bucket, objectPrefix, nil
}

func (s *JobWorkerService) runLayout(ctx context.Context, job *entity.LayoutJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.variantRepo.SaveLayoutJob(ctx, job); err != nil {
		return err
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.variantRepo.SaveLayoutJob(ctx, job)
}

func (s *JobWorkerService) runReview(ctx context.Context, job *entity.ReviewJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.reviewRepo.SaveReviewJob(ctx, job); err != nil {
		return err
	}

	variant, err := s.variantRepo.FindByID(ctx, job.VariantID)
	if err != nil {
		return s.failReview(ctx, job, err)
	}
	if variant == nil {
		return s.failReview(ctx, job, ErrVariantNotFound)
	}
	if err := s.variantRepo.UpdateLastReviewedAt(ctx, job.VariantID, now); err != nil {
		return s.failReview(ctx, job, err)
	}
	if err := s.reviewRepo.CreatePlaceholderAnalysisReport(ctx, job.VariantID, job.ID, now); err != nil {
		return s.failReview(ctx, job, err)
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.reviewRepo.SaveReviewJob(ctx, job)
}

func (s *JobWorkerService) failGraphBuild(ctx context.Context, job *entity.GraphBuildJob, cause error) error {
	now := time.Now()
	message := cause.Error()
	job.Status = entity.JobStatusFailed
	job.ErrorMessage = &message
	job.FinishedAt = (*entity.Time)(&now)
	if err := s.variantRepo.SaveGraphBuildJob(ctx, job); err != nil {
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
	if err := s.reviewRepo.SaveReviewJob(ctx, job); err != nil {
		return fmt.Errorf("review failed: %w (additionally failed to persist job error: %v)", cause, err)
	}
	return cause
}
