package entity

import "time"

type Timestamped struct {
	CreatedAt time.Time `gorm:"column:created_at;not null;default:now()"`
	UpdatedAt time.Time `gorm:"column:updated_at;not null;default:now()"`
}

type CreatedOnly struct {
	CreatedAt time.Time `gorm:"column:created_at;not null;default:now()"`
}
