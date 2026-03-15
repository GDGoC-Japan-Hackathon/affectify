package entity

type BoardNode struct {
	ID        string
	Kind      string
	Title     string
	FilePath  string
	Signature string
	Receiver  string
	CodeText  string
	X         float64
	Y         float64
}

type BoardEdge struct {
	ID         string
	Kind       string
	Style      string
	FromNodeID string
	ToNodeID   string
}

type Position struct {
	X float64
	Y float64
}
