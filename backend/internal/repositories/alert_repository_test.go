package repositories

import (
	"context"
	"testing"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/redis/go-redis/v9"
)

func TestAlertRepository(t *testing.T) {
	// Setup: Requires a local redis instance. Use T.Skip if not available.
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Skipping Redis repository test: server not reachable")
	}
	defer rdb.Close()

	repo := NewAlertRepository(rdb)
	alertID := "test-alert-1"

	// 1. Create alert state
	alert := &models.Alert{
		AlertID:      alertID,
		UserID:       "user-1",
		CurrentState: models.AlertStateFallDetected,
		Severity:     models.SeverityHigh,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	err := repo.SetAlertState(ctx, alert, 10*time.Second)
	if err != nil {
		t.Fatalf("Failed to set alert state: %v", err)
	}

	// 2. Retrieve alert state
	savedAlert, err := repo.GetAlertState(ctx, alertID)
	if err != nil {
		t.Fatalf("Failed to get alert state: %v", err)
	}
	if savedAlert == nil {
		t.Fatal("Expected saved alert to be found")
	}
	if savedAlert.CurrentState != models.AlertStateFallDetected {
		t.Errorf("Expected state %s, got %s", models.AlertStateFallDetected, savedAlert.CurrentState)
	}

	// 3. Update alert state
	err = repo.UpdateAlertState(ctx, alertID, models.AlertStateLevel1Alert)
	if err != nil {
		t.Fatalf("Failed to update alert state: %v", err)
	}

	updatedAlert, _ := repo.GetAlertState(ctx, alertID)
	if updatedAlert.CurrentState != models.AlertStateLevel1Alert {
		t.Errorf("Expected state %s, got %s", models.AlertStateLevel1Alert, updatedAlert.CurrentState)
	}

	// 4. Cleanup
	err = repo.DeleteAlertState(ctx, alertID)
	if err != nil {
		t.Fatalf("Failed to delete alert state: %v", err)
	}
}
