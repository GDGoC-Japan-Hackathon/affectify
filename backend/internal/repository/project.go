package repository

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type ProjectRepository struct {
	db *gorm.DB
}

type ListProjectsFilter struct {
	UserID     int64
	Query      string
	OnlyOwned  bool
	OnlyJoined bool
}

type CreateProjectBundleInput struct {
	OwnerID     int64
	Name        string
	Description string
}

type CreateProjectBundleResult struct {
	Project *entity.Project
}

func NewProjectRepository(db *gorm.DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

func (r *ProjectRepository) ListAccessibleProjects(ctx context.Context, filter ListProjectsFilter) ([]entity.Project, error) {
	db := r.db.WithContext(ctx).Model(&entity.Project{})
	if filter.OnlyOwned {
		db = db.Where("projects.owner_id = ?", filter.UserID)
	} else if filter.OnlyJoined {
		db = db.
			Joins("JOIN project_members pm ON pm.project_id = projects.id").
			Where("pm.user_id = ? AND projects.owner_id <> ?", filter.UserID, filter.UserID)
	} else {
		db = db.
			Joins("LEFT JOIN project_members pm ON pm.project_id = projects.id").
			Where("projects.owner_id = ? OR pm.user_id = ?", filter.UserID, filter.UserID)
	}

	if filter.Query != "" {
		like := "%" + filter.Query + "%"
		db = db.Where("projects.name ILIKE ? OR COALESCE(projects.description, '') ILIKE ?", like, like)
	}

	var projects []entity.Project
	if err := db.
		Distinct("projects.*").
		Order("projects.updated_at DESC, projects.id DESC").
		Find(&projects).Error; err != nil {
		return nil, err
	}

	return projects, nil
}

func (r *ProjectRepository) FindByID(ctx context.Context, id int64) (*entity.Project, error) {
	var project entity.Project
	err := r.db.WithContext(ctx).First(&project, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *ProjectRepository) Save(ctx context.Context, project *entity.Project) error {
	return r.db.WithContext(ctx).Save(project).Error
}

func (r *ProjectRepository) DeleteByID(ctx context.Context, id int64) (bool, error) {
	result := r.db.WithContext(ctx).Delete(&entity.Project{}, id)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *ProjectRepository) HasAccess(ctx context.Context, projectID, userID int64) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&entity.Project{}).
		Joins("LEFT JOIN project_members pm ON pm.project_id = projects.id").
		Where("projects.id = ? AND (projects.owner_id = ? OR pm.user_id = ?)", projectID, userID, userID).
		Distinct("projects.id").
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *ProjectRepository) IsOwner(ctx context.Context, projectID, userID int64) (bool, error) {
	var count int64
	if err := r.db.WithContext(ctx).
		Model(&entity.Project{}).
		Where("id = ? AND owner_id = ?", projectID, userID).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *ProjectRepository) ListMembersByProjectIDs(ctx context.Context, projectIDs []int64) ([]entity.ProjectMember, error) {
	if len(projectIDs) == 0 {
		return []entity.ProjectMember{}, nil
	}

	var members []entity.ProjectMember
	if err := r.db.WithContext(ctx).
		Where("project_id IN ?", projectIDs).
		Order("joined_at ASC, id ASC").
		Find(&members).Error; err != nil {
		return nil, err
	}
	return members, nil
}

func (r *ProjectRepository) ListUsersByIDs(ctx context.Context, userIDs []int64) (map[int64]*entity.User, error) {
	if len(userIDs) == 0 {
		return map[int64]*entity.User{}, nil
	}

	var users []entity.User
	if err := r.db.WithContext(ctx).
		Where("id IN ?", userIDs).
		Find(&users).Error; err != nil {
		return nil, err
	}

	result := make(map[int64]*entity.User, len(users))
	for i := range users {
		user := users[i]
		result[user.ID] = &user
	}
	return result, nil
}

func (r *ProjectRepository) CreateProjectBundle(ctx context.Context, input CreateProjectBundleInput) (*CreateProjectBundleResult, error) {
	var result CreateProjectBundleResult

	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var description *string
		if input.Description != "" {
			description = &input.Description
		}

		project := &entity.Project{
			Name:        input.Name,
			Description: description,
			OwnerID:     input.OwnerID,
		}
		if err := tx.Create(project).Error; err != nil {
			return err
		}

		member := &entity.ProjectMember{
			ProjectID: project.ID,
			UserID:    input.OwnerID,
			AddedBy:   input.OwnerID,
			Role:      entity.ProjectMemberRoleAdmin,
		}
		if err := tx.Create(member).Error; err != nil {
			return err
		}

		result.Project = project
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("create project bundle: %w", err)
	}

	return &result, nil
}
