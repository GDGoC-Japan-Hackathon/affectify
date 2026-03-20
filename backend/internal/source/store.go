package source

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"github.com/google/uuid"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
)

var ErrDirectUploadUnsupported = errors.New("direct upload is not supported for the current source store")

type UploadedFile struct {
	RelativePath string
	Content      []byte
}

type UploadDescriptor struct {
	RelativePath string
	ContentType  string
	Size         int64
}

type UploadTarget struct {
	RelativePath string
	UploadURL    string
	ContentType  string
}

type UploadPlan struct {
	SourceRootURI string
	Targets       []UploadTarget
	ExpiresAt     time.Time
}

type Store interface {
	SaveVariantFiles(ctx context.Context, variantID int64, files []UploadedFile) (string, error)
	PrepareVariantUpload(ctx context.Context, variantID int64, files []UploadDescriptor) (*UploadPlan, error)
}

type LocalStore struct {
	rootDir string
}

type GCSStore struct {
	bucketName string
}

func NewStore(cfg config.SourceStorageConfig) Store {
	if cfg.BucketName != "" {
		return &GCSStore{bucketName: cfg.BucketName}
	}

	rootDir := cfg.LocalRootDir
	if rootDir == "" {
		rootDir = filepath.Join(os.TempDir(), "affectify-variant-sources")
	}
	return &LocalStore{rootDir: rootDir}
}

func (s *LocalStore) SaveVariantFiles(_ context.Context, variantID int64, files []UploadedFile) (string, error) {
	rootDir := filepath.Join(s.rootDir, fmt.Sprintf("variant-%d", variantID))
	if err := os.MkdirAll(rootDir, 0o755); err != nil {
		return "", err
	}
	targetDir, err := os.MkdirTemp(rootDir, "upload-*")
	if err != nil {
		return "", err
	}

	for _, file := range files {
		normalizedPath, err := normalizeRelativePath(file.RelativePath)
		if err != nil {
			return "", err
		}
		targetPath := filepath.Join(targetDir, normalizedPath)
		if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
			return "", err
		}
		if err := os.WriteFile(targetPath, file.Content, 0o644); err != nil {
			return "", err
		}
	}

	return fmt.Sprintf("file://%s", targetDir), nil
}

func (s *LocalStore) PrepareVariantUpload(context.Context, int64, []UploadDescriptor) (*UploadPlan, error) {
	return nil, ErrDirectUploadUnsupported
}

func (s *GCSStore) SaveVariantFiles(ctx context.Context, variantID int64, files []UploadedFile) (string, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return "", err
	}
	defer client.Close()

	prefix := fmt.Sprintf("variants/%d/uploads/%s", variantID, strings.ReplaceAll(filepath.Base(filepath.Clean(os.TempDir())), string(filepath.Separator), "-"))
	prefix = fmt.Sprintf("%s/%d", prefix, os.Getpid())

	bucket := client.Bucket(s.bucketName)
	for _, file := range files {
		normalizedPath, err := normalizeRelativePath(file.RelativePath)
		if err != nil {
			return "", err
		}

		objectPath := fmt.Sprintf("%s/%s", prefix, filepath.ToSlash(normalizedPath))
		writer := bucket.Object(objectPath).NewWriter(ctx)
		if _, err := bytes.NewReader(file.Content).WriteTo(writer); err != nil {
			_ = writer.Close()
			return "", err
		}
		if err := writer.Close(); err != nil {
			return "", err
		}
	}

	return fmt.Sprintf("gs://%s/%s", s.bucketName, prefix), nil
}

func (s *GCSStore) PrepareVariantUpload(ctx context.Context, variantID int64, files []UploadDescriptor) (*UploadPlan, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	prefix := buildGCSPrefix(variantID)
	bucket := client.Bucket(s.bucketName)
	expiresAt := time.Now().Add(30 * time.Minute)
	targets := make([]UploadTarget, 0, len(files))
	for _, file := range files {
		normalizedPath, err := normalizeRelativePath(file.RelativePath)
		if err != nil {
			return nil, err
		}
		contentType := strings.TrimSpace(file.ContentType)
		if contentType == "" {
			contentType = "application/octet-stream"
		}

		objectPath := fmt.Sprintf("%s/%s", prefix, filepath.ToSlash(normalizedPath))
		uploadURL, err := bucket.SignedURL(objectPath, &storage.SignedURLOptions{
			Scheme:      storage.SigningSchemeV4,
			Method:      "PUT",
			Expires:     expiresAt,
			ContentType: contentType,
		})
		if err != nil {
			return nil, err
		}

		targets = append(targets, UploadTarget{
			RelativePath: normalizedPath,
			UploadURL:    uploadURL,
			ContentType:  contentType,
		})
	}

	return &UploadPlan{
		SourceRootURI: fmt.Sprintf("gs://%s/%s", s.bucketName, prefix),
		Targets:       targets,
		ExpiresAt:     expiresAt,
	}, nil
}

func buildGCSPrefix(variantID int64) string {
	return fmt.Sprintf("variants/%d/uploads/%s", variantID, uuid.NewString())
}

func normalizeRelativePath(relativePath string) (string, error) {
	normalized := filepath.Clean(strings.ReplaceAll(relativePath, "\\", "/"))
	if normalized == "." || normalized == "" {
		return "", fmt.Errorf("invalid relative path: %s", relativePath)
	}
	if strings.HasPrefix(normalized, "..") || filepath.IsAbs(normalized) {
		return "", fmt.Errorf("invalid relative path: %s", relativePath)
	}
	return normalized, nil
}
