import torch
import torch.nn as nn
import numpy as np
from torch.utils.data import DataLoader, TensorDataset
import os
from tqdm import tqdm

# Paths
SEQUENCE_FILE = '../Data/PhysioChallenge/vitals_sequences.npy'
MODEL_SAVE_PATH = '../Data/PhysioChallenge/lstm_anomaly_model.pth'

# 1. Define LSTM Autoencoder Architecture
class LSTMAutoencoder(nn.Module):
    def __init__(self, input_dim, hidden_dim, num_layers=2):
        super(LSTMAutoencoder, self).__init__()
        
        # Encoder: Compresses sequence to context vector
        self.encoder = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True
        )
        
        # Decoder: Attempts to reconstruct the original sequence
        self.decoder = nn.LSTM(
            input_size=hidden_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True
        )
        
        # Output layer maps hidden state back to feature dimensions
        self.output_layer = nn.Linear(hidden_dim, input_dim)

    def forward(self, x):
        # x shape: (Batch, Seq_Len, Features)
        
        # Encoding
        _, (hidden, cell) = self.encoder(x)
        
        # We use the final hidden state as the "thought vector"
        # and repeat it to feed into decoder (simplest seq2seq autoencoder)
        # However, for reconstruction, we can just feed the sequence or use RepeatVector logic
        # Here we'll use a simpler approach: process the sequence and map back
        
        encoded, _ = self.encoder(x)
        decoded, _ = self.decoder(encoded)
        output = self.output_layer(decoded)
        
        return output

def train_model():
    # Parameters
    INPUT_DIM = 5      # [HR, SpO2, Temp, Activity, Accel]
    HIDDEN_DIM = 64
    NUM_LAYERS = 2
    BATCH_SIZE = 128
    EPOCHS = 10        # Using 10 epochs for initial training
    LEARNING_RATE = 0.001
    
    if not os.path.exists(SEQUENCE_FILE):
        print("Sequence file not found. Run create_sequences.py first.")
        return

    # 2. Load and Prepare Data
    print(f"Loading sequences from {SEQUENCE_FILE}...")
    data = np.load(SEQUENCE_FILE)
    tensor_data = torch.from_numpy(data).float()
    
    # HARDER TARGET: Predictive Anomaly Detection
    # Instead of Reconstruction (Autoencoder), we predict the NEXT step.
    # Input: sequence[0:19], Target: sequence[19]
    input_seqs = tensor_data[:, :-1, :]  # (Batch, 19, 5)
    target_vals = tensor_data[:, -1, :]   # (Batch, 5)

    train_size = int(0.9 * len(input_seqs))
    train_dataset = TensorDataset(input_seqs[:train_size], target_vals[:train_size])
    val_dataset = TensorDataset(input_seqs[train_size:], target_vals[train_size:])
    
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)

    # 3. Initialize Model, Loss, Optimizer
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Reduce HIDDEN_DIM slightly to prevent over-capacity for simple patterns
    # and use the final hidden state to predict just the next step.
    class LSTMForecaster(nn.Module):
        def __init__(self, input_dim, hidden_dim):
            super().__init__()
            self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers=2, batch_first=True)
            self.fc = nn.Linear(hidden_dim, input_dim)
        
        def forward(self, x):
            out, (hn, cn) = self.lstm(x)
            return self.fc(hn[-1]) # Predict based on last hidden state

    model = LSTMForecaster(INPUT_DIM, 32).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.0005) # Lower LR for stability

    # 4. Training Loop
    print("Starting predictive training...")
    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0
        
        loop = tqdm(train_loader, leave=True)
        for batch_x, batch_y in loop:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            
            outputs = model(batch_x)
            loss = criterion(outputs, batch_y)
            
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            loop.set_description(f"Epoch [{epoch+1}/{EPOCHS}]")
            loop.set_postfix(loss=loss.item())

        model.eval()
        val_loss = 0
        with torch.no_grad():
            for val_x, val_y in val_loader:
                val_x, val_y = val_x.to(device), val_y.to(device)
                val_outputs = model(val_x)
                val_loss += criterion(val_outputs, val_y).item()
        
        avg_val_loss = val_loss / len(val_loader)
        avg_train_loss = train_loss / len(train_loader)
        print(f"Epoch {epoch+1} complete. Avg Train Loss: {avg_train_loss:.8f}, Avg Val Loss: {avg_val_loss:.8f}")

    # 5. Save the trained model
    torch.save(model.state_dict(), MODEL_SAVE_PATH)
    print(f"Predictive model weights saved to {MODEL_SAVE_PATH}")

if __name__ == "__main__":
    train_model()
