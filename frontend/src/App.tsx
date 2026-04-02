import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { DashboardLayout } from './components/layout/DashboardLayout';
import FamilyDashboard from './pages/FamilyDashboard';
import FamilyTrends from './pages/FamilyTrends';
import DoctorDashboard from './pages/DoctorDashboard';
import { LoadingScreen } from './components/ui/LoadingScreen';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial system sync and load for the premium feel
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2800); // 2.8 seconds feels long enough to read but short enough to wait
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>
      
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/family/dashboard" replace />} />
          
          <Route path="/family/dashboard" element={<DashboardLayout><FamilyDashboard /></DashboardLayout>} />
          <Route path="/family/trends" element={<DashboardLayout><FamilyTrends /></DashboardLayout>} />
          <Route path="/family/*" element={<DashboardLayout><FamilyDashboard /></DashboardLayout>} />

          <Route path="/doctor/dashboard" element={<DashboardLayout><DoctorDashboard /></DashboardLayout>} />
          <Route path="/doctor/*" element={<DashboardLayout><DoctorDashboard /></DashboardLayout>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App;
