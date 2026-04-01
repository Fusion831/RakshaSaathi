package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
	"github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
)

type AlertEngine struct {
	repo       *repositories.AlertRepository
	vitalsRepo *repositories.VitalsRepository
	ws         *WSBroadcaster
	js         nats.JetStreamContext
	rdb        *redis.Client
	// Configuration (to make testing faster)
	EscalationInterval time.Duration
}

func NewAlertEngine(repo *repositories.AlertRepository, vitalsRepo *repositories.VitalsRepository, ws *WSBroadcaster, js nats.JetStreamContext, rdb *redis.Client) *AlertEngine {
	return &AlertEngine{
		repo:               repo,
		vitalsRepo:         vitalsRepo,
		ws:                 ws,
		js:                 js,
		rdb:                rdb,
		EscalationInterval: 30 * time.Second,
	}
}

// HandleEvent is the entry point for all incoming events that could trigger or affect an alert.
func (e *AlertEngine) HandleEvent(ctx context.Context, event models.BaseEvent) error {
	// 1. Idempotency Check: Don't process the same event twice
	processedKey := fmt.Sprintf("processed:%s", event.EventID)
	set, err := e.rdb.SetNX(ctx, processedKey, "1", 24*time.Hour).Result()
	if err != nil {
		return fmt.Errorf("idempotency check failed: %w", err)
	}
	if !set {
		log.Printf("Event %s already processed, skipping", event.EventID)
		return nil
	}

	// 2. Logic for Fall Detection
	if event.Type == "fall.detected" {
		return e.initiateFallAlert(ctx, event)
	}

	return nil
}

func (e *AlertEngine) initiateFallAlert(ctx context.Context, event models.BaseEvent) error {
	alertID := fmt.Sprintf("alert:%s:%d", event.UserID, time.Now().Unix())

	// Fetch last 10 minutes vitals context from Redis
	vitalsContext, _ := e.vitalsRepo.GetVitalsRange(event.UserID, event.Timestamp.Add(-10*time.Minute).Unix(), event.Timestamp.Unix())
	contextJSON, _ := json.Marshal(vitalsContext)

	alert := &models.Alert{
		AlertID:         alertID,
		UserID:          event.UserID,
		CurrentState:    models.AlertStateFallDetected,
		Severity:        models.SeverityHigh,
		IncidentContext: contextJSON,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Store in Redis with initial TTL (e.g., for verification window)
	err := e.repo.SetAlertState(ctx, alert, 30*time.Second)
	if err != nil {
		return err
	}

	log.Printf("New Fall Alert initiated: %s for user %s", alertID, event.UserID)

	// Broadcast alert creation
	e.ws.BroadcastEvent("alert.created", alert)

	// Transition to WAITING_CONFIRMATION after fallback
	go e.scheduleEscalation(alertID, e.EscalationInterval)

	return nil
}

// scheduleEscalation handles the timer-based transition
func (e *AlertEngine) scheduleEscalation(alertID string, delay time.Duration) {
	time.Sleep(delay)
	ctx := context.Background()

	err := e.AdvanceState(ctx, alertID)
	if err != nil {
		log.Printf("Failed to auto-escalate alert %s: %v", alertID, err)
	}
}

// AdvanceState handles the deterministic transitions between levels
func (e *AlertEngine) AdvanceState(ctx context.Context, alertID string) error {
	alert, err := e.repo.GetAlertState(ctx, alertID)
	if err != nil || alert == nil {
		return err // Alert might have been resolved/deleted
	}

	nextState := e.getNextState(alert.CurrentState)
	if nextState == alert.CurrentState {
		return nil // Max level reached or terminal state
	}

	log.Printf("Escalating Alert %s: %s -> %s", alertID, alert.CurrentState, nextState)

	err = e.repo.UpdateAlertState(ctx, alertID, nextState)
	if err != nil {
		return err
	}

	// Broadcast alert escalation
	alert.CurrentState = nextState
	alert.UpdatedAt = time.Now()
	e.ws.BroadcastEvent("alert.escalated", alert)

	// If not at max level, schedule next escalation
	if nextState != models.AlertStateLevel3Alert && nextState != models.AlertStateResolved {
		go e.scheduleEscalation(alertID, e.EscalationInterval)
	}

	return nil
}

func (e *AlertEngine) getNextState(current models.AlertState) models.AlertState {
	switch current {
	case models.AlertStateFallDetected:
		return models.AlertStateWaitingConfirmation
	case models.AlertStateWaitingConfirmation:
		return models.AlertStateLevel1Alert
	case models.AlertStateLevel1Alert:
		return models.AlertStateLevel2Alert
	case models.AlertStateLevel2Alert:
		return models.AlertStateLevel3Alert
	default:
		return current
	}
}
