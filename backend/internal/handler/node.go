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

type NodeServiceHandler struct {
	apiv1connect.UnimplementedNodeServiceHandler
	nodeService *service.NodeService
}

func NewNodeServiceHandler(nodeService *service.NodeService) *NodeServiceHandler {
	return &NodeServiceHandler{nodeService: nodeService}
}

func (h *NodeServiceHandler) ListNodes(
	ctx context.Context,
	req *connect.Request[apiv1.ListNodesRequest],
) (*connect.Response[apiv1.ListNodesResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	nodes, err := h.nodeService.ListNodes(ctx, identity.UID, req.Msg.VariantId)
	if err != nil {
		return nil, mapNodeError(err)
	}

	items := make([]*apiv1.Node, 0, len(nodes))
	for i := range nodes {
		items = append(items, toProtoNode(&nodes[i]))
	}

	return connect.NewResponse(&apiv1.ListNodesResponse{Nodes: items}), nil
}

func (h *NodeServiceHandler) CreateNode(
	ctx context.Context,
	req *connect.Request[apiv1.CreateNodeRequest],
) (*connect.Response[apiv1.CreateNodeResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	node, err := h.nodeService.CreateNode(ctx, identity.UID, service.CreateNodeInput{
		VariantID:     req.Msg.VariantId,
		VariantFileID: req.Msg.VariantFileId,
		Kind:          req.Msg.Kind,
		Title:         req.Msg.Title,
		Signature:     req.Msg.Signature,
		Receiver:      req.Msg.Receiver,
		CodeText:      req.Msg.CodeText,
		X:             req.Msg.X,
		Y:             req.Msg.Y,
		Metadata:      req.Msg.Metadata,
	})
	if err != nil {
		return nil, mapNodeError(err)
	}

	return connect.NewResponse(&apiv1.CreateNodeResponse{Node: toProtoNode(node)}), nil
}

func (h *NodeServiceHandler) UpdateNode(
	ctx context.Context,
	req *connect.Request[apiv1.UpdateNodeRequest],
) (*connect.Response[apiv1.UpdateNodeResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	node, err := h.nodeService.UpdateNode(ctx, identity.UID, service.UpdateNodeInput{
		ID:        req.Msg.Id,
		Title:     req.Msg.Title,
		Signature: req.Msg.Signature,
		Receiver:  req.Msg.Receiver,
		CodeText:  req.Msg.CodeText,
		X:         req.Msg.X,
		Y:         req.Msg.Y,
		Metadata:  req.Msg.Metadata,
	})
	if err != nil {
		return nil, mapNodeError(err)
	}

	return connect.NewResponse(&apiv1.UpdateNodeResponse{Node: toProtoNode(node)}), nil
}

func (h *NodeServiceHandler) DeleteNode(
	ctx context.Context,
	req *connect.Request[apiv1.DeleteNodeRequest],
) (*connect.Response[apiv1.DeleteNodeResponse], error) {
	identity, err := auth.RequireIdentity(ctx)
	if err != nil {
		return nil, connect.NewError(connect.CodeUnauthenticated, err)
	}

	if err := h.nodeService.DeleteNode(ctx, identity.UID, req.Msg.Id); err != nil {
		return nil, mapNodeError(err)
	}

	return connect.NewResponse(&apiv1.DeleteNodeResponse{}), nil
}

func mapNodeError(err error) error {
	switch {
	case errors.Is(err, service.ErrNodeNotFound), errors.Is(err, service.ErrVariantNotFound):
		return connect.NewError(connect.CodeNotFound, err)
	case errors.Is(err, service.ErrUserNotFound):
		return connect.NewError(connect.CodeFailedPrecondition, err)
	case errors.Is(err, service.ErrForbidden):
		return connect.NewError(connect.CodePermissionDenied, err)
	default:
		return connect.NewError(connect.CodeInternal, err)
	}
}
