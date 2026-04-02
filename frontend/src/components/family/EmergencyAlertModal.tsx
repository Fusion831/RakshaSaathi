import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, Phone, FileText, CheckCircle2, Volume2 } from 'lucide-react';

interface AlertData {
  type: string;
  patient: string;
  time: string;
  description: string;
  action: string;
}

interface EmergencyAlertModalProps {
  alert: AlertData | null;
  onClose: () => void;
}

export function EmergencyAlertModal({ alert, onClose }: EmergencyAlertModalProps) {
  return (
    <AnimatePresence>
      {alert && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)", transition: { duration: 0.5, ease: "easeInOut" } }}
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8"
        >
          {/* Extremely prominent backdrop dim and blur */}
          <div className="absolute inset-0 bg-[#031111]/85 backdrop-blur-2xl" onClick={onClose}></div>
          
          <motion.div 
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(231,111,81,0.3)] overflow-hidden border border-[#E76F51]/30 flex flex-col"
          >
            {/* Animated Danger Header Wash */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#E76F51]/15 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col items-center justify-center pt-12 pb-8 px-12 text-center relative z-10">
               {/* Huge Pulsing Ring Anchor */}
               <div className="relative w-28 h-28 flex items-center justify-center mb-8">
                  <motion.div 
                    animate={{ scale: [1, 1.8, 2.5], opacity: [0.6, 0.2, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-[#E76F51] shadow-[0_0_20px_rgba(231,111,81,0.5)]"
                  ></motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-gradient-to-br from-[#E76F51] to-[#C13816] rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(231,111,81,0.7)] border-[4px] border-white/90 backdrop-blur-sm"
                  >
                     <AlertOctagon size={36} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                  </motion.div>
               </div>
               
               {/* Simulated Sound Anchor */}
               <div className="flex items-center justify-center gap-1.5 text-[#E76F51] bg-[#E76F51]/10 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] mb-5 shadow-sm border border-[#E76F51]/20">
                  <Volume2 size={14} className="animate-pulse" />
                  Alert Tone Enabled
               </div>
               
               <h2 className="text-[2.8rem] font-black text-[#083B3C] tracking-tight leading-none mb-3">
                 {alert.type}
               </h2>
               <p className="text-[14px] font-extrabold text-[#E76F51] uppercase tracking-[0.25em] mb-8">
                 Detected at {alert.time} • {alert.patient}
               </p>
               
               <div className="w-full bg-gradient-to-br from-[#FDF7F5] to-white border border-[#E76F51]/20 p-8 rounded-[1.5rem] text-left mb-8 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)]">
                 <p className="text-[18px] font-black text-[#083B3C] mb-3 leading-snug">{alert.description}</p>
                 <div className="h-px w-full bg-[#E76F51]/10 my-4"></div>
                 <p className="text-[14px] font-bold text-[#7D908C] leading-relaxed flex items-start gap-2">
                   <span className="text-[#C13816] font-black uppercase tracking-widest text-[11px] mt-1 shrink-0 bg-[#E76F51]/10 px-2 py-0.5 rounded">Action</span> 
                   <span className="opacity-90">{alert.action}</span>
                 </p>
               </div>
               
               {/* Premium Action Buttons */}
               <div className="w-full flex flex-col sm:flex-row items-center gap-4 justify-center">
                  <button 
                    onClick={onClose}
                    className="w-full sm:w-auto px-8 py-4.5 rounded-2xl flex items-center justify-center gap-2.5 font-black text-[13px] uppercase tracking-[0.15em] text-[#7D908C] bg-white border-2 border-[#D9ECE9] hover:bg-[#F4FBFA] hover:text-[#083B3C] hover:border-[#67D6D8] transition-all shadow-sm group"
                  >
                     <CheckCircle2 size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                     Acknowledge
                  </button>
                  <button 
                    className="w-full sm:w-auto px-8 py-4.5 rounded-2xl flex items-center justify-center gap-2.5 font-black text-[13px] uppercase tracking-[0.15em] text-[#083B3C] bg-white border-2 border-[#67D6D8] hover:bg-[#EAF7F6] hover:shadow-lg transition-all shadow-sm"
                  >
                     <FileText size={20} strokeWidth={2.5} />
                     View Details
                  </button>
                  <button 
                    className="w-full sm:w-auto px-10 py-4.5 rounded-2xl flex items-center justify-center gap-2.5 font-black text-[13px] uppercase tracking-[0.15em] text-white bg-gradient-to-r from-[#E76F51] to-[#C13816] hover:scale-[1.03] transition-transform shadow-[0_15px_30px_rgba(231,111,81,0.4)] border border-white/20"
                  >
                     <Phone size={20} className="animate-pulse drop-shadow-sm" strokeWidth={2.5} />
                     Call Patient
                  </button>
               </div>
               
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
