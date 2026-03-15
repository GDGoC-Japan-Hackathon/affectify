package handler

import (
	"context"
	"strconv"

	connect "connectrpc.com/connect"

	apiv1 "github.com/siraiyuto/affectify/backend/gen/api/v1"
	"github.com/siraiyuto/affectify/backend/internal/service"
)

type BoardServiceHandler struct {
	layoutService *service.LayoutService
}

func NewBoardServiceHandler(layoutService *service.LayoutService) *BoardServiceHandler {
	return &BoardServiceHandler{layoutService: layoutService}
}

func (h *BoardServiceHandler) GetBoardLayout(
	ctx context.Context,
	req *connect.Request[apiv1.GetBoardLayoutRequest],
) (*connect.Response[apiv1.GetBoardLayoutResponse], error) {
	variantID, err := strconv.ParseInt(req.Msg.BoardId, 10, 64)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	nodes, edges, err := h.layoutService.CalculateLayout(ctx, variantID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// レスポンス構築
	protoNodes := make([]*apiv1.BoardNodeProto, len(nodes))
	for i, n := range nodes {
		protoNodes[i] = &apiv1.BoardNodeProto{
			Id:        n.ID,
			Kind:      n.Kind,
			Title:     n.Title,
			FilePath:  n.FilePath,
			Signature: n.Signature,
			Receiver:  n.Receiver,
			X:         n.X,
			Y:         n.Y,
			CodeText:  n.CodeText,
		}
	}

	protoEdges := make([]*apiv1.BoardEdgeProto, len(edges))
	for i, e := range edges {
		protoEdges[i] = &apiv1.BoardEdgeProto{
			Id:         e.ID,
			FromNodeId: e.FromNodeID,
			ToNodeId:   e.ToNodeID,
			Kind:       e.Kind,
			Style:      e.Style,
		}
	}

	return connect.NewResponse(&apiv1.GetBoardLayoutResponse{
		Nodes: protoNodes,
		Edges: protoEdges,
	}), nil
}
