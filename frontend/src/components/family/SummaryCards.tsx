import { Card, CardContent } from '../ui/Card';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function SummaryCards({ patient }: { patient: any }) {
  return (
    <Card className="shadow-premium border-none relative overflow-hidden bg-[#083B3C] hover:-translate-y-0 hover:shadow-2xl">
      {/* Abstract Background Accents */}
      <div className="absolute top-0 right-0 w-[600px] h-full bg-gradient-to-l from-[#67D6D8]/20 to-transparent skew-x-12 blur-[60px]" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#EAF7F6]/10 rounded-full blur-[80px]" />
      
      <CardContent className="p-10 flex flex-col lg:flex-row items-center justify-between relative z-10 gap-10">
        <div className="flex items-center gap-8">
           <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#67D6D8] to-[#EAF7F6] text-[#083B3C] shadow-[0_0_40px_rgba(103,214,216,0.3)] border-4 border-white/10 flex items-center justify-center">
             <span className="text-4xl font-extrabold tracking-tight">
               {patient.name.split(' ').map((n: string) => n[0]).join('')}
             </span>
           </div>
           <div>
             <div className="flex items-center gap-4 mb-2">
               <h2 className="text-4xl font-black text-white drop-shadow-md">{patient.name}</h2>
               <Badge className="bg-[#63C7B2]/20 text-[#63C7B2] border-[#63C7B2]/30 px-3 py-1.5 flex items-center gap-1.5 shadow-inner backdrop-blur-md">
                 <CheckCircle2 size={12} strokeWidth={3} />
                 Safe Zone
               </Badge>
             </div>
             <p className="text-white/60 font-bold tracking-widest text-[11px] uppercase ml-1 opacity-90">{patient.age} yrs • Primary Residence</p>
           </div>
        </div>

        <div className="flex gap-12 bg-black/20 backdrop-blur-xl px-12 py-7 rounded-[2rem] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
           <div className="flex flex-col">
             <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1.5">System Status</span>
             <span className="text-2xl font-bold text-[#EAF7F6] flex items-center gap-2.5 drop-shadow-md">
               <ShieldCheck size={22} className="text-[#63C7B2]" /> All Stable
             </span>
           </div>
           <div className="w-px h-12 bg-white/10 self-center"></div>
           <div className="flex flex-col">
             <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1.5">Last Sync</span>
             <span className="text-2xl font-bold text-white/90 flex items-center gap-2.5 drop-shadow-md">
               <span className="relative flex h-3 w-3 mr-1 mt-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#67D6D8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-[#67D6D8]"></span>
               </span>
               Just Now
             </span>
           </div>
        </div>
      </CardContent>
    </Card>
  )
}
