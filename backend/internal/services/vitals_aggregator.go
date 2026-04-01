package services

import (
	"context"
	"log"
	"math"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
	"gorm.io/gorm"
)

type VitalsAggregator struct {
	vitalsRepo *repositories.VitalsRepository
	db         *gorm.DB
	interval   time.Duration
}

func NewVitalsAggregator(repo *repositories.VitalsRepository, db *gorm.DB, interval time.Duration) *VitalsAggregator {
	return &VitalsAggregator{
		vitalsRepo: repo,
		db:         db,
		interval:   interval,
	}
}

// StartAggregationLoop executes at a fixed interval to downsample Redis data to Postgres
func (a *VitalsAggregator) StartAggregationLoop(ctx context.Context) {
	ticker := time.NewTicker(a.interval)
	defer ticker.Stop()

	log.Printf("[VitalsAggregator] Aggregation worker started with interval: %v", a.interval)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			a.runAggregationTask()
		}
	}
}

func (a *VitalsAggregator) runAggregationTask() {
	// 1. Fetch all unique users from Redis (This would normally be dynamic, or from DB)
	// We'll simulate fetching for one, but in production we'd iterate over active users

	now := time.Now()
	startTime := now.Add(-a.interval).Unix()
	endTime := now.Unix()
	intervalTime := now.Truncate(a.interval)

	// In production: users := a.getUsers()
	// For now, we'll try to aggregate for any active sessions
	// We'll use a placeholder userID for demonstration until the user registry is ready
	a.AggregateUserVitals("test_user_1", startTime, endTime, intervalTime)
}

// AggregateUserVitals performs the computation for a single user
func (a *VitalsAggregator) AggregateUserVitals(userID string, start, end int64, intervalTime time.Time) {
	vitals, err := a.vitalsRepo.GetVitalsRange(userID, start, end)
	if err != nil || len(vitals) == 0 {
		return
	}

	var sumHR, sumSpO2 float64
	maxHR, maxSpO2 := -1.0, -1.0
	minHR, minSpO2 := 1000.0, 1000.0 // Reasonable defaults

	for _, v := range vitals {
		hr := float64(v.HeartRate)
		spo2 := float64(v.SpO2)

		sumHR += hr
		sumSpO2 += spo2

		maxHR = math.Max(maxHR, hr)
		minHR = math.Min(minHR, hr)

		maxSpO2 = math.Max(maxSpO2, spo2)
		minSpO2 = math.Min(minSpO2, spo2)
	}

	n := float64(len(vitals))

	agg := models.VitalsAggregated{
		UserID:   userID,
		Interval: intervalTime,
		AvgHR:    sumHR / n,
		MaxHR:    maxHR,
		MinHR:    minHR,
		AvgSpO2:  sumSpO2 / n,
		MaxSpO2:  maxSpO2,
		MinSpO2:  minSpO2,
	}

	// Persist to Postgres (Warm Storage)
	if err := a.db.Create(&agg).Error; err != nil {
		log.Printf("[VitalsAggregator] DB Save Error for user %s: %v", userID, err)
	}
}
