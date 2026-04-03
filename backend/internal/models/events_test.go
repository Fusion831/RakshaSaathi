package models

import (
	"encoding/json"
	"testing"
	"time"
)

func TestBaseEvent_ToJSON(t *testing.T) {
	payload := json.RawMessage(`{"heart_rate": 85, "spo2": 98}`)
	event := BaseEvent{
		EventID:   "123",
		Type:      "vitals.updated",
		UserID:    "user_1",
		Timestamp: time.Now(),
		Payload:   payload,
	}

	data, err := event.ToJSON()
	if err != nil {
		t.Fatalf("Failed to marshal BaseEvent: %v", err)
	}

	if len(data) == 0 {
		t.Fatal("Marshaled data is empty")
	}

	var unmarshaled BaseEvent
	if err := json.Unmarshal(data, &unmarshaled); err != nil {
		t.Fatalf("Failed to unmarshal BaseEvent: %v", err)
	}

	if unmarshaled.EventID != event.EventID {
		t.Errorf("Expected EventID %s, got %s", event.EventID, unmarshaled.EventID)
	}
}

func TestVitalsData_Unmarshall(t *testing.T) {
	jsonData := `{"heart_rate": 80, "spo2": 95, "steps": 1000, "temperature": 36.5}`
	vitals, err := FromJSON[VitalsData]([]byte(jsonData))
	if err != nil {
		t.Fatalf("Failed to unmarshal VitalsData: %v", err)
	}

	if vitals.HeartRate != 80 {
		t.Errorf("Expected HeartRate 80, got %f", vitals.HeartRate)
	}

	if vitals.Temperature != 36.5 {
		t.Errorf("Expected Temperature 36.5, got %f", vitals.Temperature)
	}
}

func TestAlert_States(t *testing.T) {
	alert := Alert{
		AlertID:      "alert_123",
		UserID:       "user_456",
		CurrentState: AlertStateFallDetected,
		Severity:     SeverityHigh,
	}

	if alert.CurrentState != AlertStateFallDetected {
		t.Errorf("Expected state %s, got %s", AlertStateFallDetected, alert.CurrentState)
	}
}
