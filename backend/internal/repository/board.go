package repository

import (
	"context"
	"fmt"
	"strconv"

	"gorm.io/gorm"

	"github.com/siraiyuto/affectify/backend/internal/entity"
	repoEntity "github.com/siraiyuto/affectify/backend/internal/repository/entity"
)

type BoardRepository struct {
	db *gorm.DB
}

func NewBoardRepository(db *gorm.DB) *BoardRepository {
	return &BoardRepository{db: db}
}

// GetNodesAndEdges は variant_id に紐づくノードとエッジを取得し、
// 業務型に変換して返す。
func (r *BoardRepository) GetNodesAndEdges(ctx context.Context, variantID int64) ([]entity.BoardNode, []entity.BoardEdge, error) {
	var dbNodes []repoEntity.Node
	if err := r.db.WithContext(ctx).Where("variant_id = ?", variantID).Find(&dbNodes).Error; err != nil {
		return nil, nil, fmt.Errorf("nodes 取得失敗: %w", err)
	}

	var dbEdges []repoEntity.Edge
	if err := r.db.WithContext(ctx).Where("variant_id = ?", variantID).Find(&dbEdges).Error; err != nil {
		return nil, nil, fmt.Errorf("edges 取得失敗: %w", err)
	}

	nodes := make([]entity.BoardNode, len(dbNodes))
	for i, n := range dbNodes {
		nodes[i] = entity.BoardNode{
			ID:        strconv.FormatInt(n.ID, 10),
			Kind:      string(n.Kind),
			Title:     n.Title,
			FilePath:  ptrToStr(n.FilePath),
			Signature: ptrToStr(n.Signature),
			Receiver:  ptrToStr(n.Receiver),
			CodeText:  ptrToStr(n.CodeText),
			X:         n.PositionX,
			Y:         n.PositionY,
		}
	}

	edges := make([]entity.BoardEdge, len(dbEdges))
	for i, e := range dbEdges {
		edges[i] = entity.BoardEdge{
			ID:         strconv.FormatInt(e.ID, 10),
			FromNodeID: strconv.FormatInt(e.FromNodeID, 10),
			ToNodeID:   strconv.FormatInt(e.ToNodeID, 10),
			Kind:       string(e.Kind),
			Style:      string(e.Style),
		}
	}

	return nodes, edges, nil
}

// UpdateNodePositions は各ノードの position_x, position_y を更新する。
func (r *BoardRepository) UpdateNodePositions(ctx context.Context, positions map[string]entity.Position) error {
	for idStr, pos := range positions {
		id, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil {
			return fmt.Errorf("ID変換失敗 %s: %w", idStr, err)
		}
		if err := r.db.WithContext(ctx).
			Model(&repoEntity.Node{}).
			Where("id = ?", id).
			Updates(map[string]interface{}{
				"position_x": pos.X,
				"position_y": pos.Y,
			}).Error; err != nil {
			return fmt.Errorf("node %d の座標更新失敗: %w", id, err)
		}
	}
	return nil
}

func ptrToStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}
