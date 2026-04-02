import pandas as pd
import numpy as np
import os

# Paths
INPUT_FILE = '../Data/PhysioChallenge/cleaned_vitals.csv'
AUGMENTED_FILE = '../Data/PhysioChallenge/augmented_vitals.csv'

def augment_data():
    if not os.path.exists(INPUT_FILE):
        print(f"File {INPUT_FILE} not found. Run cleaning script first.")
        return

    print("Loading cleaned dataset for augmentation...")
    df = pd.read_csv(INPUT_FILE)
    
    # 1. Synthesize SpO2 (Oxygen Saturation)
    # Normal is 95-100. Lower values correlate slightly with high heart rate or low temp (distress).
    print("Augmenting SpO2...")
    n_rows = len(df)
    
    # Base SpO2 around 98%
    spo2_base = np.random.normal(98, 1, n_rows)
    
    # Add dependency: If HR > 150, drop SpO2 slightly to simulate distress
    hr_distress = df['heart_rate'] > 150
    spo2_base[hr_distress] -= np.random.uniform(2, 5, sum(hr_distress))
    
    df['spo2'] = np.clip(spo2_base, 70, 100)

    # 2. Synthesize Activity (Steps/Motion)
    # Most wearables report activity as a categorical or magnitude value.
    # 0: Sedentary, 1: Light, 2: Active, 3: High
    print("Augmenting Activity & Acceleration...")
    
    # Logic: Higher HR generally means higher activity
    activity = np.zeros(n_rows)
    hr = df['heart_rate'].fillna(75) # Default to resting for logic
    
    activity[(hr > 100) & (hr <= 130)] = 1 # Light
    activity[(hr > 130) & (hr <= 160)] = 2 # Active
    activity[hr > 160] = 3                 # High
    
    # Add some randomness (e.g., high HR but no move = stress/medical anomaly)
    # We'll leave 10% as "mismatch" to help the LSTM learn anomalies
    mismatch_idx = np.random.choice(n_rows, int(n_rows * 0.05), replace=False)
    activity[mismatch_idx] = 0 
    
    df['activity'] = activity

    # 3. Synthesize Acceleration Magnitude
    # Simple magnitude of (x,y,z) sensor
    df['acceleration'] = np.clip(activity * 2.1 + np.random.normal(0.5, 0.2, n_rows), 0, 15)

    # Save augmented dataset
    df.to_csv(AUGMENTED_FILE, index=False)
    print(f"Augmentation complete. Saved {n_rows} rows with new features to {AUGMENTED_FILE}")
    print(f"New Columns: {list(df.columns)}")

if __name__ == "__main__":
    augment_data()
