package service

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/source"
)

var (
	ErrVariantNotFound       = errors.New("variant not found")
	ErrProjectNotFound       = errors.New("project not found")
	ErrDesignGuideNotFound   = errors.New("design guide not found")
	ErrGraphBuildJobNotFound = errors.New("graph build job not found")
	ErrLayoutJobNotFound     = errors.New("layout job not found")
)

type VariantDetail struct {
	Variant   *entity.Variant
	Creator   *entity.User
	NodeCount int32
}

type VariantWorkspace struct {
	Variant     *entity.Variant
	Creator     *entity.User
	Files       []entity.VariantFile
	DesignGuide *entity.VariantDesignGuide
	Nodes       []entity.Node
	Edges       []entity.Edge
}

type CreateVariantInput struct {
	ProjectID           int64
	Name                string
	Description         string
	ForkedFromVariantID *int64
	BaseDesignGuideID   *int64
}

type UpdateVariantInput struct {
	ID             int64
	Name           string
	Description    string
	IsMain         *bool
	SourceLanguage *string
	SourceRootURI  *string
}

type UpdateVariantDesignGuideInput struct {
	ID          int64
	Title       string
	Description string
	Content     string
}

type CreateLayoutJobInput struct {
	VariantID  int64
	LayoutType string
}

type PrepareVariantSourceUploadInput struct {
	VariantID int64
	Files     []source.UploadDescriptor
}

type VariantService struct {
	db             *gorm.DB
	userRepository *repository.UserRepository
	variantRepo    *repository.VariantRepository
	projectRepo    *repository.ProjectRepository
	jobDispatcher  JobDispatcher
	sourceStore    source.Store
}

func NewVariantService(db *gorm.DB, userRepository *repository.UserRepository, jobDispatcher JobDispatcher, sourceStore source.Store) *VariantService {
	return &VariantService{
		db:             db,
		userRepository: userRepository,
		variantRepo:    repository.NewVariantRepository(db),
		projectRepo:    repository.NewProjectRepository(db),
		jobDispatcher:  jobDispatcher,
		sourceStore:    sourceStore,
	}
}

func (s *VariantService) ListVariants(ctx context.Context, firebaseUID string, projectID int64) ([]VariantDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	hasAccess, err := s.projectRepo.HasAccess(ctx, projectID, requester.ID)
	if err != nil {
		return nil, err
	}
	if !hasAccess {
		return nil, ErrForbidden
	}

	variants, err := s.variantRepo.ListByProjectID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	return s.attachVariantDetails(ctx, variants)
}

func (s *VariantService) GetVariant(ctx context.Context, firebaseUID string, id int64) (*VariantDetail, error) {
	variant, _, err := s.requireVariantAccess(ctx, firebaseUID, id)
	if err != nil {
		return nil, err
	}

	details, err := s.attachVariantDetails(ctx, []entity.Variant{*variant})
	if err != nil {
		return nil, err
	}
	if len(details) == 0 {
		return nil, ErrVariantNotFound
	}

	return &details[0], nil
}

func (s *VariantService) CreateVariant(
	ctx context.Context,
	firebaseUID string,
	input CreateVariantInput,
) (*VariantDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	hasAccess, err := s.projectRepo.HasAccess(ctx, input.ProjectID, requester.ID)
	if err != nil {
		return nil, err
	}
	if !hasAccess {
		return nil, ErrForbidden
	}

	var created entity.Variant
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var project entity.Project
		if err := tx.First(&project, input.ProjectID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrProjectNotFound
			}
			return err
		}

		var existingCount int64
		if err := tx.Model(&entity.Variant{}).
			Where("project_id = ?", input.ProjectID).
			Count(&existingCount).Error; err != nil {
			return err
		}

		var description *string
		if input.Description != "" {
			description = &input.Description
		}

		created = entity.Variant{
			ProjectID:           input.ProjectID,
			Name:                input.Name,
			Description:         description,
			IsMain:              existingCount == 0,
			ForkedFromVariantID: input.ForkedFromVariantID,
			Status:              entity.VariantStatusActive,
			CreatedBy:           requester.ID,
		}

		if input.ForkedFromVariantID != nil {
			var parent entity.Variant
			if err := tx.First(&parent, *input.ForkedFromVariantID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrVariantNotFound
				}
				return err
			}

			created.SourceLanguage = parent.SourceLanguage
			created.SourceRootURI = parent.SourceRootURI
			created.AnalysisScore = parent.AnalysisScore
		}

		if err := tx.Create(&created).Error; err != nil {
			return err
		}

		if err := s.initializeVariantDesignGuide(tx, requester.ID, created.ID, input.BaseDesignGuideID, input.ForkedFromVariantID); err != nil {
			return err
		}

		if input.ForkedFromVariantID != nil {
			if err := s.cloneVariantWorkspace(tx, *input.ForkedFromVariantID, created.ID); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.GetVariant(ctx, firebaseUID, created.ID)
}

