import torch
import torch.nn as nn
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import os

# --- Model Architecture (Must match training) ---
class LSTMForecaster(nn.Module):
    def __init__(self, input_dim, hidden_dim):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=2, batch_first=True)
        self.fc = nn.Linear(hidden_dim, input_dim)
    
    def forward(self, x):
        out, (hn, cn) = self.lstm(x)
        return self.fc(hn[-1])

# --- Configurations ---
MODEL_PATH = '../Data/PhysioChallenge/lstm_anomaly_model.pth'
METADATA_PATH = '../Data/PhysioChallenge/normalization_metadata.npy'
INPUT_DIM = 5
HIDDEN_DIM = 32

app = FastAPI(title="RakshaSaathi Anomaly Detection Service")

# Global state for model and scaler
model = None
metadata = None

@app.on_event("startup")
def load_resources():
    global model, metadata
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
        print(f"Error: Model or Metadata not found. Paths: {MODEL_PATH}, {METADATA_PATH}")
        return

    # Load Metadata (Scaler params)
    metadata = np.load(METADATA_PATH, allow_pickle=True).item()
    
    # Load Model
    model = LSTMForecaster(INPUT_DIM, HIDDEN_DIM)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=torch.device('cpu')))
    model.eval()
    print("Inference service resources loaded successfully.")

class VitalsSequence(BaseModel):
    # Sequence of 19 timesteps, each with 5 features: [HR, SpO2, Temp, Activity, Accel]
    sequence: List[List[float]] 

class AnomalyResponse(BaseModel):
    is_anomaly: bool
    score: float
    severity: str
    prediction_error: List[float]

@app.post("/predict", response_model=AnomalyResponse)
async def predict(data: VitalsSequence):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    seq = np.array(data.sequence)
    if seq.shape != (19, 5):
        raise HTTPException(status_code=400, detail=f"Expected shape (19, 5), got {seq.shape}")

    # 1. Normalize using metadata
    # metadata['min'] and metadata['max'] are arrays of shape (5,)
    seq_norm = (seq - metadata['min']) / (metadata['max'] - metadata['min'] + 1e-8)
    
    # Convert to torch tensor
    input_tensor = torch.FloatTensor(seq_norm).unsqueeze(0) # Batch size 1
    
    # 2. Inference
    with torch.no_grad():
        predicted_next = model(input_tensor).numpy()[0]
    
    # Normally we compare against the *actual* 20th step provided by the user
    # But for a streaming service, we can also return the error if the user provides 20 steps
    # We'll assume the last step in the input sequence (if 20 steps given) or just return the prediction error
    # Let's adjust logic: if user provides 20 steps, we validate the 20th.
    
    # For now, let's just return a mock "high score" strategy
    # Real logic: Go backend sends 20 steps. We take 19 for input, 1 for target.
    # But since we only have 19, we return the prediction.
    
    return {
        "is_anomaly": False,
        "score": 0.0,
        "severity": "NORMAL",
        "prediction_error": predicted_next.tolist()
    }

@app.post("/analyze_window", response_model=AnomalyResponse)
async def analyze_window(data: List[List[float]]):
    """Expects 20 timesteps. Uses first 19 to predict 20th, compares with actual 20th."""
    if len(data) != 20:
        raise HTTPException(status_code=400, detail="Require exactly 20 timesteps")
    
    seq = np.array(data)
    inputs = seq[:-1]
    actual = seq[-1]
    
    # Normalize
    inputs_norm = (inputs - metadata['min']) / (metadata['max'] - metadata['min'] + 1e-8)
    actual_norm = (actual - metadata['min']) / (metadata['max'] - metadata['min'] + 1e-8)
    
    input_tensor = torch.FloatTensor(inputs_norm).unsqueeze(0)
    
    with torch.no_grad():
        predicted_norm = model(input_tensor).numpy()[0]
    
    # Calculate MSE Anomaly Score
    error = np.mean((predicted_norm - actual_norm)**2)
    
    # Thresholding (based on training loss baseline of 0.01)
    # 0.05 is a heuristic "high error"
    severity = "NORMAL"
    is_anomaly = False
    if error > 0.08:
        severity = "HIGH"
        is_anomaly = True
    elif error > 0.04:
        severity = "MEDIUM"
        is_anomaly = True

    return {
        "is_anomaly": is_anomaly,
        "score": float(error),
        "severity": severity,
        "prediction_error": (predicted_norm - actual_norm).tolist()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
