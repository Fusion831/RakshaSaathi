package nats

import (
	"log"

	"github.com/nats-io/nats.go"
	"github.com/sihhackathon/gharseva/internal/config"
)

func NewNATSConnection(cfg *config.Config) (nats.JetStreamContext, *nats.Conn, error) {
	nc, err := nats.Connect(cfg.NatsURL)
	if err != nil {
		return nil, nil, err
	}

	js, err := nc.JetStream()
	if err != nil {
		return nil, nc, err
	}

	log.Println("Connected to NATS JetStream successfully")
	return js, nc, nil
}
