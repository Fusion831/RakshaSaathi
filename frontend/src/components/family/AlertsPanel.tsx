import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { alerts } from '../../data/mockData';
import { Badge } from '../ui/Badge';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function AlertsPanel() {
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(alerts[0].id);

  const getIcon = (severity: string) => {
    switch(severity) {
      case 'critical': return <ShieldAlert size={20} className="text-brand-danger" />;
      case 'warning': return <AlertTriangle size={20} className="text-brand-warning" />;
      default: return <Clock size={20} className="text-brand-muted" />;
    }
  }

  const getBadgeVariant = (severity: string) => {
    if (severity === 'critical') return 'danger';
    if (severity === 'warning') return 'warning';
    return 'default';
  }

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <Card className="h-full flex flex-col shadow-md">
      <CardHeader className="border-b border-brand-border/50 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
             Real-Time Alerts
             <span className="bg-brand-danger text-white text-xs px-2 py-0.5 rounded-full">{alerts.length}</span>
          </CardTitle>
          <div className="flex gap-2">
             <button onClick={() => setFilter('all')} className={cn("text-xs px-2 py-1 flex-1 rounded", filter === 'all' ? "bg-brand-dark text-white" : "bg-brand-mint text-brand-dark")}>All</button>
             <button onClick={() => setFilter('critical')} className={cn("text-xs px-2 py-1 rounded", filter === 'critical' ? "bg-brand-danger text-white" : "bg-brand-danger/10 text-brand-danger")}>Crit</button>
             <button onClick={() => setFilter('warning')} className={cn("text-xs px-2 py-1 rounded", filter === 'warning' ? "bg-brand-warning text-white" : "bg-brand-warning/10 text-brand-warning")}>Warn</button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto max-h-[400px]">
        <div className="divide-y divide-brand-border/50">
          <AnimatePresence>
            {filteredAlerts.map(alert => (
              <motion.div 
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                key={alert.id} 
                className={cn(
                  "p-4 cursor-pointer hover:bg-brand-mint/20 transition-colors block border-l-4",
                  alert.severity === 'critical' ? 'border-l-brand-danger' : 'border-l-brand-warning',
                  expandedId === alert.id ? 'bg-brand-mint/10' : ''
                )}
                onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
              >
                <div className="flex gap-4 items-start">
                  <div className="mt-1">
                    {getIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-brand-dark text-sm">{alert.title}</h4>
                      <span className="text-xs text-brand-muted font-medium whitespace-nowrap ml-2">{alert.time}</span>
                    </div>
                    {expandedId === alert.id ? (
                      <motion.div 
                        initial={{ opacity: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, marginTop: 8 }}
                      >
                        <p className="text-sm text-brand-muted leading-relaxed">{alert.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <Badge variant={alert.status === 'new' ? 'danger' : 'success'}>{alert.status}</Badge>
                          {alert.status !== 'resolved' && (
                            <button 
                              className="text-xs font-semibold text-brand-dark bg-brand-light/20 hover:bg-brand-light/40 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                              onClick={(e) => { e.stopPropagation(); alert.status = 'acknowledged'; }}
                            >
                              <CheckCircle2 size={14} />
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                       <p className="text-xs text-brand-muted line-clamp-1 mt-0.5">{alert.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}
