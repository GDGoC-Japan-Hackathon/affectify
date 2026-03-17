package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

const (
	defaultDBHost    = "localhost"
	defaultDBPort    = "5432"
	defaultDBUser    = "postgres"
	defaultDBName    = "affectify"
	defaultDBSSLMode = "disable"
)

type DatabaseConfig struct {
	URL                    string
	Host                   string
	Port                   string
	User                   string
	Password               string
	Name                   string
	SSLMode                string
	InstanceConnectionName string
}

func LoadDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		URL:                    os.Getenv("DATABASE_URL"),
		Host:                   GetEnv("DB_HOST", defaultDBHost),
		Port:                   GetEnv("DB_PORT", defaultDBPort),
		User:                   GetEnv("DB_USER", defaultDBUser),
		Password:               os.Getenv("DB_PASSWORD"),
		Name:                   GetEnv("DB_NAME", defaultDBName),
		SSLMode:                GetEnv("DB_SSLMODE", defaultDBSSLMode),
		InstanceConnectionName: os.Getenv("INSTANCE_CONNECTION_NAME"),
	}
}

func (c DatabaseConfig) DSN() string {
	if c.URL != "" {
		return c.URL
	}

	if c.InstanceConnectionName != "" {
		return fmt.Sprintf(
			"host=/cloudsql/%s user=%s password=%s dbname=%s sslmode=%s",
			c.InstanceConnectionName,
			c.User,
			c.Password,
			c.Name,
			c.SSLMode,
		)
	}

	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Host,
		c.Port,
		c.User,
		c.Password,
		c.Name,
		c.SSLMode,
	)
}

func GetEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func LoadEnv() error {
	return godotenv.Load(".env")
}
