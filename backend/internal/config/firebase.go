package config

type FirebaseConfig struct {
	ProjectID       string
	CredentialsFile string
}

func LoadFirebaseConfig() FirebaseConfig {
	return FirebaseConfig{
		ProjectID:       GetEnv("FIREBASE_PROJECT_ID", ""),
		CredentialsFile: GetEnv("FIREBASE_CREDENTIALS_FILE", ""),
	}
}
