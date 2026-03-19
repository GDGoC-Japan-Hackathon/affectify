import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

function resolvePickerRoot() {
  if (process.env.IMPORT_PICKER_ROOT) {
    return path.resolve(process.env.IMPORT_PICKER_ROOT);
  }
  // default: repo root (frontend の1階層上)
  return path.resolve(process.cwd(), "..");
}

function normalizeTargetPath(root: string, requestedPath?: string) {
  const target = requestedPath ? path.resolve(requestedPath) : root;
  const rootNormalized = path.resolve(root);
  if (target !== rootNormalized && !target.startsWith(`${rootNormalized}${path.sep}`)) {
    throw new Error("path is outside of picker root");
  }
  return target;
}

type TreeEntry = {
  name: string;
  fullPath: string;
  relativePath: string;
  kind: "directory" | "file";
  depth: number;
  size?: number;
};

async function walkTree(root: string, target: string, depth = 0): Promise<TreeEntry[]> {
  const dirents = await readdir(target, { withFileTypes: true });
  const entries = dirents
    .map((entry) => ({
      entry,
      fullPath: path.resolve(target, entry.name),
    }))
    .sort((a, b) => {
      if (a.entry.isDirectory() !== b.entry.isDirectory()) {
        return a.entry.isDirectory() ? -1 : 1;
      }
      return a.entry.name.localeCompare(b.entry.name);
    });

  const results: TreeEntry[] = [];
  for (const { entry, fullPath } of entries) {
    const kind: TreeEntry["kind"] = entry.isDirectory() ? "directory" : "file";
    results.push({
      name: entry.name,
      fullPath,
      relativePath: path.relative(root, fullPath) || ".",
      kind,
      depth,
      size: entry.isFile() ? (await stat(fullPath)).size : undefined,
    });
    if (entry.isDirectory()) {
      results.push(...(await walkTree(root, fullPath, depth + 1)));
    }
  }

  return results;
}

export async function GET(req: Request) {
  try {
    const root = resolvePickerRoot();
    if (!existsSync(root)) {
      return NextResponse.json({ error: `picker root not found: ${root}` }, { status: 500 });
    }

    const url = new URL(req.url);
    const requestedPath = url.searchParams.get("path") || undefined;
    const recursive = url.searchParams.get("recursive") === "1";
    const target = normalizeTargetPath(root, requestedPath);

    if (recursive) {
      const entries = await walkTree(target, target);
      return NextResponse.json({
        root,
        currentPath: target,
        currentRelativePath: path.relative(root, target) || ".",
        entries,
      });
    }

    const dirents = await readdir(target, { withFileTypes: true });
    const directories = dirents
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const fullPath = path.resolve(target, entry.name);
        const relativePath = path.relative(root, fullPath) || ".";
        return {
          name: entry.name,
          fullPath,
          relativePath,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const parentPath = target === root ? null : path.dirname(target);

    return NextResponse.json({
      root,
      currentPath: target,
      currentRelativePath: path.relative(root, target) || ".",
      parentPath,
      directories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
