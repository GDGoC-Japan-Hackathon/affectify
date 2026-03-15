package service

import (
	"context"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/entity"
)

type HealthService struct{}

func NewHealthService() *HealthService {
	return &HealthService{}
}

func (s *HealthService) Check(ctx context.Context) entity.HealthStatus {
	return entity.HealthStatus{
		Status: "ok",
	}
}
