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
            className="relative z-10 w-full max-w-md bg-white rounded-[2rem] shadow-[0_30px_100px_rgba(231,111,81,0.3)] overflow-hidden border border-[#E76F51]/30 flex flex-col"
          >
            {/* Animated Danger Header Wash */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#E76F51]/15 to-transparent pointer-events-none"></div>
            
            <div className="flex flex-col items-center justify-center pt-10 pb-6 px-8 text-center relative z-10">
               {/* Huge Pulsing Ring Anchor */}
               <div className="relative w-20 h-20 flex items-center justify-center mb-6">
                  <motion.div 
                    animate={{ scale: [1, 1.8, 2.5], opacity: [0.6, 0.2, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-[#E76F51] shadow-[0_0_20px_rgba(231,111,81,0.5)]"
                  ></motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 bg-gradient-to-br from-[#E76F51] to-[#C13816] rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(231,111,81,0.7)] border-[3px] border-white/90 backdrop-blur-sm"
                  >
                     <AlertOctagon size={28} className="text-white drop-shadow-lg" strokeWidth={2.5} />
                  </motion.div>
               </div>
               
               {/* Simulated Sound Anchor */}
               <div className="flex items-center justify-center gap-1.5 text-[#E76F51] bg-[#E76F51]/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm border border-[#E76F51]/20">
                  <Volume2 size={12} className="animate-pulse" />
                  Alert
               </div>
               
               <h2 className="text-2xl font-black text-[#083B3C] tracking-tight leading-none mb-2">
                 {alert.type}
               </h2>
               <p className="text-[12px] font-extrabold text-[#E76F51] uppercase tracking-[0.25em] mb-6">
                 {alert.time} • {alert.patient}
               </p>
               
               <div className="w-full bg-gradient-to-br from-[#FDF7F5] to-white border border-[#E76F51]/20 p-5 rounded-xl text-left mb-6 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)]">
                 <p className="text-base font-bold text-[#083B3C] mb-2 leading-snug">{alert.description}</p>
                 <div className="h-px w-full bg-[#E76F51]/10 my-3"></div>
                 <p className="text-[12px] font-semibold text-[#7D908C] leading-relaxed flex items-start gap-2">
                   <span className="text-[#C13816] font-black uppercase tracking-widest text-[10px] mt-0.5 shrink-0 bg-[#E76F51]/10 px-1.5 py-0.5 rounded text-[9px]">Action</span> 
                   <span className="opacity-90">{alert.action}</span>
                 </p>
               </div>
               
               {/* Premium Action Buttons */}
               <div className="w-full flex flex-col gap-3 justify-center">
                  <button 
                    className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-[12px] uppercase tracking-widest text-white bg-gradient-to-r from-[#E76F51] to-[#C13816] hover:scale-[1.02] transition-transform shadow-lg border border-white/20"
                  >
                     <Phone size={16} className="animate-pulse drop-shadow-sm" strokeWidth={2.5} />
                     Call Emergency
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-[12px] uppercase tracking-widest text-[#083B3C] bg-white border-2 border-[#D9ECE9] hover:bg-[#F4FBFA] hover:text-[#7D908C] transition-all shadow-sm"
                  >
                     <CheckCircle2 size={16} strokeWidth={2.5} />
                     Acknowledge
                  </button>
               </div>
               
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
