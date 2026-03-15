package handler

import (
	"context"

	connect "connectrpc.com/connect"

	apiv1 "github.com/siraiyuto/affectify/backend/gen/api/v1"
	"github.com/siraiyuto/affectify/backend/internal/service"
)

type HealthServiceHandler struct {
	healthService *service.HealthService
}

func NewHealthServiceHandler(healthService *service.HealthService) *HealthServiceHandler {
	return &HealthServiceHandler{
		healthService: healthService,
	}
}

func (h *HealthServiceHandler) HealthCheck(
	ctx context.Context,
	req *connect.Request[apiv1.HealthCheckRequest],
) (*connect.Response[apiv1.HealthCheckResponse], error) {
	status := h.healthService.Check(ctx)

	return connect.NewResponse(&apiv1.HealthCheckResponse{
		Status: status.Status,
	}), nil
}
