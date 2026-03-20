"use client";

import { getFirebaseAuth } from "@/lib/firebase";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

type DirectUploadTarget = {
  relativePath: string;
  uploadURL: string;
  contentType: string;
};

type DirectUploadPlan = {
  directUploadEnabled: boolean;
  sourceRootUri?: string;
  targets?: DirectUploadTarget[];
};

async function getAuthToken() {
  const auth = getFirebaseAuth();
  return auth?.currentUser ? await auth.currentUser.getIdToken() : null;
}

async function prepareVariantSourceUpload(
  variantId: string,
  files: File[],
): Promise<DirectUploadPlan> {
  const token = await getAuthToken();
  const response = await fetch(`${baseUrl}/variant-sources/upload-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      variantId: Number(variantId),
      files: files.map((file) => ({
        relativePath: (file.webkitRelativePath || file.name).replaceAll("\\", "/"),
        contentType: file.type || "application/octet-stream",
        size: file.size,
      })),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "アップロード計画の取得に失敗しました");
  }

  return (await response.json()) as DirectUploadPlan;
}

async function uploadVariantSourceMultipart(
  variantId: string,
  files: File[],
): Promise<{ sourceRootUri: string; fileCount: number }> {
  const token = await getAuthToken();

  const formData = new FormData();
  for (const file of files) {
    const relativePath = file.webkitRelativePath || file.name;
    formData.append("files", file, file.name);
    formData.append("relative_paths", relativePath);
  }

  const response = await fetch(`${baseUrl}/variant-sources/upload?variant_id=${encodeURIComponent(variantId)}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const payload = (await response.json()) as {
    sourceRootUri?: string;
    fileCount?: number;
    error?: string;
  };

  if (!response.ok || !payload.sourceRootUri) {
    throw new Error(payload.error || "ソースアップロードに失敗しました");
  }

  return {
    sourceRootUri: payload.sourceRootUri,
    fileCount: payload.fileCount ?? files.length,
  };
}

async function uploadVariantSourceDirect(
  files: File[],
  plan: DirectUploadPlan,
): Promise<{ sourceRootUri: string; fileCount: number }> {
  if (!plan.sourceRootUri || !plan.targets || plan.targets.length === 0) {
    throw new Error("アップロード計画が不完全です");
  }

  const fileByRelativePath = new Map(
    files.map((file) => [((file.webkitRelativePath || file.name).replaceAll("\\", "/")), file]),
  );

  for (const target of plan.targets) {
    const file = fileByRelativePath.get(target.relativePath);
    if (!file) {
      throw new Error(`選択ファイルが見つかりません: ${target.relativePath}`);
    }

    const response = await fetch(target.uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": target.contentType || file.type || "application/octet-stream",
      },
      body: file,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `GCS へのアップロードに失敗しました: ${target.relativePath}`);
    }
  }

  return {
    sourceRootUri: plan.sourceRootUri,
    fileCount: plan.targets.length,
  };
}

export async function uploadVariantSource(variantId: string, files: File[]): Promise<{ sourceRootUri: string; fileCount: number }> {
  const plan = await prepareVariantSourceUpload(variantId, files);
  if (plan.directUploadEnabled) {
    return uploadVariantSourceDirect(files, plan);
  }
  return uploadVariantSourceMultipart(variantId, files);
}
