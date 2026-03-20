package reviewai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"google.golang.org/genai"

	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/config"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/reviewgen"
)

type Client struct {
	cfg config.VertexAIConfig
}

func NewClient(cfg config.VertexAIConfig) *Client {
	return &Client{cfg: cfg}
}

func (c *Client) Enabled() bool {
	return c != nil && c.cfg.Enabled()
}

type ReviewInput struct {
	Guide *entity.VariantDesignGuide
	Files []entity.VariantFile
	Nodes []entity.Node
	Edges []entity.Edge
}

type ChatInput struct {
	Guide       *entity.VariantDesignGuide
	Files       []entity.VariantFile
	Nodes       []entity.Node
	Edges       []entity.Edge
	Feedback    *entity.ReviewFeedback
	UserMessage string
}

type reviewOutput struct {
	OverallScore            int32                  `json:"overall_score"`
	Summary                 string                 `json:"summary"`
	Purpose                 string                 `json:"purpose"`
	TechStack               []string               `json:"tech_stack"`
	ArchitecturePattern     string                 `json:"architecture_pattern"`
	ArchitectureDescription string                 `json:"architecture_description"`
	Strengths               []string               `json:"strengths"`
	Weaknesses              []string               `json:"weaknesses"`
	Recommendations         []recommendationOutput `json:"recommendations"`
	Risks                   []riskOutput           `json:"risks"`
	Feedbacks               []feedbackOutput       `json:"feedbacks"`
}

type recommendationOutput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	Category    string `json:"category"`
	Impact      string `json:"impact"`
	Effort      string `json:"effort"`
}

type riskOutput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Severity    string `json:"severity"`
	Category    string `json:"category"`
	Mitigation  string `json:"mitigation"`
}

type feedbackOutput struct {
	Type             string   `json:"type"`
	Severity         string   `json:"severity"`
	Title            string   `json:"title"`
	Description      string   `json:"description"`
	Suggestion       string   `json:"suggestion"`
	AIRecommendation string   `json:"ai_recommendation"`
	TargetNodeIDs    []int64  `json:"target_node_ids"`
	TargetEdgeIDs    []int64  `json:"target_edge_ids"`
	TargetFilePaths  []string `json:"target_file_paths"`
}

func (c *Client) GenerateReview(ctx context.Context, input ReviewInput) (reviewgen.Result, error) {
	client, err := c.newGenAIClient(ctx)
	if err != nil {
		return reviewgen.Result{}, err
	}

	toolState := newReviewToolState(input)
	text, err := c.runToolChat(
		ctx,
		client,
		reviewSystemInstruction,
		buildReviewPrompt(toolState),
		reviewTools(),
		func(call *genai.FunctionCall) (map[string]any, error) {
			return toolState.execute(call)
		},
		&genai.GenerateContentConfig{
			Temperature:        genai.Ptr[float32](0.2),
			MaxOutputTokens:    8192,
			ResponseMIMEType:   "application/json",
			ResponseJsonSchema: reviewOutputSchema(),
			Tools:              reviewTools(),
			ToolConfig: &genai.ToolConfig{
				FunctionCallingConfig: &genai.FunctionCallingConfig{
					Mode: genai.FunctionCallingConfigModeAuto,
				},
			},
		},
	)
	if err != nil {
		return reviewgen.Result{}, err
	}

	var out reviewOutput
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return reviewgen.Result{}, fmt.Errorf("parse vertex ai review json: %w", err)
	}
	return toReviewResult(input, out), nil
}

func (c *Client) GenerateChatReply(ctx context.Context, input ChatInput) (string, error) {
	client, err := c.newGenAIClient(ctx)
	if err != nil {
		return "", err
	}

	toolState := newChatToolState(input)
	text, err := c.runToolChat(
		ctx,
		client,
		chatSystemInstruction,
		buildChatPrompt(input),
		chatTools(),
		func(call *genai.FunctionCall) (map[string]any, error) {
			return toolState.execute(call)
		},
		&genai.GenerateContentConfig{
			Temperature:     genai.Ptr[float32](0.4),
			MaxOutputTokens: 1024,
			Tools:           chatTools(),
			ToolConfig: &genai.ToolConfig{
				FunctionCallingConfig: &genai.FunctionCallingConfig{
					Mode: genai.FunctionCallingConfigModeAuto,
				},
			},
		},
	)
	if err != nil {
		return "", err
	}

	reply := strings.TrimSpace(text)
	if reply == "" {
		return "", errors.New("vertex ai returned empty chat reply")
	}
	return reply, nil
}

