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

type AnalysisServiceHandler struct {
	apiv1connect.UnimplementedAnalysisServiceHandler
	analysisService *service.AnalysisService
}

func NewAnalysisServiceHandler(analysisService *service.AnalysisService) *AnalysisServiceHandler {
	return &AnalysisServiceHandler{analysisService: analysisService}
}

func (h *AnalysisServiceHandler) RunAnalysis(
	ctx context.Context,
	req *connect.Request[apiv1.RunAnalysisRequest],
) (*connect.Response[apiv1.RunAnalysisResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	report, err := h.analysisService.RunAnalysis(ctx, identity.UID, req.Msg.VariantId)
	if err != nil {
		return nil, mapAnalysisError(err)
	}

	return connect.NewResponse(&apiv1.RunAnalysisResponse{
		Report: toProtoAnalysisReport(report),
	}), nil
}

func (h *AnalysisServiceHandler) GetAnalysisReport(
	ctx context.Context,
	req *connect.Request[apiv1.GetAnalysisReportRequest],
) (*connect.Response[apiv1.GetAnalysisReportResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	report, err := h.analysisService.GetAnalysisReport(ctx, identity.UID, req.Msg.VariantId)
	if err != nil {
		return nil, mapAnalysisError(err)
	}

	return connect.NewResponse(&apiv1.GetAnalysisReportResponse{
		Report: toProtoAnalysisReport(report),
	}), nil
}

func mapAnalysisError(err error) error {
	switch {
	case errors.Is(err, service.ErrAnalysisReportNotFound),
		errors.Is(err, service.ErrVariantNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, service.ErrUserNotFound):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case errors.Is(err, service.ErrForbidden):
		return connect.NewError(connect.CodePermissionDenied, err)
	default:
		return connect.NewError(connect.CodeInternal, err)
	}
}
