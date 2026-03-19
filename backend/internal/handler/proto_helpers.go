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

	return timestamppb.New(*t)
}

func toProtoStruct(metadata datatypes.JSON) *structpb.Struct {
	if len(metadata) == 0 {
		return nil
	}

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

func toProtoVariant(detail *service.VariantDetail) *apiv1.Variant {
	if detail == nil || detail.Variant == nil {
		return nil
	}

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

	return &apiv1.UserSummary{
		Id:        user.ID,
		Email:     user.Email,
		Name:      user.Name,
		AvatarUrl: stringValue(user.AvatarURL),
	}
}

func toProtoVariantFile(file *entity.VariantFile) *apiv1.VariantFile {
	if file == nil {
		return nil
	}

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

func toProtoReviewFeedback(feedback *entity.ReviewFeedback) *apiv1.ReviewFeedback {
	if feedback == nil {
		return nil
	}

	return &apiv1.ReviewFeedback{
		Id:               feedback.ID,
		ReviewJobId:      feedback.ReviewJobID,
		VariantId:        feedback.VariantID,
		FeedbackType:     string(feedback.FeedbackType),
		Severity:         string(feedback.Severity),
		Title:            feedback.Title,
		Description:      feedback.Description,
		Suggestion:       feedback.Suggestion,
		AiRecommendation: resolutionValue(feedback.AIRecommendation),
		Resolution:       resolutionValue(feedback.Resolution),
		Status:           string(feedback.Status),
		DisplayOrder:     feedback.DisplayOrder,
		CreatedAt:        timestamppb.New(feedback.CreatedAt),
	}
}

func toProtoReviewFeedbackTarget(target *entity.ReviewFeedbackTarget) *apiv1.ReviewFeedbackTarget {
	if target == nil {
		return nil
	}

	return &apiv1.ReviewFeedbackTarget{
		Id:         target.ID,
		FeedbackId: target.FeedbackID,
		TargetType: string(target.TargetType),
		TargetRef:  target.TargetRef,
	}
}

func toProtoReviewFeedbackChat(chat *entity.ReviewFeedbackChat) *apiv1.ReviewFeedbackChat {
	if chat == nil {
		return nil
	}

	return &apiv1.ReviewFeedbackChat{
		Id:         chat.ID,
		FeedbackId: chat.FeedbackID,
		Role:       string(chat.Role),
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

func resolutionValue(value *entity.FeedbackResolution) string {
	if value == nil {
		return ""
	}

	return string(*value)
}

func timePointer(value *entity.Time) *time.Time {
	if value == nil {
		return nil
	}
	return (*time.Time)(value)
}
