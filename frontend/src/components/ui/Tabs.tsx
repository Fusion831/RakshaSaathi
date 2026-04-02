import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface TabsProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex p-1.5 space-x-2 bg-white/70 backdrop-blur-xl border border-[#D9ECE9]/80 shadow-[0_4px_25px_rgba(8,59,60,0.06)] rounded-[1.25rem] w-max overflow-x-auto max-w-full">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={cn(
              "relative px-8 py-3.5 text-[12px] font-black uppercase tracking-[0.15em] rounded-xl transition-all duration-300 outline-none select-none",
              isActive ? "text-[#083B3C]" : "text-[#7D908C] hover:text-[#083B3C]/80 hover:bg-[#F4FBFA]/50"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_4px_20px_rgba(8,59,60,0.08)] border border-[#D9ECE9]/60"
                initial={false}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{tab}</span>
          </button>
        );
      })}
    </div>
  );
}
