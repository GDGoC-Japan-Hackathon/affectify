package handler

import (
	"context"
	"errors"

	connect "connectrpc.com/connect"

	apiv1 "github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
)

type UserServiceHandler struct {
	userService *service.UserService
}

func NewUserServiceHandler(userService *service.UserService) *UserServiceHandler {
	return &UserServiceHandler{userService: userService}
}

func (h *UserServiceHandler) GetMe(
	ctx context.Context,
	req *connect.Request[apiv1.GetMeRequest],
) (*connect.Response[apiv1.GetMeResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	user, err := h.userService.GetMe(ctx, identity.UID)
	if err != nil {
		if errors.Is(err, service.ErrUserNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}

		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&apiv1.GetMeResponse{
		User: toProtoUser(user),
	}), nil
}

func (h *UserServiceHandler) SyncMe(
	ctx context.Context,
	req *connect.Request[apiv1.SyncMeRequest],
) (*connect.Response[apiv1.SyncMeResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	// SyncMe は Firebase Auth とアプリ内 users テーブルをつなぐ入口。
	user, created, err := h.userService.SyncMe(ctx, service.SyncMeInput{
		FirebaseUID: identity.UID,
		Email:       identity.Email,
		Name:        identity.Name,
		AvatarURL:   identity.AvatarURL,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&apiv1.SyncMeResponse{
		User:    toProtoUser(user),
		Created: created,
	}), nil
}

func toProtoUser(user *entity.User) *apiv1.User {
	if user == nil {
		return nil
	}

	var avatarURL string
	if user.AvatarURL != nil {
		avatarURL = *user.AvatarURL
	}

	return &apiv1.User{
		Id:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarUrl: avatarURL,
	}
}
