package service

import (
	"context"
	"errors"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"gorm.io/gorm"
)

var ErrForbidden = errors.New("forbidden")

type ProjectMemberDetail struct {
	Member  entity.ProjectMember
	User    *entity.User
	Inviter *entity.User
}

type ProjectDetail struct {
	Project       *entity.Project
	Owner         *entity.User
	Variants      []VariantDetail
	Members       []ProjectMemberDetail
	NodeCount     int32
	AnalysisScore *int32
	MainVariantID *int64
}

type ListProjectsInput struct {
	Query           string
	OnlyOwned       bool
	OnlyJoined      bool
	IncludeVariants bool
	IncludeMembers  bool
}

type GetProjectInput struct {
	ID              int64
	IncludeVariants bool
	IncludeMembers  bool
}

type CreateProjectInput struct {
	Name        string
	Description string
}

type UpdateProjectInput struct {
	ID          int64
	Name        string
	Description string
}

type ProjectService struct {
	projectRepo *repository.ProjectRepository
	userRepo    *repository.UserRepository
	variantRepo *repository.VariantRepository
}

func NewProjectService(db *gorm.DB, userRepo *repository.UserRepository) *ProjectService {
	return &ProjectService{
		projectRepo: repository.NewProjectRepository(db),
		userRepo:    userRepo,
		variantRepo: repository.NewVariantRepository(db),
	}
}

func (s *ProjectService) ListProjects(ctx context.Context, firebaseUID string, input ListProjectsInput) ([]ProjectDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	projects, err := s.projectRepo.ListAccessibleProjects(ctx, repository.ListProjectsFilter{
		UserID:     requester.ID,
		Query:      input.Query,
		OnlyOwned:  input.OnlyOwned,
		OnlyJoined: input.OnlyJoined,
	})
	if err != nil {
		return nil, err
	}

	return s.attachProjectDetails(ctx, projects, input.IncludeVariants, input.IncludeMembers)
}

func (s *ProjectService) GetProject(ctx context.Context, firebaseUID string, input GetProjectInput) (*ProjectDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	hasAccess, err := s.projectRepo.HasAccess(ctx, input.ID, requester.ID)
	if err != nil {
		return nil, err
	}
	if !hasAccess {
		return nil, ErrForbidden
	}

	project, err := s.projectRepo.FindByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	details, err := s.attachProjectDetails(ctx, []entity.Project{*project}, input.IncludeVariants, input.IncludeMembers)
	if err != nil {
		return nil, err
	}
	if len(details) == 0 {
		return nil, ErrProjectNotFound
	}
	return &details[0], nil
}

func (s *ProjectService) CreateProject(ctx context.Context, firebaseUID string, input CreateProjectInput) (*ProjectDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	bundle, err := s.projectRepo.CreateProjectBundle(ctx, repository.CreateProjectBundleInput{
		OwnerID:     requester.ID,
		Name:        input.Name,
		Description: input.Description,
	})
	if err != nil {
		return nil, err
	}

	return s.GetProject(ctx, firebaseUID, GetProjectInput{
		ID:              bundle.Project.ID,
		IncludeVariants: true,
		IncludeMembers:  true,
	})
}

func (s *ProjectService) UpdateProject(ctx context.Context, firebaseUID string, input UpdateProjectInput) (*ProjectDetail, error) {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}

	isOwner, err := s.projectRepo.IsOwner(ctx, input.ID, requester.ID)
	if err != nil {
		return nil, err
	}
	if !isOwner {
		return nil, ErrForbidden
	}

	project, err := s.projectRepo.FindByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, ErrProjectNotFound
	}

	project.Name = input.Name
	if input.Description == "" {
		project.Description = nil
	} else {
		project.Description = &input.Description
	}
	if err := s.projectRepo.Save(ctx, project); err != nil {
		return nil, err
	}

	return s.GetProject(ctx, firebaseUID, GetProjectInput{
		ID:              input.ID,
		IncludeVariants: true,
		IncludeMembers:  true,
	})
}

