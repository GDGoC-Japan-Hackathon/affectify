package entity

type ProjectMember struct {
	ID          int64 `gorm:"column:id;primaryKey;autoIncrement"`
	ProjectID   int64 `gorm:"column:project_id;not null;uniqueIndex:idx_project_members_project_user;index"`
	UserID      int64 `gorm:"column:user_id;not null;uniqueIndex:idx_project_members_project_user;index"`
	InvitedBy   int64 `gorm:"column:invited_by;not null"`
	JoinedAt    Time  `gorm:"column:joined_at;not null;default:now()"`
}

func (ProjectMember) TableName() string {
	return "project_members"
}
