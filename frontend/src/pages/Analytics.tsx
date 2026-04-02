import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList,
} from "recharts";
import PageLayout from "@/components/PageLayout";

const funnelData = [
  { name: "Applied", value: 1240, fill: "hsl(263 70% 66%)" },
  { name: "Screened", value: 860, fill: "hsl(263 70% 60%)" },
  { name: "Interviewed", value: 420, fill: "hsl(263 70% 54%)" },
  { name: "Offered", value: 180, fill: "hsl(263 77% 48%)" },
  { name: "Hired", value: 95, fill: "hsl(263 77% 42%)" },
];

const dropoffData = [
  { stage: "Applied→Screened", rate: 31 },
  { stage: "Screened→Interview", rate: 51 },
  { stage: "Interview→Offered", rate: 57 },
  { stage: "Offered→Hired", rate: 47 },
];

const timeToHireData = [
  { month: "Oct", days: 24 },
  { month: "Nov", days: 22 },
  { month: "Dec", days: 20 },
  { month: "Jan", days: 21 },
  { month: "Feb", days: 19 },
  { month: "Mar", days: 18 },
];

const applicationsData = [
  { week: "W1", count: 145 },
  { week: "W2", count: 198 },
  { week: "W3", count: 176 },
  { week: "W4", count: 220 },
  { week: "W5", count: 195 },
  { week: "W6", count: 248 },
  { week: "W7", count: 230 },
  { week: "W8", count: 267 },
];

const chartStyle = {
  borderRadius: 12,
  border: "1px solid hsl(220 13% 91%)",
  boxShadow: "var(--shadow-elevated)",
};

const Analytics = () => (
  <PageLayout>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
      <p className="text-muted-foreground mt-1">Hiring performance insights</p>
    </motion.div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Conversion Funnel</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" width={90} />
            <Tooltip contentStyle={chartStyle} />
            <Bar dataKey="value" fill="hsl(263 70% 66%)" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Drop-off Analysis</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dropoffData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis dataKey="stage" tick={{ fontSize: 11 }} stroke="hsl(220 9% 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" unit="%" />
            <Tooltip contentStyle={chartStyle} formatter={(v: number) => `${v}%`} />
            <Bar dataKey="rate" fill="hsl(0 84% 60%)" radius={[8, 8, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Time to Hire</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeToHireData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" unit="d" />
            <Tooltip contentStyle={chartStyle} />
            <Line type="monotone" dataKey="days" stroke="hsl(263 70% 66%)" strokeWidth={2.5} dot={{ fill: "hsl(263 70% 66%)", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground mb-4">Applications Over Time</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={applicationsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220 9% 46%)" />
            <Tooltip contentStyle={chartStyle} />
            <Bar dataKey="count" fill="hsl(263 70% 66%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  </PageLayout>
);

export default Analytics;
