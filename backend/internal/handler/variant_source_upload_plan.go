package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/source"
)

type VariantSourceUploadPlanHandler struct {
	verifier       *auth.Verifier
	variantService *service.VariantService
}

func NewVariantSourceUploadPlanHandler(verifier *auth.Verifier, variantService *service.VariantService) *VariantSourceUploadPlanHandler {
	return &VariantSourceUploadPlanHandler{
		verifier:       verifier,
		variantService: variantService,
	}
}

type prepareVariantSourceUploadRequest struct {
	VariantID int64                            `json:"variantId"`
	Files     []prepareVariantSourceUploadFile `json:"files"`
}

type prepareVariantSourceUploadFile struct {
	RelativePath string `json:"relativePath"`
	ContentType  string `json:"contentType"`
	Size         int64  `json:"size"`
}

func (h *VariantSourceUploadPlanHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := auth.ExtractBearerToken(r.Header.Get("Authorization"))
	if token == "" {
		http.Error(w, "missing authorization", http.StatusUnauthorized)
		return
	}

	identity, err := h.verifier.VerifyIDToken(r.Context(), token)
	if err != nil {
		http.Error(w, "unauthenticated", http.StatusUnauthorized)
		return
	}

	var req prepareVariantSourceUploadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.VariantID <= 0 {
		http.Error(w, "variantId is required", http.StatusBadRequest)
		return
	}
	if len(req.Files) == 0 {
		http.Error(w, "files is required", http.StatusBadRequest)
		return
	}

	files := make([]source.UploadDescriptor, 0, len(req.Files))
	for _, file := range req.Files {
		if file.RelativePath == "" {
			http.Error(w, "relativePath is required", http.StatusBadRequest)
			return
		}
		files = append(files, source.UploadDescriptor{
			RelativePath: file.RelativePath,
			ContentType:  file.ContentType,
			Size:         file.Size,
		})
	}

	plan, err := h.variantService.PrepareVariantSourceUpload(r.Context(), identity.UID, service.PrepareVariantSourceUploadInput{
		VariantID: req.VariantID,
		Files:     files,
	})
	if err != nil {
		if errors.Is(err, source.ErrDirectUploadUnsupported) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"directUploadEnabled": false,
			})
			return
		}
		statusCode := http.StatusBadRequest
		if errors.Is(err, service.ErrForbidden) {
			statusCode = http.StatusForbidden
		}
		http.Error(w, err.Error(), statusCode)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"directUploadEnabled": true,
		"sourceRootUri":       plan.SourceRootURI,
		"expiresAt":           plan.ExpiresAt.Format(time.RFC3339),
		"targets":             plan.Targets,
	})
}
