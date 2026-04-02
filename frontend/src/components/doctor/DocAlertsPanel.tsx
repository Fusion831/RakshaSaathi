import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';

const alerts = [
  { id: '1', patient: 'Sunita Sharma', type: 'Severe Hypoxia', description: 'SpO2 sustained below 92% for > 15 mins.', severity: 'critical', time: '10 min ago' },
  { id: '2', patient: 'Rahul Singh', type: 'Stress Alert', description: 'Sustained elevated stress signals detected. Poor recovery.', severity: 'warning', time: '20 min ago' },
  { id: '3', patient: 'Rahul Singh', type: 'Sleep Anomaly', description: 'Irregular sleep pattern detected (Avg 4.5h per night).', severity: 'warning', time: '30 min ago' },
  { id: '4', patient: 'Meena Devi', type: 'Tachycardia', description: 'HR > 110 bpm during sedentary period.', severity: 'warning', time: '1 hr ago' },
];

export function DocAlertsPanel() {
  return (
    <Card className="h-full flex flex-col border-white/90 shadow-[0_15px_50px_rgba(231,111,81,0.06)] overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-[#E76F51]/10 via-[#F4A261]/5 to-transparent blur-[80px] pointer-events-none group-hover:opacity-100 transition-opacity duration-1000"></div>
      
      <CardHeader className="border-b border-[#D9ECE9]/60 pb-6 pt-8 px-8 relative z-10 bg-white/60 backdrop-blur-xl">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2.5 text-2xl font-black text-[#083B3C]">
            <ShieldAlert size={26} className="text-[#E76F51] drop-shadow-md" />
            Clinical Alerts
          </CardTitle>
          <Badge variant="danger" className="animate-pulse shadow-[0_0_15px_rgba(231,111,81,0.4)] px-4 py-2 flex items-center justify-center font-black">
            {alerts.filter(a => a.severity === 'critical').length} Critical
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-y-auto relative z-10 bg-white/20 backdrop-blur-md">
        <div className="divide-y divide-[#D9ECE9]/60">
          {alerts.map(alert => (
             <div key={alert.id} className="p-8 hover:bg-white/90 transition-all cursor-pointer group/row hover:shadow-[0_4px_30px_rgba(8,59,60,0.05)] relative overflow-hidden backdrop-blur-sm">
                
                {alert.severity === 'critical' && <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-b from-[#E76F51] to-[#D9534F] shadow-[0_0_15px_rgba(231,111,81,0.6)]"></div>}
                
                <div className="flex justify-between items-start mb-3 ml-2">
                  <div className="flex items-center gap-3">
                    {alert.severity === 'critical' ? <ShieldAlert size={20} className="text-[#E76F51]" /> : <AlertTriangle size={20} className="text-[#F4A261]" />}
                    <h4 className="font-black text-[#083B3C] text-[16px] tracking-tight">{alert.type}</h4>
                  </div>
                  <span className="text-[10px] font-extrabold text-[#7D908C] uppercase tracking-widest bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-[#D9ECE9]/80 shadow-sm">{alert.time}</span>
                </div>
                
                <div className={`pl-9 mt-3 ml-2 ${alert.severity === 'critical' ? 'border-l-[3px] border-[#E76F51]/40' : 'border-l-[3px] border-[#D9ECE9]/80'}`}>
                  <p className="text-[14px] font-black text-[#083B3C] mb-1.5">{alert.patient}</p>
                  <p className="text-[14px] text-[#7D908C] font-semibold leading-relaxed mb-4 pr-4">{alert.description}</p>
                  
                  <button className="text-[11px] font-black text-[#083B3C] uppercase tracking-[0.15em] flex items-center gap-2 bg-gradient-to-r from-white to-[#F4FBFA] border border-[#D9ECE9] shadow-sm px-4 py-2 rounded-full opacity-0 group-hover/row:opacity-100 transition-all duration-300 -translate-x-4 group-hover/row:translate-x-0 hover:border-[#67D6D8] hover:shadow-md hover:text-[#083B3C]">
                    Review Case <ArrowRight size={14} strokeWidth={3} />
                  </button>
                </div>
             </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
