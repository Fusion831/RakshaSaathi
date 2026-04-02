import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { PhoneCall, Ambulance, BellRing, HeartHandshake } from 'lucide-react';

export function EmergencyContacts() {
  const contacts = [
    { name: "Dr. Sharma (Cardio)", role: "Primary Care", phone: "+91 98765 43210", icon: HeartHandshake, color: "text-[#67D6D8]", bg: "bg-[#67D6D8]/10" },
    { name: "Ambulance Desk", role: "City Hospital", phone: "102 / 112", icon: Ambulance, color: "text-[#E76F51]", bg: "bg-[#E76F51]/10" }
  ];

  return (
    <Card className="h-full border-none shadow-[0_20px_60px_rgba(8,59,60,0.06)] overflow-hidden relative group rounded-[40px]">
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#E76F51]/10 to-transparent blur-[60px] pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity duration-1000"></div>
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-[#67D6D8]/10 to-transparent blur-[40px] pointer-events-none"></div>
      
      <CardHeader className="pb-4 relative z-10 px-10 pt-10">
        <CardTitle className="text-[24px] font-black text-[#083B3C] flex items-center gap-3 tracking-tight">
          <BellRing size={26} className="text-[#E76F51]" />
          Emergency / Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent className="px-10 pb-10 relative z-10">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 mt-2">
            <button className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-gradient-to-r from-[#E76F51] to-[#C13816] text-white shadow-[0_15px_30px_rgba(231,111,81,0.3)] hover:scale-[1.03] transition-transform">
               <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest text-white/70 mb-1">Direct Line</span>
                  <span className="text-[18px] font-black tracking-tight">Call Patient</span>
               </div>
               <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center border border-white/30 backdrop-blur-sm">
                  <PhoneCall size={24} className="animate-pulse" />
               </div>
            </button>
            <button className="w-full flex items-center justify-between p-6 rounded-[1.5rem] bg-white border-2 border-[#D9ECE9] shadow-[0_5px_15px_rgba(8,59,60,0.03)] hover:shadow-[0_15px_35px_rgba(8,59,60,0.08)] hover:border-[#F4A261]/50 transition-all hover:bg-[#F4A261]/5 text-[#083B3C]">
               <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#7D908C] mb-1">Escalate</span>
                  <span className="text-[18px] font-black tracking-tight">Trigger Siren</span>
               </div>
               <div className="w-14 h-14 bg-[#F4A261]/15 text-[#C13816] rounded-full flex items-center justify-center border border-[#F4A261]/30">
                  <BellRing size={24} />
               </div>
            </button>
         </div>

         <div className="flex items-center gap-4 mb-4">
            <div className="h-px bg-[#D9ECE9]/60 flex-1"></div>
            <h3 className="text-[11px] font-black text-[#7D908C] uppercase tracking-[0.25em]">Care Team Contacts</h3>
            <div className="h-px bg-[#D9ECE9]/60 flex-1"></div>
         </div>
         
         <div className="space-y-4">
            {contacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-[#F4FBFA]/50 border border-[#D9ECE9]/60 shadow-[0_2px_10px_rgba(8,59,60,0.02)] hover:shadow-[0_8px_20px_rgba(103,214,216,0.1)] hover:bg-[#EAF7F6] transition-all cursor-pointer">
                 <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-[1.2rem] ${c.bg} ${c.color} flex items-center justify-center shadow-inner border border-white`}>
                       <c.icon size={24} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[16px] font-black text-[#083B3C] leading-none mb-1.5">{c.name}</span>
                       <span className="text-[12.5px] font-black text-[#7D908C]">{c.role}</span>
                    </div>
                 </div>
                 <button className="text-[11px] font-black text-[#083B3C] bg-white border-[1.5px] border-[#D9ECE9] shadow-sm px-6 py-3 rounded-full hover:bg-[#67D6D8] hover:text-[#083B3C] hover:border-[#67D6D8] hover:shadow-md transition-all uppercase tracking-widest">
                    Call
                 </button>
              </div>
            ))}
         </div>
      </CardContent>
    </Card>
  )
}
