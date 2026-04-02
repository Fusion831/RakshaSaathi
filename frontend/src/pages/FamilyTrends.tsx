import { motion } from 'framer-motion';
import { patientData } from '../data/mockData';
import { TrendsSection } from '../components/family/TrendsSection';

export default function FamilyTrends() {
  const container: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item: any = {
    hidden: { opacity: 0, scale: 0.96, y: 30 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10 pb-10">
      <motion.div variants={item} className="mb-6">
        <h1 className="text-[2.5rem] font-extrabold text-[#083B3C] tracking-tight drop-shadow-sm">Activity Trends</h1>
        <p className="text-[#083B3C]/70 font-semibold tracking-wide mt-2 text-lg">Deep dive into <span className="font-bold text-[#083B3C]">{patientData.name}'s</span> historical vitals and patterns.</p>
      </motion.div>

      <motion.div variants={item} className="w-full mt-4">
        <TrendsSection />
      </motion.div>
    </motion.div>
  )
}
