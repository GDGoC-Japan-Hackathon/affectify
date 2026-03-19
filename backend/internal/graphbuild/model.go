package graphbuild

type ParsedNode struct {
	ID        string
	Kind      string
	Title     string
	FilePath  string
	Signature string
	Receiver  string
	Layer     string
	CodeText  string
	X         float64
	Y         float64
}

type ParsedEdge struct {
	FromNodeID string
	ToNodeID   string
	Kind       string
	Style      string
}

type Board struct {
	Nodes []ParsedNode
	Edges []ParsedEdge
}
