package entity

type Team struct {
	ID          int64   `gorm:"column:id;primaryKey;autoIncrement"`
	Name        string  `gorm:"column:name;type:varchar(255);not null"`
	Description *string `gorm:"column:description;type:text"`
	AvatarURL   *string `gorm:"column:avatar_url;type:text"`
	CreatedBy   int64   `gorm:"column:created_by;not null;index"`
	Timestamped
}

func (Team) TableName() string {
	return "teams"
}

type TeamMember struct {
	ID       int64 `gorm:"column:id;primaryKey;autoIncrement"`
	TeamID   int64 `gorm:"column:team_id;not null;uniqueIndex:idx_team_members_team_user;index"`
	UserID   int64 `gorm:"column:user_id;not null;uniqueIndex:idx_team_members_team_user;index"`
	JoinedAt Time  `gorm:"column:joined_at;not null;default:now()"`
}

func (TeamMember) TableName() string {
	return "team_members"
}
