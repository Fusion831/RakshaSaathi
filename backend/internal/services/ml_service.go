package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"github.com/Fusion831/RakshaSaathi/internal/repositories"
)

type MLInferenceService struct {
	vitalsRepo *repositories.VitalsRepository
	mlEndpoint string
	client     *http.Client
}

func NewMLInferenceService(repo *repositories.VitalsRepository, endpoint string) *MLInferenceService {
	return &MLInferenceService{
		vitalsRepo: repo,
		mlEndpoint: endpoint,
		client:     &http.Client{Timeout: 5 * time.Second},
	}
}

type AnomalyResponse struct {
	IsAnomaly       bool      `json:"is_anomaly"`
	Score           float64   `json:"score"`
	Severity        string    `json:"severity"`
	PredictionError []float64 `json:"prediction_error"`
}

// AnalyzeRecentVitals fetches the last 20 minutes of vitals and sends them to the ML service
func (s *MLInferenceService) AnalyzeRecentVitals(userID string) (*AnomalyResponse, error) {
	// 1. Fetch last 20 readings from Redis (approx 20 minutes)
	now := time.Now().Unix()
	past := now - (25 * 60) // 25 mins buffer
	vitalsList, err := s.vitalsRepo.GetVitalsRange(userID, past, now)
	if err != nil {
		return nil, err
	}

	if len(vitalsList) < 20 {
		return nil, fmt.Errorf("insufficient data: %d/20 readings", len(vitalsList))
	}

	// Only take the last 20
	vitalsList = vitalsList[len(vitalsList)-20:]

	// 2. Format for ML [HR, SpO2, Temp, Activity, Accel]
	// Activity and Accel are currently synthetic in our training, so we'll
	// use placeholder/derived values until the real sensors are wired.
	var matrix [][]float64
	for _, v := range vitalsList {
		// Mocked activity/accel based on HR for consistency with training data
		activity := 0.0
		if v.HeartRate > 100 {
			activity = 1.0
		}
		if v.HeartRate > 130 {
			activity = 2.0
		}

		row := []float64{
			v.HeartRate,
			v.SpO2,
			v.Temperature,
			activity,
			activity * 2.1, // Synthetic accel matching augment_vitals.py logic
		}
		matrix = append(matrix, row)
	}

	// 3. Call FastAPI
	jsonBody, _ := json.Marshal(matrix)
	resp, err := s.client.Post(s.mlEndpoint+"/analyze_window", "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return nil, fmt.Errorf("ML service error (status %d): %s", resp.StatusCode, string(body))
	}

	var anomaly AnomalyResponse
	if err := json.NewDecoder(resp.Body).Decode(&anomaly); err != nil {
		return nil, err
	}

	return &anomaly, nil
}
