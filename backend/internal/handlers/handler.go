package handlers

import (
	"net/http"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/nats"
	"github.com/Fusion831/RakshaSaathi/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type Handler struct {
	alertService *services.AlertService
	engine       *services.AlertEngine
	natsMgr      *nats.JetStreamManager
	upgrader     websocket.Upgrader
}

func NewHandler(alertService *services.AlertService, engine *services.AlertEngine, natsMgr *nats.JetStreamManager) *Handler {
	return &Handler{
		alertService: alertService,
		engine:       engine,
		natsMgr:      natsMgr,
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Open for development
			},
		},
	}
}

func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// PostEvent handles ingestion of events via REST
func (h *Handler) PostEvent(c *gin.Context) {
	var event models.BaseEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	err := h.natsMgr.PublishBaseEvent(event.Type, event)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to publish event"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "event ingested", "event_id": event.EventID})
}

// GetAlerts returns active alerts from Redis
func (h *Handler) GetAlerts(c *gin.Context) {
	// Note: In a real system, you'd scan for "alert:*" keys or maintain an active list
	// For now, we'll return a placeholder or scan keys (simpler for MVP)
	// This would be moved to the repository in a later iteration
	c.JSON(http.StatusOK, gin.H{"message": "this would return the list of active alerts from redis"})
}

// GetAlertDetails returns a single alert by ID
func (h *Handler) GetAlertDetails(c *gin.Context) {
	id := c.Param("id")
	alert, err := h.alertService.GetAlert(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if alert == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "alert not found"})
		return
	}

	c.JSON(http.StatusOK, alert)
}

// AcknowledgeAlert handles the manual intervention to stop escalation
func (h *Handler) AcknowledgeAlert(c *gin.Context) {
	id := c.Param("id")
	err := h.alertService.ResolveAlert(c.Request.Context(), id, models.AlertStateResolved)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "alert acknowledged and resolved"})
}

func (h *Handler) HandleWebSocket(c *gin.Context) {
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	for {
		// Placeholder for WebSocket logic
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}
