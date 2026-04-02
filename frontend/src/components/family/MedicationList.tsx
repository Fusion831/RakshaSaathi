import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { medications } from '../../data/mockData';
import { CheckCircle2, Clock, XCircle, Pill } from 'lucide-react';

export function MedicationList() {
  return (
    <Card className="shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Today's Medications</CardTitle>
        <button className="text-brand-dark font-medium text-sm bg-brand-mint hover:bg-brand-light/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
           <Pill size={16} /> Manage Schedule
        </button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map(med => (
            <div key={med.id} className="p-4 rounded-xl border border-brand-border bg-white flex flex-col gap-3 relative transition-all hover:shadow-md hover:border-brand-mint/50 group overflow-hidden">
               {med.status === 'taken' && <div className="absolute top-0 right-0 w-full h-1 bg-brand-success shadow-[0_1px_4px_rgba(99,199,178,0.5)]"></div>}
               {med.status === 'missed' && <div className="absolute top-0 right-0 w-full h-1 bg-brand-danger shadow-[0_1px_4px_rgba(231,111,81,0.5)]"></div>}
               {med.status === 'pending' && <div className="absolute top-0 right-0 w-full h-1 bg-brand-muted/20"></div>}
               
               <div className="flex justify-between items-start mt-1">
                 <div>
                   <h4 className="font-bold text-brand-dark text-lg group-hover:text-brand-light transition-colors">{med.name}</h4>
                   <p className="text-[11px] mt-0.5 font-bold text-brand-muted uppercase tracking-widest">{med.dose}</p>
                 </div>
                 <div className="bg-brand-bg/80 border border-brand-border/50 px-2.5 py-1 rounded-md text-xs font-semibold text-brand-dark flex items-center gap-1.5 shadow-sm">
                   <Clock size={12} className={med.status === 'missed' ? 'text-brand-danger' : 'text-brand-dark'} /> {med.scheduledTime}
                 </div>
               </div>
               
               <div className="mt-2 flex items-center bg-brand-bg/50 p-2.5 -mx-4 -mb-4 border-t border-brand-border/30">
                 {med.status === 'taken' ? (
                   <span className="text-xs font-semibold text-brand-success flex items-center gap-1.5 ml-2">
                     <CheckCircle2 size={14} /> Confirmed {med.confirmationTime && `at ${med.confirmationTime}`}
                   </span>
                 ) : med.status === 'missed' ? (
                   <span className="text-xs font-semibold text-brand-danger flex items-center gap-1.5 ml-2">
                     <XCircle size={14} /> Missed
                   </span>
                 ) : (
                   <span className="text-xs font-medium text-brand-muted flex items-center gap-1.5 ml-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-brand-warning animate-pulse"></div>
                     Pending Confirmation
                   </span>
                 )}
               </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
