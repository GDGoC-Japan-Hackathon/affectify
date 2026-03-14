export type NodeKind =
  | "function"
  | "method"
  | "interface"
  | "group"
  | "note"
  | "image";

export type EdgeKind = "call" | "import" | "implement";

export type EdgeStyle = "solid" | "dashed";

export interface BoardNode {
  id: string;
  kind: NodeKind;
  title: string;
  file_path: string;
  signature: string;
  receiver: string;
  x: number;
  y: number;
  code_text: string;
}

export interface BoardEdge {
  id: string;
  from_node_id: string;
  to_node_id: string;
  kind: EdgeKind;
  style: EdgeStyle;
}
