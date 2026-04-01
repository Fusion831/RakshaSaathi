package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/config"
	"github.com/Fusion831/RakshaSaathi/internal/handlers"
	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/nats"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
	"github.com/Fusion831/RakshaSaathi/internal/services"
	"github.com/gin-gonic/gin"
	corenats "github.com/nats-io/nats.go"
	"github.com/redis/go-redis/v9"
)

// NOTE: These tests require a full environment running (NATS, Redis)
// Use go test -v ./internal/integration_test.go to run.

func TestFullIntegration(t *testing.T) {
	// 1. Setup Environment
	cfg := &config.Config{
		NatsURL:    "nats://localhost:4222",
		RedisHost:  "localhost",
		RedisPort:  "6379",
		DBHost:     "localhost",
		DBPort:     "5432",
		DBUser:     "postgres",
		DBPassword: "postgres",
		DBName:     "gharseva",
	}

	ctx := context.Background()

	// 2. Initialize Dependencies
	natsMgr, err := nats.NewJetStreamManager(cfg)
	if err != nil {
		t.Skip("NATS not available for integration test")
	}
	defer natsMgr.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", cfg.RedisHost, cfg.RedisPort),
	})
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Skip("Redis not available for integration test")
	}
	defer rdb.Close()

	// Skip real Postgres and just focus on NATS + Redis for now
	alertRepo := repositories.NewAlertRepository(rdb)
	vitalsRepo := repositories.NewVitalsRepository(rdb)
	ws := services.NewWSBroadcaster()
	alertSvc := services.NewAlertService(nil, alertRepo)
	engine := services.NewAlertEngine(alertRepo, vitalsRepo, ws, natsMgr.JS, rdb)
	h := handlers.NewHandler(alertSvc, engine, ws, natsMgr)

	// 3. Test API Health Check
	t.Run("API Health Check", func(t *testing.T) {
		r := gin.Default()
		r.GET("/health", h.HealthCheck)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/health", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Errorf("Expected health status OK, got %v", w.Code)
		}
	})

	// 4. Test Event Propagation (E2E)
	t.Run("E2E Event Flow (NATS -> Consumer -> Redis State)", func(t *testing.T) {
		subject := "fall.detected"
		durable := "integration_consumer"
		alertID := "alert-999"

		msgChan := make(chan *corenats.Msg, 1)

		// Create durable subscription to simulate alert processing
		_, err := natsMgr.SubscribeDurable(subject, durable, func(m *corenats.Msg) {
			var event models.BaseEvent
			json.Unmarshal(m.Data, &event)

			// Simulate triggering an alert in Redis
			alert := &models.Alert{
				AlertID:      alertID,
				UserID:       event.UserID,
				CurrentState: models.AlertStateFallDetected,
				Severity:     models.SeverityHigh,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			alertRepo.SetAlertState(ctx, alert, 5*time.Second)

			msgChan <- m
			m.Ack()
		})
		if err != nil {
			t.Fatalf("Failed to subscribe: %v", err)
		}

		// Publish simulated fall detection
		testEvent := models.BaseEvent{
			EventID:   "e-1",
			Type:      "fall.detected",
			UserID:    "user-99",
			Timestamp: time.Now(),
		}

		err = natsMgr.PublishBaseEvent(subject, testEvent)
		if err != nil {
			t.Fatalf("Failed to publish: %v", err)
		}

		// Wait for processing
		select {
		case <-msgChan:
			// Consumer processed the message, now verify state in Redis
			alert, _ := alertRepo.GetAlertState(ctx, alertID)
			if alert == nil {
				t.Fatal("Alert state not found in Redis after processing")
			}
			if alert.UserID != "user-99" {
				t.Errorf("Expected UserID user-99, got %s", alert.UserID)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("Integration flow timed out after 3s")
		}

		// Clean up Redis
		alertRepo.DeleteAlertState(ctx, alertID)
	})
}
