package entity

type NodeKind string

const (
	NodeKindFunction  NodeKind = "function"
	NodeKindMethod    NodeKind = "method"
	NodeKindInterface NodeKind = "interface"
	NodeKindStruct    NodeKind = "struct"
	NodeKindType      NodeKind = "type"
	NodeKindConst     NodeKind = "const"
	NodeKindVar       NodeKind = "var"
	NodeKindGroup     NodeKind = "group"
	NodeKindNote      NodeKind = "note"
	NodeKindImage     NodeKind = "image"
)

type EdgeKind string

const (
	EdgeKindCall      EdgeKind = "call"
	EdgeKindImport    EdgeKind = "import"
	EdgeKindImplement EdgeKind = "implement"
)

type EdgeStyle string

const (
	EdgeStyleSolid  EdgeStyle = "solid"
	EdgeStyleDashed EdgeStyle = "dashed"
)

type ProjectMemberRole string

const (
	ProjectMemberRoleViewer ProjectMemberRole = "viewer"
	ProjectMemberRoleEditor ProjectMemberRole = "editor"
	ProjectMemberRoleAdmin  ProjectMemberRole = "admin"
)

type VariantStatus string

const (
	VariantStatusActive   VariantStatus = "active"
	VariantStatusArchived VariantStatus = "archived"
)

type DesignGuideVisibility string

const (
	DesignGuideVisibilityPrivate DesignGuideVisibility = "private"
	DesignGuideVisibilityProject DesignGuideVisibility = "project"
	DesignGuideVisibilityPublic  DesignGuideVisibility = "public"
)

type JobStatus string

const (
	JobStatusQueued    JobStatus = "queued"
	JobStatusRunning   JobStatus = "running"
	JobStatusSucceeded JobStatus = "succeeded"
	JobStatusFailed    JobStatus = "failed"
	JobStatusCanceled  JobStatus = "canceled"
)

type LayoutType string

const (
	LayoutTypeGrid     LayoutType = "grid"
	LayoutTypeCircular LayoutType = "circular"
	LayoutTypeRandom   LayoutType = "random"
	LayoutTypeAI       LayoutType = "ai"
)

type FeedbackType string

const (
	FeedbackTypeDesignGuide FeedbackType = "design_guide"
	FeedbackTypeCode        FeedbackType = "code"
)

type FeedbackSeverity string

const (
	FeedbackSeverityHigh   FeedbackSeverity = "high"
	FeedbackSeverityMedium FeedbackSeverity = "medium"
	FeedbackSeverityLow    FeedbackSeverity = "low"
)

type FeedbackResolution string

const (
	FeedbackResolutionUpdateDesignGuide FeedbackResolution = "update_design_guide"
	FeedbackResolutionFixCode           FeedbackResolution = "fix_code"
	FeedbackResolutionBoth              FeedbackResolution = "both"
)

type FeedbackStatus string

const (
	FeedbackStatusOpen      FeedbackStatus = "open"
	FeedbackStatusResolved  FeedbackStatus = "resolved"
	FeedbackStatusDismissed FeedbackStatus = "dismissed"
)

type FeedbackTargetType string

const (
	FeedbackTargetTypeFile FeedbackTargetType = "file"
	FeedbackTargetTypeNode FeedbackTargetType = "node"
	FeedbackTargetTypeEdge FeedbackTargetType = "edge"
)

type ChatRole string

const (
	ChatRoleUser ChatRole = "user"
	ChatRoleAI   ChatRole = "ai"
)

type FeedbackActionType string

const (
	FeedbackActionTypeResolve   FeedbackActionType = "resolve"
	FeedbackActionTypeUnresolve FeedbackActionType = "unresolve"
	FeedbackActionTypeDismiss   FeedbackActionType = "dismiss"
)
