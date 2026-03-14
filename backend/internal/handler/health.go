package handler

import (
	"context"

	connect "connectrpc.com/connect"

	apiv1 "github.com/siraiyuto/affectify/backend/gen/api/v1"
)

type HealthServiceHandler struct{}

func (h *HealthServiceHandler) HealthCheck(
	ctx context.Context,
	req *connect.Request[apiv1.HealthCheckRequest],
) (*connect.Response[apiv1.HealthCheckResponse], error) {
	return connect.NewResponse(&apiv1.HealthCheckResponse{
		Status: "ok",
	}), nil
}
