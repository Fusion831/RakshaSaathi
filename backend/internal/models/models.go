package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	gorm.Model
	Name  string `json:"name"`
	Email string `json:"email" gorm:"unique"`
}

type Event struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`      // vitals.updated, fall.detected, etc
	SourceID  string    `json:"source_id"` // camera_id, wearable_id
	Payload   string    `json:"payload"`   // JSON representation of event data
	Timestamp time.Time `json:"timestamp"`
}
