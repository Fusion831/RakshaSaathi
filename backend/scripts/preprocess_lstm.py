import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler

# Paths
INPUT_FILE = '../Data/PhysioChallenge/augmented_vitals.csv'
NORMALIZED_FILE = '../Data/PhysioChallenge/normalized_vitals.npy'
METADATA_FILE = '../Data/PhysioChallenge/normalization_metadata.npy'

def preprocess_for_lstm():
    if not os.path.exists(INPUT_FILE):
        print(f"File {INPUT_FILE} not found. Run cleaning script first.")
        return

    print("Loading augmented dataset...")
    df = pd.read_csv(INPUT_FILE)
    
    # Selection of continuous features for the LSTM (Matching core.md)
    vitals = ['heart_rate', 'spo2', 'temperature', 'activity', 'acceleration']
    
    # 1. Handling Missing Values
    # Since this is time-series, we forward fill (last known value)
    # and then backward fill for any remaining NaNs at the start.
    print("Interpolating missing values...")
    df[vitals] = df.groupby('record_id')[vitals].ffill().bfill()
    
    # 2. Outlier Removal (Extreme Bounds)
    # Widened to ensure we capture critical emergencies while filtering sensor noise
    bounds = {
        'heart_rate': (20, 250),           # Bradycardia to extreme Tachycardia
        'spo2': (50, 100),                # Low O2 (distress) to 100%
        'temperature': (25, 48),           # Hypothermia to extreme Fever
        'activity': (0, 3)                 # Stationary to high-activity
    }
    for col, (low, high) in bounds.items():
        if col in df.columns:
            df[col] = df[col].clip(lower=low, upper=high)

    # 3. Normalization (Min-Max Scaling to [0,1])
    # Essential for LSTM convergence
    print("Normalizing features...")
    scaler = MinMaxScaler()
    df[vitals] = scaler.fit_transform(df[vitals])
    
    # Save the scaler parameters to ensure we can normalize incoming real-time data later
    metadata = {
        'min': scaler.data_min_,
        'max': scaler.data_max_,
        'features': vitals
    }
    
    # 4. Final cleaning: Drop any rows that still have NaNs (if a record had NO data at all)
    df = df.dropna(subset=vitals)
    
    # Save processed data
    # We'll save as a NumPy array for faster loading into PyTorch/TensorFlow
    np.save(NORMALIZED_FILE, df[vitals].values)
    np.save(METADATA_FILE, metadata)
    
    print(f"Preprocessing complete.")
    print(f"Normalized data shape: {df[vitals].shape}")
    print(f"Saved to {NORMALIZED_FILE}")

if __name__ == "__main__":
    preprocess_for_lstm()
