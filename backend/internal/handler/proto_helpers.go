package handler

import (
	"encoding/json"
	"time"

	apiv1 "github.com/GDGoC-Japan-Hackathon/affectify/backend/gen/api/v1"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/repository/entity"
	"github.com/GDGoC-Japan-Hackathon/affectify/backend/internal/service"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
	"gorm.io/datatypes"
)

func toProtoTimestamp(t *time.Time) *timestamppb.Timestamp {
	if t == nil {
		return nil
	}

	// DB / service 層の time.Time を protobuf Timestamp に寄せる。
	return timestamppb.New(*t)
}

func toProtoStruct(metadata datatypes.JSON) *structpb.Struct {
	if len(metadata) == 0 {
		return nil
	}

	// JSONB は API では protobuf Struct として返す。
	var payload map[string]any
	if err := json.Unmarshal(metadata, &payload); err != nil {
		return nil
	}

	result, err := structpb.NewStruct(payload)
	if err != nil {
		return nil
	}

	return result
}

func toProtoAnalysisReport(report *entity.AnalysisReport) *apiv1.AnalysisReport {
	if report == nil {
		return nil
	}

	return &apiv1.AnalysisReport{
		Id:           report.ID,
		VariantId:    report.VariantID,
		OverallScore: report.OverallScore,
		ReportData:   toProtoStruct(report.ReportData),
		AnalyzedAt:   timestamppb.New(time.Time(report.AnalyzedAt)),
		CreatedAt:    timestamppb.New(report.CreatedAt),
	}
}

func toProtoVariant(detail *service.VariantDetail) *apiv1.Variant {
	if detail == nil || detail.Variant == nil {
		return nil
	}

	// service が返す集約結果を API 返却用の Variant message に詰め替える。
	var forkedFromVariantID *int64
	if detail.Variant.ForkedFromVariantID != nil {
		forkedFromVariantID = detail.Variant.ForkedFromVariantID
	}

	return &apiv1.Variant{
		Id:                  detail.Variant.ID,
		ProjectId:           detail.Variant.ProjectID,
		Name:                detail.Variant.Name,
		Description:         stringValue(detail.Variant.Description),
		IsMain:              detail.Variant.IsMain,
		ForkedFromVariantId: forkedFromVariantID,
		AnalysisScore:       detail.Variant.AnalysisScore,
		NodeCount:           detail.NodeCount,
		CreatedBy:           detail.Variant.CreatedBy,
		Creator:             toProtoUserSummary(detail.Creator),
		CreatedAt:           timestamppb.New(detail.Variant.CreatedAt),
		UpdatedAt:           timestamppb.New(detail.Variant.UpdatedAt),
		Status:              string(detail.Variant.Status),
		SourceLanguage:      stringValue(detail.Variant.SourceLanguage),
		SourceRootUri:       stringValue(detail.Variant.SourceRootURI),
		LastImportedAt:      toProtoTimestamp(timePointer(detail.Variant.LastImportedAt)),
		LastReviewedAt:      toProtoTimestamp(timePointer(detail.Variant.LastReviewedAt)),
	}
}

func toProtoUserSummary(user *entity.User) *apiv1.UserSummary {
	if user == nil {
		return nil
	}

	// 軽量な一覧系レスポンスでは UserSummary に絞って返す。
	return &apiv1.UserSummary{
		Id:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarUrl: stringValue(user.AvatarURL),
	}
}

