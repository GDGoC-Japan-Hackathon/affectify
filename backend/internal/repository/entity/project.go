package entity

type Project struct {
	ID          int64   `gorm:"column:id;primaryKey;autoIncrement"`
	Name        string  `gorm:"column:name;type:varchar(255);not null"`
	Description *string `gorm:"column:description;type:text"`
	OwnerID     int64   `gorm:"column:owner_id;not null;index"`
	Timestamped
}

func (Project) TableName() string {
	return "projects"
}

