import { Search, Filter, MoreVertical, AlertTriangle } from 'lucide-react';
import { patientsList } from '../../data/mockData';

interface PatientListProps {
  onSelectPatient: (patient: any) => void;
}

export function PatientList({ onSelectPatient }: PatientListProps) {
  return (
    <div className="bg-white/90 backdrop-blur-xl border border-[#D9ECE9] shadow-[0_20px_60px_rgba(8,59,60,0.05)] rounded-[2.5rem] overflow-hidden flex flex-col h-full">
      <div className="p-8 border-b border-[#D9ECE9]/60 flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-[#F4FBFA]/80 to-transparent gap-4">
        <h3 className="text-[22px] font-black text-[#083B3C] tracking-tight">Active Patients Registry</h3>
        <div className="flex gap-4">
          <div className="relative group">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#7D908C] group-focus-within:text-[#67D6D8] transition-colors" />
            <input 
              type="text" 
              placeholder="Search patient ID or name..." 
              className="pl-12 pr-6 py-3.5 bg-white border-2 border-[#D9ECE9] rounded-2xl text-[13px] font-bold text-[#083B3C] focus:outline-none focus:ring-4 focus:ring-[#67D6D8]/20 focus:border-[#67D6D8] w-[280px] sm:w-[320px] transition-all shadow-sm placeholder:text-[#7D908C]/50" 
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3.5 bg-white border-2 border-[#D9ECE9] rounded-2xl text-[#083B3C] font-black text-[12px] uppercase tracking-widest hover:bg-[#F4FBFA] hover:border-[#67D6D8] transition-all shadow-sm text-center">
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FDFDFD] border-b border-[#D9ECE9] text-[#7D908C] text-[10px] font-black uppercase tracking-[0.25em]">
              <th className="px-10 py-6">Patient Profile</th>
              <th className="px-8 py-6">Status Level</th>
              <th className="px-8 py-6">Recent Vitals</th>
              <th className="px-8 py-6">System Alerts</th>
              <th className="px-8 py-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {patientsList.map((patient: any) => (
              <tr 
                key={patient.id} 
                onClick={() => onSelectPatient(patient)} 
                className="border-b border-[#D9ECE9]/50 hover:bg-[#F4FBFA] hover:shadow-[inset_4px_0_0_#67D6D8] transition-all cursor-pointer group"
              >
                <td className="px-10 py-6">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                       <img src={patient.avatar} alt={patient.name} className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:shadow-[0_10px_20px_rgba(8,59,60,0.1)] transition-shadow border-2 border-[#D9ECE9]" />
                       <div className={`absolute -bottom-2 -right-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${patient.status === 'Critical' ? 'bg-[#E76F51]' : patient.status === 'Attention' ? 'bg-[#F4A261]' : 'bg-[#63C7B2]'}`}></div>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-[16px] text-[#083B3C] group-hover:text-[#0A4A4B] tracking-tight">{patient.name}</span>
                      <span className="text-[12px] font-bold text-[#7D908C] flex gap-2 uppercase tracking-wide">
                        {patient.age}Y <span className="text-[#D9ECE9]">|</span> #{patient.id.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`inline-flex items-center justify-center px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                    patient.status === 'Stable' ? 'bg-[#63C7B2]/10 text-[#218F76] border-[#63C7B2]/30' :
                    patient.status === 'Attention' ? 'bg-[#F6E27A]/20 text-[#B08D12] border-[#F6E27A]/50' :
                    'bg-[#E76F51]/10 text-[#C13816] border-[#E76F51]/40'
                  }`}>
                    {patient.status}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-5">
                    <div className="flex flex-col items-start min-w-[60px]">
                      <span className="text-[10px] font-black text-[#7D908C] uppercase tracking-[0.2em] mb-1">HR</span>
                      <span className="font-black text-[#083B3C] text-[18px] leading-none">{patient.hr}</span>
                    </div>
                    <div className="w-px h-8 bg-[#D9ECE9]"></div>
                    <div className="flex flex-col items-start min-w-[60px]">
                      <span className="text-[10px] font-black text-[#7D908C] uppercase tracking-[0.2em] mb-1">O2</span>
                      <span className="font-black text-[#083B3C] text-[18px] leading-none">{patient.spo2}<span className="text-[11px]">%</span></span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  {patient.alerts > 0 ? (
                    <div className="flex items-center">
                      <span className="flex items-center gap-2 text-[10px] font-black text-[#C13816] uppercase tracking-[0.2em] bg-gradient-to-r from-[#E76F51]/10 to-transparent pr-4 pl-3 py-1.5 rounded-lg border-l-2 border-[#E76F51]">
                        <AlertTriangle size={14} strokeWidth={3} className="animate-pulse" /> {patient.alerts} Trigger
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#7D908C]/50 px-3 py-1.5 border border-transparent">No Events</span>
                  )}
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="w-10 h-10 inline-flex items-center justify-center text-[#7D908C] hover:text-[#083B3C] hover:bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-[#D9ECE9]/50">
                    <MoreVertical size={20} strokeWidth={2.5} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
