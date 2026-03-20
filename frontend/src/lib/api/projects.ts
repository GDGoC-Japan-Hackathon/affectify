import { create } from "@bufbuild/protobuf";

import { createConnectClient } from "@/lib/connect";
import {
  AddProjectMemberRequestSchema,
  CreateProjectRequestSchema,
  DeleteProjectRequestSchema,
  GetProjectRequestSchema,
  ListProjectsRequestSchema,
  RemoveProjectMemberRequestSchema,
  UpdateProjectRequestSchema,
  ProjectService,
  type Project as ProtoProject,
} from "@/gen/api/v1/project_pb";
import type { Timestamp } from "@bufbuild/protobuf/wkt";
import type { Project, ProjectMemberSummary, User, Variant } from "@/types/type";

const projectClient = createConnectClient(ProjectService);

export interface ListProjectsOptions {
  query?: string;
  onlyOwned?: boolean;
  onlyJoined?: boolean;
  includeVariants?: boolean;
  includeMembers?: boolean;
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface UpdateProjectInput {
  id: string;
  name: string;
  description: string;
}

export async function listProjects(options: ListProjectsOptions = {}): Promise<Project[]> {
  const response = await projectClient.listProjects(
    create(ListProjectsRequestSchema, {
      query: options.query ?? "",
      onlyOwned: options.onlyOwned ?? false,
      onlyJoined: options.onlyJoined ?? false,
      includeVariants: options.includeVariants ?? true,
      includeMembers: options.includeMembers ?? true,
    }),
  );

  return response.projects.map(mapProject);
}

export async function getProject(projectId: string): Promise<Project> {
  const response = await projectClient.getProject(
    create(GetProjectRequestSchema, {
      id: BigInt(projectId),
      includeVariants: true,
      includeMembers: true,
    }),
  );

  if (!response.project) {
    throw new Error("project の取得に失敗しました");
  }

  return mapProject(response.project);
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const response = await projectClient.createProject(
    create(CreateProjectRequestSchema, {
      name: input.name,
      description: input.description,
    }),
  );

  if (!response.project) {
    throw new Error("project の作成に失敗しました");
  }

  return mapProject(response.project);
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  const response = await projectClient.updateProject(
    create(UpdateProjectRequestSchema, {
      id: BigInt(input.id),
      name: input.name,
      description: input.description,
    }),
  );

  if (!response.project) {
    throw new Error("project の更新に失敗しました");
  }

  return mapProject(response.project);
}

export async function addProjectMember(
  projectId: string,
  email: string,
): Promise<ProjectMemberSummary> {
  const response = await projectClient.addProjectMember(
    create(AddProjectMemberRequestSchema, {
      projectId: BigInt(projectId),
      email,
      role: "editor",
    }),
  );

  if (!response.member) {
    throw new Error("メンバーの追加に失敗しました");
  }

  return mapProjectMemberSummary(response.member);
}

export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<void> {
  await projectClient.removeProjectMember(
    create(RemoveProjectMemberRequestSchema, {
      projectId: BigInt(projectId),
      userId: BigInt(userId),
    }),
  );
}

export async function deleteProject(projectId: string): Promise<void> {
  await projectClient.deleteProject(
    create(DeleteProjectRequestSchema, {
      id: BigInt(projectId),
    }),
  );
}

function mapProject(project: ProtoProject): Project {
  const variants = project.variants.map(mapVariant);
  const memberSummaries = project.members.map(mapProjectMemberSummary);
  const mainVariantId = variants.find((variant) => variant.isMain)?.id;

  return {
    id: project.id.toString(),
    name: project.name,
    description: project.description,
    ownerId: project.ownerId.toString(),
    owner: mapUser(project.owner),
    createdAt: toDate(project.createdAt),
    updatedAt: toDate(project.updatedAt),
    nodeCount: project.nodeCount,
    analysisScore: project.analysisScore,
    variants,
    members: memberSummaries.map((member) => member.userId),
    memberSummaries,
    mainVariantId,
  };
}

function mapVariant(variant: ProtoProject["variants"][number]): Variant {
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

function mapProjectMemberSummary(member: ProtoProject["members"][number]): ProjectMemberSummary {
  return {
    userId: member.userId.toString(),
    addedBy: member.addedBy.toString(),
    role: member.role,
    joinedAt: toDate(member.joinedAt),
    user: mapUser(member.user),
    addedByUser: mapUser(member.addedByUser),
  };
}

function mapUser(user?: ProtoProject["owner"]): User | undefined {
  if (!user) return undefined;

  return {
    id: user.id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatarUrl,
  };
}

function toDate(timestamp?: Timestamp): Date {
  if (!timestamp) return new Date();
  return new Date(Number(timestamp.seconds) * 1000);
}