func (c *Client) newGenAIClient(ctx context.Context) (*genai.Client, error) {
	if !c.Enabled() {
		return nil, errors.New("vertex ai is not configured")
	}
	return genai.NewClient(ctx, &genai.ClientConfig{
		Backend:  genai.BackendVertexAI,
		Project:  c.cfg.ProjectID,
		Location: c.cfg.Region,
		HTTPOptions: genai.HTTPOptions{
			APIVersion: "v1",
		},
	})
}

func (c *Client) runToolChat(
	ctx context.Context,
	client *genai.Client,
	systemInstruction string,
	prompt string,
	tools []*genai.Tool,
	exec func(*genai.FunctionCall) (map[string]any, error),
	cfg *genai.GenerateContentConfig,
) (string, error) {
	config := *cfg
	config.SystemInstruction = &genai.Content{
		Parts: []*genai.Part{{Text: systemInstruction}},
	}
	config.Tools = tools

	chat, err := client.Chats.Create(ctx, c.cfg.Model, &config, nil)
	if err != nil {
		return "", err
	}

	resp, err := chat.SendMessage(ctx, genai.Part{Text: prompt})
	if err != nil {
		return "", err
	}

	for range 6 {
		if len(resp.FunctionCalls()) == 0 {
			return strings.TrimSpace(resp.Text()), nil
		}

		parts := make([]*genai.Part, 0, len(resp.FunctionCalls()))
		for _, call := range resp.FunctionCalls() {
			payload, err := exec(call)
			if err != nil {
				payload = map[string]any{"error": err.Error()}
			}
			parts = append(parts, &genai.Part{
				FunctionResponse: &genai.FunctionResponse{
					ID:       call.ID,
					Name:     call.Name,
					Response: payload,
				},
			})
		}

		resp, err = chat.Send(ctx, parts...)
		if err != nil {
			return "", err
		}
	}

	return "", errors.New("vertex ai function-calling loop exceeded limit")
}

type reviewToolState struct {
	guide *entity.VariantDesignGuide
	files []entity.VariantFile
	nodes []entity.Node
	edges []entity.Edge
}

func newReviewToolState(input ReviewInput) *reviewToolState {
	return &reviewToolState{
		guide: input.Guide,
		files: input.Files,
		nodes: input.Nodes,
		edges: input.Edges,
	}
}

func (s *reviewToolState) execute(call *genai.FunctionCall) (map[string]any, error) {
	switch call.Name {
	case "get_design_guide":
		return map[string]any{
			"output": map[string]any{
				"title":       stringOrEmpty(s.guide, func(g *entity.VariantDesignGuide) string { return g.Title }),
				"description": stringOrEmpty(s.guide, func(g *entity.VariantDesignGuide) string { return derefString(g.Description) }),
				"content":     stringOrEmpty(s.guide, func(g *entity.VariantDesignGuide) string { return g.Content }),
			},
		}, nil
	case "get_graph_summary":
		return map[string]any{
			"output": map[string]any{
				"file_count":        countVisibleFiles(s.files),
				"node_count":        len(s.nodes),
				"edge_count":        len(s.edges),
				"node_kinds":        countNodeKinds(s.nodes),
				"edge_kinds":        countEdgeKinds(s.edges),
				"isolated_node_ids": isolatedNodeIDs(s.nodes, s.edges, 12),
			},
		}, nil
	case "list_files":
		limit := clampLimit(readIntArg(call.Args, "limit", 12), 1, 50)
		return map[string]any{
			"output": listFilesPayload(s.files, s.nodes, limit),
		}, nil
	case "list_nodes":
		limit := clampLimit(readIntArg(call.Args, "limit", 20), 1, 80)
		kind := strings.TrimSpace(readStringArg(call.Args, "kind"))
		return map[string]any{
			"output": listNodesPayload(s.nodes, s.files, kind, limit),
		}, nil
	case "list_edges":
		limit := clampLimit(readIntArg(call.Args, "limit", 24), 1, 100)
		kind := strings.TrimSpace(readStringArg(call.Args, "kind"))
		return map[string]any{
			"output": listEdgesPayload(s.edges, kind, limit),
		}, nil
	default:
		return nil, fmt.Errorf("unsupported tool: %s", call.Name)
	}
}

