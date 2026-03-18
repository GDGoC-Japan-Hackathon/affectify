import { readdir } from "node:fs/promises";
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

export async function GET(req: Request) {
  try {
    const root = resolvePickerRoot();
    if (!existsSync(root)) {
      return NextResponse.json({ error: `picker root not found: ${root}` }, { status: 500 });
    }

    const url = new URL(req.url);
    const requestedPath = url.searchParams.get("path") || undefined;
    const target = normalizeTargetPath(root, requestedPath);

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
