package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type UserRepository struct {
	db *gorm.DB
}

type UpsertUserParams struct {
	FirebaseUID string
	Email       string
	Name        string
	AvatarURL   string
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByFirebaseUID(ctx context.Context, firebaseUID string) (*entity.User, error) {
	var user entity.User
	err := r.db.WithContext(ctx).
		Where("firebase_uid = ?", firebaseUID).
		First(&user).
		Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *UserRepository) UpsertByFirebaseUID(ctx context.Context, params UpsertUserParams) (*entity.User, bool, error) {
	now := time.Now()
	existing, err := r.FindByFirebaseUID(ctx, params.FirebaseUID)
	if err != nil {
		return nil, false, err
	}

	name := params.Name
	if name == "" {
		name = params.Email
	}

	var avatarURL *string
	if params.AvatarURL != "" {
		avatarURL = &params.AvatarURL
	}

	if existing == nil {
		// 初回ログイン時は Firebase の claims から内部ユーザーを新規作成する。
		user := &entity.User{
			FirebaseUID: params.FirebaseUID,
			Email:       params.Email,
			Name:        name,
			AvatarURL:   avatarURL,
			LastLoginAt: &now,
		}
		if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
			return nil, false, err
		}

		return user, true, nil
	}

	// 2回目以降のログインでは認証基盤側のプロフィールで更新する。
	existing.Email = params.Email
	existing.Name = name
	existing.AvatarURL = avatarURL
	existing.LastLoginAt = &now
	if err := r.db.WithContext(ctx).Save(existing).Error; err != nil {
		return nil, false, err
	}

	return existing, false, nil
}
