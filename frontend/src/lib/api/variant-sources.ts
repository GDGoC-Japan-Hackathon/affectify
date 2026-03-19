"use client";

import { getFirebaseAuth } from "@/lib/firebase";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

export async function uploadVariantSource(variantId: string, files: File[]): Promise<{ sourceRootUri: string; fileCount: number }> {
  const auth = getFirebaseAuth();
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;

  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file, file.webkitRelativePath || file.name);
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
