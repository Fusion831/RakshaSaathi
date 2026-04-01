package nats

import (
	"log"
	"testing"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/Fusion831/RakshaSaathi/internal/config"
	"github.com/Fusion831/RakshaSaathi/internal/models"
)

// NOTE: These tests require a running NATS server at nats://localhost:4222
// If NATS is not available, they will be skipped in a real CI environment.

func TestJetStreamManager_PublishAndSubscribe(t *testing.T) {
	cfg := &config.Config{
		NatsURL: "nats://localhost:4222",
	}

	// Try to connect, skip if NATS is unavailable
	mgr, err := NewJetStreamManager(cfg)
	if err != nil {
		t.Skip("Skipping NATS test: server not reachable")
	}
	defer mgr.Close()

	subject := "vitals.updated"
	durable := "test_consumer"
	
	msgChan := make(chan *nats.Msg, 1)
	
	_, err = mgr.SubscribeDurable(subject, durable, func(m *nats.Msg) {
		msgChan <- m
		m.Ack()
	})
	if err != nil {
		t.Fatalf("Failed to subscribe: %v", err)
	}

	event := models.BaseEvent{
		EventID:   "test-1",
		Type:      "vitals.updated",
		UserID:    "user-1",
		Timestamp: time.Now(),
	}

	err = mgr.PublishBaseEvent(subject, event)
	if err != nil {
		t.Fatalf("Failed to publish: %v", err)
	}

	select {
	case msg := <-msgChan:
		log.Printf("Received message: %s", string(msg.Data))
	case <-time.After(2 * time.Second):
		t.Fatal("Timed out waiting for message")
	}
}

