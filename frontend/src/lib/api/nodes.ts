import { create } from "@bufbuild/protobuf";
import { createConnectClient } from "@/lib/connect";
import { NodeService, UpdateNodeRequestSchema, CreateNodeRequestSchema } from "@/gen/api/v1/node_pb";
import type { BoardNode } from "@/types/type";

const nodeClient = createConnectClient(NodeService);

export async function createNode(variantId: string, params: {
  kind: string;
  title: string;
  codeText: string;
  x: number;
  y: number;
}): Promise<BoardNode> {
  const response = await nodeClient.createNode(
    create(CreateNodeRequestSchema, {
      variantId: BigInt(variantId),
      kind: params.kind,
      title: params.title,
      codeText: params.codeText,
      x: params.x,
      y: params.y,
    }),
  );

  if (!response.node) throw new Error("ノードの作成に失敗しました");
  const n = response.node;
  return {
    id: n.id.toString(),
    kind: n.kind,
    title: n.title,
    file_path: "",
    signature: n.signature,
    receiver: n.receiver,
    code_text: n.codeText,
    x: n.x,
    y: n.y,
  };
}

export async function updateNodeCode(id: string, codeText: string, node: BoardNode): Promise<void> {
  await nodeClient.updateNode(
    create(UpdateNodeRequestSchema, {
      id: BigInt(id),
      title: node.title,
      codeText,
      x: node.x,
      y: node.y,
      signature: node.signature,
      receiver: node.receiver,
    }),
  );
}

export async function updateNodePosition(id: string, x: number, y: number): Promise<void> {
  await nodeClient.updateNode(
    create(UpdateNodeRequestSchema, {
      id: BigInt(id),
      x,
      y,
    }),
  );
}
