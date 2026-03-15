package entity

import "time"

type User struct {
	ID          int64      `gorm:"column:id;primaryKey;autoIncrement"`
	Email       string     `gorm:"column:email;type:varchar(255);not null;uniqueIndex"`
	Name        string     `gorm:"column:name;type:varchar(255);not null"`
	AvatarURL   *string    `gorm:"column:avatar_url;type:text"`
	LastLoginAt *time.Time `gorm:"column:last_login_at"`
	Timestamped
}

func (User) TableName() string {
	return "users"
}
