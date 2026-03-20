package layout

import (
	"fmt"
	"math"
	"sort"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

const (
	nodeW               = 260.0
	nodeH               = 200.0
	defaultXGap         = 200.0
	defaultYGap         = 200.0
	defaultBaseRadius   = 700.0
	defaultLayerGap     = 180.0
	defaultNodeRadial   = 35.0
	defaultRandomSpread = 80.0
)

type Position struct {
	X float64
	Y float64
}

func Compute(nodes []entity.Node, edges []entity.Edge, layoutType entity.LayoutType) map[int64]Position {
	switch layoutType {
	case entity.LayoutTypeCircular:
		return computeCircular(nodes, edges)
	case entity.LayoutTypeRandom:
		return computeRandom(nodes)
	default:
		return computeGrid(nodes, edges)
	}
}

func computeGrid(nodes []entity.Node, edges []entity.Edge) map[int64]Position {
	if len(nodes) == 0 {
		return map[int64]Position{}
	}

	sccs := computeSCCs(nodes, edges)
	levels := assignLevels(sccs, edges)
	levelToSCCs := map[int][]int{}
	for i := range sccs {
		level := levels[i]
		levelToSCCs[level] = append(levelToSCCs[level], i)
	}

	sortedLevels := make([]int, 0, len(levelToSCCs))
	for level := range levelToSCCs {
		sortedLevels = append(sortedLevels, level)
	}
	sort.Ints(sortedLevels)

	sccCenters := map[int]Position{}
	cursorX := 0.0
	for _, level := range sortedLevels {
		sccIndexes := levelToSCCs[level]
		maxW, maxH := 0.0, 0.0
		for _, idx := range sccIndexes {
			w, h := sccBounds(len(sccs[idx]))
			if w > maxW {
				maxW = w
			}
			if h > maxH {
				maxH = h
			}
		}
		cols, rows := chooseGridShape(len(sccIndexes), maxW, maxH, defaultXGap, defaultYGap)
		levelH := float64(rows)*maxH + float64(max(0, rows-1))*defaultYGap
		levelW := float64(cols)*maxW + float64(max(0, cols-1))*defaultXGap

		for k, idx := range sccIndexes {
			row := k / cols
			col := k % cols
			sccCenters[idx] = Position{
				X: cursorX + float64(col)*(maxW+defaultXGap) + maxW/2,
				Y: -levelH/2 + float64(row)*(maxH+defaultYGap) + maxH/2,
			}
		}
		cursorX += levelW + defaultXGap
	}

	return expandSCCCenters(sccs, sccCenters)
}

func computeCircular(nodes []entity.Node, edges []entity.Edge) map[int64]Position {
	if len(nodes) == 0 {
		return map[int64]Position{}
	}

	sccs := computeSCCs(nodes, edges)
	levels := assignLevels(sccs, edges)
	levelToSCCs := map[int][]int{}
	maxLevel := 0
	for i := range sccs {
		level := levels[i]
		levelToSCCs[level] = append(levelToSCCs[level], i)
		if level > maxLevel {
			maxLevel = level
		}
	}

	sortedLevels := make([]int, 0, len(levelToSCCs))
	for level := range levelToSCCs {
		sortedLevels = append(sortedLevels, level)
	}
	sort.Ints(sortedLevels)

	sccCenters := map[int]Position{}
	for _, level := range sortedLevels {
		indexes := levelToSCCs[level]
		radius := defaultBaseRadius + float64(maxLevel-level)*defaultLayerGap
		anglePer := 2 * math.Pi / math.Max(1, float64(len(indexes)))
		offset := stableUnit(fmt.Sprintf("layer:%d", level)) * 2 * math.Pi

		for k, idx := range indexes {
			angle := float64(k)*anglePer + offset - math.Pi/2
			sccCenters[idx] = Position{
				X: radius * math.Cos(angle),
				Y: radius * math.Sin(angle),
			}
		}
	}

	return expandSCCCenters(sccs, sccCenters)
}

func computeRandom(nodes []entity.Node) map[int64]Position {
	positions := make(map[int64]Position, len(nodes))
	placed := make([]Position, 0, len(nodes))
	area := math.Sqrt(float64(len(nodes))) * math.Max(nodeW+defaultRandomSpread, nodeH+defaultRandomSpread) * 2.5

	for _, node := range nodes {
		position := Position{}
		found := false
		for attempt := 0; attempt < 300; attempt++ {
			x := (stableUnit(fmt.Sprintf("%d:x:%d", node.ID, attempt))*2 - 1) * area * 0.5
			y := (stableUnit(fmt.Sprintf("%d:y:%d", node.ID, attempt))*2 - 1) * area * 0.5
			candidate := Position{X: x, Y: y}
			if !overlaps(candidate, placed) {
				position = candidate
				found = true
				break
			}
		}
		if !found {
			position = Position{
				X: (stableUnit(fmt.Sprintf("%d:fx", node.ID))*2 - 1) * area,
				Y: (stableUnit(fmt.Sprintf("%d:fy", node.ID))*2 - 1) * area,
			}
		}
		positions[node.ID] = position
		placed = append(placed, position)
	}

	return positions
}

func expandSCCCenters(sccs [][]entity.Node, centers map[int]Position) map[int64]Position {
	positions := map[int64]Position{}
	for idx, scc := range sccs {
		center := centers[idx]
		if len(scc) == 1 {
			positions[scc[0].ID] = Position{
				X: center.X - nodeW/2,
				Y: center.Y - nodeH/2,
			}
			continue
		}

		radius := math.Max(180, float64(len(scc))*70)
		for k, node := range scc {
			angle := 2*math.Pi*float64(k)/float64(len(scc)) - math.Pi/2
			positions[node.ID] = Position{
				X: center.X + radius*math.Cos(angle) - nodeW/2,
				Y: center.Y + radius*math.Sin(angle) - nodeH/2,
			}
		}
	}
	return positions
}

func sccBounds(count int) (float64, float64) {
	if count <= 1 {
		return nodeW, nodeH
	}
	radius := math.Max(180, float64(count)*70)
	size := radius*2 + nodeW
	return size, size
}

func chooseGridShape(count int, cellW, cellH, xGap, yGap float64) (int, int) {
	if count <= 1 {
		return 1, 1
	}

	bestCols, bestRows := 1, count
	bestScore := math.Inf(1)
	for cols := 1; cols <= count; cols++ {
		rows := int(math.Ceil(float64(count) / float64(cols)))
		width := float64(cols)*cellW + float64(max(0, cols-1))*xGap
		height := float64(rows)*cellH + float64(max(0, rows-1))*yGap
		score := math.Abs(math.Log(width / math.Max(height, 1)))
		if score < bestScore {
			bestScore = score
			bestCols, bestRows = cols, rows
		}
	}
	return bestCols, bestRows
}

func computeSCCs(nodes []entity.Node, edges []entity.Edge) [][]entity.Node {
	indexByID := make(map[int64]int, len(nodes))
	for i, node := range nodes {
		indexByID[node.ID] = i
	}

	graph := make([][]int, len(nodes))
	for _, edge := range edges {
		from, okFrom := indexByID[edge.FromNodeID]
		to, okTo := indexByID[edge.ToNodeID]
		if !okFrom || !okTo || from == to {
			continue
		}
		graph[from] = append(graph[from], to)
	}

	timer := 0
	disc := make([]int, len(nodes))
	low := make([]int, len(nodes))
	onStack := make([]bool, len(nodes))
	for i := range disc {
		disc[i] = -1
		low[i] = -1
	}
	stack := []int{}
	result := [][]entity.Node{}

	var strongConnect func(v int)
	strongConnect = func(v int) {
		disc[v] = timer
		low[v] = timer
		timer++
		stack = append(stack, v)
		onStack[v] = true

		for _, w := range graph[v] {
			if disc[w] == -1 {
				strongConnect(w)
				low[v] = min(low[v], low[w])
			} else if onStack[w] {
				low[v] = min(low[v], disc[w])
			}
		}

		if low[v] == disc[v] {
			component := []entity.Node{}
			for {
				w := stack[len(stack)-1]
				stack = stack[:len(stack)-1]
				onStack[w] = false
				component = append(component, nodes[w])
				if w == v {
					break
				}
			}
			result = append(result, component)
		}
	}

	for i := range nodes {
		if disc[i] == -1 {
			strongConnect(i)
		}
	}

	return result
}

func assignLevels(sccs [][]entity.Node, edges []entity.Edge) []int {
	nodeToSCC := map[int64]int{}
	for i, scc := range sccs {
		for _, node := range scc {
			nodeToSCC[node.ID] = i
		}
	}

	outEdges := make([]map[int]struct{}, len(sccs))
	inDegree := make([]int, len(sccs))
	for i := range outEdges {
		outEdges[i] = map[int]struct{}{}
	}
	for _, edge := range edges {
		fromSCC, okFrom := nodeToSCC[edge.FromNodeID]
		toSCC, okTo := nodeToSCC[edge.ToNodeID]
		if !okFrom || !okTo || fromSCC == toSCC {
			continue
		}
		if _, exists := outEdges[fromSCC][toSCC]; exists {
			continue
		}
		outEdges[fromSCC][toSCC] = struct{}{}
		inDegree[toSCC]++
	}

	levels := make([]int, len(sccs))
	queue := []int{}
	for i, degree := range inDegree {
		if degree == 0 {
			queue = append(queue, i)
		}
	}

	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		for next := range outEdges[current] {
			if levels[next] < levels[current]+1 {
				levels[next] = levels[current] + 1
			}
			inDegree[next]--
			if inDegree[next] == 0 {
				queue = append(queue, next)
			}
		}
	}

	return levels
}

func overlaps(candidate Position, placed []Position) bool {
	for _, position := range placed {
		if candidate.X < position.X+nodeW+defaultRandomSpread &&
			candidate.X+nodeW+defaultRandomSpread > position.X &&
			candidate.Y < position.Y+nodeH+defaultRandomSpread &&
			candidate.Y+nodeH+defaultRandomSpread > position.Y {
			return true
		}
	}
	return false
}

func stableUnit(input string) float64 {
	hash := uint32(2166136261)
	for i := 0; i < len(input); i++ {
		hash ^= uint32(input[i])
		hash *= 16777619
	}
	return float64(hash) / float64(^uint32(0))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