func toProtoProject(detail *service.ProjectDetail) *apiv1.Project {
	if detail == nil || detail.Project == nil {
		return nil
	}

	variants := make([]*apiv1.Variant, 0, len(detail.Variants))
	for i := range detail.Variants {
		variants = append(variants, toProtoVariant(&detail.Variants[i]))
	}

	members := make([]*apiv1.ProjectMember, 0, len(detail.Members))
	for i := range detail.Members {
		members = append(members, toProtoProjectMember(&detail.Members[i]))
	}

	return &apiv1.Project{
		Id:            detail.Project.ID,
		Name:          detail.Project.Name,
		Description:   stringValue(detail.Project.Description),
		OwnerId:       detail.Project.OwnerID,
		Owner:         toProtoUserSummary(detail.Owner),
		NodeCount:     detail.NodeCount,
		AnalysisScore: detail.AnalysisScore,
		Variants:      variants,
		Members:       members,
		CreatedAt:     timestamppb.New(detail.Project.CreatedAt),
		UpdatedAt:     timestamppb.New(detail.Project.UpdatedAt),
	}
}

func toProtoProjectMember(detail *service.ProjectMemberDetail) *apiv1.ProjectMember {
	if detail == nil {
		return nil
	}

	return &apiv1.ProjectMember{
		ProjectId:   detail.Member.ProjectID,
		UserId:      detail.Member.UserID,
		AddedBy:     detail.Member.AddedBy,
		Role:        string(detail.Member.Role),
		JoinedAt:    timestamppb.New(time.Time(detail.Member.JoinedAt)),
		User:        toProtoUserSummary(detail.User),
		AddedByUser: toProtoUserSummary(detail.AddedByUser),
	}
}

func toProtoDesignGuideSummary(detail *service.DesignGuideSummaryDetail) *apiv1.DesignGuideSummary {
	if detail == nil || detail.Guide == nil {
		return nil
	}

	return &apiv1.DesignGuideSummary{
		Id:          detail.Guide.ID,
		Name:        detail.Guide.Name,
		Description: stringValue(detail.Guide.Description),
		CreatedBy:   detail.Guide.CreatedBy,
		Creator:     toProtoUserSummary(detail.Creator),
		LikeCount:   detail.LikeCount,
		CreatedAt:   timestamppb.New(detail.Guide.CreatedAt),
		UpdatedAt:   timestamppb.New(detail.Guide.UpdatedAt),
		Visibility:  string(detail.Guide.Visibility),
		IsTemplate:  detail.Guide.IsTemplate,
		LikedByMe:   detail.LikedByMe,
	}
}

func toProtoDesignGuide(detail *service.DesignGuideDetail) *apiv1.DesignGuide {
	if detail == nil || detail.Guide == nil {
		return nil
	}

	return &apiv1.DesignGuide{
		Id:          detail.Guide.ID,
		Name:        detail.Guide.Name,
		Description: stringValue(detail.Guide.Description),
		Content:     detail.Guide.Content,
		CreatedBy:   detail.Guide.CreatedBy,
		Creator:     toProtoUserSummary(detail.Creator),
		LikeCount:   detail.LikeCount,
		CreatedAt:   timestamppb.New(detail.Guide.CreatedAt),
		UpdatedAt:   timestamppb.New(detail.Guide.UpdatedAt),
		Visibility:  string(detail.Guide.Visibility),
		IsTemplate:  detail.Guide.IsTemplate,
		LikedByMe:   detail.LikedByMe,
	}
}

func toProtoVariantFile(file *entity.VariantFile) *apiv1.VariantFile {
	if file == nil {
		return nil
	}

	// variant 配下のファイル inventory をそのまま API へ出す。
	return &apiv1.VariantFile{
		Id:           file.ID,
		VariantId:    file.VariantID,
		Path:         file.Path,
		Language:     stringValue(file.Language),
		NodeCount:    file.NodeCount,
		IsVisible:    file.IsVisible,
		DisplayOrder: file.DisplayOrder,
		CreatedAt:    timestamppb.New(file.CreatedAt),
		UpdatedAt:    timestamppb.New(file.UpdatedAt),
	}
}

