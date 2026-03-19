package service

import (
	"context"
	"fmt"

	run "google.golang.org/api/run/v2"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
)

type JobDispatcher interface {
	DispatchGraphBuildJob(ctx context.Context, jobID int64) error
	DispatchLayoutJob(ctx context.Context, jobID int64) error
	DispatchReviewJob(ctx context.Context, jobID int64) error
}

type NoopJobDispatcher struct{}

func (NoopJobDispatcher) DispatchGraphBuildJob(context.Context, int64) error { return nil }
func (NoopJobDispatcher) DispatchLayoutJob(context.Context, int64) error     { return nil }
func (NoopJobDispatcher) DispatchReviewJob(context.Context, int64) error     { return nil }

type CloudRunJobDispatcher struct {
	projectID         string
	region            string
	graphBuildJobName string
	layoutJobName     string
	reviewJobName     string
}

func NewJobDispatcher(cfg config.JobRuntimeConfig) JobDispatcher {
	if cfg.ProjectID == "" || cfg.Region == "" {
		return NoopJobDispatcher{}
	}

	return &CloudRunJobDispatcher{
		projectID:         cfg.ProjectID,
		region:            cfg.Region,
		graphBuildJobName: cfg.GraphBuildJobName,
		layoutJobName:     cfg.LayoutJobName,
		reviewJobName:     cfg.ReviewJobName,
	}
}

func (d *CloudRunJobDispatcher) DispatchGraphBuildJob(ctx context.Context, jobID int64) error {
	if d.graphBuildJobName == "" {
		return nil
	}
	return d.runJob(ctx, d.graphBuildJobName, jobID)
}

func (d *CloudRunJobDispatcher) DispatchLayoutJob(ctx context.Context, jobID int64) error {
	if d.layoutJobName == "" {
		return nil
	}
	return d.runJob(ctx, d.layoutJobName, jobID)
}

func (d *CloudRunJobDispatcher) DispatchReviewJob(ctx context.Context, jobID int64) error {
	if d.reviewJobName == "" {
		return nil
	}
	return d.runJob(ctx, d.reviewJobName, jobID)
}

func (d *CloudRunJobDispatcher) runJob(ctx context.Context, jobName string, jobID int64) error {
	service, err := run.NewService(ctx)
	if err != nil {
		return err
	}

	resourceName := fmt.Sprintf("projects/%s/locations/%s/jobs/%s", d.projectID, d.region, jobName)
	request := &run.GoogleCloudRunV2RunJobRequest{
		Overrides: &run.GoogleCloudRunV2Overrides{
			ContainerOverrides: []*run.GoogleCloudRunV2ContainerOverride{
				{
					Env: []*run.GoogleCloudRunV2EnvVar{
						{Name: "JOB_ID", Value: fmt.Sprintf("%d", jobID)},
					},
				},
			},
		},
	}

	_, err = service.Projects.Locations.Jobs.Run(resourceName, request).Context(ctx).Do()
	return err
}
