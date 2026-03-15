package service

import (
	"context"

	"github.com/siraiyuto/affectify/backend/internal/entity"
	"github.com/siraiyuto/affectify/backend/internal/layout"
	"github.com/siraiyuto/affectify/backend/internal/repository"
)

type LayoutService struct {
	repo *repository.BoardRepository
}

func NewLayoutService(repo *repository.BoardRepository) *LayoutService {
	return &LayoutService{repo: repo}
}

// CalculateLayout は variant_id に紐づくノードの座標を計算し、DBに保存して返す。
func (s *LayoutService) CalculateLayout(ctx context.Context, variantID int64) ([]entity.BoardNode, []entity.BoardEdge, error) {
	nodes, edges, err := s.repo.GetNodesAndEdges(ctx, variantID)
	if err != nil {
		return nil, nil, err
	}

	// layout.Calculate に渡す形に変換
	layoutNodes := make([]layout.Node, len(nodes))
	for i, n := range nodes {
		layoutNodes[i] = layout.Node{ID: n.ID}
	}
	layoutEdges := make([]layout.Edge, len(edges))
	for i, e := range edges {
		layoutEdges[i] = layout.Edge{
			FromNodeID: e.FromNodeID,
			ToNodeID:   e.ToNodeID,
		}
	}

	// 座標計算
	positions := layout.Calculate(layoutNodes, layoutEdges)

	// entity.Position に変換してDBに保存
	entityPositions := make(map[string]entity.Position, len(positions))
	for id, pos := range positions {
		entityPositions[id] = entity.Position{X: pos.X, Y: pos.Y}
	}
	if err := s.repo.UpdateNodePositions(ctx, entityPositions); err != nil {
		return nil, nil, err
	}

	// 計算後の座標をノードに反映
	for i, n := range nodes {
		if pos, ok := positions[n.ID]; ok {
			nodes[i].X = pos.X
			nodes[i].Y = pos.Y
		}
	}

	return nodes, edges, nil
}
