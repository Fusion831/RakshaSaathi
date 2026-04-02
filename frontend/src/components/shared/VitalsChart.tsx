import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { weeklyVitals } from '../../data/mockData';
import { Activity } from 'lucide-react';

export function VitalsChart() {
  return (
    <Card className="h-full flex flex-col group">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl font-extrabold text-[#083B3C]">
          <Activity size={20} className="text-[#E76F51]" />
          7-Day Activity Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 w-full relative pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={weeklyVitals} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E76F51" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#E76F51" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D9ECE9" strokeOpacity={0.6} />
            <XAxis dataKey="time" stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} dy={10} />
            <YAxis yAxisId="left" stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} dx={-10} />
            <YAxis yAxisId="right" orientation="right" stroke="#7D908C" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} domain={['dataMin - 2', 'auto']} dx={10} />
            <Tooltip 
              contentStyle={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 40px -5px rgba(8,59,60,0.1)', color: '#083B3C', padding: '16px' }}
              itemStyle={{ fontWeight: 800, padding: '4px 0' }}
              cursor={{ stroke: '#67D6D8', strokeWidth: 2, strokeDasharray: '4 4' }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#083B3C', fontWeight: 800, paddingBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <Line yAxisId="left" type="monotone" name="Heart Rate (BPM)" dataKey="heartRate" stroke="#E76F51" strokeWidth={4} dot={{ r: 5, fill: '#E76F51', strokeWidth: 2, stroke: '#FFFFFF' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#E76F51' }} animationDuration={1500} />
            <Line yAxisId="right" type="monotone" name="SpO2 (%)" dataKey="spO2" stroke="#67D6D8" strokeWidth={4} dot={{ r: 5, fill: '#67D6D8', strokeWidth: 2, stroke: '#FFFFFF' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#67D6D8' }} animationDuration={1500} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
