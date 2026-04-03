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
    print("Augmenting SpO2 with noise...")
    n_rows = len(df)
    
    # Base SpO2 around 98% + High-Freq Noise (Simulate sensor jitter)
    spo2_base = np.random.normal(98, 0.5, n_rows) + np.random.uniform(-0.5, 0.5, n_rows)
    
    # Break correlations: Add random "dips" that ARE NOT linked to HR
    # This prevents the model from just learning SpO2 = f(HR)
    random_dip_idx = np.random.choice(n_rows, int(n_rows * 0.02), replace=False)
    spo2_base[random_dip_idx] -= np.random.uniform(5, 10, len(random_dip_idx))
    
    df['spo2'] = np.clip(spo2_base, 70, 100)

    # 2. Synthesize Activity (Steps/Motion)
    print("Augmenting Activity with random volatility...")
    
    # Logic: Higher HR generally means higher activity, but add jitter
    activity = np.zeros(n_rows)
    hr = df['heart_rate'].fillna(75)
    
    activity[(hr > 100) & (hr <= 130)] = 1 
    activity[(hr > 130) & (hr <= 160)] = 2
    activity[hr > 160] = 3                 
    
    # Random Volatility: Person stops/starts abruptly regardless of HR
    volatility_idx = np.random.choice(n_rows, int(n_rows * 0.1), replace=False)
    activity[volatility_idx] = np.random.randint(0, 4, len(volatility_idx))
    
    df['activity'] = activity

    # 3. Synthesize Acceleration Magnitude
    # Add heavy Gaussian noise to simulate real-world wrist movement
    noise = np.random.normal(0, 1.5, n_rows)
    df['acceleration'] = np.clip(activity * 2.1 + 0.5 + noise, 0, 15)

    # 4. Synthesize Sleep Status (Categorical Mock)
    # 0 = Awake, 1 = Light, 2 = Deep, 3 = REM
    print("Augmenting Sleep Status (Mock)...")
    sleep_status = np.zeros(n_rows)
    # Simple logic: If HR is low (< 65) and Activity is 0, high probability of sleep
    potential_sleep = (hr < 65) & (activity == 0)
    sleep_status[potential_sleep] = np.random.choice([1, 2, 3], size=np.sum(potential_sleep), p=[0.5, 0.3, 0.2])
    df['sleep_status'] = sleep_status

    # 5. Final Jitter on HR and Temp (Noisy Sensors)
    df['heart_rate'] += np.random.normal(0, 1.0, n_rows)
    df['temperature'] += np.random.normal(0, 0.1, n_rows)

    # Save augmented dataset
    df.to_csv(AUGMENTED_FILE, index=False)
    print(f"Augmentation complete. Saved {n_rows} rows with new features to {AUGMENTED_FILE}")
    print(f"New Columns: {list(df.columns)}")

if __name__ == "__main__":
    augment_data()
