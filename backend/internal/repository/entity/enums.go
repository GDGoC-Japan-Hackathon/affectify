package entity

type NodeKind string

const (
	NodeKindFunction  NodeKind = "function"
	NodeKindMethod    NodeKind = "method"
	NodeKindInterface NodeKind = "interface"
	NodeKindGroup     NodeKind = "group"
	NodeKindNote      NodeKind = "note"
	NodeKindImage     NodeKind = "image"
)

type EdgeKind string

const (
	EdgeKindCall      EdgeKind = "call"
	EdgeKindImport    EdgeKind = "import"
	EdgeKindImplement EdgeKind = "implement"
)

type EdgeStyle string

const (
	EdgeStyleSolid  EdgeStyle = "solid"
	EdgeStyleDashed EdgeStyle = "dashed"
)
