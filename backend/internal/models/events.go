package models

import (
	"encoding/json"
	"time"
)

// BaseEvent represents the structure for all event-driven messages in the system.
type BaseEvent struct {
	EventID   string          `json:"event_id" validate:"required"`
	Type      string          `json:"type" validate:"required"` // e.g., "vitals.updated", "fall.detected"
	UserID    string          `json:"user_id" validate:"required"`
	Timestamp time.Time       `json:"timestamp" validate:"required"`
	Payload   json.RawMessage `json:"payload" validate:"required"`
}

// VitalsData defines the heart rate, SpO2, and other health metrics from a smartwatch.
type VitalsData struct {
	HeartRate   float64 `json:"heart_rate" validate:"gte=0,lte=250"`
	SpO2        float64 `json:"spo2" validate:"gte=0,lte=100"`
	Steps       int     `json:"steps" validate:"gte=0"`
	Temperature float64 `json:"temperature" validate:"gte=30,lte=45"`
	SleepStatus int     `json:"sleep_status" validate:"gte=0,lte=3"` // 0: Awake, 1: Light, 2: Deep, 3: REM
}

// FallEvent defines the data for a detected fall.
type FallEvent struct {
	Confidence float64 `json:"confidence" validate:"gte=0,lte=1"`
	Location   string  `json:"location"` // e.g., "living_room", "bathroom"
}

// Severity levels for anomalies and alerts.
type Severity string

const (
	SeverityLow    Severity = "LOW"
	SeverityMedium Severity = "MEDIUM"
	SeverityHigh   Severity = "HIGH"
)

// AnomalyEvent represents a detected health or activity anomaly.
type AnomalyEvent struct {
	Severity Severity `json:"severity" validate:"oneof=LOW MEDIUM HIGH"`
	Metric   string   `json:"metric" validate:"required"` // e.g., "heart_rate", "sleep_duration"
	Message  string   `json:"message"`
}

// AlertState represents the state of an active alert in the system.
type AlertState string

const (
	AlertStateIdle                AlertState = "IDLE"
	AlertStateFallDetected        AlertState = "FALL_DETECTED"
	AlertStateWaitingConfirmation AlertState = "WAITING_CONFIRMATION"
	AlertStateLevel1Alert         AlertState = "LEVEL_1_ALERT"
	AlertStateLevel2Alert         AlertState = "LEVEL_2_ALERT"
	AlertStateLevel3Alert         AlertState = "LEVEL_3_ALERT"
	AlertStateResolved            AlertState = "RESOLVED"
	AlertStateFalseAlarm          AlertState = "FALSE_ALARM"
)

// Alert represents an entry in the alert state machine and escalation pipeline.
type Alert struct {
	AlertID         string          `json:"alert_id" gorm:"primaryKey"`
	UserID          string          `json:"user_id" gorm:"index"`
	CurrentState    AlertState      `json:"current_state"`
	Severity        Severity        `json:"severity"`
	IncidentContext json.RawMessage `json:"incident_context" gorm:"type:jsonb"` // Last 10m vitals
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// VitalsAggregated stores downsampled health metrics for historical trends.
type VitalsAggregated struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    string    `json:"user_id" gorm:"index"`
	Interval  time.Time `json:"interval" gorm:"index"` // Truncated to the aggregation period (1m or 5m)
	AvgHR     float64   `json:"avg_hr"`
	MaxHR     float64   `json:"max_hr"`
	MinHR     float64   `json:"min_hr"`
	AvgSpO2   float64   `json:"avg_spo2"`
	MaxSpO2   float64   `json:"max_spo2"`
	MinSpO2   float64   `json:"min_spo2"`
	CreatedAt time.Time `json:"created_at"`
}

// Validation Helpers (to be expanded with a validator library if needed)

func (e *BaseEvent) ToJSON() ([]byte, error) {
	return json.Marshal(e)
}

func FromJSON[T any](data []byte) (T, error) {
	var target T
	err := json.Unmarshal(data, &target)
	return target, err
}
