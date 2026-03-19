import { create } from "@bufbuild/protobuf";

import { createConnectClient } from "@/lib/connect";
import {
  CreateGraphBuildJobRequestSchema,
  CreateLayoutJobRequestSchema,
  CreateVariantRequestSchema,
  DeleteVariantRequestSchema,
  GetGraphBuildJobRequestSchema,
  GetLayoutJobRequestSchema,
  GetVariantWorkspaceRequestSchema,
  ListVariantsRequestSchema,
  UpdateVariantRequestSchema,
  type GetVariantWorkspaceResponse,
  VariantService,
} from "@/gen/api/v1/variant_pb";
import type { BoardEdge, BoardNode, Variant } from "@/types/type";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

const variantClient = createConnectClient(VariantService);

export interface VariantWorkspaceData {
  nodes: BoardNode[];
  edges: BoardEdge[];
}

export interface UpdateVariantInput {
  id: string;
  name?: string;
  description?: string;
  isMain?: boolean;
  sourceLanguage?: string;
}

export interface GraphBuildJob {
  id: string;
  variantId: string;
  status: string;
  errorMessage: string;
}

export interface LayoutJob {
  id: string;
  variantId: string;
  layoutType: string;
  status: string;
  errorMessage: string;
}

export interface CreateVariantInput {
  projectId: string;
  name: string;
  description?: string;
  forkedFromVariantId?: string;
  baseDesignGuideId?: string;
}

export async function listVariants(projectId: string): Promise<Variant[]> {
  const response = await variantClient.listVariants(
    create(ListVariantsRequestSchema, {
      projectId: BigInt(projectId),
    }),
  );

  return response.variants.map(mapVariant);
}

export async function updateVariant(input: UpdateVariantInput): Promise<Variant> {
  const response = await variantClient.updateVariant(
    create(UpdateVariantRequestSchema, {
      id: BigInt(input.id),
      name: input.name ?? "",
      description: input.description ?? "",
      isMain: input.isMain,
      sourceLanguage: input.sourceLanguage,
    }),
  );

  if (!response.variant) {
    throw new Error("variant の更新に失敗しました");
  }

  return mapVariant(response.variant);
}

export async function deleteVariant(variantId: string): Promise<void> {
  await variantClient.deleteVariant(
    create(DeleteVariantRequestSchema, {
      id: BigInt(variantId),
    }),
  );
}

export async function createGraphBuildJob(variantId: string): Promise<GraphBuildJob> {
  const response = await variantClient.createGraphBuildJob(
    create(CreateGraphBuildJobRequestSchema, {
      variantId: BigInt(variantId),
    }),
  );

  if (!response.job) {
    throw new Error("グラフビルドジョブの作成に失敗しました");
  }

  return {
    id: response.job.id.toString(),
    variantId: response.job.variantId.toString(),
    status: response.job.status,
    errorMessage: response.job.errorMessage,
  };
}

export async function getGraphBuildJob(jobId: string): Promise<GraphBuildJob> {
  const response = await variantClient.getGraphBuildJob(
    create(GetGraphBuildJobRequestSchema, {
      id: BigInt(jobId),
    }),
  );

  if (!response.job) {
    throw new Error("グラフビルドジョブの取得に失敗しました");
  }

  return {
    id: response.job.id.toString(),
    variantId: response.job.variantId.toString(),
    status: response.job.status,
    errorMessage: response.job.errorMessage,
  };
}

export async function createLayoutJob(variantId: string, layoutType = "dagre"): Promise<LayoutJob> {
  const response = await variantClient.createLayoutJob(
    create(CreateLayoutJobRequestSchema, {
      variantId: BigInt(variantId),
      layoutType,
    }),
  );

  if (!response.job) {
    throw new Error("レイアウトジョブの作成に失敗しました");
  }

  return {
    id: response.job.id.toString(),
    variantId: response.job.variantId.toString(),
    layoutType: response.job.layoutType,
    status: response.job.status,
    errorMessage: response.job.errorMessage,
  };
}

