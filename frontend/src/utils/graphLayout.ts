import type { BoardNode, BoardEdge } from "@/types/type";

// ノードサイズ定数
const NODE_W = 260;
const NODE_H = 200;
const DEFAULT_X_GAP = 200;
const DEFAULT_Y_GAP = 200;
const DEFAULT_JITTER_X = 28;
const DEFAULT_JITTER_Y = 56;

interface LayoutOptions {
  xGap?: number;
  yGap?: number;
  // 円形レイアウト用パラメータ
  baseRadius?: number; // 最内側の基本半径
  layerDistance?: number; // 層から層への距離
  nodeRadiusFactor?: number; // SCC内ノード円の半径係数
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function jitterFromId(id: string, axisSalt: string, amount: number): number {
  const h = hashString(`${id}:${axisSalt}`);
  const unit = h / 0xffffffff;
  return (unit * 2 - 1) * amount;
}

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
function assignLevels(sccs: string[][], edges: BoardEdge[]): Map<number, number> {
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

function chooseGridShape(count: number, cellW: number, cellH: number, xGap: number, yGap: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };

  let bestCols = 1;
  let bestRows = count;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const width = cols * cellW + (cols - 1) * xGap;
    const height = rows * cellH + (rows - 1) * yGap;
    const ratio = width / Math.max(height, 1);
    const score = Math.abs(Math.log(ratio));

    if (score < bestScore) {
      bestScore = score;
      bestCols = cols;
      bestRows = rows;
    }
  }

  return { cols: bestCols, rows: bestRows };
}

// =========================================================
// 3. 座標計算
//    - トポロジカルレベルを左→右に配置
//    - 同じレベルのSCCは正方形に近いグリッドで並べる
//    - SCC内が複数ノード → 円形配置
// =========================================================
export function computeLayout(nodes: BoardNode[], edges: BoardEdge[], options: LayoutOptions = {}): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const xGapRaw = options.xGap;
  const yGapRaw = options.yGap;
  const xGap = Number.isFinite(xGapRaw) ? Math.max(0, xGapRaw as number) : DEFAULT_X_GAP;
  const yGap = Number.isFinite(yGapRaw) ? Math.max(0, yGapRaw as number) : DEFAULT_Y_GAP;

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

  // SCC中心座標を決定（レベル内は縦長回避のためグリッド配置、レベルは左→右）
  const sccCenters = new Map<number, { x: number; y: number }>();
  let cursorX = 0;

  for (const lv of sortedLevels) {
    const sccIdxs = levelToSccs.get(lv)!;
    const boxes = sccIdxs.map((i) => sccBoundingBox(sccs[i]));
    const maxW = Math.max(...boxes.map((b) => b.w));
    const maxH = Math.max(...boxes.map((b) => b.h));
    const { cols, rows } = chooseGridShape(sccIdxs.length, maxW, maxH, xGap, yGap);
    const levelH = rows * maxH + (rows - 1) * yGap;
    const levelW = cols * maxW + (cols - 1) * xGap;

    for (let k = 0; k < sccIdxs.length; k++) {
      const i = sccIdxs[k];
      const row = Math.floor(k / cols);
      const col = k % cols;
      sccCenters.set(i, {
        x: cursorX + col * (maxW + xGap) + maxW / 2,
        y: -levelH / 2 + row * (maxH + yGap) + maxH / 2,
      });
    }

    cursorX += levelW + xGap;
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

  // 見た目が硬すぎないよう、ノードIDに基づく安定ジッターを加える。
  const jitterLimitX = Math.max(0, Math.min(DEFAULT_JITTER_X, xGap * 0.18));
  const jitterLimitY = Math.max(0, Math.min(DEFAULT_JITTER_Y, yGap * 0.35));
  if (jitterLimitX > 0 || jitterLimitY > 0) {
    for (const [id, pos] of positions) {
      positions.set(id, {
        x: pos.x + jitterFromId(id, "x", jitterLimitX),
        y: pos.y + jitterFromId(id, "y", jitterLimitY),
      });
    }
  }

  return positions;
}

