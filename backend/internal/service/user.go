package service

import (
	"context"
	"errors"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

var ErrUserNotFound = errors.New("user not found")

type SyncMeInput struct {
	FirebaseUID string
	Email       string
	Name        string
	AvatarURL   string
}

type UserService struct {
	userRepository *repository.UserRepository
}

func NewUserService(userRepository *repository.UserRepository) *UserService {
	return &UserService{userRepository: userRepository}
}

func (s *UserService) GetMe(ctx context.Context, firebaseUID string) (*entity.User, error) {
	user, err := s.userRepository.FindByFirebaseUID(ctx, firebaseUID)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, ErrUserNotFound
	}

	return user, nil
}

func (s *UserService) SyncMe(ctx context.Context, input SyncMeInput) (*entity.User, bool, error) {
	return s.userRepository.UpsertByFirebaseUID(ctx, repository.UpsertUserParams{
		FirebaseUID: input.FirebaseUID,
		Email:       input.Email,
		Name:        input.Name,
		AvatarURL:   input.AvatarURL,
	})
}
