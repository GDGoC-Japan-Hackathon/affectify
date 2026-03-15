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

type ProjectShare struct {
	ID        int64 `gorm:"column:id;primaryKey;autoIncrement"`
	ProjectID int64 `gorm:"column:project_id;not null;uniqueIndex:idx_project_shares_project_team;index"`
	TeamID    int64 `gorm:"column:team_id;not null;uniqueIndex:idx_project_shares_project_team;index"`
	SharedBy  int64 `gorm:"column:shared_by;not null"`
	SharedAt  Time  `gorm:"column:shared_at;not null;default:now()"`
}

func (ProjectShare) TableName() string {
	return "project_shares"
}
