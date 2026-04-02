import { motion } from 'framer-motion';
import { HeartPulse, Droplets, Footprints, Thermometer, Moon, Activity, LineChart } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export function VitalsSnapshot({ vitals }: { vitals: any }) {
  const metrics = [
    { label: "Heart Rate", value: vitals?.heartRate || 76, unit: "BPM", icon: HeartPulse, color: "text-[#E76F51]", bg: "bg-[#E76F51]/10", border: "border-[#E76F51]/20", status: "Stable", data: [65, 70, 68, 76, 80, 75, 76] },
    { label: "Blood O2", value: vitals?.spO2 || 98, unit: "%", icon: Droplets, color: "text-[#67D6D8]", bg: "bg-[#67D6D8]/10", border: "border-[#67D6D8]/20", status: "Optimal", data: [96, 97, 98, 97, 98, 99, 98] },
    { label: "Daily Steps", value: vitals?.steps || 2450, unit: "steps", icon: Footprints, color: "text-[#63C7B2]", bg: "bg-[#63C7B2]/10", border: "border-[#63C7B2]/20", status: "Active", data: [1000, 1500, 2000, 2200, 2400, 2450, 2450] },
    { label: "Skin Temp", value: vitals?.skinTemp || 36.6, unit: "°C", icon: Thermometer, color: "text-[#F4A261]", bg: "bg-[#F4A261]/10", border: "border-[#F4A261]/20", status: "Normal", data: [36.4, 36.5, 36.5, 36.6, 36.6, 36.6, 36.6] },
    { label: "Sleep Duration", value: vitals?.sleepHours || 6.5, unit: "hrs", icon: Moon, color: "text-[#7D908C]", bg: "bg-[#7D908C]/10", border: "border-[#D9ECE9]/60", status: "Low", alert: true, data: [7, 6.5, 6, 5.5, 6.5, 6.5, 6.5] },
    { label: "Stress Index", value: "Low", unit: "", icon: Activity, color: "text-[#218F76]", bg: "bg-[#63C7B2]/10", border: "border-[#63C7B2]/20", status: "Relaxed", data: [40, 45, 35, 30, 25, 20, 20] }
  ];

  return (
    <Card className="border-none shadow-[0_20px_60px_rgba(8,59,60,0.04)] bg-white/70 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden border border-[#D9ECE9]/40 w-full relative h-max flex-shrink-0 pb-4">
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#67D6D8]/10 to-transparent blur-[60px] pointer-events-none opacity-60"></div>

      <CardHeader className="pb-8 pt-10 px-10 flex flex-row items-center justify-between border-b border-[#D9ECE9]/40 relative z-10 bg-white/40">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-br from-[#67D6D8] to-[#EAF7F6] rounded-2xl flex items-center justify-center shadow-inner border border-white">
             <LineChart size={26} className="text-[#083B3C]" strokeWidth={2.5} />
          </div>
          <div>
            <CardTitle className="text-[26px] font-black text-[#083B3C] tracking-tight leading-none mb-1.5">Live Health Telemetry</CardTitle>
            <p className="text-[12.5px] font-bold text-[#7D908C] uppercase tracking-widest">Real-time biometric analysis</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-[#F4FBFA] to-white px-5 py-2.5 rounded-full border border-[#D9ECE9] shadow-[0_2px_10px_rgba(8,59,60,0.02)]">
           <span className="w-2.5 h-2.5 bg-[#63C7B2] rounded-full animate-pulse shadow-[0_0_10px_rgba(99,199,178,0.8)] border border-white"></span>
           <span className="text-[11px] font-black uppercase tracking-widest text-[#083B3C]">Live Sensors</span>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 relative z-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 w-full">
          {metrics.map((metric, idx) => (
             <motion.div 
               key={idx}
               whileHover={{ y: -4, scale: 1.01 }}
               transition={{ type: "spring", stiffness: 400, damping: 25 }}
               className={`p-5 rounded-[1.5rem] bg-white border border-[#D9ECE9]/70 hover:border-[#67D6D8]/50 ${metric.border} shadow-[0_5px_15px_rgba(8,59,60,0.02)] hover:shadow-[0_15px_40px_rgba(8,59,60,0.06)] transition-all group overflow-hidden relative cursor-crosshair flex flex-col justify-between`}
             >
                <div className={`absolute top-0 right-0 w-24 h-24 ${metric.bg} blur-2xl rounded-full opacity-30 group-hover:opacity-80 transition-opacity -translate-y-1/2 translate-x-1/4`}></div>
                
                <div>
                   <div className="flex justify-between items-start mb-4 relative z-10 w-full">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[0.85rem] ${metric.bg} ${metric.color} flex items-center justify-center border border-white shadow-sm ring-1 ring-black/5`}>
                           <metric.icon size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-[11.5px] font-black text-[#7D908C] uppercase tracking-[0.2em]">{metric.label}</span>
                      </div>
                      
                      <span className={`text-[8.5px] font-black uppercase tracking-[0.15em] px-2.5 py-1.5 rounded-lg border shadow-sm shrink-0 ${metric.alert ? 'bg-[#E76F51]/10 text-[#C13816] border-[#E76F51]/30 animate-pulse' : 'bg-[#F4FBFA] text-[#7D908C] border-[#D9ECE9]'}`}>
                         {metric.status}
                      </span>
                   </div>
                   
                   <div className="flex items-end gap-2 relative z-10 pl-1">
                      <span className="text-[32px] font-black text-[#083B3C] leading-none tracking-tighter drop-shadow-sm">{metric.value}</span>
                      {metric.unit && <span className="text-[12.5px] font-bold text-[#7D908C] mb-1">{metric.unit}</span>}
                   </div>
                </div>

                {/* Compact Polished Sparkline */}
                <div className="w-full h-8 relative z-10 mt-4 border-t border-[#D9ECE9]/40 pt-3">
                   <svg viewBox="0 0 100 20" preserveAspectRatio="none" className={`w-full h-full stroke-current ${metric.alert ? 'text-[#E76F51]' : 'text-[#67D6D8]'} opacity-70 group-hover:opacity-100 transition-opacity stroke-[2.5px] fill-none stroke-linecap-round stroke-linejoin-round drop-shadow-sm`}>
                      <path d={`M 0 ${20 - metric.data[0]%20} Q 8 ${20 - metric.data[1]%20} 16 ${20 - metric.data[1]%20} T 32 ${20 - metric.data[2]%20} T 48 ${20 - metric.data[3]%20} T 64 ${20 - metric.data[4]%20} T 80 ${20 - metric.data[5]%20} T 100 ${20 - metric.data[6]%20}`} />
                   </svg>
                </div>
             </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
