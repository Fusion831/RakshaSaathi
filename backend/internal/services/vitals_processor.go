package services

import (
	"encoding/json"
	"log"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
)

type VitalsProcessor struct {
	vitalsRepo *repositories.VitalsRepository
	ws         *WSBroadcaster
	mlService  *MLInferenceService
}

func NewVitalsProcessor(repo *repositories.VitalsRepository, ws *WSBroadcaster, ml *MLInferenceService) *VitalsProcessor {
	return &VitalsProcessor{
		vitalsRepo: repo,
		ws:         ws,
		mlService:  ml,
	}
}

// ProcessVitals takes a raw vitals.updated event and persists to HOT storage (Redis)
func (s *VitalsProcessor) ProcessVitals(event models.BaseEvent) error {
	var vitals models.VitalsData
	err := json.Unmarshal(event.Payload, &vitals)
	if err != nil {
		log.Printf("[VitalsProcessor] Failed to unmarshal vitals payload: %v", err)
		return err
	}

	// Broadcast live vitals for the dashboard
	s.ws.BroadcastEvent("vitals.live", map[string]interface{}{
		"user_id":   event.UserID,
		"timestamp": event.Timestamp,
		"vitals":    vitals,
	})

	// Persist to Hot Storage (Redis) with UserID and Score (Timestamp)
	// Score: event.Timestamp.Unix()
	err = s.vitalsRepo.SaveVitals(event.UserID, event.Timestamp.Unix(), vitals)
	if err != nil {
		log.Printf("[VitalsProcessor] Failed to persist to Redis: %v", err)
		return err
	}

	// TRIGGER ANOMALY CHECK (Asynchronous to not block ingestion)
	go func() {
		res, err := s.mlService.AnalyzeRecentVitals(event.UserID)
		if err != nil {
			// Expected error for new users (not enough data points yet)
			return
		}

		if res.IsAnomaly {
			log.Printf("[VitalsProcessor] DETECTED ANOMALY for user %s. Score: %.4f, Severity: %s",
				event.UserID, res.Score, res.Severity)

			// Broadcast anomaly to all dashboards
			s.ws.BroadcastEvent("vitals.anomaly", map[string]interface{}{
				"user_id":  event.UserID,
				"score":    res.Score,
				"severity": res.Severity,
				"error":    res.PredictionError,
			})
		}
	}()

	log.Printf("[VitalsProcessor] Successfully stored vitals for user: %s", event.UserID)
	return nil
}
