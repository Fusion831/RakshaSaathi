import type { ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, Stethoscope, Bell, Settings, LogOut, ChevronRight, TrendingUp } from "lucide-react"
import { cn } from "../../lib/utils"
import { RakshakLogo } from "../ui/RakshakLogo"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const isDoctor = location.pathname.includes('/doctor');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const navItems = isDoctor ? [
    { icon: Stethoscope, label: "Patients Overview", href: "/doctor/dashboard" },
    { icon: Bell, label: "Clinical Alerts", href: "/doctor/alerts" },
    { icon: Settings, label: "System Settings", href: "/doctor/settings" },
  ] : [
    { icon: Home, label: "Daily Overview", href: "/family/dashboard" },
    { icon: TrendingUp, label: "Activity Trends", href: "/family/trends" },
    { icon: Bell, label: "Monitoring Alerts", href: "/family/alerts" },
    { icon: Settings, label: "Care Settings", href: "/family/settings" },
  ];

  return (
    <div className="min-h-screen bg-[#F4FBFA] font-sans selection:bg-[#67D6D8]/30 flex">
      
      {/* Sidebar Focus Layer */}
      <aside className="w-[300px] h-screen sticky top-0 bg-gradient-to-b from-[#083B3C] to-[#041D1D] flex flex-col text-white shadow-[10px_0_40px_rgba(8,59,60,0.15)] relative z-40 border-r border-[#67D6D8]/10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-64 bg-[#67D6D8]/5 rounded-full blur-[80px] pointer-events-none -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#F4A261]/5 rounded-full blur-[80px] pointer-events-none translate-y-1/2 translate-x-1/3"></div>

        <div className="p-8 pb-4 relative z-10 mt-2">
          <div className="w-56 text-white/95 mb-5 hover:scale-[1.02] transition-transform origin-left">
             <RakshakLogo className="w-full h-auto drop-shadow-xl" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[#67D6D8] text-[10.5px] font-black uppercase tracking-[0.25em] bg-[#67D6D8]/10 px-3.5 py-1.5 rounded-md border border-[#67D6D8]/20 shadow-inner">
              {isDoctor ? "Clinical Portal" : "Family Portal"}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-6 py-8 space-y-3 relative z-10 w-full overflow-y-auto">
          <p className="text-[10.5px] font-bold text-white/30 uppercase tracking-[0.2em] pl-4 mb-5">Main Menu</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "relative flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 overflow-hidden group",
                  isActive 
                    ? "text-[#083B3C] shadow-xl" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-nav" 
                    className="absolute inset-0 bg-gradient-to-r from-[#EAF7F6] to-white border border-white/50" 
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="flex items-center gap-3.5">
                    <item.icon size={22} className={cn("transition-transform duration-500", isActive ? "scale-[1.15] drop-shadow-sm text-[#083B3C]" : "group-hover:scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn("text-[15px]", isActive ? "font-extrabold tracking-tight" : "font-semibold tracking-wide")}>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={18} className="text-[#083B3C]/40 stroke-[3]" />}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-8 relative z-10 pb-10">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#67D6D8] to-[#EAF7F6] text-[#083B3C] flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(103,214,216,0.3)] group-hover:scale-105 transition-transform">
              {isDoctor ? "Dr" : "RS"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[15px] font-bold truncate text-white leading-tight">{isDoctor ? "Dr. Sharma" : "Rahul Singh"}</p>
              <p className="text-[12px] text-white/50 truncate font-semibold tracking-wide opacity-90">{isDoctor ? "Cardiologist" : "Primary Contact"}</p>
            </div>
          </div>
          <button className="w-full mt-6 flex items-center justify-center gap-2.5 text-[11px] font-extrabold uppercase tracking-widest text-white/40 hover:text-[#F4A261] transition-colors py-3.5 rounded-xl hover:bg-[#F4A261]/10">
            <LogOut size={16} strokeWidth={2.5} />
            Secure Sign Out
          </button>
        </div>
      </aside>

      {/* Main App Content Layer */}
      <main className="flex-1 w-full flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-blend-soft-light min-h-screen">
        
        {/* Enriched Global Topbar */}
        <header className="bg-white/60 backdrop-blur-2xl h-28 flex items-center justify-between px-12 sticky top-0 z-30 border-b border-[#D9ECE9]/60 shadow-[0_10px_40px_rgba(8,59,60,0.03)] supports-[backdrop-filter]:bg-white/40">
          
          <div className="flex flex-col gap-1">
             <h2 className="text-[2rem] font-black text-[#083B3C] capitalize tracking-tight drop-shadow-sm leading-none">
               Rakshak AI
             </h2>
             <div className="flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#7D908C] mt-2">
               <span>{time.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-[#D9ECE9]"></span>
               <span className="text-[#67D6D8] font-black drop-shadow-sm">{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
             </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center text-[11px] font-bold text-[#7D908C] bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-[#D9ECE9] shadow-sm uppercase tracking-widest">
               <span className="opacity-70">Secured Node:</span>
               <span className="w-2.5 h-2.5 ml-3 mr-4 bg-[#63C7B2] rounded-full shadow-[0_0_10px_rgba(99,199,178,0.8)] animate-pulse border border-[#EAF7F6]"></span>
               <div className="flex gap-1.5 bg-[#F4FBFA] p-1.5 rounded-full border border-[#D9ECE9]/50 shadow-inner ml-2">
                 <Link to="/family/dashboard" className={cn("px-6 py-2 rounded-full transition-all duration-300", !isDoctor ? "bg-gradient-to-r from-[#083B3C] to-[#041D1D] text-white shadow-lg font-black" : "hover:text-[#083B3C] font-bold")}>Family</Link>
                 <Link to="/doctor/dashboard" className={cn("px-6 py-2 rounded-full transition-all duration-300", isDoctor ? "bg-gradient-to-r from-[#083B3C] to-[#041D1D] text-white shadow-lg font-black" : "hover:text-[#083B3C] font-bold")}>Doctor</Link>
               </div>
            </div>
            
            <button className="relative w-14 h-14 flex items-center justify-center bg-white/80 backdrop-blur-md border border-[#D9ECE9] rounded-full text-[#083B3C] hover:bg-white shadow-sm hover:shadow-xl transition-all duration-500 group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-[#67D6D8]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
               <Bell size={24} className="group-hover:rotate-12 transition-transform duration-500 group-hover:scale-110" strokeWidth={2.2} />
               <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#E76F51] shadow-[0_0_12px_rgba(231,111,81,0.9)] border-2 border-white flex items-center justify-center text-[9px] font-black text-white px-0.5">2</span>
            </button>
          </div>
        </header>

        <div className="p-10 pb-20 max-w-[1600px] mx-auto w-full flex-1 relative z-20">
          {children}
        </div>
      </main>
    </div>
  )
}
