package service

import (
	"context"
)

type HealthService struct{}

type HealthStatus struct {
	Status string
}

func NewHealthService() *HealthService {
	return &HealthService{}
}

func (s *HealthService) Check(ctx context.Context) HealthStatus {
	return HealthStatus{
		Status: "ok",
	}
}
