import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { weeklyVitals } from '../../data/mockData';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Moon } from 'lucide-react';

export function SleepTrendCard() {
  const currentSleep = weeklyVitals[weeklyVitals.length - 1];
  
  return (
    <Card className="h-full flex flex-col group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-[#083B3C]">
            <Moon size={20} className="text-[#083B3C]" fill="#67D6D8" fillOpacity={0.3} />
            Sleep Pattern
          </CardTitle>
          <Badge variant="warning" className="animate-pulse shadow-sm shadow-[#F4A261]/20">Anomaly Info</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col relative z-10 w-full pt-2">
        <div className="flex gap-10 mb-6 bg-gradient-to-r from-[#F4FBFA] to-white p-5 rounded-2xl border border-white shadow-sm font-sans relative overflow-hidden">
          <div className="absolute inset-0 bg-[#EAF7F6]/30"></div>
          <div className="relative z-10">
            <p className="text-[10px] text-[#7D908C] font-extrabold uppercase tracking-widest">Last Night</p>
            <p className="text-3xl font-black text-[#083B3C] mt-1">{currentSleep.sleepDuration} <span className="text-sm font-bold text-[#7D908C]">hrs</span></p>
          </div>
          <div className="w-px h-16 bg-[#D9ECE9]/60 relative z-10"></div>
          <div className="relative z-10">
            <p className="text-[10px] text-[#7D908C] font-extrabold uppercase tracking-widest">Quality Score</p>
            <p className="text-3xl font-black text-[#083B3C] mt-1">{currentSleep.sleepQuality}<span className="text-sm font-bold text-[#7D908C]">/100</span></p>
          </div>
        </div>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyVitals} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                 <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#083B3C" />
                    <stop offset="100%" stopColor="#083B3C" stopOpacity={0.8} />
                 </linearGradient>
                 <linearGradient id="sleepGradWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F4A261" />
                    <stop offset="100%" stopColor="#E76F51" />
                 </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9ECE9" strokeOpacity={0.6} />
              <XAxis dataKey="time" stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} dy={5} />
              <YAxis stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} domain={[0, 10]} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(234, 247, 246, 0.5)' }}
                contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px -5px rgba(8,59,60,0.08)', color: '#083B3C', padding: '12px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="sleepDuration" name="Sleep (hrs)" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {weeklyVitals.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.sleepDuration < 6 ? 'url(#sleepGradWarn)' : 'url(#sleepGrad)'} className="transition-all hover:opacity-90 cursor-pointer" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
