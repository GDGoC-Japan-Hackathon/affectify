package reviewai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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
	Targets     []entity.ReviewFeedbackTarget
	UserMessage string
}

type ResolutionDraftInput struct {
	Guide      *entity.VariantDesignGuide
	Files      []entity.VariantFile
	Nodes      []entity.Node
	Edges      []entity.Edge
	Feedback   *entity.ReviewFeedback
	Targets    []entity.ReviewFeedbackTarget
	Resolution string
}

type ApplyInput struct {
	Guide             *entity.VariantDesignGuide
	Files             map[string]string
	ResolvedFeedbacks []ApplyFeedback
	UpdateDesignGuide bool
	UpdateCode        bool
}

type ApplyFeedback struct {
	Title          string
	Description    string
	Resolution     string
	ResolutionNote string
	FilePaths      []string
	NodeIDs        []int64
	EdgeIDs        []int64
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

type applyOutput struct {
	DesignGuideContent string            `json:"design_guide_content"`
	FileUpdates        []ApplyFileUpdate `json:"file_updates"`
}

type ApplyFileUpdate struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

func (c *Client) GenerateReview(ctx context.Context, input ReviewInput) (reviewgen.Result, error) {
	text, err := c.generateReviewText(ctx, input, 0.2)
	if err != nil {
		return reviewgen.Result{}, err
	}

	var out reviewOutput
	normalizedText := normalizeJSONObject(text)
	if err := json.Unmarshal([]byte(normalizedText), &out); err != nil {
		log.Printf("reviewai: invalid review json len=%d snippet=%q", len(text), truncate(strings.TrimSpace(text), 240))

		retryText, retryErr := c.generateReviewText(ctx, input, 0.0)
		if retryErr != nil {
			return reviewgen.Result{}, fmt.Errorf("parse vertex ai review json: %w", err)
		}

		normalizedRetryText := normalizeJSONObject(retryText)
		if retryParseErr := json.Unmarshal([]byte(normalizedRetryText), &out); retryParseErr != nil {
			log.Printf("reviewai: invalid review json after retry len=%d snippet=%q", len(retryText), truncate(strings.TrimSpace(retryText), 240))
			return reviewgen.Result{}, fmt.Errorf("parse vertex ai review json: %w", retryParseErr)
		}
	}
	return toReviewResult(input, out), nil
}

func (c *Client) generateReviewText(ctx context.Context, input ReviewInput, temperature float32) (string, error) {
	client, err := c.newGenAIClient(ctx)
	if err != nil {
		return "", err
	}

	toolState := newReviewToolState(input)
	return c.runToolChat(
		ctx,
		client,
		reviewSystemInstruction,
		buildReviewPrompt(toolState),
		reviewTools(),
		func(call *genai.FunctionCall) (map[string]any, error) {
			return toolState.execute(call)
		},
		&genai.GenerateContentConfig{
			Temperature:        genai.Ptr[float32](temperature),
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

func (c *Client) GenerateResolutionDraft(ctx context.Context, input ResolutionDraftInput) (string, error) {
	client, err := c.newGenAIClient(ctx)
	if err != nil {
		return "", err
	}

	toolState := newResolutionToolState(input)
	text, err := c.runToolChat(
		ctx,
		client,
		resolutionDraftSystemInstruction,
		buildResolutionDraftPrompt(input),
		resolutionDraftTools(),
		func(call *genai.FunctionCall) (map[string]any, error) {
			return toolState.execute(call)
		},
		&genai.GenerateContentConfig{
			Temperature:     genai.Ptr[float32](0.3),
			MaxOutputTokens: 512,
			Tools:           resolutionDraftTools(),
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

	text = strings.TrimSpace(text)
	if text == "" {
		return "", errors.New("vertex ai returned empty resolution draft")
	}
	if err := validateResolutionDraft(text, input); err != nil {
		return "", err
	}
	return text, nil
}

func (c *Client) GenerateApplyChanges(ctx context.Context, input ApplyInput) (*applyOutput, error) {
	client, err := c.newGenAIClient(ctx)
	if err != nil {
		return nil, err
	}

	fileEntries := make([]map[string]string, 0, len(input.Files))
	paths := make([]string, 0, len(input.Files))
	for path := range input.Files {
		paths = append(paths, path)
	}
	sort.Strings(paths)
	for _, path := range paths {
		fileEntries = append(fileEntries, map[string]string{
			"path":    path,
			"content": input.Files[path],
		})
	}

	payload := map[string]any{
		"update_design_guide": input.UpdateDesignGuide,
		"update_code":         input.UpdateCode,
		"design_guide": map[string]any{
			"title":       stringOrEmpty(input.Guide, func(g *entity.VariantDesignGuide) string { return g.Title }),
			"description": stringOrEmpty(input.Guide, func(g *entity.VariantDesignGuide) string { return derefString(g.Description) }),
			"content":     stringOrEmpty(input.Guide, func(g *entity.VariantDesignGuide) string { return g.Content }),
		},
		"resolved_feedbacks": input.ResolvedFeedbacks,
		"files":              fileEntries,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	cfg := &genai.GenerateContentConfig{
		Temperature:        genai.Ptr[float32](0.2),
		MaxOutputTokens:    8192,
		ResponseMIMEType:   "application/json",
		ResponseJsonSchema: applyOutputSchema(),
	}

	config := *cfg
	config.SystemInstruction = &genai.Content{
		Parts: []*genai.Part{{Text: applyChangesSystemInstruction}},
	}

	resp, err := client.Models.GenerateContent(ctx, c.cfg.Model, []*genai.Content{
		{
			Role: "user",
			Parts: []*genai.Part{{
				Text: buildApplyChangesPrompt(string(body)),
			}},
		},
	}, &config)
	if err != nil {
		return nil, err
	}

	text := strings.TrimSpace(resp.Text())
	if text == "" {
		return nil, errors.New("vertex ai returned empty apply result")
	}

	var out applyOutput
	if err := json.Unmarshal([]byte(text), &out); err != nil {
		return nil, fmt.Errorf("parse vertex ai apply json: %w", err)
	}
	return &out, nil
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
	case "list_files":
		limit := clampLimit(readIntArg(call.Args, "limit", 12), 1, 50)
		return map[string]any{
			"output": listFilesPayload(s.input.Files, s.input.Nodes, limit),
		}, nil
	case "list_nodes":
		limit := clampLimit(readIntArg(call.Args, "limit", 20), 1, 80)
		kind := strings.TrimSpace(readStringArg(call.Args, "kind"))
		return map[string]any{
			"output": listNodesPayload(s.input.Nodes, s.input.Files, kind, limit),
		}, nil
	case "list_edges":
		limit := clampLimit(readIntArg(call.Args, "limit", 24), 1, 100)
		kind := strings.TrimSpace(readStringArg(call.Args, "kind"))
		return map[string]any{
			"output": listEdgesPayload(s.input.Edges, kind, limit),
		}, nil
	case "get_node_context":
		nodeID := readInt64Arg(call.Args, "node_id", 0)
		return map[string]any{
			"output": nodeContextPayload(nodeID, s.input.Nodes, s.input.Files, s.input.Edges),
		}, nil
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
	case "get_feedback_targets":
		return map[string]any{
			"output": feedbackTargetsPayload(s.input.Targets, s.input.Files, s.input.Nodes, s.input.Edges),
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

type resolutionToolState struct {
	input ResolutionDraftInput
}

func newResolutionToolState(input ResolutionDraftInput) *resolutionToolState {
	return &resolutionToolState{input: input}
}

func (s *resolutionToolState) execute(call *genai.FunctionCall) (map[string]any, error) {
	chatState := newChatToolState(ChatInput{
		Guide:    s.input.Guide,
		Files:    s.input.Files,
		Nodes:    s.input.Nodes,
		Edges:    s.input.Edges,
		Feedback: s.input.Feedback,
		Targets:  s.input.Targets,
	})
	return chatState.execute(call)
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
				Name:        "list_files",
				Description: "Lists imported files with path and node count. Use when you need to inspect related files for the current discussion.",
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
			{
				Name:        "get_node_context",
				Description: "Returns one node with its code text, file path, and directly related edges. Use when you need to inspect a specific node deeply.",
				ParametersJsonSchema: map[string]any{
					"type": "object",
					"properties": map[string]any{
						"node_id": map[string]any{"type": "integer"},
					},
					"required": []string{"node_id"},
				},
			},
			{
				Name:                 "get_feedback_context",
				Description:          "Returns the selected review feedback card details.",
				ParametersJsonSchema: map[string]any{"type": "object", "properties": map[string]any{}},
			},
			{
				Name:                 "get_feedback_targets",
				Description:          "Returns the current feedback target files, nodes, and edges with enough detail to inspect the exact affected area.",
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

func resolutionDraftTools() []*genai.Tool {
	return chatTools()
}

const reviewSystemInstruction = `あなたは Go コードベースと設計書をレビューする日本語のソフトウェアアーキテクトです。
返答は必ずスキーマに一致する JSON のみを返してください。
必要なら tool を使ってから最終回答してください。
出力は簡潔にし、overall_score、summary、feedbacks を中心に返してください。
feedback.title、description、suggestion は必ず自然な日本語で書いてください。
feedback.type は design_guide か code のみ、severity は high/medium/low のみ、ai_recommendation は update_design_guide/fix_code/both のみを使ってください。
feedbacks は最大 5 件にしてください。
node ID、edge ID、file path は与えられたものだけを使い、捏造しないでください。`

const chatSystemInstruction = `あなたは設計・コードレビュー workspace 内で応答する日本語の AI レビュアーです。
返答は自然な日本語で、簡潔だが具体的にしてください。
必要なら tool を使って文脈を確認してください。
特定の指摘対象を詳しく見る必要があるときは get_feedback_targets で候補を確認し、必要なら get_node_context で個別 node を掘ってください。
文脈が足りないときは断定しないでください。`

const resolutionDraftSystemInstruction = `あなたはレビュー指摘の解決内容を要約する日本語の AI アシスタントです。
返答は 2-4 文の自然な日本語のみで、箇条書きや見出しは不要です。
選ばれた resolution に従って、何をどう変更するかを具体的に書いてください。
設計書更新なら設計上の変更点、コード修正なら対象となる依存や責務の変更点を含めてください。
必ず対象となる node 名、file path、interface 名、関数名のいずれか1つ以上を文中に含めてください。
「品質向上を図る」「一貫性を高める」「具体的な指針を追記する」のような抽象表現だけで終わってはいけません。`

const applyChangesSystemInstruction = `あなたは確定済みレビュー決定を実際の設計書とコードに反映する日本語の AI ソフトウェアエンジニアです。
返答は必ず JSON のみで返してください。
update_design_guide が true のときだけ design_guide_content を更新し、false のときは空文字にしてください。
update_code が true のときだけ file_updates を返し、対象外ファイルは含めないでください。
file_updates の content は更新後の全文にしてください。path は入力に含まれるものだけを使い、捏造しないでください。
resolved_feedbacks の resolution_note を最優先で反映してください。`

func buildReviewPrompt(state *reviewToolState) string {
	return fmt.Sprintf(
		"この variant workspace をレビューし、構造化された結果を返してください。\n現在の概要: files=%d, nodes=%d, edges=%d。\n必要なら tool を使って詳細を確認し、最大5件の具体的なフィードバックを返してください。summary は 2-3 文で短く、日本語で返してください。",
		countVisibleFiles(state.files),
		len(state.nodes),
		len(state.edges),
	)
}

func buildChatPrompt(input ChatInput) string {
	return fmt.Sprintf(
		"ユーザーのメッセージ: %s\n選択中のフィードバックカードに対して返答してください。次に取るべき実務的な一手を示し、設計書・コード・両方のどれを更新すべきかも日本語で触れてください。",
		input.UserMessage,
	)
}

func buildResolutionDraftPrompt(input ResolutionDraftInput) string {
	return fmt.Sprintf(
		"このレビュー指摘に対して、resolution=%s で対応する前提の最終決定メモを日本語で下書きしてください。\n"+
			"ユーザーが承認して保存する文章です。抽象的な方針説明ではなく、実際に何をどう変えるかを書いてください。\n"+
			"指摘タイトル: %s\n"+
			"指摘内容: %s\n"+
			"改善提案: %s\n"+
			"AIの現在提案: %s\n"+
			"対象の要約:\n%s\n"+
			"少なくとも1つの具体的な対象名（file path / node title / interface / 関数名）を文中に含めてください。",
		input.Resolution,
		input.Feedback.Title,
		input.Feedback.Description,
		input.Feedback.Suggestion,
		derefResolution(input.Feedback.AIRecommendation),
		summarizeResolutionTargets(input),
	)
}

func buildApplyChangesPrompt(payload string) string {
	return "以下の JSON を入力として、確定済みレビュー決定を設計書とコードへ反映してください。設計書本文と更新ファイル全文だけを JSON で返してください。\n" + payload
}

func summarizeResolutionTargets(input ResolutionDraftInput) string {
	filePaths := make([]string, 0, len(input.Targets))
	nodeIDs := make([]int64, 0, len(input.Targets))
	edgeIDs := make([]int64, 0, len(input.Targets))
	for _, target := range input.Targets {
		if target.FilePath != nil && strings.TrimSpace(*target.FilePath) != "" {
			filePaths = append(filePaths, *target.FilePath)
		}
		if target.NodeID != nil {
			nodeIDs = append(nodeIDs, *target.NodeID)
		}
		if target.EdgeID != nil {
			edgeIDs = append(edgeIDs, *target.EdgeID)
		}
	}

	nodeTitles := make([]string, 0, len(nodeIDs))
	for _, node := range input.Nodes {
		for _, id := range nodeIDs {
			if node.ID == id {
				nodeTitles = append(nodeTitles, node.Title)
				break
			}
		}
	}

	parts := make([]string, 0, 3)
	if len(filePaths) > 0 {
		parts = append(parts, "files="+strings.Join(uniqueStrings(filePaths), ", "))
	}
	if len(nodeTitles) > 0 {
		parts = append(parts, "nodes="+strings.Join(uniqueStrings(nodeTitles), ", "))
	}
	if len(edgeIDs) > 0 {
		parts = append(parts, fmt.Sprintf("edge_ids=%v", edgeIDs))
	}
	if len(parts) == 0 {
		return "明示的な target はありません。必要なら設計書と workspace 要約から最も関係の深い対象を特定してください。"
	}
	return strings.Join(parts, "\n")
}

func validateResolutionDraft(text string, input ResolutionDraftInput) error {
	lower := strings.ToLower(text)
	genericPhrases := []string{
		"品質向上を図",
		"一貫性を高め",
		"具体的な指針を追記",
		"設計ガイドを更新",
		"関連する設計項目",
	}
	for _, phrase := range genericPhrases {
		if strings.Contains(text, phrase) {
			return fmt.Errorf("resolution draft is too generic: %s", phrase)
		}
	}

	candidates := make([]string, 0, len(input.Targets)+len(input.Nodes))
	for _, target := range input.Targets {
		if target.FilePath != nil {
			candidates = append(candidates, strings.ToLower(*target.FilePath))
		}
		if target.NodeID != nil {
			for _, node := range input.Nodes {
				if node.ID == *target.NodeID {
					candidates = append(candidates, strings.ToLower(node.Title))
					break
				}
			}
		}
	}
	if len(candidates) == 0 {
		candidates = append(candidates, strings.ToLower(input.Feedback.Title))
	}
	for _, candidate := range candidates {
		if candidate != "" && strings.Contains(lower, candidate) {
			return nil
		}
	}
	return errors.New("resolution draft does not mention any concrete target")
}

func uniqueStrings(values []string) []string {
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}

func normalizeJSONObject(text string) string {
	trimmed := strings.TrimSpace(text)
	trimmed = strings.TrimPrefix(trimmed, "```json")
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)

	start := strings.Index(trimmed, "{")
	end := strings.LastIndex(trimmed, "}")
	if start >= 0 && end >= start {
		return trimmed[start : end+1]
	}
	return trimmed
}

func derefResolution(value *entity.FeedbackResolution) string {
	if value == nil {
		return ""
	}
	return string(*value)
}

func reviewOutputSchema() map[string]any {
	return map[string]any{
		"type":     "object",
		"required": []string{"overall_score", "summary", "feedbacks"},
		"properties": map[string]any{
			"overall_score": map[string]any{"type": "integer"},
			"summary":       map[string]any{"type": "string"},
			"feedbacks": map[string]any{
				"type": "array",
				"maxItems": 5,
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

func applyOutputSchema() map[string]any {
	return map[string]any{
		"type":     "object",
		"required": []string{"design_guide_content", "file_updates"},
		"properties": map[string]any{
			"design_guide_content": map[string]any{"type": "string"},
			"file_updates": map[string]any{
				"type": "array",
				"items": map[string]any{
					"type":     "object",
					"required": []string{"path", "content"},
					"properties": map[string]any{
						"path":    map[string]any{"type": "string"},
						"content": map[string]any{"type": "string"},
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

func feedbackTargetsPayload(
	targets []entity.ReviewFeedbackTarget,
	files []entity.VariantFile,
	nodes []entity.Node,
	edges []entity.Edge,
) map[string]any {
	fileByPath := make(map[string]entity.VariantFile, len(files))
	for _, file := range files {
		fileByPath[file.Path] = file
	}

	nodeByID := make(map[int64]entity.Node, len(nodes))
	for _, node := range nodes {
		nodeByID[node.ID] = node
	}

	edgeByID := make(map[int64]entity.Edge, len(edges))
	for _, edge := range edges {
		edgeByID[edge.ID] = edge
	}

	filesOut := make([]map[string]any, 0)
	nodesOut := make([]map[string]any, 0)
	edgesOut := make([]map[string]any, 0)
	seenFiles := map[string]struct{}{}
	seenNodes := map[int64]struct{}{}
	seenEdges := map[int64]struct{}{}

	for _, target := range targets {
		if target.FilePath != nil {
			path := *target.FilePath
			if _, ok := seenFiles[path]; !ok {
				seenFiles[path] = struct{}{}
				file := fileByPath[path]
				filesOut = append(filesOut, map[string]any{
					"path":      path,
					"language":  derefString(file.Language),
					"nodeCount": file.NodeCount,
					"isVisible": file.IsVisible,
				})
			}
		}
		if target.NodeID != nil {
			id := *target.NodeID
			if _, ok := seenNodes[id]; !ok {
				seenNodes[id] = struct{}{}
				node, ok := nodeByID[id]
				if ok {
					nodesOut = append(nodesOut, map[string]any{
						"id":        node.ID,
						"kind":      string(node.Kind),
						"title":     node.Title,
						"signature": derefString(node.Signature),
						"receiver":  derefString(node.Receiver),
						"file_path": filePathForNode(node, files),
					})
				}
			}
		}
		if target.EdgeID != nil {
			id := *target.EdgeID
			if _, ok := seenEdges[id]; !ok {
				seenEdges[id] = struct{}{}
				edge, ok := edgeByID[id]
				if ok {
					edgesOut = append(edgesOut, map[string]any{
						"id":           edge.ID,
						"kind":         string(edge.Kind),
						"from_node_id": edge.FromNodeID,
						"to_node_id":   edge.ToNodeID,
						"label":        derefString(edge.Label),
					})
				}
			}
		}
	}

	return map[string]any{
		"files": filesOut,
		"nodes": nodesOut,
		"edges": edgesOut,
	}
}

func nodeContextPayload(
	nodeID int64,
	nodes []entity.Node,
	files []entity.VariantFile,
	edges []entity.Edge,
) map[string]any {
	if nodeID == 0 {
		return map[string]any{}
	}

	var target *entity.Node
	for i := range nodes {
		if nodes[i].ID == nodeID {
			target = &nodes[i]
			break
		}
	}
	if target == nil {
		return map[string]any{}
	}

	relatedEdges := make([]map[string]any, 0)
	for _, edge := range edges {
		if edge.FromNodeID == nodeID || edge.ToNodeID == nodeID {
			relatedEdges = append(relatedEdges, map[string]any{
				"id":           edge.ID,
				"kind":         string(edge.Kind),
				"from_node_id": edge.FromNodeID,
				"to_node_id":   edge.ToNodeID,
				"label":        derefString(edge.Label),
			})
		}
	}

	return map[string]any{
		"id":         target.ID,
		"kind":       string(target.Kind),
		"title":      target.Title,
		"signature":  derefString(target.Signature),
		"receiver":   derefString(target.Receiver),
		"file_path":  filePathForNode(*target, files),
		"code_text":  truncate(derefString(target.CodeText), 4000),
		"edge_count": len(relatedEdges),
		"edges":      relatedEdges,
	}
}

func filePathForNode(node entity.Node, files []entity.VariantFile) string {
	if node.VariantFileID == nil {
		return ""
	}
	for _, file := range files {
		if file.ID == *node.VariantFileID {
			return file.Path
		}
	}
	return ""
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

func readInt64Arg(args map[string]any, key string, fallback int64) int64 {
	if args == nil {
		return fallback
	}
	switch value := args[key].(type) {
	case int:
		return int64(value)
	case int32:
		return int64(value)
	case int64:
		return value
	case float64:
		return int64(value)
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