func toProtoVariantDesignGuide(guide *entity.VariantDesignGuide) *apiv1.VariantDesignGuide {
	if guide == nil {
		return nil
	}

	// variant に適用中の設計書作業コピーを API 形式に変換する。
	return &apiv1.VariantDesignGuide{
		Id:                guide.ID,
		VariantId:         guide.VariantID,
		BaseDesignGuideId: guide.BaseDesignGuideID,
		Title:             guide.Title,
		Description:       stringValue(guide.Description),
		Content:           guide.Content,
		Version:           guide.Version,
		CreatedBy:         guide.CreatedBy,
		CreatedAt:         timestamppb.New(guide.CreatedAt),
		UpdatedAt:         timestamppb.New(guide.UpdatedAt),
	}
}

func toProtoNode(node *entity.Node) *apiv1.Node {
	if node == nil {
		return nil
	}

	// node は metadata など DB 固有表現を含むので handler で変換する。
	return &apiv1.Node{
		Id:            node.ID,
		VariantId:     node.VariantID,
		VariantFileId: node.VariantFileID,
		Kind:          string(node.Kind),
		Title:         node.Title,
		Signature:     stringValue(node.Signature),
		Receiver:      stringValue(node.Receiver),
		CodeText:      stringValue(node.CodeText),
		X:             node.PositionX,
		Y:             node.PositionY,
		Metadata:      toProtoStruct(node.Metadata),
		CreatedAt:     timestamppb.New(node.CreatedAt),
		UpdatedAt:     timestamppb.New(node.UpdatedAt),
	}
}

func toProtoEdge(edge *entity.Edge) *apiv1.Edge {
	if edge == nil {
		return nil
	}

	// edge も DB entity をそのまま返さず API message に詰め替える。
	return &apiv1.Edge{
		Id:         edge.ID,
		VariantId:  edge.VariantID,
		FromNodeId: edge.FromNodeID,
		ToNodeId:   edge.ToNodeID,
		Kind:       string(edge.Kind),
		Style:      string(edge.Style),
		Label:      stringValue(edge.Label),
		Metadata:   toProtoStruct(edge.Metadata),
		CreatedAt:  timestamppb.New(edge.CreatedAt),
	}
}

func toProtoGraphBuildJob(job *entity.GraphBuildJob) *apiv1.GraphBuildJob {
	if job == nil {
		return nil
	}

	// 非同期 job の状態は handler で string / timestamp を API 向けに整える。
	return &apiv1.GraphBuildJob{
		Id:           job.ID,
		VariantId:    job.VariantID,
		RequestedBy:  job.RequestedBy,
		Status:       string(job.Status),
		ErrorMessage: stringValue(job.ErrorMessage),
		StartedAt:    toProtoTimestamp(timePointer(job.StartedAt)),
		FinishedAt:   toProtoTimestamp(timePointer(job.FinishedAt)),
		CreatedAt:    timestamppb.New(job.CreatedAt),
	}
}

func toProtoLayoutJob(job *entity.LayoutJob) *apiv1.LayoutJob {
	if job == nil {
		return nil
	}

	// layout job も graph build job と同じ考え方で変換する。
	return &apiv1.LayoutJob{
		Id:           job.ID,
		VariantId:    job.VariantID,
		RequestedBy:  job.RequestedBy,
		LayoutType:   string(job.LayoutType),
		Status:       string(job.Status),
		ErrorMessage: stringValue(job.ErrorMessage),
		StartedAt:    toProtoTimestamp(timePointer(job.StartedAt)),
		FinishedAt:   toProtoTimestamp(timePointer(job.FinishedAt)),
		CreatedAt:    timestamppb.New(job.CreatedAt),
	}
}

func toProtoReviewJob(job *entity.ReviewJob) *apiv1.ReviewJob {
	if job == nil {
		return nil
	}

	// review job の状態表示に必要な最小項目だけを API へ出す。
	return &apiv1.ReviewJob{
		Id:           job.ID,
		VariantId:    job.VariantID,
		RequestedBy:  job.RequestedBy,
		Status:       string(job.Status),
		ErrorMessage: stringValue(job.ErrorMessage),
		StartedAt:    toProtoTimestamp(timePointer(job.StartedAt)),
		FinishedAt:   toProtoTimestamp(timePointer(job.FinishedAt)),
		CreatedAt:    timestamppb.New(job.CreatedAt),
	}
}

