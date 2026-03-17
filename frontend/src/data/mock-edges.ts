import type { BoardEdge } from "@/types/type";

export const mockEdges: BoardEdge[] = [
  {
    id: "edge-1",
    from_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    to_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relToBase",
    kind: "call",
    style: "solid",
  },
  {
    id: "edge-2",
    from_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relativeFilePath",
    to_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).relToBase",
    kind: "call",
    style: "solid",
  },
  {
    id: "edge-3",
    from_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.NewParser",
    to_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    kind: "call",
    style: "dashed",
  },
  {
    id: "edge-4",
    from_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.(Parser).Parse",
    to_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.Analyzer",
    kind: "implement",
    style: "dashed",
  },
  {
    id: "edge-5",
    from_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.NewParser",
    to_node_id: "github.com/sirayu2525/google-hackathon/analyzer/internal/parser.Analyzer",
    kind: "import",
    style: "solid",
  },
];

// 大規模レイアウト確認用モック（既存mockEdgesは保持）
export const mockEdgesLarge: BoardEdge[] = [
  { id: "e1", from_node_id: "app.cmd.main", to_node_id: "app.boot.run", kind: "call", style: "solid" },
  { id: "e2", from_node_id: "app.boot.run", to_node_id: "app.boot.loadConfig", kind: "call", style: "solid" },
  { id: "e3", from_node_id: "app.boot.run", to_node_id: "app.boot.initDB", kind: "call", style: "solid" },
  { id: "e4", from_node_id: "app.boot.run", to_node_id: "app.http.start", kind: "call", style: "solid" },
  { id: "e5", from_node_id: "app.http.start", to_node_id: "app.http.register", kind: "call", style: "solid" },
  { id: "e6", from_node_id: "app.http.register", to_node_id: "app.handler.user.get", kind: "call", style: "solid" },
  { id: "e7", from_node_id: "app.http.register", to_node_id: "app.handler.user.create", kind: "call", style: "solid" },
  { id: "e8", from_node_id: "app.middleware.auth", to_node_id: "app.auth.verify", kind: "call", style: "dashed" },
  { id: "e9", from_node_id: "app.handler.user.get", to_node_id: "app.service.user.get", kind: "call", style: "solid" },
  { id: "e10", from_node_id: "app.handler.user.create", to_node_id: "app.service.user.create", kind: "call", style: "solid" },
  { id: "e11", from_node_id: "app.service.user.get", to_node_id: "app.repo.user.find", kind: "call", style: "solid" },
  { id: "e12", from_node_id: "app.service.user.create", to_node_id: "app.repo.user.save", kind: "call", style: "solid" },

  // SCC-1 (service.get -> repo.find -> analysis.run -> service.get)
  { id: "e13", from_node_id: "app.repo.user.find", to_node_id: "app.analysis.run", kind: "call", style: "dashed" },
  { id: "e14", from_node_id: "app.analysis.run", to_node_id: "app.service.user.get", kind: "call", style: "dashed" },

  // SCC-2 (analysis.run <-> cache.get <-> cache.put)
  { id: "e15", from_node_id: "app.analysis.run", to_node_id: "app.analysis.cache.get", kind: "call", style: "solid" },
  { id: "e16", from_node_id: "app.analysis.cache.get", to_node_id: "app.analysis.cache.put", kind: "call", style: "solid" },
  { id: "e17", from_node_id: "app.analysis.cache.put", to_node_id: "app.analysis.run", kind: "call", style: "dashed" },

  // SCC-3 (graph.build -> graph.scc -> graph.topo -> graph.build)
  { id: "e18", from_node_id: "app.analysis.run", to_node_id: "app.graph.build", kind: "call", style: "solid" },
  { id: "e19", from_node_id: "app.graph.build", to_node_id: "app.graph.scc", kind: "call", style: "solid" },
  { id: "e20", from_node_id: "app.graph.scc", to_node_id: "app.graph.topo", kind: "call", style: "solid" },
  { id: "e21", from_node_id: "app.graph.topo", to_node_id: "app.graph.build", kind: "call", style: "dashed" },

  // その他のDAG接続
  { id: "e22", from_node_id: "app.graph.topo", to_node_id: "app.ui.note", kind: "import", style: "dashed" },
  { id: "e23", from_node_id: "app.repo.user.save", to_node_id: "app.analysis.run", kind: "call", style: "dashed" },
  { id: "e24", from_node_id: "app.boot.loadConfig", to_node_id: "app.ui.note", kind: "import", style: "dashed" },
];
