import { create } from "@bufbuild/protobuf";

import { createConnectClient } from "@/lib/connect";
import {
  CreateDesignGuideRequestSchema,
  DeleteDesignGuideRequestSchema,
  DesignGuideService,
  GetDesignGuideRequestSchema,
  LikeDesignGuideRequestSchema,
  ListDesignGuidesRequestSchema,
  UnlikeDesignGuideRequestSchema,
  UpdateDesignGuideRequestSchema,
  type DesignGuide as ProtoDesignGuide,
  type DesignGuideSummary as ProtoDesignGuideSummary,
} from "@/gen/api/v1/design_guide_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import type { DesignGuide, DesignGuideVisibility } from "@/types/type";

const designGuideClient = createConnectClient(DesignGuideService);

export interface ListDesignGuidesOptions {
  query?: string;
  createdByMe?: boolean;
  likedByMe?: boolean;
}

export interface CreateDesignGuideInput {
  name: string;
  description: string;
  content: string;
  visibility?: DesignGuideVisibility;
  isTemplate?: boolean;
}

export interface UpdateDesignGuideInput {
  id: string;
  name: string;
  description: string;
  content: string;
  visibility?: DesignGuideVisibility;
  isTemplate?: boolean;
}

export async function listDesignGuides(options: ListDesignGuidesOptions = {}): Promise<DesignGuide[]> {
  const response = await designGuideClient.listDesignGuides(
    create(ListDesignGuidesRequestSchema, {
      query: options.query ?? "",
      createdByMe: options.createdByMe ?? false,
      likedByMe: options.likedByMe ?? false,
    }),
  );

  return response.designGuides.map(mapDesignGuideSummary);
}

export async function getDesignGuide(id: string): Promise<DesignGuide> {
  const response = await designGuideClient.getDesignGuide(
    create(GetDesignGuideRequestSchema, {
      id: BigInt(id),
    }),
  );

  if (!response.designGuide) {
    throw new Error("設計書の取得に失敗しました");
  }

  return mapDesignGuide(response.designGuide);
}

export async function createDesignGuide(input: CreateDesignGuideInput): Promise<DesignGuide> {
  const response = await designGuideClient.createDesignGuide(
    create(CreateDesignGuideRequestSchema, {
      name: input.name,
      description: input.description,
      content: input.content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.visibility ? { visibility: input.visibility } as any : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.isTemplate !== undefined ? { isTemplate: input.isTemplate } as any : {}),
    }),
  );

  if (!response.designGuide) {
    throw new Error("設計書の作成に失敗しました");
  }

  return mapDesignGuide(response.designGuide);
}

export async function updateDesignGuide(input: UpdateDesignGuideInput): Promise<DesignGuide> {
  const response = await designGuideClient.updateDesignGuide(
    create(UpdateDesignGuideRequestSchema, {
      id: BigInt(input.id),
      name: input.name,
      description: input.description,
      content: input.content,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.visibility ? { visibility: input.visibility } as any : {}),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.isTemplate !== undefined ? { isTemplate: input.isTemplate } as any : {}),
    }),
  );

  if (!response.designGuide) {
    throw new Error("設計書の更新に失敗しました");
  }

  return mapDesignGuide(response.designGuide);
}

export async function deleteDesignGuide(id: string): Promise<void> {
  await designGuideClient.deleteDesignGuide(
    create(DeleteDesignGuideRequestSchema, {
      id: BigInt(id),
    }),
  );
}

export async function likeDesignGuide(id: string): Promise<void> {
  await designGuideClient.likeDesignGuide(
    create(LikeDesignGuideRequestSchema, {
      designGuideId: BigInt(id),
    }),
  );
}

export async function unlikeDesignGuide(id: string): Promise<void> {
  await designGuideClient.unlikeDesignGuide(
    create(UnlikeDesignGuideRequestSchema, {
      designGuideId: BigInt(id),
    }),
  );
}

function mapDesignGuideSummary(guide: ProtoDesignGuideSummary): DesignGuide {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = guide as any;
  return {
    id: guide.id.toString(),
    name: guide.name,
    description: guide.description,
    createdBy: guide.createdBy.toString(),
    createdAt: toDate(guide.createdAt),
    updatedAt: toDate(guide.updatedAt),
    content: "",
    visibility: (g.visibility as DesignGuideVisibility) || "private",
    isTemplate: g.isTemplate ?? false,
    likeCount: guide.likeCount,
  };
}

function mapDesignGuide(guide: ProtoDesignGuide): DesignGuide {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = guide as any;
  return {
    id: guide.id.toString(),
    name: guide.name,
    description: guide.description,
    createdBy: guide.createdBy.toString(),
    createdAt: toDate(guide.createdAt),
    updatedAt: toDate(guide.updatedAt),
    content: guide.content,
    visibility: (g.visibility as DesignGuideVisibility) || "private",
    isTemplate: g.isTemplate ?? false,
    likeCount: guide.likeCount,
  };
}

function toDate(timestamp?: Timestamp): Date {
  if (!timestamp) return new Date();
  return new Date(Number(timestamp.seconds) * 1000);
}
