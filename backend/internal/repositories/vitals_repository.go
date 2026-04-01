package repositories

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/models"
	"github.com/redis/go-redis/v9"
)

type VitalsRepository struct {
	redis *redis.Client
	ctx   context.Context
}

func NewVitalsRepository(rd *redis.Client) *VitalsRepository {
	return &VitalsRepository{
		redis: rd,
		ctx:   context.Background(),
	}
}

const (
	VitalsKeyPrefix = "vitals"
	VitalsTTL       = 2 * time.Hour
)

// SaveStore stores vitals in a sorted set keyed by user_id
func (r *VitalsRepository) SaveVitals(userID string, timestamp int64, data models.VitalsData) error {
	key := fmt.Sprintf("%s:%s", VitalsKeyPrefix, userID)

	payload, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// Add to sorted set with timestamp as score
	err = r.redis.ZAdd(r.ctx, key, redis.Z{
		Score:  float64(timestamp),
		Member: payload,
	}).Err()
	if err != nil {
		return err
	}

	// Cleanup old entries (outside the 2-hour window)
	cutoff := time.Now().Add(-VitalsTTL).Unix()
	r.redis.ZRemRangeByScore(r.ctx, key, "-inf", fmt.Sprintf("%d", cutoff))

	// Ensure the key itself has a TTL (though ZRem is more surgical)
	r.redis.Expire(r.ctx, key, VitalsTTL)

	return nil
}

// GetVitalsRange returns vitals for a specific user within a time range
func (r *VitalsRepository) GetVitalsRange(userID string, start, end int64) ([]models.VitalsData, error) {
	key := fmt.Sprintf("%s:%s", VitalsKeyPrefix, userID)

	results, err := r.redis.ZRangeByScore(r.ctx, key, &redis.ZRangeBy{
		Min: fmt.Sprintf("%d", start),
		Max: fmt.Sprintf("%d", end),
	}).Result()
	if err != nil {
		return nil, err
	}

	var vitals []models.VitalsData
	for _, res := range results {
		var v models.VitalsData
		if err := json.Unmarshal([]byte(res), &v); err == nil {
			vitals = append(vitals, v)
		}
	}
	return vitals, nil
}
