package config

type FirebaseConfig struct {
	ProjectID       string
	CredentialsFile string
	CredentialsJSON string
}

func LoadFirebaseConfig() FirebaseConfig {
	return FirebaseConfig{
		ProjectID:       GetEnv("FIREBASE_PROJECT_ID", ""),
		CredentialsFile: GetEnv("FIREBASE_CREDENTIALS_FILE", ""),
		CredentialsJSON: GetEnv("FIREBASE_CREDENTIALS_JSON", ""),
	}
}
