package entity

type Variant struct {
	ID              int64   `gorm:"column:id;primaryKey;autoIncrement"`
	ProjectID       int64   `gorm:"column:project_id;not null;index"`
	Name            string  `gorm:"column:name;type:varchar(255);not null"`
	Description     *string `gorm:"column:description;type:text"`
	IsMain          bool    `gorm:"column:is_main;not null;default:false;index"`
	ParentVariantID *int64  `gorm:"column:parent_variant_id;index"`
	DesignGuideID   *int64  `gorm:"column:design_guide_id"`
	AnalysisScore   *int32  `gorm:"column:analysis_score"`
	CreatedBy       int64   `gorm:"column:created_by;not null"`
	Timestamped
}

func (Variant) TableName() string {
	return "variants"
}
