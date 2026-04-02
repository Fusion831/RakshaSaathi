import { Users, Activity, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';

export function DocSummaryStats() {
  const stats = [
    { label: "Total Monitored", value: "1,248", icon: Users, color: "text-[#083B3C]", bg: "bg-gradient-to-br from-[#67D6D8] to-[#EAF7F6]", trend: "+12 this week", trendColor: "text-[#1D746A]", trendBg: "bg-[#63C7B2]/20" },
    { label: "Critical Alerts", value: "2", icon: AlertTriangle, color: "text-white", bg: "bg-gradient-to-br from-[#E76F51] to-[#D9534F] shadow-[0_0_20px_rgba(231,111,81,0.4)]", trend: "-3% vs yesterday", trendColor: "text-[#1D746A]", trendBg: "bg-[#63C7B2]/20" },
    { label: "High Risk Patients", value: "14", icon: Activity, color: "text-[#B05C12]", bg: "bg-gradient-to-br from-[#F4A261] to-[#F6E27A]/50", trend: "+2 this week", trendColor: "text-[#E76F51]", trendBg: "bg-[#E76F51]/10 border border-[#E76F51]/20" },
    { label: "Overall Adherence", value: "92%", icon: TrendingUp, color: "text-[#083B3C]", bg: "bg-gradient-to-br from-white to-[#EAF7F6] border border-[#67D6D8]/30", trend: "+4% vs last month", trendColor: "text-[#1D746A]", trendBg: "bg-[#63C7B2]/20" }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
      {stats.map((stat, i) => (
        <Card key={i} className="hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(8,59,60,0.12)] transition-all duration-500 border-white/60 cursor-pointer overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-white/80 to-transparent opacity-80 rounded-full blur-[30px] group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
          <CardContent className="p-8">
            <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center ${stat.bg} ${stat.color} mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500`}>
              <stat.icon size={26} strokeWidth={2.5} />
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#7D908C] mb-2">{stat.label}</p>
            <h3 className="text-[2.5rem] font-black text-[#083B3C] tracking-tight leading-none mb-3 drop-shadow-sm">{stat.value}</h3>
            <p className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-sm w-fit ${stat.trendColor} ${stat.trendBg}`}>{stat.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
