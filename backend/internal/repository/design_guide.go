package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type DesignGuideRepository struct {
	db *gorm.DB
}

type ListDesignGuidesFilter struct {
	UserID        int64
	Query         string
	CreatedByMe   bool
	LikedByMe     bool
	Visibility    string
	OnlyTemplates bool
}

func NewDesignGuideRepository(db *gorm.DB) *DesignGuideRepository {
	return &DesignGuideRepository{db: db}
}

func (r *DesignGuideRepository) List(ctx context.Context, filter ListDesignGuidesFilter) ([]entity.DesignGuide, error) {
	db := r.db.WithContext(ctx).Model(&entity.DesignGuide{})

	if filter.LikedByMe {
		db = db.Joins(
			"JOIN design_guide_likes dgl ON dgl.design_guide_id = design_guides.id AND dgl.user_id = ?",
			filter.UserID,
		)
	} else if filter.CreatedByMe {
		db = db.Where("design_guides.created_by = ?", filter.UserID)
	} else {
		db = db.Where("design_guides.created_by = ? OR design_guides.visibility = ?", filter.UserID, entity.DesignGuideVisibilityPublic)
	}

	if filter.Query != "" {
		like := "%" + filter.Query + "%"
		db = db.Where("design_guides.name ILIKE ? OR COALESCE(design_guides.description, '') ILIKE ?", like, like)
	}
	if filter.Visibility != "" {
		db = db.Where("design_guides.visibility = ?", filter.Visibility)
	}
	if filter.OnlyTemplates {
		db = db.Where("design_guides.is_template = ?", true)
	}

	var guides []entity.DesignGuide
	if err := db.
		Distinct("design_guides.*").
		Order("design_guides.updated_at DESC, design_guides.id DESC").
		Find(&guides).Error; err != nil {
		return nil, err
	}

	return guides, nil
}

func (r *DesignGuideRepository) FindByID(ctx context.Context, id int64) (*entity.DesignGuide, error) {
	var guide entity.DesignGuide
	err := r.db.WithContext(ctx).First(&guide, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &guide, nil
}

func (r *DesignGuideRepository) Save(ctx context.Context, guide *entity.DesignGuide) error {
	return r.db.WithContext(ctx).Save(guide).Error
}

func (r *DesignGuideRepository) Create(ctx context.Context, guide *entity.DesignGuide) error {
	return r.db.WithContext(ctx).Create(guide).Error
}

func (r *DesignGuideRepository) DeleteByID(ctx context.Context, id int64) (bool, error) {
	result := r.db.WithContext(ctx).Delete(&entity.DesignGuide{}, id)
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected > 0, nil
}

func (r *DesignGuideRepository) CountLikesByGuideIDs(ctx context.Context, guideIDs []int64) (map[int64]int32, error) {
	if len(guideIDs) == 0 {
		return map[int64]int32{}, nil
	}

	type row struct {
		DesignGuideID int64
		Count         int64
	}
	var rows []row
	if err := r.db.WithContext(ctx).
		Model(&entity.DesignGuideLike{}).
		Select("design_guide_id, COUNT(*) AS count").
		Where("design_guide_id IN ?", guideIDs).
		Group("design_guide_id").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make(map[int64]int32, len(rows))
	for _, row := range rows {
		result[row.DesignGuideID] = int32(row.Count)
	}
	return result, nil
}

func (r *DesignGuideRepository) FindLikedGuideIDsByUser(ctx context.Context, userID int64, guideIDs []int64) (map[int64]bool, error) {
	if len(guideIDs) == 0 {
		return map[int64]bool{}, nil
	}

	var likes []entity.DesignGuideLike
	if err := r.db.WithContext(ctx).
		Where("user_id = ? AND design_guide_id IN ?", userID, guideIDs).
		Find(&likes).Error; err != nil {
		return nil, err
	}

	result := make(map[int64]bool, len(likes))
	for _, like := range likes {
		result[like.DesignGuideID] = true
	}
	return result, nil
}

func (r *DesignGuideRepository) FindCreatorsByIDs(ctx context.Context, userIDs []int64) (map[int64]*entity.User, error) {
	return NewProjectRepository(r.db).ListUsersByIDs(ctx, userIDs)
}

func (r *DesignGuideRepository) FindLike(ctx context.Context, designGuideID, userID int64) (*entity.DesignGuideLike, error) {
	var like entity.DesignGuideLike
	err := r.db.WithContext(ctx).
		Where("design_guide_id = ? AND user_id = ?", designGuideID, userID).
		First(&like).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &like, nil
}

func (r *DesignGuideRepository) CreateLike(ctx context.Context, like *entity.DesignGuideLike) error {
	return r.db.WithContext(ctx).Create(like).Error
}

func (r *DesignGuideRepository) DeleteLikeByID(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Delete(&entity.DesignGuideLike{}, id).Error
}

