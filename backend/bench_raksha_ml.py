import torch
import time

class EdgeLSTMAutoencoder(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = torch.nn.LSTM(input_size=6, hidden_size=32, batch_first=True)
        self.decoder = torch.nn.LSTM(input_size=32, hidden_size=6, batch_first=True)

    def forward(self, x):
        _, (hidden, _) = self.encoder(x)
        repeated_hidden = hidden[-1].unsqueeze(1).repeat(1, x.size(1), 1)
        out, _ = self.decoder(repeated_hidden)
        return out

model = torch.jit.script(EdgeLSTMAutoencoder())
model.eval()

dummy_telemetry = torch.randn(1, 60, 6)

with torch.no_grad():
    for _ in range(10):
        model(dummy_telemetry)

latencies = []
with torch.no_grad():
    for _ in range(1000):
        t0 = time.perf_counter()
        model(dummy_telemetry)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000)

print(f"✅ LSTM-Autoencoder Inference Latency: {sum(latencies)/len(latencies):.2f} ms")