type chatToolState struct {
	input ChatInput
}

func newChatToolState(input ChatInput) *chatToolState {
	return &chatToolState{input: input}
}

func (s *chatToolState) execute(call *genai.FunctionCall) (map[string]any, error) {
	switch call.Name {
	case "get_feedback_context":
		feedback := s.input.Feedback
		if feedback == nil {
			return map[string]any{"output": map[string]any{}}, nil
		}
		return map[string]any{
			"output": map[string]any{
				"title":             feedback.Title,
				"description":       feedback.Description,
				"suggestion":        feedback.Suggestion,
				"severity":          string(feedback.Severity),
				"status":            string(feedback.Status),
				"ai_recommendation": derefResolution(feedback.AIRecommendation),
			},
		}, nil
	case "get_design_guide":
		return map[string]any{
			"output": map[string]any{
				"title":       stringOrEmpty(s.input.Guide, func(g *entity.VariantDesignGuide) string { return g.Title }),
				"description": stringOrEmpty(s.input.Guide, func(g *entity.VariantDesignGuide) string { return derefString(g.Description) }),
				"content":     truncate(stringOrEmpty(s.input.Guide, func(g *entity.VariantDesignGuide) string { return g.Content }), 3000),
			},
		}, nil
	case "get_workspace_summary":
		return map[string]any{
			"output": map[string]any{
				"file_count": countVisibleFiles(s.input.Files),
				"node_count": len(s.input.Nodes),
				"edge_count": len(s.input.Edges),
				"node_kinds": countNodeKinds(s.input.Nodes),
				"edge_kinds": countEdgeKinds(s.input.Edges),
			},
		}, nil
	default:
		return nil, fmt.Errorf("unsupported tool: %s", call.Name)
	}
}

func reviewTools() []*genai.Tool {
	return []*genai.Tool{{
		FunctionDeclarations: []*genai.FunctionDeclaration{
			{
				Name:                 "get_design_guide",
				Description:          "Returns the current design guide title, description, and content.",
				ParametersJsonSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			},
			{
				Name:                 "get_graph_summary",
				Description:          "Returns high-level counts and structure statistics for files, nodes, edges, and isolated nodes.",
				ParametersJsonSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			},
			{
				Name:        "list_files",
				Description: "Lists imported files with path and node count. Use when you need concrete file targets.",
				ParametersJsonSchema: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"limit": map[string]any{"type": "integer"},
					},
				},
			},
			{
				Name:        "list_nodes",
				Description: "Lists graph nodes. Optionally filter by node kind such as function, method, or interface.",
				ParametersJsonSchema: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"kind":  map[string]any{"type": "string"},
						"limit": map[string]any{"type": "integer"},
					},
				},
			},
			{
				Name:        "list_edges",
				Description: "Lists graph edges. Optionally filter by edge kind such as call or implement.",
				ParametersJsonSchema: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"kind":  map[string]any{"type": "string"},
						"limit": map[string]any{"type": "integer"},
					},
				},
			},
		},
	}}
}

func chatTools() []*genai.Tool {
	return []*genai.Tool{{
		FunctionDeclarations: []*genai.FunctionDeclaration{
			{
				Name:                 "get_feedback_context",
				Description:          "Returns the selected review feedback card details.",
				ParametersJsonSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			},
			{
				Name:                 "get_design_guide",
				Description:          "Returns the current design guide for the variant.",
				ParametersJsonSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			},
			{
				Name:                 "get_workspace_summary",
				Description:          "Returns the current workspace graph summary.",
				ParametersJsonSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			},
		},
	}}
}

const reviewSystemInstruction = `You are a senior software architect reviewing a Go codebase and its design guide.
Return only valid JSON that matches the requested schema.
You may call tools when needed before finalizing.
Feedback must be specific, actionable, and grounded in the provided workspace data.
Allowed feedback.type values: design_guide, code.
Allowed severity values: high, medium, low.
Allowed ai_recommendation values: update_design_guide, fix_code, both.
Do not invent node IDs, edge IDs, or file paths.`

const chatSystemInstruction = `You are an AI reviewer responding inside a design/code review workspace.
Answer in Japanese, concise but specific. You may call tools for context.
Do not claim certainty if the available context is limited.`

