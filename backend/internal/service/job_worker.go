package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"google.golang.org/api/iterator"
	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/graphbuild"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/layout"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/reviewgen"
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
	log.Printf("graph-build: start job_id=%d variant_id=%d", job.ID, job.VariantID)
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.variantRepo.SaveGraphBuildJob(ctx, job); err != nil {
		return err
	}

	if err := s.syncGraph(ctx, job.VariantID, now); err != nil {
		log.Printf("graph-build: failed job_id=%d variant_id=%d err=%v", job.ID, job.VariantID, err)
		return s.failGraphBuild(ctx, job, err)
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	log.Printf("graph-build: succeeded job_id=%d variant_id=%d", job.ID, job.VariantID)
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
	moduleRoot := findGoModuleRoot(localDir, files)
	files = relativizeFilesToModuleRoot(localDir, moduleRoot, files)
	log.Printf(
		"graph-build: materialized variant_id=%d source_root_uri=%s local_dir=%s module_root=%s files=%d",
		variantID,
		*variant.SourceRootURI,
		localDir,
		moduleRoot,
		len(files),
	)
	if len(files) == 0 {
		return errors.New("variant source_root_uri does not contain any files")
	}
	if !containsGoModule(files) {
		return errors.New("current graph build supports Go modules only: go.mod not found")
	}
	goFiles := filterGoFiles(files)
	if len(goFiles) == 0 {
		return fmt.Errorf(
			"current graph build supports Go repositories only: found %d files, 0 .go files",
			len(files),
		)
	}

	board, err := graphbuild.NewParser(moduleRoot).Parse()
	if err != nil {
		return err
	}
	log.Printf(
		"graph-build: parsed variant_id=%d nodes=%d edges=%d",
		variantID,
		len(board.Nodes),
		len(board.Edges),
	)
	if len(board.Nodes) == 0 {
		sampleFiles := goFiles
		if len(sampleFiles) > 5 {
			sampleFiles = sampleFiles[:5]
		}
		return fmt.Errorf(
			"graph build produced no nodes: found %d files, %d Go files, but extracted 0 functions/methods (sample Go files: %s)",
			len(files),
			len(goFiles),
			strings.Join(sampleFiles, ", "),
		)
	}

	return s.variantRepo.SyncParsedGraph(ctx, variantID, importedAt, files, board)
}

