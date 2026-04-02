import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const loadingStatuses = [
  { main: "Initializing System", sub: "Establishing secure health-network connection" },
  { main: "Syncing Signals", sub: "Calibrating telemetry and vital sensors" },
  { main: "Analyzing Data", sub: "Running predictive healthcare models" },
  { main: "Environment Ready", sub: "Decrypting patient metrics" }
];

export function LoadingScreen() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < loadingStatuses.length - 1) {
        i++;
        setIndex(i);
      }
    }, 700); 
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(20px)", transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] } }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#020A0A]"
    >
      {/* Cinematic Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#083B3C]/90 via-[#031111] to-[#010808] pointer-events-none"></div>
      
      {/* Dynamic Radial Lighting & Glow (Softened and broader) */}
      <motion.div 
        animate={{ opacity: [0.1, 0.2, 0.1], scale: [1, 1.05, 1] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute w-[1000px] h-[1000px] bg-[#67D6D8] rounded-full blur-[200px] pointer-events-none" 
      />
      <motion.div 
        animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.1, 1] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
        className="absolute w-[800px] h-[800px] bg-[#E76F51] rounded-full blur-[150px] pointer-events-none translate-y-32" 
      />

      {/* Main Center Composition - Massive, Visible, Stacked Lockup */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-[800px] px-8 mb-4 mt-[-40px]">
        
        {/* Animated Symbol & Scan Rings */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          
          {/* Smooth Expanding Radar / Scan Rings */}
          {[...Array(3)].map((_, i) => (
             <motion.div 
               key={i}
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: [0.5, 1.8], opacity: [0, 0.35, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeOut", delay: i * 1.33 }}
               className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(103,214,216,0.1)] pointer-events-none origin-center"
               style={{ border: `1px ${i % 2 === 0 ? 'solid' : 'dashed'} rgba(103, 214, 216, 0.25)` }}
             />
          ))}

          {/* The Independent Triangular Symbol Container */}
          <motion.div 
            initial={{ scale: 0.85, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-28 h-28 flex items-center justify-center relative z-20 overflow-visible"
          >
            {/* The Rakshak AI Triangular Polygon Isolated */}
            <svg viewBox="0 0 110 130" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_25px_rgba(231,111,81,0.6)]">
               <defs>
                 <linearGradient id="symGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                   <stop offset="0%" stopColor="#FFA07A" />
                   <stop offset="100%" stopColor="#FF3366" />
                 </linearGradient>
               </defs>
               <motion.path 
                 d="M 10 30 Q 10 20 18 25 L 90 60 Q 100 65 90 70 L 18 105 Q 10 110 10 100 Z" 
                 stroke="url(#symGrad)" 
                 strokeWidth="10" 
                 strokeLinecap="round" 
                 strokeLinejoin="round" 
                 fill="none" 
                 initial={{ pathLength: 0, opacity: 0 }}
                 animate={{ pathLength: 1, opacity: 1 }}
                 transition={{ duration: 2, ease: "easeInOut" }}
               />
            </svg>
            <motion.div 
               animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3] }}
               transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
               className="absolute inset-0 bg-[#E76F51]/20 blur-[25px] rounded-full z-[-1] pointer-events-none"
            ></motion.div>
          </motion.div>
        </div>

        {/* Massive White Wordmark Layer */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 flex flex-col items-center drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-30"
        >
          <h1 className="text-[3.5rem] tracking-tight leading-none font-black flex items-center gap-4">
             <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">RAKSHAK</span>
             <span className="text-[#67D6D8] drop-shadow-[0_0_20px_rgba(103,214,216,0.6)]">AI</span>
          </h1>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.4em] text-[#EAF7F6] opacity-80 mt-4 text-center">
            Advanced Health Intelligence
          </p>
        </motion.div>
      </div>

      {/* Embedded Continuous ECG Line passing behind everything */}
      <svg viewBox="0 0 1000 100" className="absolute top-[48%] -translate-y-1/2 w-[200%] left-[-50%] opacity-20 pointer-events-none fill-none stroke-[#E76F51] stroke-[2px] z-0">
         <motion.path 
           d="M 0 50 L 200 50 L 220 30 L 240 80 L 260 40 L 300 50 L 450 50 L 470 20 L 490 90 L 510 50 L 650 50 L 670 40 L 690 70 L 710 50 L 850 50 L 870 20 L 890 90 L 910 50 L 1000 50" 
           initial={{ x: 0 }}
           animate={{ x: "-500px" }}
           transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
           strokeLinecap="round"
           strokeLinejoin="round"
         />
      </svg>

      {/* Dynamic Status Text */}
      <div className="flex flex-col items-center w-full min-h-[90px] relative mt-16 mb-6 z-20">
        <AnimatePresence mode="wait">
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex flex-col items-center justify-start"
          >
            <h2 className="text-[#EAF7F6] text-xl sm:text-[22px] leading-tight font-black uppercase tracking-[0.2em] drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] mb-2.5 text-center">
              {loadingStatuses[index].main}
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full border border-[#E76F51] flex items-center justify-center shadow-sm">
                <span className="w-1 h-1 bg-[#E76F51] rounded-full animate-ping"></span>
              </span>
              <p className="text-[#67D6D8] font-black tracking-[0.2em] text-[11px] sm:text-[12px] uppercase opacity-90 text-center">
                {loadingStatuses[index].sub}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sleek Segmented Progress Indicator */}
      <div className="w-full max-w-[450px] flex items-center gap-1.5 px-8 z-20">
         {[...Array(4)].map((_, i) => (
           <div key={i} className="h-1 flex-1 bg-[#EAF7F6]/10 rounded-full overflow-hidden border border-[#EAF7F6]/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] relative">
             <motion.div 
               initial={{ width: "0%" }}
               animate={{ width: index >= i ? "100%" : "0%" }}
               transition={{ duration: 0.8, ease: "easeInOut" }}
               className={`absolute inset-y-0 left-0 ${i === 3 ? 'bg-gradient-to-r from-[#67D6D8] to-white shadow-[0_0_12px_rgba(255,255,255,0.8)]' : 'bg-[#67D6D8] shadow-[0_0_8px_rgba(103,214,216,0.6)]'}`}
             />
           </div>
         ))}
      </div>
    </motion.div>
  )
}