func buildReviewPrompt(state *reviewToolState) string {
	return fmt.Sprintf(
		"Review this variant workspace and produce a structured review.\nCurrent quick stats: files=%d nodes=%d edges=%d.\nUse tools if you need more detail before finalizing.\nGive 3-8 feedback items with concrete targets when possible.",
		countVisibleFiles(state.files),
		len(state.nodes),
		len(state.edges),
	)
}

func buildChatPrompt(input ChatInput) string {
	return fmt.Sprintf(
		"User message: %s\nReply to the selected feedback card. Give a practical next step and mention whether design guide, code, or both should be updated.",
		input.UserMessage,
	)
}

func reviewOutputSchema() map[string]any {
	return map[string]any{
		"type":     "object",
		"required": []string{"overall_score", "summary", "feedbacks"},
		"properties": map[string]any{
			"overall_score": map[string]any{"type": "integer"},
			"summary":       map[string]any{"type": "string"},
			"purpose":       map[string]any{"type": "string"},
			"tech_stack": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"architecture_pattern":     map[string]any{"type": "string"},
			"architecture_description": map[string]any{"type": "string"},
			"strengths": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"weaknesses": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
			"recommendations": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"title":       map[string]any{"type": "string"},
						"description": map[string]any{"type": "string"},
						"priority":    map[string]any{"type": "string"},
						"category":    map[string]any{"type": "string"},
						"impact":      map[string]any{"type": "string"},
						"effort":      map[string]any{"type": "string"},
					},
				},
			},
			"risks": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type": "object",
					"properties": map[string]any{
						"title":       map[string]any{"type": "string"},
						"description": map[string]any{"type": "string"},
						"severity":    map[string]any{"type": "string"},
						"category":    map[string]any{"type": "string"},
						"mitigation":  map[string]any{"type": "string"},
					},
				},
			},
			"feedbacks": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":     "object",
					"required": []string{"type", "severity", "title", "description", "suggestion", "ai_recommendation"},
					"properties": map[string]any{
						"type":              map[string]any{"type": "string"},
						"severity":          map[string]any{"type": "string"},
						"title":             map[string]any{"type": "string"},
						"description":       map[string]any{"type": "string"},
						"suggestion":        map[string]any{"type": "string"},
						"ai_recommendation": map[string]any{"type": "string"},
						"target_node_ids": map[string]any{
							"type":  "array",
							"items": map[string]any{"type": "integer"},
						},
						"target_edge_ids": map[string]any{
							"type":  "array",
							"items": map[string]any{"type": "integer"},
						},
						"target_file_paths": map[string]any{
							"type":  "array",
							"items": map[string]any{"type": "string"},
						},
					},
				},
			},
		},
	}
}

func toReviewResult(input ReviewInput, out reviewOutput) reviewgen.Result {
	if out.OverallScore < 0 {
		out.OverallScore = 0
	}
	if out.OverallScore > 100 {
		out.OverallScore = 100
	}
	if len(out.TechStack) == 0 {
		out.TechStack = []string{"Go"}
	}

	result := reviewgen.Result{
		OverallScore: out.OverallScore,
		Summary:      strings.TrimSpace(out.Summary),
		Feedbacks:    make([]reviewgen.Feedback, 0, len(out.Feedbacks)),
	}
	for _, feedback := range out.Feedbacks {
		result.Feedbacks = append(result.Feedbacks, reviewgen.Feedback{
			Type:             normalizeFeedbackType(feedback.Type),
			Severity:         normalizeSeverity(feedback.Severity),
			Title:            strings.TrimSpace(feedback.Title),
			Description:      strings.TrimSpace(feedback.Description),
			Suggestion:       strings.TrimSpace(feedback.Suggestion),
			AIRecommendation: normalizeResolution(feedback.AIRecommendation),
			TargetNodeIDs:    feedback.TargetNodeIDs,
			TargetEdgeIDs:    feedback.TargetEdgeIDs,
			TargetFilePaths:  compactStrings(feedback.TargetFilePaths),
		})
	}

	weaknesses := out.Weaknesses
	if len(weaknesses) == 0 {
		weaknesses = collectWeaknessesFromFeedbacks(result.Feedbacks)
	}

	result.ReportData = map[string]any{
		"overview": map[string]any{
			"summary":   result.Summary,
			"purpose":   strings.TrimSpace(out.Purpose),
			"techStack": out.TechStack,
		},
		"architecture": map[string]any{
			"pattern":     strings.TrimSpace(out.ArchitecturePattern),
			"description": strings.TrimSpace(out.ArchitectureDescription),
			"strengths":   compactStrings(out.Strengths),
			"weaknesses":  compactStrings(weaknesses),
		},
		"dependencies": map[string]any{
			"totalCount": len(input.Edges),
			"byType": map[string]any{
				"internal": len(input.Edges),
				"external": 0,
				"circular": 0,
			},
			"issues": dependencyIssuesFromFeedbacks(result.Feedbacks),
		},
		"codeQuality": map[string]any{
			"overallScore": result.OverallScore,
			"metrics": map[string]any{
				"maintainability": boundedScore(result.OverallScore),
				"complexity":      boundedScore(result.OverallScore - 5),
				"testability":     boundedScore(result.OverallScore - 3),
				"reusability":     boundedScore(result.OverallScore - 2),
			},
		},
		"recommendations": recommendationMaps(out.Recommendations),
		"risks":           riskMaps(out.Risks),
	}

	return result
}

