import numpy as np
import os
from tqdm import tqdm

# Paths
INPUT_FILE = '../Data/PhysioChallenge/normalized_vitals.npy'
SEQUENCE_FILE = '../Data/PhysioChallenge/vitals_sequences.npy'

# Parameters (Window size of 20 timesteps as per core.md)
WINDOW_SIZE = 20
STRIDE = 8

def create_sequences():
    if not os.path.exists(INPUT_FILE):
        print(f"File {INPUT_FILE} not found. Run preprocessing script first.")
        return

    print(f"Loading normalized data from {INPUT_FILE}...")
    data = np.load(INPUT_FILE)
    
    n_samples = data.shape[0]
    n_features = data.shape[1]
    
    # We'll calculate sequence indices with a stride
    indices = np.arange(0, n_samples - WINDOW_SIZE, STRIDE)
    n_windows = len(indices)
    
    print(f"Creating {n_windows} sequences (Window: {WINDOW_SIZE}, Stride: {STRIDE})...")
    
    # Pre-allocate memory
    sequences = np.zeros((n_windows, WINDOW_SIZE, n_features), dtype=np.float32)
    
    for i, idx in enumerate(tqdm(indices)):
        sequences[i] = data[idx : idx + WINDOW_SIZE]
        
    # Save the sequences
    print(f"Saving sequences to {SEQUENCE_FILE}...")
    np.save(SEQUENCE_FILE, sequences)
    
    print(f"Sequence generation complete.")
    print(f"Final shape: {sequences.shape}")

if __name__ == "__main__":
    create_sequences()
