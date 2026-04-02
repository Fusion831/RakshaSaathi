import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Clock } from 'lucide-react';

const events = [
  { time: '08:00 AM', title: 'Medication Taken', desc: 'Amlodipine 5mg logged via dispenser.', isWarning: false },
  { time: '09:30 AM', title: 'Living Room Activity', desc: 'Patient detected moving in living area.', isWarning: false },
  { time: '11:15 AM', title: 'Vital Check', desc: 'HR and SpO2 confirmed stable.', isWarning: false },
  { time: '02:00 PM', title: 'Fall False Alarm', desc: 'CCTV confirmed object drop, not patient.', isWarning: true },
];

export function ActivityTimeline() {
  return (
    <Card className="h-full group">
      <CardHeader className="pb-4 border-b border-[#D9ECE9]/50">
        <CardTitle className="flex items-center gap-2.5 text-xl font-extrabold text-[#083B3C]">
          <Clock size={20} className="text-[#67D6D8]" strokeWidth={2.5} />
          Today's Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 relative">
        <div className="absolute left-[42px] top-8 bottom-4 w-px bg-gradient-to-b from-[#67D6D8]/50 to-transparent"></div>
        <div className="space-y-8 relative pl-2">
          {events.map((event, i) => (
            <div key={i} className="flex gap-6 relative group/event hover:-translate-y-0.5 transition-transform cursor-default">
               <div className={`w-6 h-6 rounded-full flex-shrink-0 mt-0.5 border-[3.5px] border-white shadow-[0_0_10px_rgba(0,0,0,0.1)] flex items-center justify-center relative z-10 
                   ${event.isWarning ? 'bg-[#E76F51] shadow-[#E76F51]/30' : 'bg-[#67D6D8] shadow-[#67D6D8]/30 group-hover/event:bg-[#083B3C]'} transition-colors duration-500`}
               ></div>
               <div className="flex-1 bg-[#F4FBFA]/40 hover:bg-[#F4FBFA] p-4 rounded-2xl border border-transparent hover:border-[#D9ECE9]/60 transition-all -mt-3 shadow-sm hover:shadow-[0_4px_15px_rgba(103,214,216,0.06)]">
                 <p className="text-[10px] font-black tracking-widest text-[#7D908C] uppercase mb-1">{event.time}</p>
                 <h4 className={`text-[15px] font-black ${event.isWarning ? 'text-[#E76F51]' : 'text-[#083B3C]'}`}>{event.title}</h4>
                 <p className="text-[13px] font-semibold text-[#7D908C] mt-1 leading-relaxed pr-2">{event.desc}</p>
               </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
