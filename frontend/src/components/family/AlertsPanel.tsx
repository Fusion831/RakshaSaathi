import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  time: string;
  status: 'new' | 'acknowledged' | 'resolved';
  state?: string;
}

export function AlertsPanel({ alerts = [] }: { alerts?: AlertItem[] }) {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(alerts.length > 0 ? alerts[0].id : null);

  const getIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <ShieldAlert size={20} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={20} className="text-yellow-500" />;
      default: return <Clock size={20} className="text-slate-400" />;
    }
  }

  const getBadgeVariant = (severity: string) => {
    if (severity === 'critical') return 'danger';
    if (severity === 'warning') return 'warning';
    return 'default';
  }

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <Card className="h-full flex flex-col shadow-lg border border-slate-200 relative z-40 bg-white">
      <CardHeader className="border-b border-slate-200 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
             Real-Time Alerts
             <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{filteredAlerts.length}</span>
          </CardTitle>
          <div className="flex gap-2">
             <button onClick={() => setFilter('all')} className={cn("text-xs px-2 py-1 flex-1 rounded", filter === 'all' ? "bg-slate-800 text-white" : "bg-teal-100 text-slate-800")}>All</button>
             <button onClick={() => setFilter('critical')} className={cn("text-xs px-2 py-1 rounded", filter === 'critical' ? "bg-red-500 text-white" : "bg-red-100 text-red-500")}>Crit</button>
             <button onClick={() => setFilter('warning')} className={cn("text-xs px-2 py-1 rounded", filter === 'warning' ? "bg-yellow-500 text-white" : "bg-yellow-100 text-yellow-600")}>Warn</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-[400px] flex-1">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No alerts at this time</p>
            <p className="text-sm mt-2">All systems operating normally</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            <AnimatePresence>
              {filteredAlerts.map(alert => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key={alert.id} 
                  className={cn(
                    "p-4 cursor-pointer hover:bg-slate-50 transition-colors block border-l-4",
                    alert.severity === 'critical' ? 'border-l-red-500 bg-red-50/30' : 'border-l-yellow-500 bg-yellow-50/20',
                    expandedId === alert.id ? 'bg-slate-100' : ''
                  )}
                  onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                >
                  <div className="flex gap-4 items-start">
                    <div className="mt-1">
                      {getIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-slate-800 text-sm">{alert.title} {alert.state && `(${alert.state})`}</h4>
                        <span className="text-xs text-slate-500 font-medium whitespace-nowrap ml-2">{alert.time}</span>
                      </div>
                      {expandedId === alert.id ? (
                        <motion.div 
                          initial={{ opacity: 0, marginTop: 0 }} 
                          animate={{ opacity: 1, marginTop: 8 }}
                        >
                          <p className="text-sm text-slate-600 leading-relaxed">{alert.description}</p>
                          <div className="mt-3 flex items-center justify-between">
                            <Badge variant={alert.status === 'new' ? 'danger' : 'success'}>{alert.status}</Badge>
                            {alert.status !== 'resolved' && (
                              <button 
                                className="text-xs font-semibold text-slate-800 bg-teal-100 hover:bg-teal-200 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                                onClick={(e) => { e.stopPropagation(); }}
                              >
                                <CheckCircle2 size={14} />
                                Acknowledge
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                         <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{alert.description}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
