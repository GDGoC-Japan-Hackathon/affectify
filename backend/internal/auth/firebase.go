package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
)

var ErrAuthNotConfigured = errors.New("firebase auth is not configured")

type Verifier struct {
	client *firebaseauth.Client
}

func NewVerifier(ctx context.Context, cfg config.FirebaseConfig) (*Verifier, error) {
	if cfg.ProjectID == "" && cfg.CredentialsFile == "" {
		return &Verifier{}, nil
	}

	appConfig := &firebase.Config{}
	if cfg.ProjectID != "" {
		appConfig.ProjectID = cfg.ProjectID
	}

	var opts []option.ClientOption
	if cfg.CredentialsFile != "" {
		opts = append(opts, option.WithCredentialsFile(cfg.CredentialsFile))
	}
	if cfg.CredentialsJSON != "" {
		opts = append(opts, option.WithCredentialsJSON([]byte(cfg.CredentialsJSON)))
	}

	app, err := firebase.NewApp(ctx, appConfig, opts...)
	if err != nil {
		return nil, fmt.Errorf("create firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("create firebase auth client: %w", err)
	}

	return &Verifier{client: client}, nil
}

func (v *Verifier) VerifyIDToken(ctx context.Context, rawToken string) (Identity, error) {
	if v.client == nil {
		return Identity{}, ErrAuthNotConfigured
	}

	token, err := v.client.VerifyIDToken(ctx, rawToken)
	if err != nil {
		return Identity{}, fmt.Errorf("verify firebase id token: %w", err)
	}

	return Identity{
		UID:       token.UID,
		Email:     stringClaim(token.Claims, "email"),
		Name:      stringClaim(token.Claims, "name"),
		AvatarURL: stringClaim(token.Claims, "picture"),
	}, nil
}

func ExtractBearerToken(header string) string {
	if header == "" {
		return ""
	}

	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}

	return strings.TrimSpace(parts[1])
}

func stringClaim(claims map[string]any, key string) string {
	value, ok := claims[key]
	if !ok {
		return ""
	}

	str, ok := value.(string)
	if !ok {
		return ""
	}

	return str
}
