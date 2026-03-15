package entity

import "gorm.io/datatypes"

type AnalysisReport struct {
	ID           int64          `gorm:"column:id;primaryKey;autoIncrement"`
	VariantID    int64          `gorm:"column:variant_id;not null;index"`
	OverallScore int32          `gorm:"column:overall_score;not null;index"`
	ReportData   datatypes.JSON `gorm:"column:report_data;type:jsonb;not null"`
	AnalyzedAt   Time           `gorm:"column:analyzed_at;not null;default:now()"`
	CreatedOnly
}

func (AnalysisReport) TableName() string {
	return "analysis_reports"
}

type ActivityLog struct {
	ID                int64          `gorm:"column:id;primaryKey;autoIncrement"`
	UserID            int64          `gorm:"column:user_id;not null;index"`
	ProjectID         *int64         `gorm:"column:project_id;index"`
	TeamID            *int64         `gorm:"column:team_id;index"`
	ActionType        string         `gorm:"column:action_type;type:varchar(100);not null"`
	ActionDescription *string        `gorm:"column:action_description;type:text"`
	Metadata          datatypes.JSON `gorm:"column:metadata;type:jsonb"`
	CreatedOnly
}

func (ActivityLog) TableName() string {
	return "activity_logs"
}
