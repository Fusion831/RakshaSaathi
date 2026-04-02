import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { patientData } from '../data/mockData';
import { SummaryCards } from '../components/family/SummaryCards';
import { AlertsPanel } from '../components/family/AlertsPanel';
import { VitalsSnapshot } from '../components/family/VitalsSnapshot';
import { MedicationList } from '../components/family/MedicationList';
import { ActivityTimeline } from '../components/family/ActivityTimeline';
import { AIInsights } from '../components/family/AIInsights';
import { EmergencyAlertModal } from '../components/family/EmergencyAlertModal';
import { WarningToast } from '../components/family/WarningToast';
import { Tabs } from '../components/ui/Tabs';
import { EmergencyContacts } from '../components/family/EmergencyContacts';
import { TrendsSection } from '../components/family/TrendsSection';
import { Activity } from 'lucide-react';

export default function FamilyDashboard() {
  const [criticalAlert, setCriticalAlert] = useState<any>(null);
  const [warningAlert, setWarningAlert] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");

  const triggerCritical = () => {
    setCriticalAlert({
      type: "Fall Detected",
      patient: patientData.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: "Rahul Singh may have fallen near the primary living space. Advanced 3D sensors detect no significant movement for 18 seconds post-impact.",
      action: "Immediate attention required. Contact the patient now or dispatch emergency services to the residence."
    });
  };

  const triggerWarning = () => {
    setWarningAlert({
      type: "Geofence Breach",
      patient: patientData.name,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description: "Patient has approached the outer boundary of the registered home safe zone."
    });
    setTimeout(() => setWarningAlert(null), 8000);
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
      <WarningToast alert={warningAlert} onClose={() => setWarningAlert(null)} />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-10">
        
        {/* Dynamic Header & Intelligent Tab System */}
        <motion.div variants={item} className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-6">
          <div>
            <h1 className="text-[2.8rem] font-extrabold text-[#083B3C] tracking-tight drop-shadow-sm leading-none">Good morning, Family</h1>
            <p className="text-[#083B3C]/70 font-semibold tracking-wide mt-3 text-lg">Here is the latest health overview for <span className="font-bold text-[#083B3C]">{patientData.name}</span>.</p>
          </div>
          <Tabs 
            tabs={["Overview", "Trends", "Medications", "Alerts", "Insights"]} 
            activeTab={activeTab} 
            onChange={setActiveTab} 
          />
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
                      <VitalsSnapshot vitals={patientData.vitals} />
                      <EmergencyContacts /> 
                    </div>
                    <div className="space-y-10 flex flex-col">
                      <AlertsPanel />
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
                <div className="max-w-[1000px] mx-auto"><AlertsPanel /></div>
             )}

             {activeTab === "Insights" && (
                <div className="max-w-[1000px] mx-auto"><AIInsights /></div>
             )}
          </motion.div>
        </AnimatePresence>

        {/* Demo Controls Floating Panel */}
        <motion.div variants={item} className="fixed bottom-10 right-10 flex flex-col gap-3.5 z-50 bg-white/70 backdrop-blur-2xl p-5 rounded-3xl shadow-[0_20px_50px_rgba(8,59,60,0.15)] border border-[#D9ECE9]/80 group hover:bg-white scale-90 sm:scale-100 origin-bottom-right transition-colors">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#083B3C] text-left mb-1 flex items-center gap-2">
             <Activity size={14} className="text-[#E76F51]" /> Interruption Layer Simulator
          </p>
          <div className="flex gap-3">
            <button onClick={triggerWarning} className="px-6 py-3 bg-[#F4A261]/10 text-[#C13816] font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-[#F4A261]/20 transition-colors border border-[#F4A261]/30 shadow-sm">
              Trigger Warning
            </button>
            <button onClick={triggerCritical} className="px-6 py-3 bg-gradient-to-r from-[#E76F51] to-[#C13816] text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:scale-[1.03] hover:shadow-[0_10px_25px_rgba(231,111,81,0.4)] transition-all shadow-md border border-white/20">
              Force Critical Alert
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
