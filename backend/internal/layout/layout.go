// Package layout は board_nodes の初期座標 (x, y) を計算する。
// Tarjanのアルゴリズムで強連結成分（SCC）を検出し、階層的なトップダウンレイアウトを行う。
package layout

import "math"

// ---- 定数（フロントエンドの CodeCard サイズに合わせる） ----

const (
	NodeWidth  = 250.0
	NodeHeight = 200.0
	NodeSep    = 100.0 // SCC バウンディングボックス間の横方向の余白
	RankSep    = 100.0 // ランク（行）間の縦方向の余白
	Margin     = 50.0
	MinRadius  = 150.0 // 複数ノードSCCの円形配置の最小半径
	RadiusStep = 60.0  // SCCのノード数に応じた半径の増加量
)

// ---- 入出力の型 ----

// Node は board_nodes の1行に対応する。
type Node struct {
	ID string
}

// Edge は board_edges の1行に対応する（有向辺）。
type Edge struct {
	FromNodeID string
	ToNodeID   string
}

// Position はキャンバス上の座標。
type Position struct {
	X float64
	Y float64
}

// ---- 公開API ----

// Calculate は全ノードの (x, y) 座標を返す。
//
// 手順:
//  1. エッジから隣接リストを構築する。
//  2. Tarjanのアルゴリズムで強連結成分（SCC）を検出する。
//  3. SCC を縮約した DAG を構築する。
//  4. 各SCCのランク = DAG内のソースからの最長パス長 を求める。
//  5. ランクごとに行を作り、上から下へ中央揃えで配置する。
//  6. SCC内の配置: ノード1つ → 中央、複数 → 円形。
func Calculate(nodes []Node, edges []Edge) map[string]Position {
	n := len(nodes)
	if n == 0 {
		return map[string]Position{}
	}

	// ノードID → 整数インデックス
	idx := make(map[string]int, n)
	for i, nd := range nodes {
		idx[nd.ID] = i
	}

	// 整数インデックスで表した隣接リスト
	adj := make([][]int, n)
	for _, e := range edges {
		u, ok1 := idx[e.FromNodeID]
		v, ok2 := idx[e.ToNodeID]
		if ok1 && ok2 && u != v {
			adj[u] = append(adj[u], v)
		}
	}

	// Step 1: SCC検出
	sccs := tarjanSCC(n, adj)
	numSCCs := len(sccs)

	// sccOf[ノードindex] = SCCのindex
	sccOf := make([]int, n)
	for si, scc := range sccs {
		for _, v := range scc {
			sccOf[v] = si
		}
	}

	// Step 2: SCC DAGの構築
	sccAdj := make([]map[int]struct{}, numSCCs)
	for i := range sccAdj {
		sccAdj[i] = make(map[int]struct{})
	}
	for u, neighbors := range adj {
		for _, v := range neighbors {
			si, sj := sccOf[u], sccOf[v]
			if si != sj {
				sccAdj[si][sj] = struct{}{}
			}
		}
	}

	// Step 3: 各SCCのランク（ソースからの最長パス長）を計算
	ranks := longestPathRanks(numSCCs, sccAdj)

	// Step 4: ランクごとにSCCをグループ化
	maxRank := 0
	for _, r := range ranks {
		if r > maxRank {
			maxRank = r
		}
	}
	byRank := make([][]int, maxRank+1)
	for si, r := range ranks {
		byRank[r] = append(byRank[r], si)
	}

	// Step 5: 各SCCのバウンディングボックスサイズを計算
	type size struct{ w, h float64 }
	sccSize := make([]size, numSCCs)
	for si, scc := range sccs {
		if len(scc) == 1 {
			sccSize[si] = size{NodeWidth, NodeHeight}
		} else {
			r := circleRadius(len(scc))
			d := r*2 + NodeWidth
			sccSize[si] = size{d, d}
		}
	}

	// Step 6: 各SCCの中心座標を行ごとに計算
	type point struct{ x, y float64 }
	sccCenter := make([]point, numSCCs)

	curY := Margin
	for _, row := range byRank {
		// 行の高さ = 行内で最も高いSCCの高さ
		rowH := 0.0
		for _, si := range row {
			if sccSize[si].h > rowH {
				rowH = sccSize[si].h
			}
		}
		// 行全体の幅
		rowW := -NodeSep
		for _, si := range row {
			rowW += sccSize[si].w + NodeSep
		}
		// x=0 を中心として左から右へ並べる
		curX := -rowW / 2
		for _, si := range row {
			sccCenter[si] = point{curX + sccSize[si].w/2, curY + rowH/2}
			curX += sccSize[si].w + NodeSep
		}
		curY += rowH + RankSep
	}

	// Step 7: SCCの中心座標からノード座標を計算
	positions := make(map[string]Position, n)
	for si, scc := range sccs {
		cx, cy := sccCenter[si].x, sccCenter[si].y
		if len(scc) == 1 {
			v := scc[0]
			positions[nodes[v].ID] = Position{
				X: cx - NodeWidth/2,
				Y: cy - NodeHeight/2,
			}
		} else {
			// 循環依存のノードは中心点の周りに円形配置
			r := circleRadius(len(scc))
			for i, v := range scc {
				angle := 2*math.Pi*float64(i)/float64(len(scc)) - math.Pi/2
				positions[nodes[v].ID] = Position{
					X: cx + r*math.Cos(angle) - NodeWidth/2,
					Y: cy + r*math.Sin(angle) - NodeHeight/2,
				}
			}
		}
	}

	return positions
}

