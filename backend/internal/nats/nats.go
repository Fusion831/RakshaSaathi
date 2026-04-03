package nats

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/config"
	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/nats-io/nats.go"
)

type JetStreamManager struct {
	Conn *nats.Conn
	JS   nats.JetStreamContext
}

func NewJetStreamManager(cfg *config.Config) (*JetStreamManager, error) {
	// Reconnect logic is built into nats.Connect options
	nc, err := nats.Connect(cfg.NatsURL,
		nats.MaxReconnects(-1),
		nats.ReconnectWait(2*time.Second),
		nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
			log.Printf("Disconnected from NATS: %v", err)
		}),
		nats.ReconnectHandler(func(nc *nats.Conn) {
			log.Printf("Reconnected to NATS: %s", nc.ConnectedUrl())
		}),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("failed to get JetStream context: %w", err)
	}

	manager := &JetStreamManager{
		Conn: nc,
		JS:   js,
	}

	// Initial Stream Setup
	if err := manager.setupStreams(); err != nil {
		nc.Close()
		return nil, err
	}

	log.Println("Connected to NATS JetStream successfully")
	return manager, nil
}

func (m *JetStreamManager) setupStreams() error {
	// Define the RAKSHASAATHI stream to capture all relevant events
	streamName := "RAKSHASAATHI"
	subjects := []string{"fall.detected", "vitals.updated", "anomaly.detected", "sos.triggered", "alert.*"}

	_, err := m.JS.StreamInfo(streamName)
	if err != nil {
		log.Printf("Stream %s not found, creating...", streamName)
		_, err = m.JS.AddStream(&nats.StreamConfig{
			Name:     streamName,
			Subjects: subjects,
			Storage:  nats.FileStorage,
		})
		if err != nil {
			return fmt.Errorf("failed to create stream: %w", err)
		}
	} else {
		// Update stream to include any new subjects like sos.triggered
		_, err = m.JS.UpdateStream(&nats.StreamConfig{
			Name:     streamName,
			Subjects: subjects,
			Storage:  nats.FileStorage,
		})
		if err != nil {
			log.Printf("Stream %s already exists, but failed to update subjects: %v", streamName, err)
		} else {
			log.Printf("Stream %s subjects updated successfully", streamName)
		}
	}
	return nil
}

// PublishBaseEvent handles serialization and publishing to JetStream
func (m *JetStreamManager) PublishBaseEvent(subject string, event models.BaseEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	_, err = m.JS.Publish(subject, data)
	if err != nil {
		return fmt.Errorf("failed to publish to NATS: %w", err)
	}

	return nil
}

// SubscribeDurable creates a consumer that keeps track of its own progress
func (m *JetStreamManager) SubscribeDurable(subject, durableName string, handler nats.MsgHandler) (*nats.Subscription, error) {
	sub, err := m.JS.Subscribe(subject, handler,
		nats.Durable(durableName),
		nats.ManualAck(), // Ensuring reliable processing
	)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to %s: %w", subject, err)
	}

	log.Printf("Durable subscriber %s created for subject %s", durableName, subject)
	return sub, nil
}

func (m *JetStreamManager) Close() {
	m.Conn.Close()
}
