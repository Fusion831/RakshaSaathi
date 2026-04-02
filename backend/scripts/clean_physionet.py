import os
import pandas as pd
import numpy as np
from tqdm import tqdm

# Constants
DATA_DIR = '../Data/PhysioChallenge/set-a/'
OUTPUT_FILE = '../Data/PhysioChallenge/cleaned_vitals.csv'

# Features we want to keep (wearable-compatible for daily life)
# Dropping: GCS (Invasive), NiSys/DiasABP (Cuff-based), ICUType
WEARABLE_FEATURES = {
    'HR': 'heart_rate',
    'Temp': 'temperature',
    'RespRate': 'respiratory_rate',
    'Weight': 'weight',
}

# Static descriptors for person context
# Height/Weight/Age are common in health apps
DESCRIPTORS = ['Age', 'Gender', 'Height']

def parse_physionet_file(file_path):
    """Parses a single PhysioNet .txt file into a long-form DataFrame."""
    try:
        df = pd.read_csv(file_path)
        record_id = df.loc[df['Parameter'] == 'RecordID', 'Value'].values[0]
        
        # Extract Static Data
        static_data = {'record_id': record_id}
        for desc in DESCRIPTORS:
            val = df.loc[df['Parameter'] == desc, 'Value'].values
            static_data[desc.lower()] = val[0] if len(val) > 0 else np.nan
            
        # Filter for wearable-compatible vitals
        vitals_df = df[df['Parameter'].isin(WEARABLE_FEATURES.keys())].copy()
        vitals_df['Parameter'] = vitals_df['Parameter'].map(WEARABLE_FEATURES)
        
        # Pivot to wide format (Time vs Parameters)
        # Note: Multiple readings at same time might exist, we'll take the mean
        pivoted = vitals_df.pivot_table(index='Time', columns='Parameter', values='Value', aggfunc='mean').reset_index()
        
        # Add static data
        for k, v in static_data.items():
            pivoted[k] = v
            
        return pivoted
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

def main():
    if not os.path.exists(DATA_DIR):
        print(f"Directory {DATA_DIR} does not exist.")
        return

    all_records = []
    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.txt')]
    
    print(f"Found {len(files)} files. Starting cleaning...")
    
    for filename in tqdm(files): # Processing all records
        file_path = os.path.join(DATA_DIR, filename)
        record_df = parse_physionet_file(file_path)
        if record_df is not None:
            all_records.append(record_df)
            
    if not all_records:
        print("No records processed.")
        return

    # Combine all records
    final_df = pd.concat(all_records, ignore_index=True)
    
    # Handle missing values: 
    # For now, we'll keep them as NaN so the ML model can decide (e.g., masking or interpolation)
    # But we drop entries that are completely empty of vital signs
    vital_cols = list(WEARABLE_FEATURES.values())
    final_df = final_df.dropna(subset=vital_cols, how='all')
    
    # Save to CSV
    final_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Successfully saved {len(final_df)} rows to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
