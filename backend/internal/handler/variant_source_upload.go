package handler

import (
	"encoding/json"
	"net/http"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/source"
)

type VariantSourceUploadHandler struct {
	verifier       *auth.Verifier
	variantService *service.VariantService
}

func NewVariantSourceUploadHandler(verifier *auth.Verifier, variantService *service.VariantService) *VariantSourceUploadHandler {
	return &VariantSourceUploadHandler{
		verifier:       verifier,
		variantService: variantService,
	}
}

func (h *VariantSourceUploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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

	variantIDParam := r.URL.Query().Get("variant_id")
	if variantIDParam == "" {
		http.Error(w, "variant_id is required", http.StatusBadRequest)
		return
	}

	var variantID int64
	if _, err := fmtSscanf(variantIDParam, &variantID); err != nil {
		http.Error(w, "invalid variant_id", http.StatusBadRequest)
		return
	}

	if err := r.ParseMultipartForm(64 << 20); err != nil {
		http.Error(w, "invalid multipart form", http.StatusBadRequest)
		return
	}

	fileHeaders := r.MultipartForm.File["files"]
	if len(fileHeaders) == 0 {
		http.Error(w, "files is required", http.StatusBadRequest)
		return
	}
	relativePaths := r.MultipartForm.Value["relative_paths"]
	if len(relativePaths) != len(fileHeaders) {
		http.Error(w, "relative_paths must match files", http.StatusBadRequest)
		return
	}

	files := make([]source.UploadedFile, 0, len(fileHeaders))
	for i, fileHeader := range fileHeaders {
		file, err := fileHeader.Open()
		if err != nil {
			http.Error(w, "failed to open file", http.StatusBadRequest)
			return
		}
		content, err := ioReadAll(file)
		_ = file.Close()
		if err != nil {
			http.Error(w, "failed to read file", http.StatusBadRequest)
			return
		}
		relativePath := relativePaths[i]
		if relativePath == "" {
			http.Error(w, "relative_paths must not be empty", http.StatusBadRequest)
			return
		}
		files = append(files, source.UploadedFile{
			RelativePath: relativePath,
			Content:      content,
		})
	}

	sourceRootURI, err := h.variantService.UploadVariantSource(r.Context(), identity.UID, variantID, files)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"sourceRootUri": sourceRootURI,
		"fileCount":     len(files),
	})
}