func (s *VariantService) UpdateVariant(ctx context.Context, firebaseUID string, input UpdateVariantInput) (*VariantDetail, error) {
	variant, _, err := s.requireVariantAccess(ctx, firebaseUID, input.ID)
	if err != nil {
		return nil, err
	}

	variant.Name = input.Name
	if input.Description == "" {
		variant.Description = nil
	} else {
		variant.Description = &input.Description
	}
	if input.IsMain != nil {
		variant.IsMain = *input.IsMain
	}
	if input.SourceLanguage != nil {
		if *input.SourceLanguage == "" {
			variant.SourceLanguage = nil
		} else {
			variant.SourceLanguage = input.SourceLanguage
		}
	}
	if input.SourceRootURI != nil {
		if *input.SourceRootURI == "" {
			variant.SourceRootURI = nil
		} else {
			variant.SourceRootURI = input.SourceRootURI
		}
	}

	if err := s.variantRepo.Save(ctx, variant); err != nil {
		return nil, err
	}

	return s.GetVariant(ctx, firebaseUID, input.ID)
}

func (s *VariantService) DeleteVariant(ctx context.Context, firebaseUID string, id int64) error {
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, id); err != nil {
		return err
	}

	deleted, err := s.variantRepo.DeleteByID(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrVariantNotFound
	}

	return nil
}

func (s *VariantService) UploadVariantSource(ctx context.Context, firebaseUID string, variantID int64, files []source.UploadedFile) (string, error) {
	variant, _, err := s.requireVariantAccess(ctx, firebaseUID, variantID)
	if err != nil {
		return "", err
	}

	sourceRootURI, err := s.sourceStore.SaveVariantFiles(ctx, variantID, files)
	if err != nil {
		return "", err
	}

	variant.SourceRootURI = &sourceRootURI
	if err := s.variantRepo.Save(ctx, variant); err != nil {
		return "", err
	}

	return sourceRootURI, nil
}

func (s *VariantService) PrepareVariantSourceUpload(
	ctx context.Context,
	firebaseUID string,
	input PrepareVariantSourceUploadInput,
) (*source.UploadPlan, error) {
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, input.VariantID); err != nil {
		return nil, err
	}

	return s.sourceStore.PrepareVariantUpload(ctx, input.VariantID, input.Files)
}

func (s *VariantService) GetVariantWorkspace(ctx context.Context, firebaseUID string, variantID int64) (*VariantWorkspace, error) {
	detail, err := s.GetVariant(ctx, firebaseUID, variantID)
	if err != nil {
		return nil, err
	}

	files, err := s.variantRepo.ListFilesByVariantID(ctx, variantID)
	if err != nil {
		return nil, err
	}

	designGuide, err := s.variantRepo.FindDesignGuideByVariantID(ctx, variantID)
	if err != nil {
		return nil, err
	}

	nodes, err := s.variantRepo.ListNodesByVariantID(ctx, variantID)
	if err != nil {
		return nil, err
	}

	edges, err := s.variantRepo.ListEdgesByVariantID(ctx, variantID)
	if err != nil {
		return nil, err
	}

	workspace := &VariantWorkspace{
		Variant: detail.Variant,
		Creator: detail.Creator,
		Files:   files,
		Nodes:   nodes,
		Edges:   edges,
	}
	if designGuide != nil {
		workspace.DesignGuide = designGuide
	}

	return workspace, nil
}

func (s *VariantService) UpdateVariantDesignGuide(
	ctx context.Context,
	firebaseUID string,
	input UpdateVariantDesignGuideInput,
) (*entity.VariantDesignGuide, error) {
	guide, requester, err := s.requireVariantDesignGuideAccess(ctx, firebaseUID, input.ID)
	if err != nil {
		return nil, err
	}

	guide.Title = input.Title
	if input.Description == "" {
		guide.Description = nil
	} else {
		guide.Description = &input.Description
	}
	guide.Content = input.Content
	guide.Version++
	guide.CreatedBy = requester.ID

	if err := s.variantRepo.SaveDesignGuide(ctx, guide); err != nil {
		return nil, err
	}

	return guide, nil
}

