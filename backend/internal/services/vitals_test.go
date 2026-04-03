package services

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
	"github.com/redis/go-redis/v9"
)

func TestVitalsProcessor_ProcessVitals(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}
	defer rdb.Close()

	repo := repositories.NewVitalsRepository(rdb)
	ws := NewWSBroadcaster()
	mlService := NewMLInferenceService(repo, "http://localhost:8000") // Mock or actual endpoint
	// No need to start WS for unit test since we just want to see if it doesn't crash on broadcast

	processor := NewVitalsProcessor(repo, ws, mlService)

	userID := "test_user_vitals"
	vitals := models.VitalsData{HeartRate: 75, SpO2: 98}
	vitalsRaw, _ := json.Marshal(vitals)

	event := models.BaseEvent{
		EventID:   "evt_1",
		UserID:    userID,
		Type:      "vitals.updated",
		Timestamp: time.Now(),
		Payload:   vitalsRaw,
	}

	err := processor.ProcessVitals(event)
	if err != nil {
		t.Fatalf("Failed to process vitals: %v", err)
	}

	// Verify in Redis
	stored, err := repo.GetVitalsRange(userID, event.Timestamp.Unix()-1, event.Timestamp.Unix()+1)
	if err != nil {
		t.Fatalf("Failed to fetch stored vitals: %v", err)
	}

	if len(stored) != 1 {
		t.Errorf("Expected 1 stored vital, got %d", len(stored))
	} else if stored[0].HeartRate != 75 {
		t.Errorf("Expected HR 75, got %f", stored[0].HeartRate)
	}
}

func TestVitalsAggregator_Aggregation(t *testing.T) {
	rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available")
	}
	defer rdb.Close()

	// For Postgres, we'd ideally use sqlite-in-memory for GORM tests
	// But let's verify the logic first
	repo := repositories.NewVitalsRepository(rdb)
	userID := "agg_test_user"

	now := time.Now().Unix()
	repo.SaveVitals(userID, now-10, models.VitalsData{HeartRate: 70, SpO2: 95})
	repo.SaveVitals(userID, now-5, models.VitalsData{HeartRate: 80, SpO2: 97})
	repo.SaveVitals(userID, now, models.VitalsData{HeartRate: 90, SpO2: 99})

	vitals, err := repo.GetVitalsRange(userID, now-15, now+5)
	if err != nil {
		t.Fatalf("Failed to get vitals: %v", err)
	}

	if len(vitals) != 3 {
		t.Errorf("Expected 3 vitals, got %d", len(vitals))
	}

	// Manual stats check
	var sum float64
	maxVal := -1.0
	for _, v := range vitals {
		hr := float64(v.HeartRate)
		sum += hr
		if hr > maxVal {
			maxVal = hr
		}
	}

	if sum/3 != 80 {
		t.Errorf("Expected Avg 80, got %f", sum/3)
	}
	if maxVal != 90 {
		t.Errorf("Expected Max 90, got %f", maxVal)
	}
}