func toProtoReviewApplyJob(job *entity.ReviewApplyJob) *apiv1.ReviewApplyJob {
	if job == nil {
		return nil
	}

	return &apiv1.ReviewApplyJob{
		Id:           job.ID,
		VariantId:    job.VariantID,
		ReviewJobId:  job.ReviewJobID,
		RequestedBy:  job.RequestedBy,
		Status:       string(job.Status),
		ErrorMessage: stringValue(job.ErrorMessage),
		StartedAt:    toProtoTimestamp(timePointer(job.StartedAt)),
		FinishedAt:   toProtoTimestamp(timePointer(job.FinishedAt)),
		CreatedAt:    timestamppb.New(job.CreatedAt),
	}
}

func toProtoReviewFeedback(feedback *entity.ReviewFeedback, userReaction *string) *apiv1.ReviewFeedback {
	if feedback == nil {
		return nil
	}

	// review card は内部 enum を proto enum に変換して返す。
	return &apiv1.ReviewFeedback{
		Id:               feedback.ID,
		ReviewJobId:      feedback.ReviewJobID,
		VariantId:        feedback.VariantID,
		FeedbackType:     toProtoReviewFeedbackType(feedback.FeedbackType),
		Severity:         toProtoReviewFeedbackSeverity(feedback.Severity),
		Title:            feedback.Title,
		Description:      feedback.Description,
		Suggestion:       feedback.Suggestion,
		AiRecommendation: toProtoReviewFeedbackResolution(feedback.AIRecommendation),
		Resolution:       toProtoReviewFeedbackResolution(feedback.Resolution),
		Status:           toProtoReviewFeedbackStatus(feedback.Status),
		DisplayOrder:     feedback.DisplayOrder,
		CreatedAt:        timestamppb.New(feedback.CreatedAt),
		UserReaction:     toProtoReviewFeedbackReaction(userReaction),
		ResolutionNote:   stringValue(feedback.ResolutionNote),
	}
}

func toProtoReviewFeedbackTarget(target *entity.ReviewFeedbackTarget) *apiv1.ReviewFeedbackTarget {
	if target == nil {
		return nil
	}

	return &apiv1.ReviewFeedbackTarget{
		Id:         target.ID,
		FeedbackId: target.FeedbackID,
		NodeId:     target.NodeID,
		EdgeId:     target.EdgeID,
		FilePath:   target.FilePath,
	}
}

func toProtoReviewFeedbackChat(chat *entity.ReviewFeedbackChat) *apiv1.ReviewFeedbackChat {
	if chat == nil {
		return nil
	}

	// chat 履歴は created_by と timestamp を含めて UI がそのまま描画できる形にする。
	return &apiv1.ReviewFeedbackChat{
		Id:         chat.ID,
		FeedbackId: chat.FeedbackID,
		Role:       toProtoReviewFeedbackChatRole(chat.Role),
		Content:    chat.Content,
		CreatedBy:  chat.CreatedBy,
		CreatedAt:  timestamppb.New(chat.CreatedAt),
	}
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}

func timePointer(value *entity.Time) *time.Time {
	if value == nil {
		return nil
	}
	return (*time.Time)(value)
}

func toProtoReviewFeedbackType(value entity.FeedbackType) apiv1.ReviewFeedbackType {
	switch value {
	case entity.FeedbackTypeDesignGuide:
		return apiv1.ReviewFeedbackType_REVIEW_FEEDBACK_TYPE_DESIGN_GUIDE
	case entity.FeedbackTypeCode:
		return apiv1.ReviewFeedbackType_REVIEW_FEEDBACK_TYPE_CODE
	default:
		return apiv1.ReviewFeedbackType_REVIEW_FEEDBACK_TYPE_UNSPECIFIED
	}
}

