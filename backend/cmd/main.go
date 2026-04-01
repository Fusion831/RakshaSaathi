package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/config"
	"github.com/Fusion831/RakshaSaathi/internal/handlers"
	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/nats"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
	"github.com/Fusion831/RakshaSaathi/internal/services"
	"github.com/gin-gonic/gin"
	corenats "github.com/nats-io/nats.go"
)

func main() {
	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Setup PostgreSQL
	db, err := repositories.NewPostgresDB(cfg)
	if err != nil {
		log.Fatal("Could not connect to PostgreSQL:", err)
	}

	// 3. Setup Redis
	rdb, err := repositories.NewRedisClient(cfg)
	if err != nil {
		log.Fatal("Could not connect to Redis:", err)
	}

	// 4. Setup NATS
	natsMgr, err := nats.NewJetStreamManager(cfg)
	if err != nil {
		log.Fatal("Could not connect to NATS:", err)
	}
	defer natsMgr.Close()

	// 5. Initialize Services
	alertRepo := repositories.NewAlertRepository(rdb)
	vitalsRepo := repositories.NewVitalsRepository(rdb)

	wsBroadcaster := services.NewWSBroadcaster()
	go wsBroadcaster.Start()

	engine := services.NewAlertEngine(alertRepo, vitalsRepo, wsBroadcaster, natsMgr.JS, rdb)
	alertService := services.NewAlertService(db, alertRepo)
	vitalsProcessor := services.NewVitalsProcessor(vitalsRepo, wsBroadcaster)
	aggregator := services.NewVitalsAggregator(vitalsRepo, db, 5*time.Minute)

	// 5.1 Run Vitals Migrations
	db.AutoMigrate(&models.VitalsAggregated{})

	// 6. Start NATS Consumers
	startConsumers(natsMgr, engine, vitalsProcessor)

	// 6.1 Start Aggregation Worker
	go aggregator.StartAggregationLoop(context.Background())

	// 7. Initialize Handlers
	h := handlers.NewHandler(alertService, engine, wsBroadcaster, natsMgr)

	// 8. Setup HTTP server
	r := gin.Default()

	r.GET("/health", h.HealthCheck)
	r.GET("/ws", h.HandleWebSocket)

	// REST API Routes
	r.POST("/event", h.PostEvent)
	r.GET("/alerts/:id", h.GetAlertDetails)
	r.POST("/alerts/:id/acknowledge", h.AcknowledgeAlert)

	// 8. Start server
	log.Printf("Starting RakshaSaathi server on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("Could not start server:", err)
	}
}

func startConsumers(mgr *nats.JetStreamManager, engine *services.AlertEngine, vitals *services.VitalsProcessor) {
	ctx := context.Background()

	// Consumer for Fall Detection
	_, err := mgr.SubscribeDurable("fall.detected", "fall_processor", func(m *corenats.Msg) {
		var event models.BaseEvent
		if err := json.Unmarshal(m.Data, &event); err != nil {
			log.Printf("Error unmarshaling fall event: %v", err)
			m.Term()
			return
		}

		if err := engine.HandleEvent(ctx, event); err != nil {
			log.Printf("Error handling fall event: %v", err)
			m.Nak() // Retry later
			return
		}
		m.Ack()
	})
	if err != nil {
		log.Printf("Failed to subscribe to fall.detected: %v", err)
	}

	// Consumer for Vitals (Hot Storage Ingestion)
	_, err = mgr.SubscribeDurable("vitals.updated", "vitals_processor", func(m *corenats.Msg) {
		var event models.BaseEvent
		if err := json.Unmarshal(m.Data, &event); err != nil {
			log.Printf("Error unmarshaling vitals event: %v", err)
			m.Term()
			return
		}

		if err := vitals.ProcessVitals(event); err != nil {
			log.Printf("Error processing vitals: %v", err)
			m.Nak()
			return
		}
		m.Ack()
	})
	if err != nil {
		log.Printf("Failed to subscribe to vitals.updated: %v", err)
	}

	// Consumer for Anomalies
	_, err = mgr.SubscribeDurable("anomaly.detected", "anomaly_processor", func(m *corenats.Msg) {
		var event models.BaseEvent
		if err := json.Unmarshal(m.Data, &event); err != nil {
			log.Printf("Error unmarshaling anomaly event: %v", err)
			m.Term()
			return
		}

		if err := engine.HandleEvent(ctx, event); err != nil {
			log.Printf("Error handling anomaly event: %v", err)
			m.Nak()
			return
		}
		m.Ack()
	})
	if err != nil {
		log.Printf("Failed to subscribe to anomaly.detected: %v", err)
	}

	log.Println("NATS Durable Consumers started for fall and anomalies")
}
