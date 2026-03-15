// Package repository はDBアクセスを担当する。
package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/siraiyuto/affectify/backend/internal/layout"
)

// BoardNodeRow は board_nodes テーブルの1行。
type BoardNodeRow struct {
	ID        string
	Kind      string
	Title     string
	FilePath  string
	Signature string
	Receiver  string
	CodeText  string
}

// BoardEdgeRow は board_edges テーブルの1行。
type BoardEdgeRow struct {
	ID         string
	FromNodeID string
	ToNodeID   string
	Kind       string
	Style      string
}

// BoardRepository はボード関連のDBアクセスをまとめる。
type BoardRepository struct {
	db *pgxpool.Pool
}

// NewBoardRepository はリポジトリを生成する。
func NewBoardRepository(db *pgxpool.Pool) *BoardRepository {
	return &BoardRepository{db: db}
}

// GetNodesAndEdges は指定ボードのノードとエッジを取得する。
func (r *BoardRepository) GetNodesAndEdges(ctx context.Context, boardID string) ([]BoardNodeRow, []BoardEdgeRow, error) {
	// ノード取得
	nodeRows, err := r.db.Query(ctx, `
		SELECT id, kind, title,
		       COALESCE(file_path, ''),
		       COALESCE(signature, ''),
		       COALESCE(receiver, ''),
		       COALESCE(code_text, '')
		FROM board_nodes
		WHERE board_id = $1
	`, boardID)
	if err != nil {
		return nil, nil, fmt.Errorf("board_nodes 取得失敗: %w", err)
	}
	defer nodeRows.Close()

	var nodes []BoardNodeRow
	for nodeRows.Next() {
		var n BoardNodeRow
		if err := nodeRows.Scan(&n.ID, &n.Kind, &n.Title, &n.FilePath, &n.Signature, &n.Receiver, &n.CodeText); err != nil {
			return nil, nil, fmt.Errorf("board_nodes スキャン失敗: %w", err)
		}
		nodes = append(nodes, n)
	}

	// エッジ取得
	edgeRows, err := r.db.Query(ctx, `
		SELECT id, from_node_id, to_node_id, kind, COALESCE(style, 'solid')
		FROM board_edges
		WHERE board_id = $1
	`, boardID)
	if err != nil {
		return nil, nil, fmt.Errorf("board_edges 取得失敗: %w", err)
	}
	defer edgeRows.Close()

	var edges []BoardEdgeRow
	for edgeRows.Next() {
		var e BoardEdgeRow
		if err := edgeRows.Scan(&e.ID, &e.FromNodeID, &e.ToNodeID, &e.Kind, &e.Style); err != nil {
			return nil, nil, fmt.Errorf("board_edges スキャン失敗: %w", err)
		}
		edges = append(edges, e)
	}

	return nodes, edges, nil
}

// UpdateNodePositions は計算済みの x, y を board_nodes に一括書き込む。
func (r *BoardRepository) UpdateNodePositions(ctx context.Context, positions map[string]layout.Position) error {
	for nodeID, pos := range positions {
		_, err := r.db.Exec(ctx, `
			UPDATE board_nodes SET x = $1, y = $2 WHERE id = $3
		`, pos.X, pos.Y, nodeID)
		if err != nil {
			return fmt.Errorf("node %s の座標更新失敗: %w", nodeID, err)
		}
	}
	return nil
}
