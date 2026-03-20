package config

type VertexAIConfig struct {
	ProjectID string
	Region    string
	Model     string
}

func (c VertexAIConfig) Enabled() bool {
	return c.ProjectID != "" && c.Region != "" && c.Model != ""
}

func LoadVertexAIConfig() VertexAIConfig {
	return VertexAIConfig{
		ProjectID: GetEnv("GCP_PROJECT_ID", ""),
		Region:    GetEnv("GCP_REGION", ""),
		Model:     GetEnv("VERTEX_AI_MODEL", ""),
	}
}
