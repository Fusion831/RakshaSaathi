import { Card } from '../ui/Card';
import { Activity, Moon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend, Tooltip } from 'recharts';
import { weeklyVitals } from '../../data/mockData';

const customLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex items-center justify-start gap-8 mt-1 mb-8 pl-4">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
          <span className="text-[13px] font-black uppercase tracking-widest pt-0.5" style={{ color: entry.color }}>
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
};

export function TrendsSection() {
  const currentSleep = weeklyVitals[weeklyVitals.length - 1];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
      
      {/* 7-Day Activity Trends Card */}
      <Card className="rounded-[40px] border-2 border-white/60 shadow-[0_20px_60px_rgba(8,59,60,0.06)] bg-white p-10 hover:-translate-y-1 transition-transform relative overflow-hidden group">
        <div className="flex items-center gap-3.5 mb-2 pl-4">
          <Activity size={32} className="text-[#E76F51]" />
          <h2 className="text-[28px] font-black text-[#083B3C] tracking-tight">7-Day Activity Trends</h2>
        </div>
        
        <div className="h-[300px] w-full mt-6 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyVitals} margin={{ top: 10, right: 10, bottom: 20, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAF7F6" strokeWidth={2} />
              <XAxis dataKey="time" stroke="#7D908C" fontSize={14} fontWeight={800} tickLine={false} axisLine={false} dy={20} />
              <YAxis yAxisId="left" stroke="#7D908C" fontSize={14} fontWeight={800} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} dx={-15} />
              <YAxis yAxisId="right" orientation="right" stroke="#7D908C" fontSize={14} fontWeight={800} tickLine={false} axisLine={false} domain={['dataMin - 2', 'auto']} dx={15} />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px -5px rgba(8,59,60,0.08)', color: '#083B3C', padding: '16px' }}
                itemStyle={{ fontWeight: 800, padding: '4px 0' }}
                cursor={{ stroke: '#D9ECE9', strokeWidth: 2, strokeDasharray: '4 4' }}
              />
              <Legend content={customLegend} verticalAlign="top" align="left" />
              <Line yAxisId="left" type="monotone" name="Heart Rate (BPM)" dataKey="heartRate" stroke="#E76F51" strokeWidth={5} dot={{ r: 7, fill: '#E76F51', strokeWidth: 0 }} activeDot={{ r: 9, strokeWidth: 0, fill: '#E76F51' }} animationDuration={1000} />
              <Line yAxisId="right" type="monotone" name="SpO2 (%)" dataKey="spO2" stroke="#67D6D8" strokeWidth={5} dot={{ r: 7, fill: '#67D6D8', strokeWidth: 0 }} activeDot={{ r: 9, strokeWidth: 0, fill: '#67D6D8' }} animationDuration={1000} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Sleep Pattern Card */}
      <Card className="rounded-[40px] border-2 border-white/60 shadow-[0_20px_60px_rgba(8,59,60,0.06)] bg-white p-10 hover:-translate-y-1 transition-transform flex flex-col relative overflow-hidden group">
        <div className="flex justify-between items-center mb-8 pl-2">
          <div className="flex items-center gap-3.5">
            <Moon size={32} className="text-[#083B3C]" />
            <h2 className="text-[28px] font-black text-[#083B3C] tracking-tight">Sleep Pattern</h2>
          </div>
          <div className="bg-[#FEF5ED] text-[#E76F51] border border-[#F4A261]/20 font-extrabold text-[12px] uppercase tracking-widest px-5 py-2.5 rounded-full shadow-sm hover:bg-[#F4A261]/10 transition-colors cursor-pointer">
            Anomaly Info
          </div>
        </div>
        
        <div className="flex-1 rounded-[32px] bg-[#F4FBFA] border border-[#D9ECE9]/60 p-10 flex items-center justify-center relative overflow-hidden mt-2 shadow-[inset_0_2px_15px_rgba(0,0,0,0.02)]">
           <div className="flex w-full items-center justify-between gap-4 relative z-10 px-2 lg:px-8">
             
             <div className="flex-1 flex flex-col items-start mt-2">
               <span className="text-[14px] font-extrabold text-[#7D908C] uppercase tracking-[0.2em] mb-5 leading-tight">Last<br/>Night</span>
               <div className="flex items-baseline gap-2 mb-2">
                 <span className="text-[72px] leading-none font-black text-[#083B3C] tracking-tighter drop-shadow-sm">{currentSleep.sleepDuration}</span>
               </div>
               <span className="text-[20px] font-extrabold text-[#7D908C] opacity-80 tracking-wide mt-1">hrs</span>
             </div>
             
             <div className="w-[3px] h-[150px] bg-[#EAF7F6] shadow-[1px_0_2px_rgba(255,255,255,0.8)] rounded-full hidden sm:block mx-4"></div>
             
             <div className="flex-1 flex flex-col items-start sm:pl-10 mt-2">
               <span className="text-[14px] font-extrabold text-[#7D908C] uppercase tracking-[0.2em] mb-5 leading-tight">Quality<br/>Score</span>
               <div className="flex items-baseline mb-10">
                 <span className="text-[72px] leading-none font-black text-[#083B3C] tracking-tighter drop-shadow-sm">{currentSleep.sleepQuality}</span>
                 <span className="text-[20px] font-extrabold text-[#7D908C] ml-1.5 opacity-80">/100</span>
               </div>
             </div>
             
           </div>
        </div>
      </Card>

    </div>
  )
}