export async function getLayoutJob(jobId: string): Promise<LayoutJob> {
  const response = await variantClient.getLayoutJob(
    create(GetLayoutJobRequestSchema, {
      id: BigInt(jobId),
    }),
  );

  if (!response.job) {
    throw new Error("レイアウトジョブの取得に失敗しました");
  }

  return {
    id: response.job.id.toString(),
    variantId: response.job.variantId.toString(),
    layoutType: response.job.layoutType,
    status: response.job.status,
    errorMessage: response.job.errorMessage,
  };
}

export async function createVariant(input: CreateVariantInput): Promise<Variant> {
  const response = await variantClient.createVariant(
    create(CreateVariantRequestSchema, {
      projectId: BigInt(input.projectId),
      name: input.name,
      description: input.description ?? "",
      forkedFromVariantId: toOptionalBigInt(input.forkedFromVariantId),
      baseDesignGuideId: toOptionalBigInt(input.baseDesignGuideId),
    }),
  );

  if (!response.variant) {
    throw new Error("variant の作成に失敗しました");
  }

  return mapVariant(response.variant);
}

export async function getVariantWorkspace(variantId: string): Promise<VariantWorkspaceData> {
  const response = await variantClient.getVariantWorkspace(
    create(GetVariantWorkspaceRequestSchema, {
      variantId: BigInt(variantId),
    }),
  );

  return mapWorkspaceResponse(response);
}

function mapVariant(variant: {
  id: bigint;
  name: string;
  description: string;
  createdBy: bigint;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  nodeCount: number;
  analysisScore?: number;
  isMain: boolean;
  forkedFromVariantId?: bigint;
}): Variant {
  return {
    id: variant.id.toString(),
    name: variant.name,
    description: variant.description,
    createdBy: variant.createdBy.toString(),
    createdAt: toDate(variant.createdAt),
    updatedAt: toDate(variant.updatedAt),
    nodeCount: variant.nodeCount,
    analysisScore: variant.analysisScore,
    isMain: variant.isMain,
    parentVariantId: variant.forkedFromVariantId?.toString(),
  };
}

function toDate(timestamp?: Timestamp): Date {
  if (!timestamp) return new Date();
  return new Date(Number(timestamp.seconds) * 1000);
}

function toOptionalBigInt(value?: string): bigint | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return BigInt(value);
}

function mapWorkspaceResponse(response: GetVariantWorkspaceResponse): VariantWorkspaceData {
  const filePathById = new Map<string, string>();
  for (const file of response.files) {
    filePathById.set(file.id.toString(), file.path);
  }

  return {
    nodes: response.nodes.map((node) => ({
      id: node.id.toString(),
      kind: normalizeNodeKind(node.kind),
      title: node.title,
      file_path: node.variantFileId ? (filePathById.get(node.variantFileId.toString()) ?? "") : "",
      signature: node.signature,
      receiver: node.receiver,
      x: node.x,
      y: node.y,
      code_text: node.codeText,
    })),
    edges: response.edges.map((edge) => ({
      id: edge.id.toString(),
      from_node_id: edge.fromNodeId.toString(),
      to_node_id: edge.toNodeId.toString(),
      kind: normalizeEdgeKind(edge.kind),
      style: normalizeEdgeStyle(edge.style),
    })),
  };
}

function normalizeNodeKind(kind: string): BoardNode["kind"] {
  switch (kind) {
    case "function":
    case "method":
    case "interface":
    case "group":
    case "note":
    case "memo":
    case "image":
    case "drawing":
      return kind;
    default:
      return "function";
  }
}

function normalizeEdgeKind(kind: string): BoardEdge["kind"] {
  switch (kind) {
    case "call":
    case "import":
    case "implement":
      return kind;
    default:
      return "call";
  }
}

function normalizeEdgeStyle(style: string): BoardEdge["style"] {
  switch (style) {
    case "solid":
    case "dashed":
      return style;
    default:
      return "solid";
  }
}
