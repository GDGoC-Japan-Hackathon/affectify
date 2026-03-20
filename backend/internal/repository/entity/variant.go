package entity

type Variant struct {
	ID                  int64         `gorm:"column:id;primaryKey;autoIncrement"`
	ProjectID           int64         `gorm:"column:project_id;not null;index"`
	Name                string        `gorm:"column:name;type:varchar(255);not null"`
	Description         *string       `gorm:"column:description;type:text"`
	IsMain              bool          `gorm:"column:is_main;not null;default:false;index"`
	ForkedFromVariantID *int64        `gorm:"column:forked_from_variant_id;index"`
	AnalysisScore       *int32        `gorm:"column:analysis_score"`
	Status              VariantStatus `gorm:"column:status;type:varchar(30);not null;default:active;index"`
	SourceLanguage      *string       `gorm:"column:source_language;type:varchar(50)"`
	SourceRootURI       *string       `gorm:"column:source_root_uri;type:text"`
	CreatedBy           int64         `gorm:"column:created_by;not null"`
	LastImportedAt      *Time         `gorm:"column:last_imported_at"`
	LastReviewedAt      *Time         `gorm:"column:last_reviewed_at"`
	Timestamped
}

func (Variant) TableName() string {
	return "variants"
}