// ---- 内部ヘルパー ----

// circleRadius は k ノードの円形配置に使う半径を返す。
func circleRadius(k int) float64 {
	r := MinRadius
	if s := float64(k) * RadiusStep; s > r {
		r = s
	}
	return r
}

// tarjanSCC はTarjanのアルゴリズムでSCCを検出し、逆トポロジカル順（シンク優先）で返す。
func tarjanSCC(n int, adj [][]int) [][]int {
	index := 0
	indices := make([]int, n)
	lowlink := make([]int, n)
	onStack := make([]bool, n)
	for i := range indices {
		indices[i] = -1
	}
	var stack []int
	var sccs [][]int

	var strongConnect func(v int)
	strongConnect = func(v int) {
		indices[v] = index
		lowlink[v] = index
		index++
		stack = append(stack, v)
		onStack[v] = true

		for _, w := range adj[v] {
			if indices[w] == -1 {
				strongConnect(w)
				if lowlink[w] < lowlink[v] {
					lowlink[v] = lowlink[w]
				}
			} else if onStack[w] && indices[w] < lowlink[v] {
				lowlink[v] = indices[w]
			}
		}

		// lowlink == index のとき、このノードがSCCの根
		if lowlink[v] == indices[v] {
			var scc []int
			for {
				w := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				onStack[w] = false
				scc = append(scc, w)
				if w == v {
					break
				}
			}
			sccs = append(sccs, scc)
		}
	}

	for v := 0; v < n; v++ {
		if indices[v] == -1 {
			strongConnect(v)
		}
	}
	return sccs
}

// longestPathRanks は SCC DAG における各ノードのランクを返す。
// ランク = DAG内のソース（入次数0）からの最長パス長。
// カーンのトポロジカルソートを使って O(V+E) で計算する。
func longestPathRanks(n int, adj []map[int]struct{}) []int {
	// 入次数を計算
	inDeg := make([]int, n)
	for i := range adj {
		for j := range adj[i] {
			inDeg[j]++
		}
	}

	ranks := make([]int, n)
	// 入次数0のノード（ソース）をキューに積む
	queue := make([]int, 0, n)
	for i := 0; i < n; i++ {
		if inDeg[i] == 0 {
			queue = append(queue, i)
		}
	}

	// BFSで最長パスを更新
	for len(queue) > 0 {
		v := queue[0]
		queue = queue[1:]
		for j := range adj[v] {
			if ranks[v]+1 > ranks[j] {
				ranks[j] = ranks[v] + 1
			}
			inDeg[j]--
			if inDeg[j] == 0 {
				queue = append(queue, j)
			}
		}
	}

	return ranks
}
