package config

type JobRuntimeConfig struct {
	ProjectID         string
	Region            string
	GraphBuildJobName string
	LayoutJobName     string
	ReviewJobName     string
	SourceBucketName  string
}

func LoadJobRuntimeConfig() JobRuntimeConfig {
	return JobRuntimeConfig{
		ProjectID:         GetEnv("GCP_PROJECT_ID", ""),
		Region:            GetEnv("GCP_REGION", ""),
		GraphBuildJobName: GetEnv("GRAPH_BUILD_JOB_NAME", ""),
		LayoutJobName:     GetEnv("LAYOUT_JOB_NAME", ""),
		ReviewJobName:     GetEnv("REVIEW_JOB_NAME", ""),
		SourceBucketName:  GetEnv("SOURCE_BUCKET_NAME", ""),
	}
}
