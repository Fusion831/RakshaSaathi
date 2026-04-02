export interface VitalRecord {
  time: string;
  heartRate: number;
  spO2: number;
  sleepDuration: number;
  sleepQuality: number;
  stressScore: number;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  scheduledTime: string;
  status: 'taken' | 'missed' | 'pending';
  confirmationTime?: string;
}

export interface Alert {
  id: string;
  title: string;
  time: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'new' | 'acknowledged' | 'resolved';
  description: string;
}

export const weeklyVitals: VitalRecord[] = [
  { time: 'Mon', heartRate: 72, spO2: 98, sleepDuration: 7.5, sleepQuality: 85, stressScore: 35 },
  { time: 'Tue', heartRate: 75, spO2: 97, sleepDuration: 7.0, sleepQuality: 82, stressScore: 40 },
  { time: 'Wed', heartRate: 71, spO2: 98, sleepDuration: 7.2, sleepQuality: 80, stressScore: 42 },
  { time: 'Thu', heartRate: 85, spO2: 96, sleepDuration: 5.5, sleepQuality: 60, stressScore: 58 },
  { time: 'Fri', heartRate: 74, spO2: 98, sleepDuration: 5.0, sleepQuality: 55, stressScore: 65 },
  { time: 'Sat', heartRate: 73, spO2: 98, sleepDuration: 4.8, sleepQuality: 50, stressScore: 68 },
  { time: 'Sun', heartRate: 80, spO2: 97, sleepDuration: 4.5, sleepQuality: 45, stressScore: 75 },
];

export const medications: Medication[] = [
  { id: 'm1', name: 'Amlodipine', dose: '5mg', scheduledTime: '08:00 AM', status: 'taken', confirmationTime: '08:15 AM' },
  { id: 'm2', name: 'Metformin', dose: '500mg', scheduledTime: '01:00 PM', status: 'pending' },
  { id: 'm3', name: 'Atorvastatin', dose: '20mg', scheduledTime: '08:00 PM', status: 'pending' },
];

export const alerts: Alert[] = [
  { id: 'a1', title: 'Fall Detected', time: '10:45 AM', severity: 'critical', status: 'new', description: 'CCTV detected a potential fall in the living room.' },
  { id: 'a2', title: 'Sleep Pattern Anomaly', time: '07:30 AM', severity: 'warning', status: 'new', description: 'Sleep duration is 34% lower than weekly average. Poor sleep quality detected for 3 consecutive nights.' },
  { id: 'a3', title: 'Stress Level Alert', time: '09:15 AM', severity: 'warning', status: 'new', description: 'Stress indicators have remained elevated for 2 days. Resting heart rate and poor sleep suggest moderate stress.' },
  { id: 'a4', title: 'Missed Medication', time: 'Yesterday 08:30 PM', severity: 'warning', status: 'acknowledged', description: 'Atorvastatin dose confirmation was missed.' },
  { id: 'a5', title: 'Abnormal Heart Rate', time: 'Thu 02:15 PM', severity: 'warning', status: 'resolved', description: 'Heart rate spiked to 115 bpm for 10 minutes.' },
];

export const patientData = {
  name: 'Rahul Singh',
  age: 78,
  status: 'Warning',
  riskScore: 'Medium',
  location: 'At Home',
  lastActive: '10 mins ago',
  vitals: {
    heartRate: 76,
    spO2: 97,
    steps: 2450,
    sleepHours: 4.5,
    skinTemp: 36.6,
    sedentaryHours: 4.2
  }
}

export const patientsList = [
  { id: "P-4821", name: "Rahul Singh", age: 78, status: "Critical", hr: 112, spo2: 92, alerts: 2, avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704d", adherence: 88 },
  { id: "P-4822", name: "Ananya Patel", age: 65, status: "Attention", hr: 88, spo2: 95, alerts: 1, avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704e", adherence: 92 },
  { id: "P-4823", name: "Vikram Mehta", age: 72, status: "Stable", hr: 72, spo2: 98, alerts: 0, avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704f", adherence: 98 },
  { id: "P-4824", name: "Sunil Kapoor", age: 81, status: "Stable", hr: 68, spo2: 97, alerts: 0, avatar: "https://i.pravatar.cc/150?u=a042581f4e29026704a", adherence: 95 }
];