func (s *VariantService) CreateGraphBuildJob(ctx context.Context, firebaseUID string, variantID int64) (*entity.GraphBuildJob, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, variantID); err != nil {
		return nil, err
	}

	job := &entity.GraphBuildJob{
		VariantID:   variantID,
		RequestedBy: requester.ID,
		Status:      entity.JobStatusQueued,
	}
	if err := s.variantRepo.CreateGraphBuildJob(ctx, job); err != nil {
		return nil, err
	}
	if s.jobDispatcher != nil {
		if err := s.jobDispatcher.DispatchGraphBuildJob(ctx, job.ID); err != nil {
			message := err.Error()
			job.Status = entity.JobStatusFailed
			job.ErrorMessage = &message
			_ = s.variantRepo.SaveGraphBuildJob(ctx, job)
			return nil, err
		}
	}

	return job, nil
}

func (s *VariantService) GetGraphBuildJob(ctx context.Context, firebaseUID string, id int64) (*entity.GraphBuildJob, error) {
	job, err := s.variantRepo.FindGraphBuildJobByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, ErrGraphBuildJobNotFound
	}
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, job.VariantID); err != nil {
		return nil, err
	}
	return job, nil
}

func (s *VariantService) CreateLayoutJob(
	ctx context.Context,
	firebaseUID string,
	input CreateLayoutJobInput,
) (*entity.LayoutJob, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, input.VariantID); err != nil {
		return nil, err
	}

	layoutType := entity.LayoutTypeGrid
	if input.LayoutType != "" {
		layoutType = entity.LayoutType(input.LayoutType)
	}

	job := &entity.LayoutJob{
		VariantID:   input.VariantID,
		RequestedBy: requester.ID,
		LayoutType:  layoutType,
		Status:      entity.JobStatusQueued,
	}
	if err := s.variantRepo.CreateLayoutJob(ctx, job); err != nil {
		return nil, err
	}
	if s.jobDispatcher != nil {
		if err := s.jobDispatcher.DispatchLayoutJob(ctx, job.ID); err != nil {
			message := err.Error()
			job.Status = entity.JobStatusFailed
			job.ErrorMessage = &message
			_ = s.variantRepo.SaveLayoutJob(ctx, job)
			return nil, err
		}
	}

	return job, nil
}

func (s *VariantService) GetLayoutJob(ctx context.Context, firebaseUID string, id int64) (*entity.LayoutJob, error) {
	job, err := s.variantRepo.FindLayoutJobByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if job == nil {
		return nil, ErrLayoutJobNotFound
	}
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, job.VariantID); err != nil {
		return nil, err
	}
	return job, nil
}

func (s *VariantService) BulkUpdateNodePositions(ctx context.Context, firebaseUID string, variantID int64, positions map[int64][2]float64) error {
	if _, _, err := s.requireVariantAccess(ctx, firebaseUID, variantID); err != nil {
		return err
	}
	return s.variantRepo.ApplyNodePositions(ctx, variantID, positions)
}

