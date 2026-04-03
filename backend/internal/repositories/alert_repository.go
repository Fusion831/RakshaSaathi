package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/redis/go-redis/v9"
)

type AlertRepository struct {
	rdb *redis.Client
}

func NewAlertRepository(rdb *redis.Client) *AlertRepository {
	return &AlertRepository{rdb: rdb}
}

func (r *AlertRepository) buildKey(alertID string) string {
	return fmt.Sprintf("alert:%s", alertID)
}

// SetAlertState stores the full alert object with a specified TTL.
func (r *AlertRepository) SetAlertState(ctx context.Context, alert *models.Alert, ttl time.Duration) error {
	data, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("failed to marshal alert: %w", err)
	}

	key := r.buildKey(alert.AlertID)
	err = r.rdb.Set(ctx, key, data, ttl).Err()
	if err != nil {
		return fmt.Errorf("failed to save alert to redis: %w", err)
	}

	return nil
}

// GetAlertState retrieves the full alert object from Redis.
func (r *AlertRepository) GetAlertState(ctx context.Context, alertID string) (*models.Alert, error) {
	key := r.buildKey(alertID)
	data, err := r.rdb.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Not found
		}
		return nil, fmt.Errorf("failed to get alert from redis: %w", err)
	}

	var alert models.Alert
	if err := json.Unmarshal(data, &alert); err != nil {
		return nil, fmt.Errorf("failed to unmarshal alert: %w", err)
	}

	return &alert, nil
}

// UpdateAlertState partially updates the state of an existing alert while preserving TTL.
func (r *AlertRepository) UpdateAlertState(ctx context.Context, alertID string, newState models.AlertState) error {
	key := r.buildKey(alertID)

	// Fetch existing TTL
	ttl, err := r.rdb.TTL(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to get alert TTL: %w", err)
	}

	alert, err := r.GetAlertState(ctx, alertID)
	if err != nil {
		return err
	}
	if alert == nil {
		return fmt.Errorf("alert %s not found for update", alertID)
	}

	alert.CurrentState = newState
	alert.UpdatedAt = time.Now()

	return r.SetAlertState(ctx, alert, ttl)
}

// DeleteAlertState removes the alert state from Redis (e.g., after resolution).
func (r *AlertRepository) DeleteAlertState(ctx context.Context, alertID string) error {
	key := r.buildKey(alertID)
	return r.rdb.Del(ctx, key).Err()
}
