package entity

type VariantFile struct {
	ID           int64   `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID    int64   `gorm:"column:variant_id;not null;uniqueIndex:idx_variant_files_variant_path;index"`
	Path         string  `gorm:"column:path;type:text;not null;uniqueIndex:idx_variant_files_variant_path"`
	Language     *string `gorm:"column:language;type:varchar(50);index"`
	NodeCount    int32   `gorm:"column:node_count;not null;default:0"`
	IsVisible    bool    `gorm:"column:is_visible;not null;default:true;index"`
	DisplayOrder int32   `gorm:"column:display_order;not null;default:0"`
	Timestamped
}

func (VariantFile) TableName() string {
	return "variant_files"
}

type VariantDesignGuide struct {
	ID                int64   `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID         int64   `gorm:"column:variant_id;not null;uniqueIndex"`
	BaseDesignGuideID *int64  `gorm:"column:base_design_guide_id;index"`
	Title             string  `gorm:"column:title;type:varchar(255);not null"`
	Description       *string `gorm:"column:description;type:text"`
	Content           string  `gorm:"column:content;type:text;not null"`
	Version           int32   `gorm:"column:version;not null;default:1"`
	CreatedBy         int64   `gorm:"column:created_by;not null;index"`
	Timestamped
}

func (VariantDesignGuide) TableName() string {
	return "variant_design_guides"
}

type GraphBuildJob struct {
	ID           int64     `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID    int64     `gorm:"column:variant_id;not null;index"`
	RequestedBy  int64     `gorm:"column:requested_by;not null;index"`
	Status       JobStatus `gorm:"column:status;type:varchar(30);not null;index"`
	ErrorMessage *string   `gorm:"column:error_message;type:text"`
	StartedAt    *Time     `gorm:"column:started_at"`
	FinishedAt   *Time     `gorm:"column:finished_at"`
	CreatedOnly
}

func (GraphBuildJob) TableName() string {
	return "graph_build_jobs"
}

type LayoutJob struct {
	ID           int64      `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID    int64      `gorm:"column:variant_id;not null;index"`
	RequestedBy  int64      `gorm:"column:requested_by;not null;index"`
	LayoutType   LayoutType `gorm:"column:layout_type;type:varchar(30);not null"`
	Status       JobStatus  `gorm:"column:status;type:varchar(30);not null;index"`
	ErrorMessage *string    `gorm:"column:error_message;type:text"`
	StartedAt    *Time      `gorm:"column:started_at"`
	FinishedAt   *Time      `gorm:"column:finished_at"`
	CreatedOnly
}

func (LayoutJob) TableName() string {
	return "layout_jobs"
}

type ReviewJob struct {
	ID           int64     `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID    int64     `gorm:"column:variant_id;not null;index"`
	RequestedBy  int64     `gorm:"column:requested_by;not null;index"`
	Status       JobStatus `gorm:"column:status;type:varchar(30);not null;index"`
	ErrorMessage *string   `gorm:"column:error_message;type:text"`
	StartedAt    *Time     `gorm:"column:started_at"`
	FinishedAt   *Time     `gorm:"column:finished_at"`
	CreatedOnly
}

func (ReviewJob) TableName() string {
	return "review_jobs"
}

type ReviewFeedback struct {
	ID               int64               `gorm:"column:id;primaryKey;autoIncrement"`
	ReviewJobID      int64               `gorm:"column:review_job_id;not null;index"`
	VariantID        int64               `gorm:"column:variant_id;not null;index"`
	FeedbackType     FeedbackType        `gorm:"column:feedback_type;type:varchar(30);not null"`
	Severity         FeedbackSeverity    `gorm:"column:severity;type:varchar(20);not null;index"`
	Title            string              `gorm:"column:title;type:varchar(255);not null"`
	Description      string              `gorm:"column:description;type:text;not null"`
	Suggestion       string              `gorm:"column:suggestion;type:text;not null"`
	AIRecommendation *FeedbackResolution `gorm:"column:ai_recommendation;type:varchar(30)"`
	Resolution       *FeedbackResolution `gorm:"column:resolution;type:varchar(30)"`
	Status           FeedbackStatus      `gorm:"column:status;type:varchar(30);not null;default:open;index"`
	DisplayOrder     int32               `gorm:"column:display_order;not null;default:0"`
	CreatedOnly
}

func (ReviewFeedback) TableName() string {
	return "review_feedbacks"
}

type ReviewFeedbackTarget struct {
	ID         int64              `gorm:"column:id;primaryKey;autoIncrement"`
	FeedbackID int64              `gorm:"column:feedback_id;not null;index"`
	TargetType FeedbackTargetType `gorm:"column:target_type;type:varchar(20);not null;index"`
	TargetRef  string             `gorm:"column:target_ref;type:text;not null"`
}

func (ReviewFeedbackTarget) TableName() string {
	return "review_feedback_targets"
}

type ReviewFeedbackChat struct {
	ID         int64    `gorm:"column:id;primaryKey;autoIncrement"`
	FeedbackID int64    `gorm:"column:feedback_id;not null;index"`
	Role       ChatRole `gorm:"column:role;type:varchar(20);not null"`
	Content    string   `gorm:"column:content;type:text;not null"`
	CreatedBy  *int64   `gorm:"column:created_by;index"`
	CreatedAt  Time     `gorm:"column:created_at;not null;default:now();index"`
}

func (ReviewFeedbackChat) TableName() string {
	return "review_feedback_chats"
}

type ReviewFeedbackAction struct {
	ID         int64               `gorm:"column:id;primaryKey;autoIncrement"`
	FeedbackID int64               `gorm:"column:feedback_id;not null;index"`
	ActionType FeedbackActionType  `gorm:"column:action_type;type:varchar(30);not null"`
	Resolution *FeedbackResolution `gorm:"column:resolution;type:varchar(30)"`
	ActedBy    int64               `gorm:"column:acted_by;not null;index"`
	CreatedAt  Time                `gorm:"column:created_at;not null;default:now();index"`
}

func (ReviewFeedbackAction) TableName() string {
	return "review_feedback_actions"
}

type ReviewFeedbackReaction struct {
	ID         int64  `gorm:"column:id;primaryKey;autoIncrement"`
	FeedbackID int64  `gorm:"column:feedback_id;not null;uniqueIndex:idx_review_feedback_reactions_feedback_user;index"`
	UserID     int64  `gorm:"column:user_id;not null;uniqueIndex:idx_review_feedback_reactions_feedback_user;index"`
	Reaction   string `gorm:"column:reaction;type:varchar(20);not null"`
	Timestamped
}

func (ReviewFeedbackReaction) TableName() string {
	return "review_feedback_reactions"
}
