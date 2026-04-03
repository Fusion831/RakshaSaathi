package services

import (
	"context"
	"log"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/Fusion831/RakshaSaathi/internal/repositories"
	"gorm.io/gorm"
)

type AlertService struct {
	db   *gorm.DB
	repo *repositories.AlertRepository
}

func NewAlertService(db *gorm.DB, repo *repositories.AlertRepository) *AlertService {
	return &AlertService{
		db:   db,
		repo: repo,
	}
}

func (s *AlertService) GetAlert(ctx context.Context, id string) (*models.Alert, error) {
	return s.repo.GetAlertState(ctx, id)
}

func (s *AlertService) ResolveAlert(ctx context.Context, id string, finalState models.AlertState) error {
	// 1. Move from Redis to Postgres (Simulated persistence)
	alert, err := s.repo.GetAlertState(ctx, id)
	if err != nil {
		return err
	}
	if alert == nil {
		return nil
	}

	alert.CurrentState = finalState
	alert.UpdatedAt = time.Now()

	// 2. Persist to DB if provided
	if s.db != nil {
		// Example GORM write
		if err := s.db.Create(alert).Error; err != nil {
			log.Printf("Failed to archive alert in Postgres: %v", err)
		}
	}

	// 3. Remove from Redis
	return s.repo.DeleteAlertState(ctx, id)
}

// GetAlertHistory retrieves alert history for a user from PostgreSQL
func (s *AlertService) GetAlertHistory(ctx context.Context, userID string) ([]models.Alert, error) {
	var alerts []models.Alert

	if s.db == nil {
		return alerts, nil // No database configured
	}

	// Fetch last 100 alerts for user, ordered by timestamp desc
	err := s.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("timestamp DESC").
		Limit(100).
		Find(&alerts).Error

	if err != nil {
		log.Printf("Failed to fetch alert history for user %s: %v", userID, err)
		return []models.Alert{}, nil
	}

	return alerts, nil
}

// Logic for alert state machine will go here
