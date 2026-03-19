package handler

import (
	"context"
	"errors"

	connect "connectrpc.com/connect"

	apiv1 "github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1/apiv1connect"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/auth"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
)

type VariantServiceHandler struct {
	apiv1connect.UnimplementedVariantServiceHandler
	variantService *service.VariantService
}

func NewVariantServiceHandler(variantService *service.VariantService) *VariantServiceHandler {
	return &VariantServiceHandler{variantService: variantService}
}

func (h *VariantServiceHandler) ListVariants(
	ctx context.Context,
	req *connect.Request[apiv1.ListVariantsRequest],
) (*connect.Response[apiv1.ListVariantsResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	variants, err := h.variantService.ListVariants(ctx, req.Msg.ProjectId)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	items := make([]*apiv1.Variant, 0, len(variants))
	for _, variant := range variants {
		items = append(items, toProtoVariant(&variant))
	}

	return connect.NewResponse(&apiv1.ListVariantsResponse{Variants: items}), nil
}

func (h *VariantServiceHandler) GetVariant(
	ctx context.Context,
	req *connect.Request[apiv1.GetVariantRequest],
) (*connect.Response[apiv1.GetVariantResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	variant, err := h.variantService.GetVariant(ctx, req.Msg.Id)
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.GetVariantResponse{
		Variant: toProtoVariant(variant),
	}), nil
}

func (h *VariantServiceHandler) CreateVariant(
	ctx context.Context,
	req *connect.Request[apiv1.CreateVariantRequest],
) (*connect.Response[apiv1.CreateVariantResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	variant, err := h.variantService.CreateVariant(ctx, identity.UID, service.CreateVariantInput{
		ProjectID:           req.Msg.ProjectId,
		Name:                req.Msg.Name,
		Description:         req.Msg.Description,
		ForkedFromVariantID: req.Msg.ForkedFromVariantId,
		BaseDesignGuideID:   req.Msg.BaseDesignGuideId,
	})
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.CreateVariantResponse{
		Variant: toProtoVariant(variant),
	}), nil
}

func (h *VariantServiceHandler) UpdateVariant(
	ctx context.Context,
	req *connect.Request[apiv1.UpdateVariantRequest],
) (*connect.Response[apiv1.UpdateVariantResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	variant, err := h.variantService.UpdateVariant(ctx, service.UpdateVariantInput{
		ID:             req.Msg.Id,
		Name:           req.Msg.Name,
		Description:    req.Msg.Description,
		IsMain:         req.Msg.IsMain,
		SourceLanguage: req.Msg.SourceLanguage,
	})
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.UpdateVariantResponse{
		Variant: toProtoVariant(variant),
	}), nil
}

func (h *VariantServiceHandler) DeleteVariant(
	ctx context.Context,
	req *connect.Request[apiv1.DeleteVariantRequest],
) (*connect.Response[apiv1.DeleteVariantResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	if err := h.variantService.DeleteVariant(ctx, req.Msg.Id); err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.DeleteVariantResponse{}), nil
}

func (h *VariantServiceHandler) GetVariantWorkspace(
	ctx context.Context,
	req *connect.Request[apiv1.GetVariantWorkspaceRequest],
) (*connect.Response[apiv1.GetVariantWorkspaceResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	workspace, err := h.variantService.GetVariantWorkspace(ctx, req.Msg.VariantId)
	if err != nil {
		return nil, mapVariantError(err)
	}

	files := make([]*apiv1.VariantFile, 0, len(workspace.Files))
	for i := range workspace.Files {
		files = append(files, toProtoVariantFile(&workspace.Files[i]))
	}

	nodes := make([]*apiv1.Node, 0, len(workspace.Nodes))
	for i := range workspace.Nodes {
		nodes = append(nodes, toProtoNode(&workspace.Nodes[i]))
	}

	edges := make([]*apiv1.Edge, 0, len(workspace.Edges))
	for i := range workspace.Edges {
		edges = append(edges, toProtoEdge(&workspace.Edges[i]))
	}

	return connect.NewResponse(&apiv1.GetVariantWorkspaceResponse{
		Variant:     toProtoVariant(&service.VariantDetail{Variant: workspace.Variant, Creator: workspace.Creator, NodeCount: int32(len(workspace.Nodes))}),
		Files:       files,
		DesignGuide: toProtoVariantDesignGuide(workspace.DesignGuide),
		Nodes:       nodes,
		Edges:       edges,
	}), nil
}

func (h *VariantServiceHandler) CreateGraphBuildJob(
	ctx context.Context,
	req *connect.Request[apiv1.CreateGraphBuildJobRequest],
) (*connect.Response[apiv1.CreateGraphBuildJobResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	job, err := h.variantService.CreateGraphBuildJob(ctx, identity.UID, req.Msg.VariantId)
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.CreateGraphBuildJobResponse{
		Job: toProtoGraphBuildJob(job),
	}), nil
}

func (h *VariantServiceHandler) GetGraphBuildJob(
	ctx context.Context,
	req *connect.Request[apiv1.GetGraphBuildJobRequest],
) (*connect.Response[apiv1.GetGraphBuildJobResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	job, err := h.variantService.GetGraphBuildJob(ctx, req.Msg.Id)
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.GetGraphBuildJobResponse{
		Job: toProtoGraphBuildJob(job),
	}), nil
}

func (h *VariantServiceHandler) CreateLayoutJob(
	ctx context.Context,
	req *connect.Request[apiv1.CreateLayoutJobRequest],
) (*connect.Response[apiv1.CreateLayoutJobResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	job, err := h.variantService.CreateLayoutJob(ctx, identity.UID, service.CreateLayoutJobInput{
		VariantID:  req.Msg.VariantId,
		LayoutType: req.Msg.LayoutType,
	})
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.CreateLayoutJobResponse{
		Job: toProtoLayoutJob(job),
	}), nil
}

func (h *VariantServiceHandler) GetLayoutJob(
	ctx context.Context,
	req *connect.Request[apiv1.GetLayoutJobRequest],
) (*connect.Response[apiv1.GetLayoutJobResponse], error) {
	if _, err := auth.RequireIdentity(ctx); err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	job, err := h.variantService.GetLayoutJob(ctx, req.Msg.Id)
	if err != nil {
		return nil, mapVariantError(err)
	}

	return connect.NewResponse(&apiv1.GetLayoutJobResponse{
		Job: toProtoLayoutJob(job),
	}), nil
}

func mapVariantError(err error) error {
	switch {
	case errors.Is(err, service.ErrVariantNotFound),
		errors.Is(err, service.ErrProjectNotFound),
		errors.Is(err, service.ErrDesignGuideNotFound),
		errors.Is(err, service.ErrGraphBuildJobNotFound),
		errors.Is(err, service.ErrLayoutJobNotFound),
		errors.Is(err, service.ErrUserNotFound):
		if errors.Is(err, service.ErrUserNotFound) {
			return connect.NewError(connect.CodeFailedPrecondition, err)
		}
		return connect.NewError(connect.CodeNotFound, err)
	default:
		return connect.NewError(connect.CodeInternal, err)
	}
}
