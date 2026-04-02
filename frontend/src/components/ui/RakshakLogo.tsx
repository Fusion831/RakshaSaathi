import React from 'react';

export function RakshakLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="logoGrad" x1="285" y1="14" x2="374" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA07A" />
          <stop offset="100%" stopColor="#FF3366" />
        </linearGradient>
      </defs>
      
      {/* Triangle Outline */}
      <path 
        d="M 285 30 Q 285 20 293 25 L 365 60 Q 375 65 365 70 L 293 105 Q 285 110 285 100 Z" 
        stroke="url(#logoGrad)" 
        strokeWidth="10" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none" 
      />
      
      {/* RAKSHAK */}
      <text x="10" y="82" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="56" fill="currentColor">
        RAKSHAK
      </text>
      
      {/* AI */}
      <text x="298" y="82" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="56" fill="currentColor">
        AI
      </text>
    </svg>
  );
}
