import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

type AnalyzerNode = {
  id: string;
  kind: string;
  title: string;
  file_path: string;
  signature: string;
  receiver?: string;
  x?: number;
  y?: number;
  code_text?: string;
};

type AnalyzerEdge = {
  id?: string;
  from_node_id: string;
  to_node_id: string;
  kind?: string;
  style?: string;
};

type AnalyzerBoard = {
  nodes: AnalyzerNode[];
  edges: AnalyzerEdge[];
};

type ImportRequestBody = {
  folderPath?: string;
  // TODO(team): variantId/projectId を受け取り、DB保存先を特定する。
  variantId?: string;
  projectId?: string;
};

function resolveAnalyzerDir() {
  if (process.env.ANALYZER_DIR) {
    return path.resolve(process.env.ANALYZER_DIR);
  }
  return path.resolve(process.cwd(), "..", "..", "google-hackathon-feat-import", "google-hackathon-feat-import", "analyzer");
}

function extractJsonBlock(rawOutput: string) {
  const start = rawOutput.indexOf("{");
  if (start < 0) {
    return { warnings: rawOutput.trim(), json: "" };
  }
  return {
    warnings: rawOutput.slice(0, start).trim(),
    json: rawOutput.slice(start),
  };
}

function normalizeBoard(board: AnalyzerBoard): AnalyzerBoard {
  const nodes: AnalyzerNode[] = [];
  const nodeIds = new Set<string>();
  for (const n of board.nodes) {
    const id = (n.id || "").trim();
    if (!id) continue;
    if (nodeIds.has(id)) continue;
    nodeIds.add(id);
    nodes.push({
      id,
      kind: n.kind,
      title: n.title,
      file_path: (n.file_path || "").replace(/\\/g, "/"),
      signature: n.signature || "",
      receiver: n.receiver || "",
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : 0,
      code_text: n.code_text || "",
    });
  }

  const edgeSet = new Set<string>();
  const edgeIds = new Set<string>();
  const edges: AnalyzerEdge[] = [];
  for (const e of board.edges) {
    if (!nodeIds.has(e.from_node_id) || !nodeIds.has(e.to_node_id)) continue;
    const kind = e.kind === "import" || e.kind === "implement" ? e.kind : "call";
    const style = e.style === "dashed" ? "dashed" : "solid";
    const dedupKey = `${e.from_node_id}->${e.to_node_id}:${kind}:${style}`;
    if (edgeSet.has(dedupKey)) continue;
    edgeSet.add(dedupKey);

    const preferredId = (e.id || "").trim() || `edge-${edges.length + 1}`;
    let edgeId = preferredId;
    if (edgeIds.has(edgeId)) {
      let seq = 2;
      while (edgeIds.has(`${preferredId}-${seq}`)) {
        seq++;
      }
      edgeId = `${preferredId}-${seq}`;
    }
    edgeIds.add(edgeId);

    edges.push({
      id: edgeId,
      from_node_id: e.from_node_id,
      to_node_id: e.to_node_id,
      kind,
      style,
    });
  }

  return { nodes, edges };
}

async function runAnalyzer(analyzerDir: string, folderPath: string): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return await new Promise((resolve, reject) => {
    const child = spawn("go", ["run", "./cmd/analyzer", folderPath], {
      cwd: analyzerDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => resolve({ stdout, stderr, code }));
  });
}

// NOTE(team): 現状は no-op。後でここをDB保存実装に差し替える。
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function persistImportedGraph(_params: { variantId?: string; projectId?: string; board: AnalyzerBoard }) {
  return;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ImportRequestBody;
    const folderPath = body.folderPath?.trim();
    if (!folderPath) {
      return NextResponse.json({ error: "folderPath is required" }, { status: 400 });
    }

    const targetDir = path.resolve(folderPath);
    if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
      return NextResponse.json({ error: `directory not found: ${targetDir}` }, { status: 400 });
    }

    const analyzerDir = resolveAnalyzerDir();
    if (!existsSync(analyzerDir)) {
      return NextResponse.json({ error: `analyzer directory not found: ${analyzerDir}` }, { status: 500 });
    }

    const { stdout, stderr, code } = await runAnalyzer(analyzerDir, targetDir);
    if (code !== 0) {
      return NextResponse.json(
        {
          error: "analyzer failed",
          details: stderr || stdout,
        },
        { status: 500 },
      );
    }

    const { warnings, json } = extractJsonBlock(stdout);
    if (!json) {
      return NextResponse.json(
        {
          error: "analyzer output does not contain JSON",
          details: stdout,
        },
        { status: 500 },
      );
    }

    const parsed = JSON.parse(json) as AnalyzerBoard;
    const normalized = normalizeBoard(parsed);

    await persistImportedGraph({
      variantId: body.variantId,
      projectId: body.projectId,
      board: normalized,
    });

    return NextResponse.json({
      nodes: normalized.nodes,
      edges: normalized.edges,
      warnings: [warnings, stderr].filter(Boolean).join("\n").trim(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
