import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface WarningToastProps {
  alert: any;
  onClose: () => void;
}

export function WarningToast({ alert, onClose }: WarningToastProps) {
  return (
    <AnimatePresence>
      {alert && (
        <motion.div 
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-8 right-8 z-[150] w-[450px] bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_rgba(8,59,60,0.15)] border-2 border-[#F4A261]/40 overflow-hidden flex cursor-pointer group"
          onClick={onClose}
        >
          <div className="w-2.5 bg-gradient-to-b from-[#F4A261] to-[#E76F51] shadow-[0_0_10px_rgba(244,162,97,0.8)]"></div>
          <div className="p-6 flex-1 relative">
            <button className="absolute top-4 right-4 text-[#7D908C] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F4FBFA] p-1 rounded-full">
              <X size={16} strokeWidth={3} />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-[1.2rem] bg-gradient-to-br from-[#F4A261]/20 to-[#E76F51]/10 text-[#C13816] flex items-center justify-center flex-shrink-0 shadow-inner border border-[#F4A261]/30">
                <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col pt-0.5">
                <div className="flex items-center gap-2 mb-1.5">
                   <span className="text-[12px] font-black uppercase tracking-[0.15em] text-[#C13816]">{alert.type}</span>
                   <span className="text-[10px] font-bold text-[#7D908C] uppercase tracking-wider bg-[#F4FBFA] px-2 py-0.5 rounded-md border border-[#D9ECE9] shadow-sm">{alert.time}</span>
                </div>
                <h4 className="text-[16px] font-black text-[#083B3C] leading-none mb-2 tracking-tight">{alert.patient}</h4>
                <p className="text-[13px] font-bold text-[#7D908C] leading-relaxed pr-2">{alert.description}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