func normalizeFeedbackType(value string) entity.FeedbackType {
	switch strings.TrimSpace(value) {
	case string(entity.FeedbackTypeDesignGuide):
		return entity.FeedbackTypeDesignGuide
	default:
		return entity.FeedbackTypeCode
	}
}

func normalizeSeverity(value string) entity.FeedbackSeverity {
	switch strings.TrimSpace(value) {
	case string(entity.FeedbackSeverityHigh):
		return entity.FeedbackSeverityHigh
	case string(entity.FeedbackSeverityMedium):
		return entity.FeedbackSeverityMedium
	default:
		return entity.FeedbackSeverityLow
	}
}

func normalizeResolution(value string) entity.FeedbackResolution {
	switch strings.TrimSpace(value) {
	case string(entity.FeedbackResolutionUpdateDesignGuide):
		return entity.FeedbackResolutionUpdateDesignGuide
	case string(entity.FeedbackResolutionFixCode):
		return entity.FeedbackResolutionFixCode
	default:
		return entity.FeedbackResolutionBoth
	}
}

func countVisibleFiles(files []entity.VariantFile) int {
	count := 0
	for _, file := range files {
		if file.IsVisible {
			count++
		}
	}
	return count
}

func countNodeKinds(nodes []entity.Node) map[string]int {
	out := map[string]int{}
	for _, node := range nodes {
		out[string(node.Kind)]++
	}
	return out
}

func countEdgeKinds(edges []entity.Edge) map[string]int {
	out := map[string]int{}
	for _, edge := range edges {
		out[string(edge.Kind)]++
	}
	return out
}

func isolatedNodeIDs(nodes []entity.Node, edges []entity.Edge, limit int) []int64 {
	inDegree := map[int64]int{}
	outDegree := map[int64]int{}
	for _, edge := range edges {
		outDegree[edge.FromNodeID]++
		inDegree[edge.ToNodeID]++
	}
	out := make([]int64, 0, limit)
	for _, node := range nodes {
		if inDegree[node.ID] == 0 && outDegree[node.ID] == 0 {
			out = append(out, node.ID)
			if len(out) >= limit {
				break
			}
		}
	}
	return out
}

func listFilesPayload(files []entity.VariantFile, nodes []entity.Node, limit int) []map[string]any {
	nodeCountByFileID := map[int64]int{}
	for _, node := range nodes {
		if node.VariantFileID != nil {
			nodeCountByFileID[*node.VariantFileID]++
		}
	}
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	out := make([]map[string]any, 0, min(limit, len(files)))
	for _, file := range files {
		out = append(out, map[string]any{
			"id":         file.ID,
			"path":       file.Path,
			"language":   derefString(file.Language),
			"node_count": nodeCountByFileID[file.ID],
		})
		if len(out) >= limit {
			break
		}
	}
	return out
}

func listNodesPayload(nodes []entity.Node, files []entity.VariantFile, kind string, limit int) []map[string]any {
	filePathByID := map[int64]string{}
	for _, file := range files {
		filePathByID[file.ID] = file.Path
	}
	filtered := make([]entity.Node, 0, len(nodes))
	for _, node := range nodes {
		if kind == "" || string(node.Kind) == kind {
			filtered = append(filtered, node)
		}
	}
	sort.Slice(filtered, func(i, j int) bool {
		if filtered[i].Kind == filtered[j].Kind {
			return filtered[i].Title < filtered[j].Title
		}
		return filtered[i].Kind < filtered[j].Kind
	})
	out := make([]map[string]any, 0, min(limit, len(filtered)))
	for _, node := range filtered {
		filePath := ""
		if node.VariantFileID != nil {
			filePath = filePathByID[*node.VariantFileID]
		}
		out = append(out, map[string]any{
			"id":        node.ID,
			"kind":      string(node.Kind),
			"title":     node.Title,
			"receiver":  derefString(node.Receiver),
			"signature": derefString(node.Signature),
			"file_path": filePath,
		})
		if len(out) >= limit {
			break
		}
	}
	return out
}