func toProtoReviewFeedbackSeverity(value entity.FeedbackSeverity) apiv1.ReviewFeedbackSeverity {
	switch value {
	case entity.FeedbackSeverityHigh:
		return apiv1.ReviewFeedbackSeverity_REVIEW_FEEDBACK_SEVERITY_HIGH
	case entity.FeedbackSeverityMedium:
		return apiv1.ReviewFeedbackSeverity_REVIEW_FEEDBACK_SEVERITY_MEDIUM
	case entity.FeedbackSeverityLow:
		return apiv1.ReviewFeedbackSeverity_REVIEW_FEEDBACK_SEVERITY_LOW
	default:
		return apiv1.ReviewFeedbackSeverity_REVIEW_FEEDBACK_SEVERITY_UNSPECIFIED
	}
}

func toProtoReviewFeedbackResolution(value *entity.FeedbackResolution) apiv1.ReviewFeedbackResolution {
	if value == nil {
		return apiv1.ReviewFeedbackResolution_REVIEW_FEEDBACK_RESOLUTION_UNSPECIFIED
	}

	switch *value {
	case entity.FeedbackResolutionUpdateDesignGuide:
		return apiv1.ReviewFeedbackResolution_REVIEW_FEEDBACK_RESOLUTION_UPDATE_DESIGN_GUIDE
	case entity.FeedbackResolutionFixCode:
		return apiv1.ReviewFeedbackResolution_REVIEW_FEEDBACK_RESOLUTION_FIX_CODE
	case entity.FeedbackResolutionBoth:
		return apiv1.ReviewFeedbackResolution_REVIEW_FEEDBACK_RESOLUTION_BOTH
	default:
		return apiv1.ReviewFeedbackResolution_REVIEW_FEEDBACK_RESOLUTION_UNSPECIFIED
	}
}

func toProtoReviewFeedbackStatus(value entity.FeedbackStatus) apiv1.ReviewFeedbackStatus {
	switch value {
	case entity.FeedbackStatusOpen:
		return apiv1.ReviewFeedbackStatus_REVIEW_FEEDBACK_STATUS_OPEN
	case entity.FeedbackStatusResolved:
		return apiv1.ReviewFeedbackStatus_REVIEW_FEEDBACK_STATUS_RESOLVED
	case entity.FeedbackStatusDismissed:
		return apiv1.ReviewFeedbackStatus_REVIEW_FEEDBACK_STATUS_DISMISSED
	default:
		return apiv1.ReviewFeedbackStatus_REVIEW_FEEDBACK_STATUS_UNSPECIFIED
	}
}

func toProtoReviewFeedbackReaction(value *string) apiv1.ReviewFeedbackReaction {
	if value == nil {
		return apiv1.ReviewFeedbackReaction_REVIEW_FEEDBACK_REACTION_UNSPECIFIED
	}

	switch *value {
	case "good":
		return apiv1.ReviewFeedbackReaction_REVIEW_FEEDBACK_REACTION_GOOD
	case "bad":
		return apiv1.ReviewFeedbackReaction_REVIEW_FEEDBACK_REACTION_BAD
	default:
		return apiv1.ReviewFeedbackReaction_REVIEW_FEEDBACK_REACTION_UNSPECIFIED
	}
}

func toProtoReviewFeedbackChatRole(value entity.ChatRole) apiv1.ReviewFeedbackChatRole {
	switch value {
	case entity.ChatRoleUser:
		return apiv1.ReviewFeedbackChatRole_REVIEW_FEEDBACK_CHAT_ROLE_USER
	case entity.ChatRoleAI:
		return apiv1.ReviewFeedbackChatRole_REVIEW_FEEDBACK_CHAT_ROLE_AI
	default:
		return apiv1.ReviewFeedbackChatRole_REVIEW_FEEDBACK_CHAT_ROLE_UNSPECIFIED
	}
}
