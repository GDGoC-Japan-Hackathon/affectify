package reviewgen

import (
	"fmt"
	"sort"
	"strings"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
)

type Feedback struct {
	Type             entity.FeedbackType
	Severity         entity.FeedbackSeverity
	Title            string
	Description      string
	Suggestion       string
	AIRecommendation entity.FeedbackResolution
	TargetNodeIDs    []int64
	TargetEdgeIDs    []int64
	TargetFilePaths  []string
}

type Result struct {
	OverallScore int32
	Summary      string
	ReportData   map[string]any
	Feedbacks    []Feedback
}

func Generate(
	guide *entity.VariantDesignGuide,
	files []entity.VariantFile,
	nodes []entity.Node,
	edges []entity.Edge,
) Result {
	fileByID := make(map[int64]entity.VariantFile, len(files))
	for _, file := range files {
		fileByID[file.ID] = file
	}

	inDegree := make(map[int64]int, len(nodes))
	outDegree := make(map[int64]int, len(nodes))
	implementIncoming := make(map[int64]int)
	for _, edge := range edges {
		outDegree[edge.FromNodeID]++
		inDegree[edge.ToNodeID]++
		if edge.Kind == entity.EdgeKindImplement {
			implementIncoming[edge.ToNodeID]++
		}
	}

	var feedbacks []Feedback
	recommendations := make([]map[string]any, 0)
	risks := make([]map[string]any, 0)
	dependencyIssues := make([]map[string]any, 0)

	trimmedGuide := ""
	if guide != nil {
		trimmedGuide = strings.TrimSpace(guide.Content)
	}
	if len(trimmedGuide) < 120 {
		feedbacks = append(feedbacks, Feedback{
			Type:             entity.FeedbackTypeDesignGuide,
			Severity:         entity.FeedbackSeverityHigh,
			Title:            "設計意図の説明が不足しています",
			Description:      "現在の設計書は短く、責務分割や依存方針をレビューで参照しづらい状態です。",
			Suggestion:       "少なくとも目的、主要コンポーネント、依存境界、変更時の判断基準を追記してください。",
			AIRecommendation: entity.FeedbackResolutionUpdateDesignGuide,
		})
		recommendations = append(recommendations, map[string]any{
			"id":          "guide-coverage",
			"priority":    "high",
			"category":    "architecture",
			"title":       "設計書に責務と依存方針を追記する",
			"description": "レビュー観点が曖昧になっているため、設計書の前提を増やしてください。",
			"impact":      "AI レビューと実装判断の一致率が上がります。",
			"effort":      "medium",
		})
	}

	if len(nodes) >= 3 && len(edges) == 0 {
		targetNodeIDs := firstNodeIDs(nodes, 5)
		feedbacks = append(feedbacks, Feedback{
			Type:             entity.FeedbackTypeCode,
			Severity:         entity.FeedbackSeverityHigh,
			Title:            "依存関係の接続が抽出されていません",
			Description:      "ノードは存在しますが call / implement edge が 1 本もありません。処理の流れが読み取れない状態です。",
			Suggestion:       "関数呼び出しや interface 実装が意図どおり記述されているかを見直し、境界を明示してください。",
			AIRecommendation: entity.FeedbackResolutionFixCode,
			TargetNodeIDs:    targetNodeIDs,
		})
		dependencyIssues = append(dependencyIssues, map[string]any{
			"type":          "missing",
			"severity":      "high",
			"description":   "関数間依存が抽出されておらず、処理経路が不明です。",
			"affectedNodes": toStringIDs(targetNodeIDs),
		})
		risks = append(risks, map[string]any{
			"id":          "missing-dependencies",
			"severity":    "high",
			"category":    "architecture",
			"title":       "依存関係が可視化できていない",
			"description": "コード構造の理解に必要な接続が不足しています。",
			"mitigation":  "依存を明示する設計と、責務分離の確認を行ってください。",
		})
	}

	type fileStat struct {
		path       string
		nodeCount  int
		targetNode []int64
	}
	fileStats := make([]fileStat, 0, len(files))
	for _, file := range files {
		stat := fileStat{path: file.Path}
		for _, node := range nodes {
			if node.VariantFileID != nil && *node.VariantFileID == file.ID {
				stat.nodeCount++
				if len(stat.targetNode) < 4 {
					stat.targetNode = append(stat.targetNode, node.ID)
				}
			}
		}
		if stat.nodeCount > 0 {
			fileStats = append(fileStats, stat)
		}
	}
	sort.Slice(fileStats, func(i, j int) bool {
		if fileStats[i].nodeCount == fileStats[j].nodeCount {
			return fileStats[i].path < fileStats[j].path
		}
		return fileStats[i].nodeCount > fileStats[j].nodeCount
	})
	for _, stat := range fileStats {
		if stat.nodeCount < 12 {
			break
		}
		feedbacks = append(feedbacks, Feedback{
			Type:             entity.FeedbackTypeCode,
			Severity:         entity.FeedbackSeverityMedium,
			Title:            fmt.Sprintf("ファイル %s に責務が集中しています", stat.path),
			Description:      fmt.Sprintf("このファイルには %d 個のノードがあり、責務が集まり始めています。", stat.nodeCount),
			Suggestion:       "関連機能を分割し、依存を小さく保てる単位でファイルを整理してください。",
			AIRecommendation: entity.FeedbackResolutionFixCode,
			TargetNodeIDs:    stat.targetNode,
			TargetFilePaths:  []string{stat.path},
		})
		if len(recommendations) < 4 {
			recommendations = append(recommendations, map[string]any{
				"id":          "large-file-" + sanitizeID(stat.path),
				"priority":    "medium",
				"category":    "maintainability",
				"title":       "大きいファイルを分割する",
				"description": fmt.Sprintf("%s はノード数が多く、責務分離が弱くなっています。", stat.path),
				"impact":      "変更時の影響範囲を減らせます。",
				"effort":      "medium",
			})
		}
		if len(feedbacks) >= 6 {
			break
		}
	}

	isolated := make([]entity.Node, 0)
	for _, node := range nodes {
		if inDegree[node.ID] == 0 && outDegree[node.ID] == 0 {
			isolated = append(isolated, node)
		}
	}
	if len(nodes) > 0 && len(isolated)*100/len(nodes) >= 35 {
		targetNodeIDs := firstNodeIDs(isolated, 5)
		feedbacks = append(feedbacks, Feedback{
			Type:             entity.FeedbackTypeCode,
			Severity:         entity.FeedbackSeverityMedium,
			Title:            "孤立ノードが多く責務のつながりが見えづらいです",
			Description:      fmt.Sprintf("全 %d ノード中 %d ノードが孤立しており、責務の流れを追いにくい状態です。", len(nodes), len(isolated)),
			Suggestion:       "関連する呼び出しや実装関係を明示し、独立しすぎた処理を見直してください。",
			AIRecommendation: entity.FeedbackResolutionFixCode,
			TargetNodeIDs:    targetNodeIDs,
		})
	}

	interfaceNodes := make([]entity.Node, 0)
	for _, node := range nodes {
		if node.Kind == entity.NodeKindInterface && implementIncoming[node.ID] == 0 {
			interfaceNodes = append(interfaceNodes, node)
		}
	}
	for _, node := range interfaceNodes {
		filePath := filePathForNode(node, fileByID)
		feedbacks = append(feedbacks, Feedback{
			Type:             entity.FeedbackTypeCode,
			Severity:         entity.FeedbackSeverityMedium,
			Title:            fmt.Sprintf("interface %s の実装が見つかっていません", node.Title),
			Description:      "interface ノードは存在しますが implement edge が無く、利用意図が不明です。",
			Suggestion:       "実装を追加するか、現時点で不要なら interface の抽象化を見直してください。",
			AIRecommendation: entity.FeedbackResolutionFixCode,
			TargetNodeIDs:    []int64{node.ID},
			TargetFilePaths:  compactStrings([]string{filePath}),
		})
		if len(feedbacks) >= 8 {
			break
		}
	}

	if len(feedbacks) == 0 {
		feedbacks = append(feedbacks, Feedback{
			Type:             entity.FeedbackTypeCode,
			Severity:         entity.FeedbackSeverityLow,
			Title:            "大きな問題は見つかりませんでした",
			Description:      "現在の graph からは大きな構造上の問題を検出していません。",
			Suggestion:       "設計書の更新と定期レビューを続けてください。",
			AIRecommendation: entity.FeedbackResolutionUpdateDesignGuide,
			TargetNodeIDs:    firstNodeIDs(nodes, 3),
		})
	}

	score := int32(92)
	for _, feedback := range feedbacks {
		switch feedback.Severity {
		case entity.FeedbackSeverityHigh:
			score -= 15
		case entity.FeedbackSeverityMedium:
			score -= 8
		default:
			score -= 3
		}
	}
	if score < 20 {
		score = 20
	}

	summary := buildSummary(guide, nodes, edges, feedbacks)
	reportData := map[string]any{
		"overview": map[string]any{
			"summary":   summary,
			"purpose":   buildPurpose(guide),
			"techStack": []string{"Go"},
		},
		"architecture": map[string]any{
			"pattern":     "service-repository",
			"description": buildArchitectureDescription(nodes, edges),
			"strengths": []string{
				fmt.Sprintf("解析済みノード %d 件", len(nodes)),
				fmt.Sprintf("解析済みエッジ %d 件", len(edges)),
			},
			"weaknesses": collectWeaknesses(feedbacks),
		},
		"dependencies": map[string]any{
			"totalCount": len(edges),
			"byType": map[string]any{
				"internal": len(edges),
				"external": 0,
				"circular": 0,
			},
			"issues": dependencyIssues,
		},
		"codeQuality": map[string]any{
			"overallScore": score,
			"metrics": map[string]any{
				"maintainability": clampScore(score + 4),
				"complexity":      clampScore(score - 2),
				"testability":     clampScore(score),
				"reusability":     clampScore(score - 1),
			},
		},
		"recommendations": recommendations,
		"risks":           risks,
	}

	return Result{
		OverallScore: score,
		Summary:      summary,
		ReportData:   reportData,
		Feedbacks:    feedbacks,
	}
}

