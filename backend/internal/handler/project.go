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

type ProjectServiceHandler struct {
	apiv1connect.UnimplementedProjectServiceHandler
	projectService *service.ProjectService
}

func NewProjectServiceHandler(projectService *service.ProjectService) *ProjectServiceHandler {
	return &ProjectServiceHandler{projectService: projectService}
}

func (h *ProjectServiceHandler) ListProjects(
	ctx context.Context,
	req *connect.Request[apiv1.ListProjectsRequest],
) (*connect.Response[apiv1.ListProjectsResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	projects, err := h.projectService.ListProjects(ctx, identity.UID, service.ListProjectsInput{
		Query:           req.Msg.Query,
		OnlyOwned:       req.Msg.OnlyOwned,
		OnlyJoined:      req.Msg.OnlyJoined,
		IncludeVariants: req.Msg.IncludeVariants,
		IncludeMembers:  req.Msg.IncludeMembers,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	result := make([]*apiv1.Project, 0, len(projects))
	for i := range projects {
		result = append(result, toProtoProject(&projects[i]))
	}

	return connect.NewResponse(&apiv1.ListProjectsResponse{
		Projects: result,
	}), nil
}

func (h *ProjectServiceHandler) GetProject(
	ctx context.Context,
	req *connect.Request[apiv1.GetProjectRequest],
) (*connect.Response[apiv1.GetProjectResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	project, err := h.projectService.GetProject(ctx, identity.UID, service.GetProjectInput{
		ID:              req.Msg.Id,
		IncludeVariants: req.Msg.IncludeVariants,
		IncludeMembers:  req.Msg.IncludeMembers,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			return nil, connect.NewError(connect.CodeNotFound, err)
		case errors.Is(err, service.ErrForbidden):
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		default:
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&apiv1.GetProjectResponse{
		Project: toProtoProject(project),
	}), nil
}

func (h *ProjectServiceHandler) CreateProject(
	ctx context.Context,
	req *connect.Request[apiv1.CreateProjectRequest],
) (*connect.Response[apiv1.CreateProjectResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	project, err := h.projectService.CreateProject(ctx, identity.UID, service.CreateProjectInput{
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&apiv1.CreateProjectResponse{
		Project: toProtoProject(project),
	}), nil
}

func (h *ProjectServiceHandler) UpdateProject(
	ctx context.Context,
	req *connect.Request[apiv1.UpdateProjectRequest],
) (*connect.Response[apiv1.UpdateProjectResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	project, err := h.projectService.UpdateProject(ctx, identity.UID, service.UpdateProjectInput{
		ID:          req.Msg.Id,
		Name:        req.Msg.Name,
		Description: req.Msg.Description,
	})
	if err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			return nil, connect.NewError(connect.CodeNotFound, err)
		case errors.Is(err, service.ErrForbidden):
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		default:
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&apiv1.UpdateProjectResponse{
		Project: toProtoProject(project),
	}), nil
}

func (h *ProjectServiceHandler) DeleteProject(
	ctx context.Context,
	req *connect.Request[apiv1.DeleteProjectRequest],
) (*connect.Response[apiv1.DeleteProjectResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	if err := h.projectService.DeleteProject(ctx, identity.UID, req.Msg.Id); err != nil {
		switch {
		case errors.Is(err, service.ErrProjectNotFound):
			return nil, connect.NewError(connect.CodeNotFound, err)
		case errors.Is(err, service.ErrForbidden):
			return nil, connect.NewError(connect.CodePermissionDenied, err)
		default:
			return nil, connect.NewError(connect.CodeInternal, err)
		}
	}

	return connect.NewResponse(&apiv1.DeleteProjectResponse{}), nil
}
