package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/sihhackathon/gharseva/internal/config"
	"github.com/sihhackathon/gharseva/internal/handlers"
	"github.com/sihhackathon/gharseva/internal/nats"
	"github.com/sihhackathon/gharseva/internal/repositories"
	"github.com/sihhackathon/gharseva/internal/services"
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
	alertService := services.NewAlertService(db, rdb, natsMgr.JS)

	// 6. Initialize Handlers
	h := handlers.NewHandler(alertService)

	// 7. Setup HTTP server
	r := gin.Default()

	r.GET("/health", h.HealthCheck)
	r.GET("/ws", h.HandleWebSocket)

	// 8. Start server
	log.Printf("Starting server on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("Could not start server:", err)
	}
}