func buildSummary(guide *entity.VariantDesignGuide, nodes []entity.Node, edges []entity.Edge, feedbacks []Feedback) string {
	if len(feedbacks) == 0 {
		return fmt.Sprintf("ノード %d 件、エッジ %d 件を解析し、大きな問題は見つかりませんでした。", len(nodes), len(edges))
	}
	top := feedbacks[0]
	if guide == nil || strings.TrimSpace(guide.Content) == "" {
		return fmt.Sprintf("ノード %d 件・エッジ %d 件を解析しました。最大の課題は \"%s\" で、設計書の情報不足がレビュー精度を下げています。", len(nodes), len(edges), top.Title)
	}
	return fmt.Sprintf("ノード %d 件・エッジ %d 件を解析しました。最大の課題は \"%s\" です。", len(nodes), len(edges), top.Title)
}

func buildPurpose(guide *entity.VariantDesignGuide) string {
	if guide == nil {
		return "設計書が未設定のため、コード構造から目的を推定しています。"
	}
	content := strings.TrimSpace(guide.Content)
	if content == "" {
		return "設計書本文が空です。"
	}
	if len(content) > 120 {
		return content[:120]
	}
	return content
}

func buildArchitectureDescription(nodes []entity.Node, edges []entity.Edge) string {
	interfaceCount := 0
	methodCount := 0
	for _, node := range nodes {
		switch node.Kind {
		case entity.NodeKindInterface:
			interfaceCount++
		case entity.NodeKindMethod:
			methodCount++
		}
	}
	return fmt.Sprintf("関数/メソッド中心の構成です。interface %d 件、method %d 件、edge %d 件を検出しました。", interfaceCount, methodCount, len(edges))
}

