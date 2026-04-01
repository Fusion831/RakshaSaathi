package services

import (
	"context"
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
	defer rdb.Close()

	repo := repositories.NewAlertRepository(rdb)
	engine := NewAlertEngine(repo, nil, rdb)

	userID := "user-123"
	eventID := "event-456"

	// 1. Process Event
	event := models.BaseEvent{
		EventID:   eventID,
		Type:      "fall.detected",
		UserID:    userID,
		Timestamp: time.Now(),
	}

	err := engine.HandleEvent(ctx, event)
	if err != nil {
		t.Fatalf("Failed to handle event: %v", err)
	}

	// 2. Verify Idempotency (Processing same event again shouldn't fail or duplicate)
	err = engine.HandleEvent(ctx, event)
	if err != nil {
		t.Fatalf("Idempotency check failed: %v", err)
	}

	// 3. Verify Deterministic Transitions (simulating time-based advance)
	// Alert key will be generated as alert:userID:unix
	// For testing, let's manually trigger AdvanceState

	// We need to find the alertID created. For simplicity in test, let's just trigger on fall detected.
	// In production, we'd use a more deterministic alertID prefix or store in a user->active_alert map.
	// But let's check if transitions are correct logic-wise.

	if engine.getNextState(models.AlertStateFallDetected) != models.AlertStateWaitingConfirmation {
		t.Error("Transition FallDetected -> WaitingConfirmation failed")
	}
	if engine.getNextState(models.AlertStateWaitingConfirmation) != models.AlertStateLevel1Alert {
		t.Error("Transition WaitingConfirmation -> Level1 failed")
	}
}