func listEdgesPayload(edges []entity.Edge, kind string, limit int) []map[string]any {
	filtered := make([]entity.Edge, 0, len(edges))
	for _, edge := range edges {
		if kind == "" || string(edge.Kind) == kind {
			filtered = append(filtered, edge)
		}
	}
	sort.Slice(filtered, func(i, j int) bool { return filtered[i].ID < filtered[j].ID })
	out := make([]map[string]any, 0, min(limit, len(filtered)))
	for _, edge := range filtered {
		out = append(out, map[string]any{
			"id":      edge.ID,
			"kind":    string(edge.Kind),
			"from_id": edge.FromNodeID,
			"to_id":   edge.ToNodeID,
			"label":   derefString(edge.Label),
			"style":   string(edge.Style),
		})
		if len(out) >= limit {
			break
		}
	}
	return out
}

func recommendationMaps(items []recommendationOutput) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]any{
			"id":          sanitizeID(item.Title),
			"priority":    item.Priority,
			"category":    item.Category,
			"title":       item.Title,
			"description": item.Description,
			"impact":      item.Impact,
			"effort":      item.Effort,
		})
	}
	return out
}

func riskMaps(items []riskOutput) []map[string]any {
	out := make([]map[string]any, 0, len(items))
	for _, item := range items {
		out = append(out, map[string]any{
			"id":          sanitizeID(item.Title),
			"severity":    item.Severity,
			"category":    item.Category,
			"title":       item.Title,
			"description": item.Description,
			"mitigation":  item.Mitigation,
		})
	}
	return out
}

func dependencyIssuesFromFeedbacks(feedbacks []reviewgen.Feedback) []map[string]any {
	out := make([]map[string]any, 0)
	for _, feedback := range feedbacks {
		if feedback.Type != entity.FeedbackTypeCode {
			continue
		}
		if len(feedback.TargetNodeIDs) == 0 && len(feedback.TargetEdgeIDs) == 0 {
			continue
		}
		out = append(out, map[string]any{
			"type":          "review",
			"severity":      string(feedback.Severity),
			"description":   feedback.Title,
			"affectedNodes": toStringIDs(feedback.TargetNodeIDs),
		})
		if len(out) >= 6 {
			break
		}
	}
	return out
}

func collectWeaknessesFromFeedbacks(feedbacks []reviewgen.Feedback) []string {
	out := make([]string, 0, len(feedbacks))
	for _, feedback := range feedbacks {
		out = append(out, feedback.Title)
		if len(out) >= 5 {
			break
		}
	}
	return out
}

func boundedScore(score int32) int32 {
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return score
}

func readStringArg(args map[string]any, key string) string {
	if args == nil {
		return ""
	}
	value, _ := args[key].(string)
	return value
}

func readIntArg(args map[string]any, key string, fallback int) int {
	if args == nil {
		return fallback
	}
	switch value := args[key].(type) {
	case int:
		return value
	case int32:
		return int(value)
	case int64:
		return int(value)
	case float64:
		return int(value)
	default:
		return fallback
	}
}

func clampLimit(value, minValue, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func derefResolution(value *entity.FeedbackResolution) string {
	if value == nil {
		return ""
	}
	return string(*value)
}

func stringOrEmpty[T any](value *T, selector func(*T) string) string {
	if value == nil {
		return ""
	}
	return selector(value)
}

func compactStrings(values []string) []string {
	out := make([]string, 0, len(values))
	seen := map[string]struct{}{}
	for _, value := range values {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		out = append(out, value)
	}
	return out
}

func sanitizeID(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	replacer := strings.NewReplacer(" ", "-", "/", "-", "_", "-", ".", "-", ":", "-")
	return replacer.Replace(value)
}

func toStringIDs(ids []int64) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, fmt.Sprintf("%d", id))
	}
	return out
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
