// Package handler はRPCハンドラを担当する。
package handler

import (
	"context"

	connect "connectrpc.com/connect"

	apiv1 "github.com/siraiyuto/affectify/backend/gen/api/v1"
	"github.com/siraiyuto/affectify/backend/internal/layout"
	"github.com/siraiyuto/affectify/backend/internal/repository"
)

// BoardServiceHandler は BoardService RPC の実装。
type BoardServiceHandler struct {
	repo *repository.BoardRepository
}

// NewBoardServiceHandler はハンドラを生成する。
func NewBoardServiceHandler(repo *repository.BoardRepository) *BoardServiceHandler {
	return &BoardServiceHandler{repo: repo}
}

// GetBoardLayout はボードのノード座標を計算してフロントエンドに返す。
//
// 処理の流れ:
//  1. DBからboard_id に紐づくノードとエッジを取得
//  2. layout.Calculate で各ノードの x, y を計算
//  3. 計算結果を board_nodes に書き込む
//  4. 描画に必要な全情報をレスポンスとして返す
func (h *BoardServiceHandler) GetBoardLayout(
	ctx context.Context,
	req *connect.Request[apiv1.GetBoardLayoutRequest],
) (*connect.Response[apiv1.GetBoardLayoutResponse], error) {
	boardID := req.Msg.BoardId

	// Step 1: DBからノードとエッジを取得
	nodeRows, edgeRows, err := h.repo.GetNodesAndEdges(ctx, boardID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Step 2: layout.Calculate に渡す形に変換
	layoutNodes := make([]layout.Node, len(nodeRows))
	for i, n := range nodeRows {
		layoutNodes[i] = layout.Node{ID: n.ID}
	}
	layoutEdges := make([]layout.Edge, len(edgeRows))
	for i, e := range edgeRows {
		layoutEdges[i] = layout.Edge{
			FromNodeID: e.FromNodeID,
			ToNodeID:   e.ToNodeID,
		}
	}

	// Step 3: 座標計算
	positions := layout.Calculate(layoutNodes, layoutEdges)

	// Step 4: 計算結果をDBに書き込む
	if err := h.repo.UpdateNodePositions(ctx, positions); err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	// Step 5: レスポンス構築（描画に必要な全フィールドを含める）
	protoNodes := make([]*apiv1.BoardNodeProto, len(nodeRows))
	for i, n := range nodeRows {
		pos := positions[n.ID]
		protoNodes[i] = &apiv1.BoardNodeProto{
			Id:       n.ID,
			Kind:     n.Kind,
			Title:    n.Title,
			FilePath: n.FilePath,
			Signature: n.Signature,
			Receiver:  n.Receiver,
			X:         pos.X,
			Y:         pos.Y,
			CodeText:  n.CodeText,
		}
	}

	protoEdges := make([]*apiv1.BoardEdgeProto, len(edgeRows))
	for i, e := range edgeRows {
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
