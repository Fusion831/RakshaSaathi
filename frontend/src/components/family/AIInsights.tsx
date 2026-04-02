import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Brain, ChevronDown, Moon, Activity, Footprints } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const insights = [
  { id: 1, title: "Sleep Pattern Anomaly", desc: "Sleep duration is 34% lower than weekly average. Poor sleep quality detected for 3 consecutive nights.", highlight: true, icon: Moon, color: "text-brand-warning", bg: "bg-brand-warning/10" },
  { id: 2, title: "Elevated Stress Indicators", desc: "Resting heart rate and poor sleep suggest moderate stress. Stress level has remained elevated for 2 days.", highlight: true, icon: Activity, color: "text-brand-danger", bg: "bg-brand-danger/10" },
  { id: 3, title: "Activity lower than usual today", desc: "Patient's step count is 30% below the 7-day average. We recommend an evening walk to keep mobility active.", highlight: false, icon: Footprints, color: "text-brand-light", bg: "bg-brand-light/20" },
];

export function AIInsights() {
  const [expandedId, setExpandedId] = useState<number | null>(insights[0].id);

  return (
    <Card className="shadow-md bg-gradient-to-br from-[#F4FBFA] to-[#EAF7F6] border-[#67D6D8]/30">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-brand-dark">
           <Brain size={20} className="text-brand-light" />
           AI Smart Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-brand-border/50 transition-all hover:shadow-md cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
             <div className="flex gap-4">
               <div className={`mt-0.5 min-w-8 h-8 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                 <item.icon size={16} />
               </div>
               <div className="flex-1">
                 <div className="flex justify-between items-start">
                   <h4 className="text-[13px] font-bold text-brand-dark">{item.title}</h4>
                   <div className={`w-5 h-5 flex items-center justify-center rounded-full transition-colors ${expandedId === item.id ? 'bg-brand-mint text-brand-dark' : 'text-brand-muted hover:bg-brand-mint/50'}`}>
                     <ChevronDown size={14} className={`transition-transform duration-300 ${expandedId === item.id ? 'rotate-180' : ''}`} />
                   </div>
                 </div>
                 {item.highlight && expandedId !== item.id && <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wide text-brand-danger bg-brand-danger/10 px-2 py-0.5 rounded border border-brand-danger/20">Attention Required</span>}
                 <AnimatePresence>
                   {expandedId === item.id && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, marginTop: 8 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                       <p className="text-sm text-brand-muted leading-relaxed pb-1 border-l-2 border-brand-light pl-2 ml-1">{item.desc}</p>
                       {item.highlight && <span className="inline-block mt-3 text-[10px] uppercase font-bold tracking-wide text-brand-danger bg-brand-danger/10 px-2 py-0.5 rounded border border-brand-danger/20">Attention Required</span>}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