func (s *ProjectService) DeleteProject(ctx context.Context, firebaseUID string, id int64) error {
	requester, err := s.requireUser(ctx, firebaseUID)
	if err != nil {
		return err
	}

	isOwner, err := s.projectRepo.IsOwner(ctx, id, requester.ID)
	if err != nil {
		return err
	}
	if !isOwner {
		return ErrForbidden
	}

	deleted, err := s.projectRepo.DeleteByID(ctx, id)
	if err != nil {
		return err
	}
	if !deleted {
		return ErrProjectNotFound
	}
	return nil
}

func (s *ProjectService) requireUser(ctx context.Context, firebaseUID string) (*entity.User, error) {
	user, err := s.userRepo.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *ProjectService) attachProjectDetails(ctx context.Context, projects []entity.Project, includeVariants bool, includeMembers bool) ([]ProjectDetail, error) {
	if len(projects) == 0 {
		return []ProjectDetail{}, nil
	}

	projectIDs := make([]int64, 0, len(projects))
	ownerIDs := make([]int64, 0, len(projects))
	for _, project := range projects {
		projectIDs = append(projectIDs, project.ID)
		ownerIDs = append(ownerIDs, project.OwnerID)
	}

	ownerByID, err := s.projectRepo.ListUsersByIDs(ctx, ownerIDs)
	if err != nil {
		return nil, err
	}

	variants, err := s.variantRepo.ListByProjectIDs(ctx, projectIDs)
	if err != nil {
		return nil, err
	}
	variantDetails, err := s.attachVariantDetails(ctx, variants)
	if err != nil {
		return nil, err
	}
	variantDetailsByProjectID := make(map[int64][]VariantDetail)
	nodeCountByProjectID := make(map[int64]int32)
	analysisScoreByProjectID := make(map[int64]*int32)
	mainVariantIDByProjectID := make(map[int64]*int64)
	for i := range variantDetails {
		detail := variantDetails[i]
		variantDetailsByProjectID[detail.Variant.ProjectID] = append(variantDetailsByProjectID[detail.Variant.ProjectID], detail)
		nodeCountByProjectID[detail.Variant.ProjectID] += detail.NodeCount
		if detail.Variant.IsMain {
			mainVariantID := detail.Variant.ID
			mainVariantIDByProjectID[detail.Variant.ProjectID] = &mainVariantID
			if detail.Variant.AnalysisScore != nil {
				score := *detail.Variant.AnalysisScore
				analysisScoreByProjectID[detail.Variant.ProjectID] = &score
			}
		} else if analysisScoreByProjectID[detail.Variant.ProjectID] == nil && detail.Variant.AnalysisScore != nil {
			score := *detail.Variant.AnalysisScore
			analysisScoreByProjectID[detail.Variant.ProjectID] = &score
		}
	}

	memberDetailsByProjectID := map[int64][]ProjectMemberDetail{}
	if includeMembers {
		members, err := s.projectRepo.ListMembersByProjectIDs(ctx, projectIDs)
		if err != nil {
			return nil, err
		}

		userIDs := make([]int64, 0, len(members)*2)
		for _, member := range members {
			userIDs = append(userIDs, member.UserID, member.InvitedBy)
		}
		userByID, err := s.projectRepo.ListUsersByIDs(ctx, userIDs)
		if err != nil {
			return nil, err
		}

		for i := range members {
			member := members[i]
			memberDetailsByProjectID[member.ProjectID] = append(memberDetailsByProjectID[member.ProjectID], ProjectMemberDetail{
				Member:  member,
				User:    userByID[member.UserID],
				Inviter: userByID[member.InvitedBy],
			})
		}
	}

	details := make([]ProjectDetail, 0, len(projects))
	for i := range projects {
		project := projects[i]
		detail := ProjectDetail{
			Project:       &project,
			Owner:         ownerByID[project.OwnerID],
			NodeCount:     nodeCountByProjectID[project.ID],
			AnalysisScore: analysisScoreByProjectID[project.ID],
			MainVariantID: mainVariantIDByProjectID[project.ID],
		}
		if includeVariants {
			detail.Variants = variantDetailsByProjectID[project.ID]
		}
		if includeMembers {
			detail.Members = memberDetailsByProjectID[project.ID]
		}
		details = append(details, detail)
	}

	return details, nil
}

func (s *ProjectService) attachVariantDetails(ctx context.Context, variants []entity.Variant) ([]VariantDetail, error) {
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
