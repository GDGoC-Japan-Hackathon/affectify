package entity

import "gorm.io/datatypes"

type Node struct {
	ID            int64          `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID     int64          `gorm:"column:variant_id;not null;index"`
	VariantFileID *int64         `gorm:"column:variant_file_id;index"`
	Kind          NodeKind       `gorm:"column:kind;type:varchar(50);not null;index"`
	Title         string         `gorm:"column:title;type:varchar(255);not null;index"`
	Signature     *string        `gorm:"column:signature;type:text"`
	Receiver      *string        `gorm:"column:receiver;type:text"`
	CodeText      *string        `gorm:"column:code_text;type:text"`
	PositionX     float64        `gorm:"column:position_x;not null;default:0"`
	PositionY     float64        `gorm:"column:position_y;not null;default:0"`
	Metadata      datatypes.JSON `gorm:"column:metadata;type:jsonb"`
	Timestamped
}

func (Node) TableName() string {
	return "nodes"
}

type Edge struct {
	ID         int64          `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID  int64          `gorm:"column:variant_id;not null;uniqueIndex:idx_edges_variant_nodes_kind;index"`
	FromNodeID int64          `gorm:"column:from_node_id;not null;uniqueIndex:idx_edges_variant_nodes_kind;index"`
	ToNodeID   int64          `gorm:"column:to_node_id;not null;uniqueIndex:idx_edges_variant_nodes_kind;index"`
	Kind       EdgeKind       `gorm:"column:kind;type:varchar(50);not null;uniqueIndex:idx_edges_variant_nodes_kind"`
	Style      EdgeStyle      `gorm:"column:style;type:varchar(20);not null;default:solid"`
	Label      *string        `gorm:"column:label;type:text"`
	Metadata   datatypes.JSON `gorm:"column:metadata;type:jsonb"`
	CreatedOnly
}

func (Edge) TableName() string {
	return "edges"
}
