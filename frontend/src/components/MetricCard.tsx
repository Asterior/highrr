import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  index?: number;
}

const MetricCard = ({ title, value, change, icon: Icon, index = 0 }: MetricCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="bg-card rounded-2xl border border-border p-6 shadow-card hover-lift"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-body text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold text-heading text-foreground mt-1">{value}</p>
        {change && (
          <p className="text-sm text-primary font-medium mt-1">{change}</p>
        )}
      </div>
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
        <Icon className="w-5 h-5 text-accent-foreground" />
      </div>
    </div>
  </motion.div>
);

export default MetricCard;
