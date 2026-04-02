import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { weeklyVitals } from '../../data/mockData';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ActivitySquare, ArrowUpRight } from 'lucide-react';

export function StressTrendCard() {
  const currentStress = weeklyVitals[weeklyVitals.length - 1].stressScore;
  const isHigh = currentStress > 60;

  return (
    <Card className="h-full flex flex-col group border-white/80 border hover:-translate-y-1 overflow-hidden relative">
       <div className="absolute top-0 right-0 w-64 h-64 bg-[#E76F51]/10 rounded-full blur-[60px] pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
      <CardHeader className="pb-2 relative z-10">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-[#083B3C]">
            <ActivitySquare size={20} className="text-[#E76F51]" />
            Clinical Stress Trend
          </CardTitle>
          <Badge variant={isHigh ? "danger" : "default"} className={isHigh ? "animate-pulse shadow-[0_0_12px_rgba(231,111,81,0.5)]" : ""}>
            {isHigh ? "Elevated" : "Normal"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col relative z-10 w-full pt-2 px-8 pb-8">
        <div className="flex gap-4 mb-4 bg-white/70 p-5 rounded-2xl border border-white shadow-[0_4px_15px_rgba(8,59,60,0.03)] backdrop-blur-md">
          <div className="flex-1">
            <p className="text-[10px] text-[#7D908C] font-extrabold uppercase tracking-widest">Current Level</p>
            <div className="flex items-center justify-between gap-3 mt-1">
               <h3 className="text-3xl font-black text-[#083B3C]">{currentStress}<span className="text-sm text-[#7D908C] font-bold">/100</span></h3>
               <span className="flex items-center text-[10px] font-black text-[#E76F51] bg-[#E76F51]/10 border border-[#E76F51]/20 px-2 py-1 rounded-md uppercase tracking-wider">
                 <ArrowUpRight size={14} className="mr-0.5" strokeWidth={3} /> 15% Sustained
               </span>
            </div>
          </div>
        </div>
        
        <div className="h-[200px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyVitals} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E76F51" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#E76F51" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9ECE9" strokeOpacity={0.6} />
              <XAxis dataKey="time" stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} dy={5} />
              <YAxis stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} domain={[0, 100]} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px -5px rgba(8,59,60,0.08)', color: '#083B3C', padding: '12px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="stressScore" name="Stress Score" stroke="#E76F51" strokeWidth={5} fill="url(#stressGrad)" activeDot={{ r: 8, fill: '#E76F51', stroke: '#FFF', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-8 flex flex-col justify-end">
           <h4 className="text-[10px] font-extrabold text-[#7D908C] uppercase tracking-[0.2em] pl-1 mb-2.5">Contributing Factors</h4>
           <div className="flex flex-wrap gap-2.5 mb-5">
             <Badge className="bg-[#E76F51]/10 text-[#E76F51] border-[#E76F51]/20 font-bold shadow-sm px-3 py-1.5">Elevated Resting HR</Badge>
             <Badge className="bg-[#F4A261]/10 text-[#B05C12] border-[#F4A261]/30 font-bold shadow-sm px-3 py-1.5">Poor Sleep Quality</Badge>
           </div>
           <div className="text-[12.5px] text-[#083B3C] bg-gradient-to-r from-red-50 to-white/50 border border-[#E76F51]/20 p-4 rounded-xl leading-relaxed shadow-sm relative overflow-hidden backdrop-blur-sm">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E76F51]"></div>
             <span className="font-black text-[#E76F51] mr-1 uppercase text-[10px] tracking-widest block mb-1">Clinical Note</span> 
             Sustained elevated stress signals detected over the last 48 hours. Evaluate physiological triggers.
           </div>
        </div>
      </CardContent>
    </Card>
  )
}
