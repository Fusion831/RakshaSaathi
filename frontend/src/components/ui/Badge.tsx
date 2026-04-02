import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'caution' | 'outline';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: "bg-brand-mint/80 text-brand-dark shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] border border-brand-light/30",
    success: "bg-brand-success/10 text-[#1D746A] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] border border-brand-success/30",
    warning: "bg-brand-warning/10 text-[#B05C12] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] border border-brand-warning/30",
    danger: "bg-brand-danger/10 text-[#B5351E] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] border border-brand-danger/30",
    caution: "bg-brand-caution/10 text-[#9A7D0A] shadow-[inset_0_1px_2px_rgba(255,255,255,0.9)] border border-brand-caution/40",
    outline: "bg-white border border-brand-border text-brand-muted shadow-sm",
  }
  
  return (
    <div className={cn("inline-flex items-center rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider backdrop-blur-sm transition-all duration-300", variants[variant], className)} {...props}>
      {children}
    </div>
  )
}
