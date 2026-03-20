package middleware

import (
	"net/http"
	"slices"
)

func WithCORS(next http.Handler) http.Handler {
	allowedOrigins := []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://whitecoder--hackathon-2e83a.asia-east1.hosted.app",
	}

	allowedHeaders := []string{
		"Accept",
		"Authorization",
		"Content-Type",
		"Connect-Protocol-Version",
		"Connect-Timeout-Ms",
		"Grpc-Timeout",
		"X-User-Agent",
	}

	allowedMethods := []string{
		http.MethodGet,
		http.MethodPost,
		http.MethodOptions,
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && slices.Contains(allowedOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", joinHeaderValues(allowedHeaders))
			w.Header().Set("Access-Control-Allow-Methods", joinHeaderValues(allowedMethods))
		}

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func joinHeaderValues(values []string) string {
	if len(values) == 0 {
		return ""
	}

	result := values[0]
	for _, value := range values[1:] {
		result += ", " + value
	}

	return result
}
