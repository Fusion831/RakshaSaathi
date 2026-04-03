import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { patientData } from '../data/mockData';
import { SummaryCards } from '../components/family/SummaryCards';
import { AlertsPanel } from '../components/family/AlertsPanel';
import { VitalsSnapshot } from '../components/family/VitalsSnapshot';
import { MedicationList } from '../components/family/MedicationList';
import { ActivityTimeline } from '../components/family/ActivityTimeline';       
import { AIInsights } from '../components/family/AIInsights';
import { EmergencyAlertModal } from '../components/family/EmergencyAlertModal'; 
import { AnomalyModal } from '../components/family/AnomalyModal';
import { WarningToast } from '../components/family/WarningToast';
import { Tabs } from '../components/ui/Tabs';
import { EmergencyContacts } from '../components/family/EmergencyContacts';     
import { TrendsSection } from '../components/family/TrendsSection';
import { DemoButton } from '../components/family/DemoButton';
import { AlertHistory } from '../components/family/AlertHistory';
import { Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export default function FamilyDashboard() {
  const [criticalAlert, setCriticalAlert] = useState<any>(null);
  const [warningAlert, setWarningAlert] = useState<any>(null);
  const [anomalyAlert, setAnomalyAlert] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoProcess, setDemoProcess] = useState<any>(null);
  const [liveVitals, setLiveVitals] = useState({
    heartRate: 76,
    spO2: 98,
    steps: 2450,
    skinTemp: 36.6,
    sleepHours: 6.5,
    activity: 0
  });
  const [liveAlerts, setLiveAlerts] = useState<any[]>([]);

  // Integration: Connect to Go Backend WebSocket
  const { messages, isConnected } = useWebSocket("ws://localhost:8080/ws");

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      console.log("WS Event Recieved:", lastMessage);

      // Update live vitals from WebSocket stream
      if (lastMessage.type === "vitals.live" && lastMessage.payload) {
        setLiveVitals(prev => ({
          heartRate: lastMessage.payload.vitals?.heart_rate || prev.heartRate,
          spO2: lastMessage.payload.vitals?.blood_oxygen || prev.spO2,
          steps: lastMessage.payload.vitals?.steps || prev.steps,
          skinTemp: lastMessage.payload.vitals?.body_temperature || prev.skinTemp,
          sleepHours: prev.sleepHours,
          activity: lastMessage.payload.vitals?.activity_level || prev.activity
        }));
      }

      // Handle alert events
      if (lastMessage.type === "alert.created" || lastMessage.type === "alert.escalated" || lastMessage.type === "anomaly.detected") {
        const newAlert = {
          id: lastMessage.payload?.alert_id || "alert-" + Date.now(),
          title: lastMessage.type === "alert.escalated" ? "Alert Escalated" : lastMessage.type === "anomaly.detected" ? "Anomaly Detected" : "New Alert",
          description: lastMessage.payload?.message || lastMessage.payload?.description || "A new alert has been triggered.",
          severity: lastMessage.payload?.severity === "HIGH" || lastMessage.payload?.severity === "CRITICAL" ? "critical" : lastMessage.type === "anomaly.detected" ? "warning" : "warning",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "new",
          state: lastMessage.payload?.state,
          type: lastMessage.type
        };
        setLiveAlerts(prev => [newAlert, ...prev].slice(0, 10)); // Keep last 10 alerts
        console.log("Alert added to panel:", newAlert);
      }

      // Handle Backend Events Mapping to Frontend Modals
      if (lastMessage.type === "fall.detected" || lastMessage.type === "alert.escalated" || lastMessage.type === "sos.triggered") {
        setCriticalAlert({
          type: lastMessage.type === "sos.triggered" ? "SOS Triggered" : "Critical Alert",
          patient: patientData.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description: "System detected a critical incident. " + (lastMessage.payload?.message || "Immediate attention required."),
          action: "Dispatching emergency services process engaged."
        });
      }
      
      if (lastMessage.type === "anomaly.detected") {
        setAnomalyAlert({
          type: "Anomaly Detected",
          metric: lastMessage.payload?.metric || "Unknown",
          severity: lastMessage.payload?.severity || "MEDIUM",
          message: lastMessage.payload?.message || "Abnormal vital patterns detected",
          patient: patientData.name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          description: lastMessage.payload?.message || "System flagged abnormal vital patterns."
        });
        // Also add to alerts panel
        const newAlert = {
          id: "anomaly-" + Date.now(),
          title: "Anomaly Detected - " + (lastMessage.payload?.metric || "Unknown"),
          description: lastMessage.payload?.message || "Anomaly detected",
          severity: lastMessage.payload?.severity === "HIGH" ? "critical" : "warning",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: "new",
          type: "anomaly"
        };
        setLiveAlerts(prev => [newAlert, ...prev].slice(0, 10));
      }
    }
  }, [messages]);

  const triggerCritical = async () => {
    // Send standard BaseEvent over REST to backend to trigger the processing logic
    try {
      await fetch("http://localhost:8080/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: "sim-" + Date.now(),
          type: "fall.detected",
          user_id: "user-123",
          timestamp: new Date().toISOString(),
          payload: {
            confidence: 0.95,
            location: "Living Room"
          }
        })
      });
    } catch(e) {
      console.error(e);
      // Fallback for visual demo if backend is offline
      setCriticalAlert({
        type: "Fall Detected (Simulation)",
        patient: patientData.name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: "Simulated fall payload failed to reach backend.", 
        action: "Backend might be down."
      });
    }
  };

  const triggerWarning = async () => {
    try {
      await fetch("http://localhost:8080/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: "sim-" + Date.now(),
          type: "anomaly.detected",
          user_id: "user-123",
          timestamp: new Date().toISOString(),
          payload: {
            severity: "MEDIUM",
            metric: "heart_rate",
            message: "Simulated spike in vitals."
          }
        })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const handleStartDemo = async () => {
    setDemoRunning(true);
    console.log("Starting Live Demo Mode...");
    // In a browser environment, we would need WebWorker or backend endpoint
    // For now, show UI feedback
  };

  const handleStopDemo = () => {
    setDemoRunning(false);
    console.log("Stopping Live Demo Mode...");
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`http://localhost:8080/alerts/${alertId}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      if (response.ok) {
        setCriticalAlert(null);
        console.log("Alert acknowledged");
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: any = {
    hidden: { opacity: 0, scale: 0.96, y: 30 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } }
  };

  return (
    <>
      <EmergencyAlertModal alert={criticalAlert} onClose={() => setCriticalAlert(null)} />
      <AnomalyModal alert={anomalyAlert} onClose={() => setAnomalyAlert(null)} />
      <WarningToast alert={warningAlert} onClose={() => setWarningAlert(null)} />
      <AlertHistory userId="user-123" isOpen={showAlertHistory} onClose={() => setShowAlertHistory(false)} />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-10 pt-8">
        
        {/* Dynamic Header & Intelligent Tab System */}
        <motion.div variants={item} className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-6">
          <div>
            <h1 className="text-[2.8rem] font-extrabold text-[#083B3C] tracking-tight drop-shadow-sm leading-none">Good morning, Family</h1>
            <p className="text-[#083B3C]/70 font-semibold tracking-wide mt-3 text-lg">Here is the latest health overview for <span className="font-bold text-[#083B3C]">{patientData.name}</span>.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Tabs 
              tabs={["Overview", "Trends", "Medications", "Alerts", "Insights"]} 
              activeTab={activeTab} 
              onChange={setActiveTab} 
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAlertHistory(true)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition"
              >
                View History
              </button>
              <DemoButton 
                onStartDemo={handleStartDemo}
                onStopDemo={handleStopDemo}
              />
            </div>
          </div>
        </motion.div>

        {/* Tab Routing Body */}
        <AnimatePresence mode="wait">
          <motion.div 
             key={activeTab}
             initial={{ opacity: 0, y: 15 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -15, transition: { duration: 0.2 } }}
             transition={{ duration: 0.4, ease: "easeOut" }}
             className="w-full"
          >
             {activeTab === "Overview" && (
                <div className="space-y-10">
                  <SummaryCards patient={patientData} />
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    <div className="xl:col-span-2 space-y-10 flex flex-col">
                      <VitalsSnapshot vitals={liveVitals} />
                      <EmergencyContacts /> 
                    </div>
                    <div className="space-y-10 flex flex-col">
                      <AlertsPanel alerts={liveAlerts} />
                      <ActivityTimeline />
                    </div>
                  </div>
                </div>
             )}

             {activeTab === "Trends" && (
                <TrendsSection />
             )}

             {activeTab === "Medications" && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <MedicationList />
                  {/* Reuse Activity Timeline to fill visual space cleanly */}
                  <ActivityTimeline />
                </div>
             )}

             {activeTab === "Alerts" && (
                <div className="max-w-[1000px] mx-auto"><AlertsPanel alerts={liveAlerts} /></div>
             )}

             {activeTab === "Insights" && (
                <div className="max-w-[1000px] mx-auto"><AIInsights /></div>
             )}
          </motion.div>
        </AnimatePresence>

        {/* Demo Controls Floating Panel */}
        <motion.div variants={item} className="fixed bottom-10 right-10 flex flex-col gap-3.5 z-50 bg-white/70 backdrop-blur-2xl p-5 rounded-3xl shadow-[0_20px_50px_rgba(8,59,60,0.15)] border border-[#D9ECE9]/80 group hover:bg-white scale-90 sm:scale-100 origin-bottom-right transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#083B3C] text-left mb-1 flex items-center gap-2">
             <Activity size={14} className="text-[#E76F51]" /> Interruption Layer Simulator {isConnected ? "(Online)" : "(Offline)"}
          </p>
          <div className="flex gap-3">
            <button onClick={triggerWarning} className="px-6 py-3 bg-[#F4A261]/10 text-[#C13816] font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-[#F4A261]/20 transition-colors border border-[#F4A261]/30 shadow-sm">     
              Trigger Warning (Cloud)
            </button>
            <button onClick={triggerCritical} className="px-6 py-3 bg-gradient-to-r from-[#E76F51] to-[#C13816] text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:scale-[1.03] hover:shadow-[0_10px_25px_rgba(231,111,81,0.4)] transition-all shadow-md border border-white/20">
              Force Critical Alert (Cloud)
            </button>
            <button onClick={async () => {
              try {
                await fetch("http://localhost:8080/event", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_id: "sos-" + Date.now(),
                    type: "sos.triggered",
                    user_id: "user-123",
                    timestamp: new Date().toISOString(),
                    payload: { source: "watch_button_press" }
                  })
                });
              } catch(e) {}
            }} className="px-6 py-3 bg-red-600 text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors shadow-md">
              SOS Button
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