func (s *VariantService) requireUser(ctx context.Context, firebaseUID string) (*entity.User, error) {
	user, err := s.userRepository.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (s *VariantService) getVariantEntity(ctx context.Context, id int64) (*entity.Variant, error) {
	variant, err := s.variantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if variant == nil {
		return nil, ErrVariantNotFound
	}
	return variant, nil
}

func (s *VariantService) requireVariantAccess(ctx context.Context, firebaseUID string, variantID int64) (*entity.Variant, *entity.User, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}

	variant, err := s.getVariantEntity(ctx, variantID)
	if err != nil {
		return nil, nil, err
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

func (s *VariantService) requireVariantDesignGuideAccess(ctx context.Context, firebaseUID string, designGuideID int64) (*entity.VariantDesignGuide, *entity.User, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, nil, err
	}

	guide, err := s.variantRepo.FindDesignGuideByID(ctx, designGuideID)
	if err != nil {
		return nil, nil, err
	}
	if guide == nil {
		return nil, nil, ErrDesignGuideNotFound
	}

	variant, err := s.getVariantEntity(ctx, guide.VariantID)
	if err != nil {
		return nil, nil, err
	}

	hasAccess, err := s.projectRepo.HasAccess(ctx, variant.ProjectID, requester.ID)
	if err != nil {
		return nil, nil, err
	}
	if !hasAccess {
		return nil, nil, ErrForbidden
	}

	return guide, requester, nil
}

func (s *VariantService) attachVariantDetails(ctx context.Context, variants []entity.Variant) ([]VariantDetail, error) {
	if len(variants) == 0 {
		return []VariantDetail{}, nil
	}

	variantIDs := make([]int64, 0, len(variants))
	creatorIDs := make([]int64, 0, len(variants))
	for _, variant := range variants {
		variantIDs = append(variantIDs, variant.ID)
		creatorIDs = append(creatorIDs, variant.CreatedBy)
	}

	countByVariantID, err := s.variantRepo.CountNodesByVariantIDs(ctx, variantIDs)
	if err != nil {
		return nil, err
	}
	creatorByID, err := s.variantRepo.ListCreatorsByIDs(ctx, creatorIDs)
	if err != nil {
		return nil, err
	}

	details := make([]VariantDetail, 0, len(variants))
	for i := range variants {
		variant := variants[i]
		details = append(details, VariantDetail{
			Variant:   &variant,
			Creator:   creatorByID[variant.CreatedBy],
			NodeCount: countByVariantID[variant.ID],
		})
	}

	return details, nil
}

func (s *VariantService) initializeVariantDesignGuide(
	tx *gorm.DB,
	createdBy int64,
	variantID int64,
	baseDesignGuideID *int64,
	forkedFromVariantID *int64,
) error {
	var guide *entity.VariantDesignGuide

	if baseDesignGuideID != nil {
		var base entity.DesignGuide
		if err := tx.First(&base, *baseDesignGuideID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrDesignGuideNotFound
			}
			return err
		}

		guide = &entity.VariantDesignGuide{
			VariantID:         variantID,
			BaseDesignGuideID: &base.ID,
			Title:             base.Name,
			Description:       base.Description,
			Content:           base.Content,
			Version:           1,
			CreatedBy:         createdBy,
		}
	} else if forkedFromVariantID != nil {
		var parentGuide entity.VariantDesignGuide
		if err := tx.Where("variant_id = ?", *forkedFromVariantID).First(&parentGuide).Error; err == nil {
			guide = &entity.VariantDesignGuide{
				VariantID:         variantID,
				BaseDesignGuideID: parentGuide.BaseDesignGuideID,
				Title:             parentGuide.Title,
				Description:       parentGuide.Description,
				Content:           parentGuide.Content,
				Version:           parentGuide.Version,
				CreatedBy:         createdBy,
			}
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
	}

	if guide == nil {
		return nil
	}

	return tx.Create(guide).Error
}

func (s *VariantService) cloneVariantWorkspace(tx *gorm.DB, parentVariantID, variantID int64) error {
	var files []entity.VariantFile
	if err := tx.Where("variant_id = ?", parentVariantID).Order("id ASC").Find(&files).Error; err != nil {
		return err
	}

	fileIDMap := make(map[int64]int64, len(files))
	for _, file := range files {
		cloned := entity.VariantFile{
			VariantID:    variantID,
			Path:         file.Path,
			Language:     file.Language,
			NodeCount:    file.NodeCount,
			IsVisible:    file.IsVisible,
			DisplayOrder: file.DisplayOrder,
		}
		if err := tx.Create(&cloned).Error; err != nil {
			return err
		}
		fileIDMap[file.ID] = cloned.ID
	}

	var nodes []entity.Node
	if err := tx.Where("variant_id = ?", parentVariantID).Order("id ASC").Find(&nodes).Error; err != nil {
		return err
	}

	nodeIDMap := make(map[int64]int64, len(nodes))
	for _, node := range nodes {
		cloned := entity.Node{
			VariantID: variantID,
			Kind:      node.Kind,
			Title:     node.Title,
			Signature: node.Signature,
			Receiver:  node.Receiver,
			CodeText:  node.CodeText,
			PositionX: node.PositionX,
			PositionY: node.PositionY,
			Metadata:  node.Metadata,
		}
		if node.VariantFileID != nil {
			if newFileID, ok := fileIDMap[*node.VariantFileID]; ok {
				cloned.VariantFileID = &newFileID
			}
		}
		if err := tx.Create(&cloned).Error; err != nil {
			return err
		}
		nodeIDMap[node.ID] = cloned.ID
	}

	var edges []entity.Edge
	if err := tx.Where("variant_id = ?", parentVariantID).Order("id ASC").Find(&edges).Error; err != nil {
		return err
	}

	for _, edge := range edges {
		fromNodeID, okFrom := nodeIDMap[edge.FromNodeID]
		toNodeID, okTo := nodeIDMap[edge.ToNodeID]
		if !okFrom || !okTo {
			return fmt.Errorf("edge clone failed: node mapping missing for edge %d", edge.ID)
		}

		cloned := entity.Edge{
			VariantID:  variantID,
			FromNodeID: fromNodeID,
			ToNodeID:   toNodeID,
			Kind:       edge.Kind,
			Style:      edge.Style,
			Label:      edge.Label,
			Metadata:   edge.Metadata,
		}
		if err := tx.Create(&cloned).Error; err != nil {
			return err
		}
	}

	return nil
}
