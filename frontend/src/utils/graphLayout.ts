import type { BoardNode, BoardEdge } from "@/types/type";

// ノードサイズ定数
const NODE_W = 260;
const NODE_H = 200;
const X_GAP = 200;
const Y_GAP = 200;

// =========================================================
// 1. Tarjan法による強連結成分（SCC）分解
// =========================================================
export function computeSCCs(nodeIds: string[], edges: BoardEdge[]): string[][] {
  const idx = new Map(nodeIds.map((id, i) => [id, i]));
  const n = nodeIds.length;
  const graph: number[][] = Array.from({ length: n }, () => []);

  for (const e of edges) {
    const s = idx.get(e.from_node_id);
    const t = idx.get(e.to_node_id);
    if (s !== undefined && t !== undefined && s !== t) {
      graph[s].push(t);
    }
  }

  let timer = 0;
  const disc = new Array<number>(n).fill(-1);
  const low = new Array<number>(n).fill(-1);
  const onStack = new Array<boolean>(n).fill(false);
  const stack: number[] = [];
  const sccs: string[][] = [];

  function strongConnect(v: number) {
    disc[v] = low[v] = timer++;
    stack.push(v);
    onStack[v] = true;

    for (const w of graph[v]) {
      if (disc[w] === -1) {
        strongConnect(w);
        low[v] = Math.min(low[v], low[w]);
      } else if (onStack[w]) {
        low[v] = Math.min(low[v], disc[w]);
      }
    }

    if (low[v] === disc[v]) {
      const scc: string[] = [];
      let w: number;
      do {
        w = stack.pop()!;
        onStack[w] = false;
        scc.push(nodeIds[w]);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (let v = 0; v < n; v++) {
    if (disc[v] === -1) strongConnect(v);
  }

  return sccs;
}

// =========================================================
// 2. 凝縮DAGのカーン法トポロジカルソート → レベル割り当て
// =========================================================
function assignLevels(
  sccs: string[][],
  edges: BoardEdge[],
): Map<number, number> {
  // ノードID → SCC番号
  const nodeToScc = new Map<string, number>();
  sccs.forEach((scc, i) => scc.forEach((id) => nodeToScc.set(id, i)));

  const S = sccs.length;
  const outEdges: Set<number>[] = Array.from({ length: S }, () => new Set());
  const inDegree = new Array<number>(S).fill(0);

  for (const e of edges) {
    const si = nodeToScc.get(e.from_node_id);
    const ti = nodeToScc.get(e.to_node_id);
    if (si === undefined || ti === undefined || si === ti) continue;
    if (!outEdges[si].has(ti)) {
      outEdges[si].add(ti);
      inDegree[ti]++;
    }
  }

  // BFS（カーン法）で最長パス = レベル
  const levels = new Array<number>(S).fill(0);
  const queue: number[] = [];
  for (let i = 0; i < S; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const next of outEdges[cur]) {
      if (levels[next] < levels[cur] + 1) {
        levels[next] = levels[cur] + 1;
      }
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }

  const result = new Map<number, number>();
  sccs.forEach((_, i) => result.set(i, levels[i]));
  return result;
}

// =========================================================
// 3. 座標計算
//    - トポロジカルレベルを左→右に配置
//    - 同じレベルのSCCは縦に並べる
//    - SCC内が複数ノード → 円形配置
// =========================================================
export function computeLayout(
  nodes: BoardNode[],
  edges: BoardEdge[],
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const nodeIds = nodes.map((n) => n.id);
  const sccs = computeSCCs(nodeIds, edges);
  const levels = assignLevels(sccs, edges);

  // レベルごとにSCCを集める
  const levelToSccs = new Map<number, number[]>();
  sccs.forEach((_, i) => {
    const lv = levels.get(i) ?? 0;
    if (!levelToSccs.has(lv)) levelToSccs.set(lv, []);
    levelToSccs.get(lv)!.push(i);
  });

  const sortedLevels = [...levelToSccs.keys()].sort((a, b) => a - b);

  // 各SCCの矩形幅・高さ（配置ユニットとして使う）
  function sccBoundingBox(scc: string[]): { w: number; h: number } {
    if (scc.length === 1) return { w: NODE_W, h: NODE_H };
    const radius = Math.max(180, scc.length * 70);
    const d = radius * 2 + NODE_W;
    return { w: d, h: d };
  }

  // SCC中心座標を決定（レベルごとに縦積み、レベルは左→右）
  const sccCenters = new Map<number, { x: number; y: number }>();
  let cursorX = 0;

  for (const lv of sortedLevels) {
    const sccIdxs = levelToSccs.get(lv)!;
    const boxes = sccIdxs.map((i) => sccBoundingBox(sccs[i]));
    const totalH = boxes.reduce((sum, b) => sum + b.h + Y_GAP, -Y_GAP);
    const maxW = Math.max(...boxes.map((b) => b.w));

    let cursorY = -totalH / 2;
    for (let k = 0; k < sccIdxs.length; k++) {
      const i = sccIdxs[k];
      const box = boxes[k];
      sccCenters.set(i, {
        x: cursorX + maxW / 2,
        y: cursorY + box.h / 2,
      });
      cursorY += box.h + Y_GAP;
    }

    cursorX += maxW + X_GAP;
  }

  // 各ノードの座標を計算（SCC中心からの相対位置）
  const positions = new Map<string, { x: number; y: number }>();

  sccs.forEach((scc, i) => {
    const center = sccCenters.get(i)!;

    if (scc.length === 1) {
      positions.set(scc[0], {
        x: center.x - NODE_W / 2,
        y: center.y - NODE_H / 2,
      });
    } else {
      const radius = Math.max(180, scc.length * 70);
      scc.forEach((id, k) => {
        const angle = (2 * Math.PI * k) / scc.length - Math.PI / 2;
        positions.set(id, {
          x: center.x + radius * Math.cos(angle) - NODE_W / 2,
          y: center.y + radius * Math.sin(angle) - NODE_H / 2,
        });
      });
    }
  });

  return positions;
}