func collectWeaknesses(feedbacks []Feedback) []string {
	items := make([]string, 0, len(feedbacks))
	for _, feedback := range feedbacks {
		items = append(items, feedback.Title)
		if len(items) == 3 {
			break
		}
	}
	return items
}

func clampScore(score int32) int32 {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func firstNodeIDs(items []entity.Node, limit int) []int64 {
	ids := make([]int64, 0, min(limit, len(items)))
	for i, item := range items {
		if i >= limit {
			break
		}
		ids = append(ids, item.ID)
	}
	return ids
}

func toStringIDs(ids []int64) []string {
	items := make([]string, 0, len(ids))
	for _, id := range ids {
		items = append(items, fmt.Sprintf("%d", id))
	}
	return items
}

func filePathForNode(node entity.Node, fileByID map[int64]entity.VariantFile) string {
	if node.VariantFileID == nil {
		return ""
	}
	file, ok := fileByID[*node.VariantFileID]
	if !ok {
		return ""
	}
	return file.Path
}

func compactStrings(values []string) []string {
	items := make([]string, 0, len(values))
	for _, value := range values {
		if value != "" {
			items = append(items, value)
		}
	}
	return items
}

func sanitizeID(value string) string {
	replacer := strings.NewReplacer("/", "-", ".", "-", " ", "-")
	return replacer.Replace(value)
}
