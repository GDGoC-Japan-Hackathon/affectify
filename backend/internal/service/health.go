package service

import "context"

type HealthStatus struct {
	Status string `json:"status"`
}

type HealthService struct{}

func NewHealthService() *HealthService {
	return &HealthService{}
}

func (s *HealthService) Check(ctx context.Context) HealthStatus {
	return HealthStatus{Status: "ok"}
}
