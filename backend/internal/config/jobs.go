package config

import "os"

type JobRuntimeConfig struct {
	ProjectID         string
	Region            string
	GraphBuildJobName string
	LayoutJobName     string
	ReviewJobName     string
	SourceBucketName  string
}

func LoadJobRuntimeConfig() JobRuntimeConfig {
	projectID := os.Getenv("GCP_PROJECT_ID")
	if projectID == "" {
		projectID = GetEnv("FIREBASE_PROJECT_ID", "")
	}

	return JobRuntimeConfig{
		ProjectID:         projectID,
		Region:            GetEnv("GCP_REGION", ""),
		GraphBuildJobName: GetEnv("GRAPH_BUILD_JOB_NAME", ""),
		LayoutJobName:     GetEnv("LAYOUT_JOB_NAME", ""),
		ReviewJobName:     GetEnv("REVIEW_JOB_NAME", ""),
		SourceBucketName:  GetEnv("SOURCE_BUCKET_NAME", ""),
	}
}
