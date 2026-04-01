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

func TestAlertEngine_Determinism(t *testing.T) {
	// Setup: Requires a local redis instance. Use T.Skip if not available.
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Skipping AlertEngine test: server not reachable")
	}
	// Flush Redis to ensure a clean state
	rdb.FlushDB(ctx)
	defer rdb.Close()

	repo := repositories.NewAlertRepository(rdb)
	vitalsRepo := repositories.NewVitalsRepository(rdb)
	ws := NewWSBroadcaster()
	engine := NewAlertEngine(repo, vitalsRepo, ws, nil, rdb)
	engine.EscalationInterval = 10 * time.Millisecond // Accelerate for testing

	userID := "user-123"
	eventID := "event-456"

	// 1. Process Event
	event := models.BaseEvent{
		EventID:   eventID,
		Type:      "fall.detected",
		UserID:    userID,
		Timestamp: time.Now(),
		Payload:   json.RawMessage(`{"confidence": 0.95}`),
	}

	err := engine.HandleEvent(ctx, event)
	if err != nil {
		t.Fatalf("Failed to handle event: %v", err)
	}

	// 1.a. Verify alert was created in Redis (Scanning for it since ID is dynamic)
	var alert *models.Alert
	keys, _ := rdb.Keys(ctx, "alert:*").Result()
	for _, k := range keys {
		data, _ := rdb.Get(ctx, k).Bytes()
		var temp models.Alert
		json.Unmarshal(data, &temp)
		if temp.UserID == userID {
			alert = &temp
			break
		}
	}

	if alert == nil {
		t.Fatal("Expected alert to be found in Redis")
	}
	if alert.CurrentState != models.AlertStateFallDetected {
		t.Errorf("Expected state %s, got %s", models.AlertStateFallDetected, alert.CurrentState)
	}

	// 2. Verify Idempotency (Processing same event again shouldn't fail or duplicate)
	err = engine.HandleEvent(ctx, event)
	if err != nil {
		t.Fatalf("Idempotency check failed: %v", err)
	}

	// 3. Verify Deterministic Transitions (simulating time-based advance)
	err = engine.AdvanceState(ctx, alert.AlertID)
	if err != nil {
		t.Fatalf("Failed to advance state: %v", err)
	}

	updatedAlert, _ := repo.GetAlertState(ctx, alert.AlertID)
	if updatedAlert == nil {
		t.Fatal("Expected updated alert to exist")
	}
	if updatedAlert.CurrentState != models.AlertStateWaitingConfirmation {
		t.Errorf("Expected state %s, got %s", models.AlertStateWaitingConfirmation, updatedAlert.CurrentState)
	}

	// 4. Test logic transitions
	if engine.getNextState(models.AlertStateFallDetected) != models.AlertStateWaitingConfirmation {
		t.Error("Transition FallDetected -> WaitingConfirmation failed")
	}
	if engine.getNextState(models.AlertStateWaitingConfirmation) != models.AlertStateLevel1Alert {
		t.Error("Transition WaitingConfirmation -> Level1 failed")
	}
}
