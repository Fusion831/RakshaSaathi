import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Alert {
  id: string;
  type: string;
  severity: string;
  state: string;
  timestamp: string;
  description?: string;
  user_id: string;
}

interface AlertHistoryProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AlertHistory({ userId, isOpen, onClose }: AlertHistoryProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, userId]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/alerts/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStateIcon = (state: string) => {
    if (state === 'RESOLVED') {
      return <CheckCircle size={18} className="text-green-500" />;
    }
    return <AlertCircle size={18} className="text-orange-500" />;
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:w-2/5 h-screen bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#083B3C] to-[#0d5c5e] text-white p-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Alert History</h2>
                <p className="text-gray-200 text-sm mt-1">User: {userId}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin">
                    <Clock size={32} className="text-[#083B3C]" />
                  </div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No alerts recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border-2 rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start justifying between gap-3">
                        <div className="mt-1">{getStateIcon(alert.state)}</div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {alert.type === 'FALL_DETECTED' && '🚨 Fall Detected'}
                                {alert.type === 'ANOMALY_DETECTED' && '⚠️ Anomaly Alert'}
                                {alert.type === 'SOS_TRIGGERED' && '🆘 SOS Emergency'}
                              </h3>
                              <p className="text-sm opacity-75">
                                State: <span className="font-mono">{alert.state}</span>
                              </p>
                            </div>
                            <span className="text-xs font-medium bg-white bg-opacity-30 px-3 py-1 rounded-full">
                              {formatTime(alert.timestamp)}
                            </span>
                          </div>
                          {alert.description && (
                            <p className="text-sm mt-2 opacity-90">{alert.description}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4">
              <button
                onClick={fetchAlerts}
                className="w-full bg-[#083B3C] text-white py-2 rounded-lg font-semibold hover:bg-[#0d5c5e] transition"
              >
                Refresh History
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
