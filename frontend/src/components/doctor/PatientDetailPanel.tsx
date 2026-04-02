import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Heart, Battery, AlertCircle, FileText, CalendarDays } from 'lucide-react';

interface PatientDetailPanelProps {
  patient: any | null;
  onClose: () => void;
}

export function PatientDetailPanel({ patient, onClose }: PatientDetailPanelProps) {
  if (!patient) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="w-full bg-white/95 backdrop-blur-2xl border-2 border-[#D9ECE9] shadow-[0_20px_60px_rgba(8,59,60,0.06)] rounded-[2.5rem] flex flex-col overflow-hidden h-fit"
    >
      {/* Patient Header Block */}
      <div className="relative bg-gradient-to-b from-[#F4FBFA] to-white px-8 py-8 border-b border-[#D9ECE9]/60 flex items-center justify-between">
         <div className="flex items-center gap-5 relative z-10">
           <div className="relative shrink-0">
             <img src={patient.avatar} alt={patient.name} className="w-16 h-16 rounded-[1.2rem] object-cover shadow-[0_8px_15px_rgba(8,59,60,0.08)] border border-[#D9ECE9]" />
             <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-[2.5px] border-white flex items-center justify-center shadow-sm ${patient.status === 'Critical' ? 'bg-[#E76F51] animate-pulse' : patient.status === 'Attention' ? 'bg-[#F4A261]' : 'bg-[#63C7B2]'}`}></div>
           </div>
           <div>
             <h2 className="text-[22px] font-black text-[#083B3C] tracking-tight leading-none mb-1.5">{patient.name}</h2>
             <div className="flex items-center gap-2 text-[11px] font-black text-[#7D908C] uppercase tracking-widest">
                <span>{patient.age}Y</span>
                <span className="w-1 h-1 bg-[#D9ECE9] rounded-full"></span>
                <span>#{patient.id.slice(-4)}</span>
             </div>
           </div>
         </div>
         <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-[#D9ECE9] text-[#7D908C] hover:bg-[#F4FBFA] hover:text-[#E76F51] hover:border-[#E76F51] rounded-xl transition-all shadow-sm shrink-0">
           <X size={18} strokeWidth={3} />
         </button>
      </div>

      <div className="p-8 space-y-8 bg-white flex-1 relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#67D6D8]/5 rounded-full blur-[50px] pointer-events-none"></div>

         {/* Live Vitals Grid */}
         <div className="grid grid-cols-3 gap-4 relative z-10">
           <div className="bg-[#F4FBFA] rounded-[1.5rem] p-5 border border-[#D9ECE9]/50 shadow-[inset_0_1px_4px_rgba(8,59,60,0.02)]">
              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-[9px] font-black text-[#7D908C] uppercase tracking-widest mb-2"><Heart size={14} className="text-[#E76F51]" /> HR</p>
              <p className="text-[24px] text-center sm:text-left font-black text-[#083B3C] tracking-tighter leading-none">{patient.hr}</p>
           </div>
           <div className="bg-[#F4FBFA] rounded-[1.5rem] p-5 border border-[#D9ECE9]/50 shadow-[inset_0_1px_4px_rgba(8,59,60,0.02)]">
              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-[9px] font-black text-[#7D908C] uppercase tracking-widest mb-2"><Activity size={14} className="text-[#67D6D8]" /> O2</p>
              <p className="text-[24px] text-center sm:text-left font-black text-[#083B3C] tracking-tighter leading-none">{patient.spo2}<span className="text-[12px] opacity-70">%</span></p>
           </div>
           <div className="bg-[#F4FBFA] rounded-[1.5rem] p-5 border border-[#D9ECE9]/50 shadow-[inset_0_1px_4px_rgba(8,59,60,0.02)]">
              <p className="flex items-center justify-center sm:justify-start gap-1.5 text-[9px] font-black text-[#7D908C] uppercase tracking-widest mb-2"><Battery size={14} className="text-[#63C7B2]" /> Adher</p>
              <p className="text-[24px] text-center sm:text-left font-black text-[#083B3C] tracking-tighter leading-none">{patient.adherence || "96"}<span className="text-[12px] opacity-70">%</span></p>
           </div>
         </div>

         {patient.status === 'Critical' && (
           <div className="bg-gradient-to-r from-[#FFF4F2] to-white border-l-[6px] border-y border-r border-[#E76F51]/30 border-l-[#E76F51] rounded-2xl p-6 shadow-sm relative z-10">
             <h3 className="text-[11px] font-black text-[#C13816] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
               <AlertCircle size={16} strokeWidth={2.5} className="animate-pulse" /> Safety Alert
             </h3>
             <p className="text-[14px] font-black text-[#083B3C] mb-1.5 leading-snug">Sustained Tachycardia</p>
             <p className="text-[12px] font-bold text-[#7D908C] leading-relaxed">HR values consistently exceeded threshold bounds during inactive resting periods.</p>
           </div>
         )}
         
         {patient.status === 'Attention' && (
           <div className="bg-gradient-to-r from-[#FFFCF5] to-white border-l-[6px] border-y border-r border-[#F4A261]/30 border-l-[#F4A261] rounded-2xl p-6 shadow-sm relative z-10">
             <h3 className="text-[11px] font-black text-[#B05C12] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
               <AlertCircle size={16} strokeWidth={2.5} /> Attention Required
             </h3>
             <p className="text-[14px] font-black text-[#083B3C] mb-1.5 leading-snug">Mild Irregularities</p>
             <p className="text-[12px] font-bold text-[#7D908C] leading-relaxed">Patient exhibited disrupted sleep cycle extending beyond expected baseline.</p>
           </div>
         )}

         {/* Clinical Notes */}
         <div className="bg-white rounded-[1.5rem] border border-[#D9ECE9] shadow-[0_5px_15px_rgba(8,59,60,0.03)] overflow-hidden relative z-10">
           <div className="bg-[#F4FBFA]/60 px-6 py-4 border-b border-[#D9ECE9] flex items-center justify-between">
             <h3 className="text-[11px] font-black text-[#083B3C] uppercase tracking-[0.25em] flex items-center gap-2">
               <FileText size={16} className="text-[#67D6D8]" strokeWidth={2.5} /> Observation
             </h3>
             <button className="text-[10px] font-black text-[#67D6D8] uppercase tracking-widest hover:text-[#083B3C] transition-colors">Edit</button>
           </div>
           <div className="p-6">
             <p className="text-[13px] font-bold text-[#083B3C] mb-4 leading-relaxed opacity-95">Suggesting immediate ECG block review and monitoring over exactly the next 48 hours.</p>
             <p className="flex items-center gap-2 text-[10px] font-black text-[#7D908C] uppercase tracking-[0.15em] bg-[#F4FBFA] px-3 py-1.5 w-max rounded-lg border border-[#D9ECE9]/50">
               <CalendarDays size={14} className="text-[#67D6D8]" /> 09:30 AM
             </p>
           </div>
         </div>

         {/* CTA Row */}
         <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 relative z-10">
            <button className="w-full py-4 rounded-2xl flex items-center justify-center font-black text-[11px] uppercase tracking-[0.2em] text-[#083B3C] bg-[#F4FBFA] border-2 border-[#D9ECE9] hover:bg-white hover:border-[#67D6D8] transition-all shadow-sm">
               Full History
            </button>
            <button className="w-full py-4 rounded-2xl flex items-center justify-center font-black text-[11px] uppercase tracking-[0.2em] text-white bg-gradient-to-r from-[#083B3C] to-[#0A4A4B] hover:shadow-[0_10px_25px_rgba(8,59,60,0.3)] hover:scale-[1.03] transition-all shadow-md border border-white/10">
               Escalate
            </button>
         </div>
      </div>
    </motion.div>
  )
}
