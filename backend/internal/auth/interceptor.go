package auth

import (
	"context"
	"errors"

	connect "connectrpc.com/connect"
)

type Interceptor struct {
	verifier *Verifier
}

func NewInterceptor(verifier *Verifier) *Interceptor {
	return &Interceptor{verifier: verifier}
}

func (i *Interceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		identityCtx, err := i.attachIdentity(ctx, req.Header().Get("Authorization"))
		if err != nil {
			return nil, err
		}

		return next(identityCtx, req)
	}
}

func (i *Interceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

func (i *Interceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		identityCtx, err := i.attachIdentity(ctx, conn.RequestHeader().Get("Authorization"))
		if err != nil {
			return err
		}

		return next(identityCtx, conn)
	}
}

func (i *Interceptor) attachIdentity(ctx context.Context, authHeader string) (context.Context, error) {
	token := ExtractBearerToken(authHeader)
	if token == "" {
		// 認証ヘッダーが無い場合は、そのまま公開エンドポイントとして通す。
		return ctx, nil
	}

	identity, err := i.verifier.VerifyIDToken(ctx, token)
	if err != nil {
		if errors.Is(err, ErrAuthNotConfigured) {
			return nil, connect.NewError(connect.CodeFailedPrecondition, err)
		}

		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	return WithIdentity(ctx, identity), nil
}
