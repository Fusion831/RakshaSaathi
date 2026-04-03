import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnomalyData {
  type: string;
  metric: string;
  severity: string;
  message: string;
  patient: string;
  time: string;
  description: string;
}

interface AnomalyModalProps {
  alert: AnomalyData | null;
  onClose: () => void;
}

export function AnomalyModal({ alert, onClose }: AnomalyModalProps) {
  if (!alert) return null;

  const severityColor = alert.severity === "HIGH" ? "yellow" : alert.severity === "MEDIUM" ? "amber" : "blue";
  const severityBg = alert.severity === "HIGH" ? "bg-yellow-50" : alert.severity === "MEDIUM" ? "bg-amber-50" : "bg-blue-50";
  const severityBorder = alert.severity === "HIGH" ? "border-yellow-300" : alert.severity === "MEDIUM" ? "border-amber-300" : "border-blue-300";
  const severityText = alert.severity === "HIGH" ? "text-yellow-700" : alert.severity === "MEDIUM" ? "text-amber-700" : "text-blue-700";
  const severityIcon = alert.severity === "HIGH" ? "text-yellow-600" : alert.severity === "MEDIUM" ? "text-amber-600" : "text-blue-600";

  return (
    <AnimatePresence>
      {alert && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
          
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-yellow-300"
          >
            {/* Header with severity color */}
            <div className={`${severityBg} ${severityBorder} border-b-2 px-8 py-6`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${severityBg} border-2 ${severityBorder}`}>
                  {alert.severity === "HIGH" ? (
                    <AlertTriangle className={`${severityIcon}`} size={24} />
                  ) : (
                    <AlertCircle className={`${severityIcon}`} size={24} />
                  )}
                </div>
                <div>
                  <h2 className={`text-xl font-bold ${severityText}`}>{alert.type}</h2>
                  <p className="text-sm text-slate-600">{alert.patient} • {alert.time}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">
              {/* Metric being monitored */}
              <div className={`p-4 rounded-lg ${severityBg} border-2 ${severityBorder}`}>
                <p className={`text-sm font-bold ${severityText} uppercase tracking-widest`}>Metric Affected</p>
                <p className="text-2xl font-bold text-slate-800 mt-1 capitalize">{alert.metric.replace(/_/g, ' ')}</p>
              </div>

              {/* Severity badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">Severity Level</span>
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-widest ${
                  alert.severity === "HIGH" 
                    ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300" 
                    : alert.severity === "MEDIUM"
                    ? "bg-amber-100 text-amber-800 border-2 border-amber-300"
                    : "bg-blue-100 text-blue-800 border-2 border-blue-300"
                }`}>
                  {alert.severity}
                </span>
              </div>

              {/* Message/Description */}
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">Details</p>
                <p className="text-slate-700 leading-relaxed text-sm">{alert.message}</p>
              </div>

              {/* Action required */}
              <div className="pt-2 border-t-2 border-slate-200">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Recommended Action</p>
                <p className="text-sm text-slate-600">Monitor the patient's {alert.metric.replace(/_/g, ' ')} closely. If condition persists, consider medical review.</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 px-8 py-4 bg-slate-50 border-t-2 border-slate-200">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest text-white bg-slate-800 hover:bg-slate-900 transition-colors"
              >
                <CheckCircle2 size={16} />
                Acknowledge
              </button>
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest text-slate-800 border-2 border-slate-300 hover:bg-slate-100 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
