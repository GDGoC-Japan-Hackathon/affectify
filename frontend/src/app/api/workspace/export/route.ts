import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import type { BoardNode } from "@/types/type";

export async function POST(request: NextRequest) {
  try {
    const { nodes } = await request.json() as { nodes: BoardNode[] };

    if (!Array.isArray(nodes)) {
      return NextResponse.json(
        { error: "Invalid nodes data" },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    // file_path ごとにノードをまとめる
    const fileMap = new Map<string, BoardNode[]>();
    for (const node of nodes) {
      if (!node.file_path || !node.code_text) continue;
      const arr = fileMap.get(node.file_path) ?? [];
      arr.push(node);
      fileMap.set(node.file_path, arr);
    }

    for (const [filePath, fileNodes] of fileMap) {
      const content = fileNodes.map((n) => n.code_text).join("\n\n");
      zip.file(filePath, content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="export.zip"',
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to generate ZIP file" },
      { status: 500 }
    );
  }
}
