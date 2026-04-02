import React from "react"
import { cn } from "../../lib/utils"

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[32px] border border-white/80 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(8,59,60,0.04)] hover:shadow-[0_20px_40px_rgb(8,59,60,0.08)] text-brand-text overflow-hidden transition-all duration-500 hover:-translate-y-1 relative ring-1 ring-brand-border/30", className)} {...props}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-transparent pointer-events-none rounded-[32px] z-0" />
      <div className="relative z-10 h-full flex flex-col">
        {children}
      </div>
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 p-8 pb-4", className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-xl font-extrabold tracking-tight text-brand-dark drop-shadow-sm", className)} {...props}>{children}</h3>
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-8 pt-2 flex-1 flex flex-col", className)} {...props}>{children}</div>
}
