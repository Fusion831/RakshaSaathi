import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { DocAlertsPanel } from '../components/doctor/DocAlertsPanel';
import { PatientList } from '../components/doctor/PatientList';
import { PatientDetailPanel } from '../components/doctor/PatientDetailPanel';
import { Tabs } from '../components/ui/Tabs';
import { Activity, Users, AlertCircle, HeartHandshake } from 'lucide-react';

export default function DoctorDashboard() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Patient Cohort");

  const container: any = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item: any = { hidden: { opacity: 0, scale: 0.98, y: 20 }, show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } } };

  const metrics = [
    { label: "Total Patients Managed", val: "142", icon: Users, color: "text-[#67D6D8]", bg: "bg-[#67D6D8]/10", border: "border-[#67D6D8]/20" },
    { label: "Critical Risk Profiles", val: "14", icon: Activity, color: "text-[#E76F51]", bg: "bg-[#E76F51]/10", border: "border-[#E76F51]/20", urgent: true },
    { label: "Unacknowledged Alerts", val: "3", icon: AlertCircle, color: "text-[#F4A261]", bg: "bg-[#F4A261]/10", border: "border-[#F4A261]/20" },
    { label: "Average Adherence", val: "94%", icon: HeartHandshake, color: "text-[#63C7B2]", bg: "bg-[#63C7B2]/10", border: "border-[#63C7B2]/20" }
  ];

  return (
    <>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-10 w-full overflow-hidden">
        
        {/* Dynamic Header & Intelligent Tab System */}
        <motion.div variants={item} className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 mb-6">
          <div>
            <h1 className="text-[2.8rem] font-extrabold text-[#083B3C] tracking-tight drop-shadow-sm leading-none">Clinical Command Centric</h1>
            <p className="text-[#083B3C]/70 font-semibold tracking-wide mt-3 text-lg">Cross-population health analytics and workflow triage.</p>
          </div>
          <Tabs 
            tabs={["Patient Cohort", "Population Vitals", "Adherence Rates", "Network Alerts", "Clinical Notes"]} 
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
             {activeTab === "Patient Cohort" && (
                <div className="space-y-10 w-full relative">
                  
                  {/* Big Clinical Overview Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
                     {metrics.map((m, i) => (
                       <div key={i} className={`p-8 bg-white/80 backdrop-blur-xl border ${m.border} rounded-[2rem] shadow-[0_10px_35px_rgba(8,59,60,0.03)] flex flex-col justify-between hover:shadow-lg transition-shadow relative overflow-hidden group border-2`}>
                         <div className={`absolute -right-4 -top-4 w-28 h-28 rounded-full ${m.bg} blur-[25px] group-hover:scale-150 transition-transform duration-700 pointer-events-none`}></div>
                         <div className="flex items-start justify-between mb-10 relative z-10 mt-1">
                            <h3 className="text-[12px] font-black text-[#7D908C] uppercase tracking-[0.2em] w-2/3 leading-snug">{m.label}</h3>
                            <div className={`w-14 h-14 rounded-[1.2rem] ${m.bg} ${m.color} flex items-center justify-center border border-white shadow-[0_5px_15px_rgba(8,59,60,0.05)]`}>
                               <m.icon size={24} strokeWidth={2.5} />
                            </div>
                         </div>
                         <div className="flex items-end gap-3 relative z-10">
                            <span className="text-[4rem] font-black text-[#083B3C] leading-none tracking-tighter drop-shadow-sm">{m.val}</span>
                            {m.urgent && <span className="mb-4 w-3 h-3 bg-[#E76F51] rounded-full shadow-[0_0_10px_rgba(231,111,81,0.8)] animate-pulse border-2 border-white"></span>}
                         </div>
                       </div>
                     ))}
                  </div>

                  {/* Master Patient Table Layout */}
                  <div className="flex flex-col xl:flex-row gap-8 items-start w-full relative">
                     {/* The Patient List Table shrinks seamlessly via Tailwind transitions */}
                     <div className={`transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] flex-shrink-0 ${selectedPatient ? 'w-full xl:w-[62%]' : 'w-full xl:w-[72%]'}`}>
                        <PatientList onSelectPatient={setSelectedPatient} />
                     </div>
                     
                     <div className={`transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${selectedPatient ? 'w-full xl:w-[38%] overflow-visible' : 'w-full xl:w-[28%]'}`}>
                        <AnimatePresence mode="wait">
                          {selectedPatient ? (
                             <motion.div 
                               key="detail"
                               initial={{ opacity: 0, x: 20 }}
                               animate={{ opacity: 1, x: 0 }}
                               exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                               transition={{ duration: 0.4, ease: "easeOut" }}
                               className="w-full"
                             >
                                <PatientDetailPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />
                             </motion.div>
                          ) : (
                             <motion.div 
                               key="alerts"
                               initial={{ opacity: 0, x: -20 }}
                               animate={{ opacity: 1, x: 0 }}
                               exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                               transition={{ duration: 0.4, ease: "easeOut" }}
                               className="w-full hidden xl:block"
                             >
                                <DocAlertsPanel />
                             </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                     
                     {/* Fallback alerts layout for mobile views when patient isn't selected */}
                     {!selectedPatient && (
                       <div className="w-full xl:hidden">
                         <DocAlertsPanel />
                       </div>
                     )}
                  </div>

                </div>
             )}

             {activeTab !== "Patient Cohort" && (
                <div className="w-full h-[600px] bg-white/50 backdrop-blur-xl border-[3px] border-dashed border-[#D9ECE9] rounded-[3rem] flex flex-col items-center justify-center text-center p-10">
                   <div className="w-28 h-28 bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(8,59,60,0.05)] border-2 border-[#D9ECE9] flex items-center justify-center text-[#67D6D8] mb-8 animate-bounce">
                      <Activity size={48} strokeWidth={2} />
                   </div>
                   <h2 className="text-[2rem] font-black text-[#083B3C] tracking-tight mb-3">{activeTab} Framework</h2>
                   <p className="text-[#7D908C] font-bold text-lg max-w-md leading-relaxed">Detailed population-level algorithms for {activeTab.toLowerCase()} are currently being assembled by the healthcare intelligence grid.</p>
                </div>
             )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  )
}