func (s *JobWorkerService) materializeVariantSource(ctx context.Context, sourceRootURI string) (string, []string, error) {
	if isLocalSourceURI(sourceRootURI) {
		return materializeLocalVariantSource(sourceRootURI)
	}

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

func materializeLocalVariantSource(sourceRootURI string) (string, []string, error) {
	localDir := strings.TrimPrefix(sourceRootURI, "file://")
	if !filepath.IsAbs(localDir) {
		absPath, err := filepath.Abs(localDir)
		if err != nil {
			return "", nil, err
		}
		localDir = absPath
	}

	info, err := os.Stat(localDir)
	if err != nil {
		return "", nil, err
	}
	if !info.IsDir() {
		return "", nil, fmt.Errorf("local source_root_uri is not a directory: %s", sourceRootURI)
	}

	var files []string
	if err := filepath.WalkDir(localDir, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}

		relPath, err := filepath.Rel(localDir, path)
		if err != nil {
			return err
		}
		files = append(files, filepath.ToSlash(relPath))
		return nil
	}); err != nil {
		return "", nil, err
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

func isLocalSourceURI(uri string) bool {
	return strings.HasPrefix(uri, "file://") || filepath.IsAbs(uri)
}

func filterGoFiles(files []string) []string {
	goFiles := make([]string, 0, len(files))
	for _, file := range files {
		if strings.HasSuffix(strings.ToLower(file), ".go") {
			goFiles = append(goFiles, file)
		}
	}
	return goFiles
}

func containsGoModule(files []string) bool {
	for _, file := range files {
		if filepath.Base(filepath.ToSlash(file)) == "go.mod" {
			return true
		}
	}
	return false
}

func findGoModuleRoot(localDir string, files []string) string {
	for _, file := range files {
		normalized := filepath.ToSlash(file)
		if filepath.Base(normalized) != "go.mod" {
			continue
		}
		dir := filepath.Dir(normalized)
		if dir == "." || dir == "" {
			return localDir
		}
		return filepath.Join(localDir, filepath.FromSlash(dir))
	}
	return localDir
}

func relativizeFilesToModuleRoot(localDir string, moduleRoot string, files []string) []string {
	if moduleRoot == "" || moduleRoot == localDir {
		return files
	}

	normalized := make([]string, 0, len(files))
	for _, file := range files {
		absPath := filepath.Join(localDir, filepath.FromSlash(file))
		relPath, err := filepath.Rel(moduleRoot, absPath)
		if err != nil {
			normalized = append(normalized, filepath.ToSlash(file))
			continue
		}
		normalized = append(normalized, filepath.ToSlash(relPath))
	}
	return normalized
}

func (s *JobWorkerService) runLayout(ctx context.Context, job *entity.LayoutJob) error {
	now := time.Now()
	job.Status = entity.JobStatusRunning
	job.StartedAt = (*entity.Time)(&now)
	job.ErrorMessage = nil
	if err := s.variantRepo.SaveLayoutJob(ctx, job); err != nil {
		return err
	}

	nodes, err := s.variantRepo.ListNodesByVariantID(ctx, job.VariantID)
	if err != nil {
		return s.failLayout(ctx, job, err)
	}
	if len(nodes) == 0 {
		return s.failLayout(ctx, job, errors.New("layout requires at least one node"))
	}

	edges, err := s.variantRepo.ListEdgesByVariantID(ctx, job.VariantID)
	if err != nil {
		return s.failLayout(ctx, job, err)
	}

	computed := layout.Compute(nodes, edges, job.LayoutType)
	positions := make(map[int64][2]float64, len(computed))
	for nodeID, position := range computed {
		positions[nodeID] = [2]float64{position.X, position.Y}
	}
	if err := s.variantRepo.ApplyNodePositions(ctx, job.VariantID, positions); err != nil {
		return s.failLayout(ctx, job, err)
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

	files, err := s.variantRepo.ListFilesByVariantID(ctx, job.VariantID)
	if err != nil {
		return s.failReview(ctx, job, err)
	}
	nodes, err := s.variantRepo.ListNodesByVariantID(ctx, job.VariantID)
	if err != nil {
		return s.failReview(ctx, job, err)
	}
	edges, err := s.variantRepo.ListEdgesByVariantID(ctx, job.VariantID)
	if err != nil {
		return s.failReview(ctx, job, err)
	}
	designGuide, err := s.variantRepo.FindDesignGuideByVariantID(ctx, job.VariantID)
	if err != nil {
		return s.failReview(ctx, job, err)
	}

	result := reviewgen.Generate(designGuide, files, nodes, edges)
	writes := make([]repository.FeedbackWrite, 0, len(result.Feedbacks))
	for index, feedback := range result.Feedbacks {
		aiRecommendation := feedback.AIRecommendation
		model := entity.ReviewFeedback{
			ReviewJobID:      job.ID,
			VariantID:        job.VariantID,
			FeedbackType:     feedback.Type,
			Severity:         feedback.Severity,
			Title:            feedback.Title,
			Description:      feedback.Description,
			Suggestion:       feedback.Suggestion,
			AIRecommendation: &aiRecommendation,
			Status:           entity.FeedbackStatusOpen,
			DisplayOrder:     int32(index + 1),
		}

		targets := make([]entity.ReviewFeedbackTarget, 0, len(feedback.TargetNodeIDs)+len(feedback.TargetEdgeIDs)+len(feedback.TargetFilePaths))
		for _, nodeID := range feedback.TargetNodeIDs {
			targets = append(targets, entity.ReviewFeedbackTarget{
				TargetType: entity.FeedbackTargetTypeNode,
				TargetRef:  fmt.Sprintf("%d", nodeID),
			})
		}
		for _, edgeID := range feedback.TargetEdgeIDs {
			targets = append(targets, entity.ReviewFeedbackTarget{
				TargetType: entity.FeedbackTargetTypeEdge,
				TargetRef:  fmt.Sprintf("%d", edgeID),
			})
		}
		for _, path := range feedback.TargetFilePaths {
			targets = append(targets, entity.ReviewFeedbackTarget{
				TargetType: entity.FeedbackTargetTypeFile,
				TargetRef:  path,
			})
		}

		chats := []entity.ReviewFeedbackChat{
			{
				Role:    entity.ChatRoleAI,
				Content: buildInitialAIReviewChat(feedback),
			},
		}
		writes = append(writes, repository.FeedbackWrite{
			Feedback: model,
			Targets:  targets,
			Chats:    chats,
		})
	}

	if err := s.reviewRepo.ReplaceGeneratedReview(
		ctx,
		job.VariantID,
		job.ID,
		result.OverallScore,
		result.Summary,
		result.ReportData,
		now,
		writes,
	); err != nil {
		return s.failReview(ctx, job, err)
	}

	if err := s.variantRepo.UpdateLastReviewedAt(ctx, job.VariantID, now); err != nil {
		return s.failReview(ctx, job, err)
	}

	finished := time.Now()
	job.Status = entity.JobStatusSucceeded
	job.FinishedAt = (*entity.Time)(&finished)
	return s.reviewRepo.SaveReviewJob(ctx, job)
}

func buildInitialAIReviewChat(feedback reviewgen.Feedback) string {
	return fmt.Sprintf(
		"%s。提案は「%s」です。まずは %s を確認するのがよいです。",
		feedback.Description,
		feedback.Suggestion,
		initialResolutionFocus(feedback.AIRecommendation),
	)
}

func initialResolutionFocus(resolution entity.FeedbackResolution) string {
	switch resolution {
	case entity.FeedbackResolutionUpdateDesignGuide:
		return "設計書の前提と責務分割"
	case entity.FeedbackResolutionFixCode:
		return "コード上の依存と責務境界"
	default:
		return "設計書とコードの両方"
	}
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

func (s *JobWorkerService) failLayout(ctx context.Context, job *entity.LayoutJob, cause error) error {
	now := time.Now()
	message := cause.Error()
	job.Status = entity.JobStatusFailed
	job.ErrorMessage = &message
	job.FinishedAt = (*entity.Time)(&now)
	if err := s.variantRepo.SaveLayoutJob(ctx, job); err != nil {
		return fmt.Errorf("layout failed: %w (additionally failed to persist job error: %v)", cause, err)
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
