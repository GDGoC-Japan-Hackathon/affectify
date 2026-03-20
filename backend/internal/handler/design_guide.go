package handler

import (
	"context"
	"errors"

	connect "connectrpc.com/connect"

	apiv1 "github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
)

type DesignGuideServiceHandler struct {
	apiv1connect.UnimplementedDesignGuideServiceHandler
	designGuideService *service.DesignGuideService
}

func NewDesignGuideServiceHandler(designGuideService *service.DesignGuideService) *DesignGuideServiceHandler {
	return &DesignGuideServiceHandler{designGuideService: designGuideService}
}

func (h *DesignGuideServiceHandler) ListDesignGuides(
	ctx context.Context,
	req *connect.Request[apiv1.ListDesignGuidesRequest],
) (*connect.Response[apiv1.ListDesignGuidesResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	guides, err := h.designGuideService.ListDesignGuides(ctx, identity.UID, service.ListDesignGuidesInput{
		Query:         req.Msg.Query,
		CreatedByMe:   req.Msg.CreatedByMe,
		LikedByMe:     req.Msg.LikedByMe,
		Visibility:    req.Msg.Visibility,
		OnlyTemplates: req.Msg.OnlyTemplates,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	result := make([]*apiv1.DesignGuideSummary, 0, len(guides))
	for i := range guides {
		result = append(result, toProtoDesignGuideSummary(&guides[i]))
	}
	return connect.NewResponse(&apiv1.ListDesignGuidesResponse{DesignGuides: result}), nil
}

func (h *DesignGuideServiceHandler) GetDesignGuide(
	ctx context.Context,
	req *connect.Request[apiv1.GetDesignGuideRequest],
) (*connect.Response[apiv1.GetDesignGuideResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	guide, err := h.designGuideService.GetDesignGuide(ctx, identity.UID, req.Msg.Id)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDesignGuideNotFound):
			return nil, connect.NewError(connect.CodeNotFound, err)
		case errors.Is(err, service.ErrDesignGuideForbidden):
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		default:
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&apiv1.GetDesignGuideResponse{
		DesignGuide: toProtoDesignGuide(guide),
	}), nil
}

func (h *DesignGuideServiceHandler) CreateDesignGuide(
	ctx context.Context,
	req *connect.Request[apiv1.CreateDesignGuideRequest],
) (*connect.Response[apiv1.CreateDesignGuideResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	guide, err := h.designGuideService.CreateDesignGuide(ctx, identity.UID, service.CreateDesignGuideInput{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
		Content:     req.Msg.Content,
		Visibility:  req.Msg.Visibility,
		IsTemplate:  req.Msg.IsTemplate,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&apiv1.CreateDesignGuideResponse{
		DesignGuide: toProtoDesignGuide(guide),
	}), nil
}

func (h *DesignGuideServiceHandler) UpdateDesignGuide(
	ctx context.Context,
	req *connect.Request[apiv1.UpdateDesignGuideRequest],
) (*connect.Response[apiv1.UpdateDesignGuideResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	guide, err := h.designGuideService.UpdateDesignGuide(ctx, identity.UID, service.UpdateDesignGuideInput{
		ID:          req.Msg.Id,
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
		Content:     req.Msg.Content,
		Visibility:  req.Msg.Visibility,
		IsTemplate:  req.Msg.IsTemplate,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrDesignGuideNotFound):
			return nil, connect.NewError(connect.CodeNotFound, err)
		case errors.Is(err, service.ErrDesignGuideForbidden):
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		default:
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&apiv1.UpdateDesignGuideResponse{
		DesignGuide: toProtoDesignGuide(guide),
	}), nil
}

func (h *DesignGuideServiceHandler) DeleteDesignGuide(
	ctx context.Context,
	req *connect.Request[apiv1.DeleteDesignGuideRequest],
) (*connect.Response[apiv1.DeleteDesignGuideResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	if err := h.designGuideService.DeleteDesignGuide(ctx, identity.UID, req.Msg.Id); err != nil {
		switch {
		case errors.Is(err, service.ErrDesignGuideNotFound):
			return nil, connect.NewError(connect.CodeNotFound, err)
		case errors.Is(err, service.ErrDesignGuideForbidden):
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		default:
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}
	return connect.NewResponse(&apiv1.DeleteDesignGuideResponse{}), nil
}

func (h *DesignGuideServiceHandler) LikeDesignGuide(
	ctx context.Context,
	req *connect.Request[apiv1.LikeDesignGuideRequest],
) (*connect.Response[apiv1.LikeDesignGuideResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}
	if err := h.designGuideService.LikeDesignGuide(ctx, identity.UID, req.Msg.DesignGuideId); err != nil {
		if errors.Is(err, service.ErrDesignGuideNotFound) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&apiv1.LikeDesignGuideResponse{}), nil
}

func (h *DesignGuideServiceHandler) UnlikeDesignGuide(
	ctx context.Context,
	req *connect.Request[apiv1.UnlikeDesignGuideRequest],
) (*connect.Response[apiv1.UnlikeDesignGuideResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}
	if err := h.designGuideService.UnlikeDesignGuide(ctx, identity.UID, req.Msg.DesignGuideId); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(&apiv1.UnlikeDesignGuideResponse{}), nil
}
