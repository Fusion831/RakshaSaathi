package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Fusion831/RakshaSaathi/internal/nats"
	"github.com/Fusion831/RakshaSaathi/internal/services"
	"github.com/gin-gonic/gin"
)

func TestHealthCheck(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Mocking dependencies (using nils for simplicity where they are not used)
	h := NewHandler(&services.AlertService{}, &services.AlertEngine{}, &services.WSBroadcaster{}, &nats.JetStreamManager{})

	r := gin.Default()
	r.GET("/health", h.HealthCheck)

	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status OK, got %v", w.Code)
	}

	expected := `{"status":"ok"}`
	if w.Body.String() != expected {
		t.Errorf("Expected body %s, got %s", expected, w.Body.String())
	}
}
