package config

type SourceStorageConfig struct {
	BucketName   string
	LocalRootDir string
}

func LoadSourceStorageConfig() SourceStorageConfig {
	return SourceStorageConfig{
		BucketName:   GetEnv("SOURCE_BUCKET_NAME", ""),
		LocalRootDir: GetEnv("LOCAL_SOURCE_ROOT_DIR", ""),
	}
}
