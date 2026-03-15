package entity

type DesignGuide struct {
	ID          int64                 `gorm:"column:id;primaryKey;autoIncrement"`
	Name        string                `gorm:"column:name;type:varchar(255);not null"`
	Description *string               `gorm:"column:description;type:text"`
	Content     string                `gorm:"column:content;type:text;not null"`
	Visibility  DesignGuideVisibility `gorm:"column:visibility;type:varchar(20);not null;index"`
	CreatedBy   int64                 `gorm:"column:created_by;not null;index"`
	TeamID      *int64                `gorm:"column:team_id;index"`
	Timestamped
}

func (DesignGuide) TableName() string {
	return "design_guides"
}

type DesignGuideLike struct {
	ID            int64 `gorm:"column:id;primaryKey;autoIncrement"`
	DesignGuideID int64 `gorm:"column:design_guide_id;not null;uniqueIndex:idx_design_guide_likes_design_guide_user;index"`
	UserID        int64 `gorm:"column:user_id;not null;uniqueIndex:idx_design_guide_likes_design_guide_user;index"`
	CreatedOnly
}

func (DesignGuideLike) TableName() string {
	return "design_guide_likes"
}
