import type { BoardEdge } from "@/types/type";

export const mockEdges: BoardEdge[] = [
  {
    id: "edge-1",
    from_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    to_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relToBase",
    kind: "call",
    style: "solid",
  },
  {
    id: "edge-2",
    from_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relativeFilePath",
    to_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relToBase",
    kind: "call",
    style: "solid",
  },
  {
    id: "edge-3",
    from_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.NewParser",
    to_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    kind: "call",
    style: "dashed",
  },
  {
    id: "edge-4",
    from_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    to_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.Analyzer",
    kind: "implement",
    style: "dashed",
  },
  {
    id: "edge-5",
    from_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.NewParser",
    to_node_id:
      "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.Analyzer",
    kind: "import",
    style: "solid",
  },
];
