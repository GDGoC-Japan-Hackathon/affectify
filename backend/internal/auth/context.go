package auth

import (
	"context"
	"errors"
)

var ErrUnauthenticated = errors.New("unauthenticated")

type Identity struct {
	UID       string
	Email     string
	Name      string
	AvatarURL string
}

type contextKey string

const identityContextKey contextKey = "firebase_identity"

func WithIdentity(ctx context.Context, identity Identity) context.Context {
	return context.WithValue(ctx, identityContextKey, identity)
}

func IdentityFromContext(ctx context.Context) (Identity, bool) {
	identity, ok := ctx.Value(identityContextKey).(Identity)
	return identity, ok
}

func RequireIdentity(ctx context.Context) (Identity, error) {
	identity, ok := IdentityFromContext(ctx)
	if !ok {
		return Identity{}, ErrUnauthenticated
	}

	return identity, nil
}
