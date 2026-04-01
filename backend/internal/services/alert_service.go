package services

import (
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type AlertService struct {
	db  *gorm.DB
	rdb *redis.Client
	js  nats.JetStreamContext
}

func NewAlertService(db *gorm.DB, rdb *redis.Client, js nats.JetStreamContext) *AlertService {
	return &AlertService{
		db:  db,
		rdb: rdb,
		js:  js,
	}
}

// Logic for alert state machine will go here