// =========================================================
// 4. 円形レイアウト（正多角形配置）
//    - トポロジカルレベルを同心円環として配置
//    - 浅い層（レベル小）= 外側、深い層（レベル大）= 内側
//    - 全ノードが放射状に均等分散（正多角形のように見える）
// =========================================================
export function computeCircularLayout(nodes: BoardNode[], edges: BoardEdge[], options: LayoutOptions = {}): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const xGapRaw = options.xGap;
  const yGapRaw = options.yGap;
  const xGap = Number.isFinite(xGapRaw) ? Math.max(0, xGapRaw as number) : DEFAULT_X_GAP;
  const yGap = Number.isFinite(yGapRaw) ? Math.max(0, yGapRaw as number) : DEFAULT_Y_GAP;

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
  const maxLevel = Math.max(...sortedLevels);

  // デバッグ用ログ
  console.log(
    `[CircularLayout] SCCs: ${sccs.length}, Levels: ${sortedLevels.length}, MaxLevel: ${maxLevel}, SCC per level:`,
    Array.from(levelToSccs.entries())
      .map(([lv, arr]) => `Lv${lv}:${arr.length}`)
      .join(", "),
  );

  const minRadius = Number.isFinite(options.baseRadius) ? (options.baseRadius as number) : 700;
  const radiusStep = Number.isFinite(options.layerDistance) ? (options.layerDistance as number) : 180;
  const nodeRadiusFactor = Number.isFinite(options.nodeRadiusFactor) ? (options.nodeRadiusFactor as number) : 35;

  // ========== 全層に対して密度チェック：一定以上の割合でノードが詰まっていたら層を分割 ==========
  // 理想的な弧長（各ノード間の距離）: 400px
  const idealArcLength = 400;
  const expandedLevelToSccs = new Map<number, number[]>();
  let nextVirtualLevel = maxLevel + 1;

  for (const [lv, sccIdxs] of levelToSccs) {
    // この層の半径を計算
    const radius = minRadius + (maxLevel - lv) * radiusStep;
    // この層の円周
    const circumference = 2 * Math.PI * radius;
    // 一ノードあたりの弧長
    const arcPerNode = circumference / sccIdxs.length;

    // 弧長が理想値未満なら、層を分割する
    if (arcPerNode < idealArcLength) {
      const subLayers = Math.ceil((sccIdxs.length * idealArcLength) / circumference);
      const nodesPerSublayer = Math.ceil(sccIdxs.length / subLayers);
      for (let sub = 0; sub < subLayers; sub++) {
        const start = sub * nodesPerSublayer;
        const end = Math.min((sub + 1) * nodesPerSublayer, sccIdxs.length);
        // virtualLevel を増やすことで、内側に配置される
        expandedLevelToSccs.set(nextVirtualLevel + sub, sccIdxs.slice(start, end));
      }
      nextVirtualLevel += subLayers;
    } else {
      expandedLevelToSccs.set(lv, sccIdxs);
    }
  }

  const finalSortedLevels = [...expandedLevelToSccs.keys()].sort((a, b) => a - b);
  const finalMaxLevel = Math.max(...finalSortedLevels);
  const sccCenters = new Map<number, { x: number; y: number }>();

  // 各層内で独立した角度分散を行う
  for (const lv of finalSortedLevels) {
    const sccIdxs = expandedLevelToSccs.get(lv)!;
    // 外側 = 浅い層、内側 = 深い層
    const radius = minRadius + (finalMaxLevel - lv) * radiusStep;

    // この層内のSCC数に基づいて角度ステップを計算
    const sccCount = sccIdxs.length;
    const anglePerScc = (2 * Math.PI) / Math.max(1, sccCount);

    // 層ごとのランダムオフセット角度を生成（lvに基づいて安定）
    const levelOffsetAngle = jitterFromId(`layer-${lv}`, "angle", Math.PI);

    for (let k = 0; k < sccIdxs.length; k++) {
      const i = sccIdxs[k];
      // この層内でのローカル角度 + 層レベルのオフセット
      const angle = k * anglePerScc + levelOffsetAngle - Math.PI / 2;
      sccCenters.set(i, {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      });
    }
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
      // SCC内ノード = 循環関係のノード群を中心周りに円配置
      const radius = Math.max(80, scc.length * nodeRadiusFactor);
      scc.forEach((id, k) => {
        const angle = (2 * Math.PI * k) / scc.length - Math.PI / 2;
        positions.set(id, {
          x: center.x + radius * Math.cos(angle) - NODE_W / 2,
          y: center.y + radius * Math.sin(angle) - NODE_H / 2,
        });
      });
    }
  });

  // 見た目が硬すぎないよう、ノードIDに基づく安定ジッターを加える。
  const jitterLimitX = Math.max(0, Math.min(DEFAULT_JITTER_X, xGap * 0.18));
  const jitterLimitY = Math.max(0, Math.min(DEFAULT_JITTER_Y, yGap * 0.35));
  if (jitterLimitX > 0 || jitterLimitY > 0) {
    for (const [id, pos] of positions) {
      positions.set(id, {
        x: pos.x + jitterFromId(id, "x", jitterLimitX),
        y: pos.y + jitterFromId(id, "y", jitterLimitY),
      });
    }
  }

  return positions;
}
