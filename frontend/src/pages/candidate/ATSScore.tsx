import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import PageLayout from "@/components/PageLayout";

const ATSScore = () => {
  const { user, jobs } = useStore();
  const userSkills = user.skills || [];

  const jobScores = jobs
    .filter((j) => j.status === "Active")
    .map((job) => {
      const matchedSkills = userSkills.filter((s) =>
        job.required_skills.some((rs) => rs.toLowerCase() === s.toLowerCase())
      );
      const score = Math.round((matchedSkills.length / Math.max(job.required_skills.length, 1)) * 100);
      return { job, matchedSkills, missingSkills: job.required_skills.filter((rs) => !userSkills.some((s) => s.toLowerCase() === rs.toLowerCase())), score };
    })
    .sort((a, b) => b.score - a.score);

  const avgScore = jobScores.length > 0 ? Math.round(jobScores.reduce((sum, j) => sum + j.score, 0) / jobScores.length) : 0;

  return (
    <PageLayout>
      <h1 className="text-3xl font-bold text-foreground">ATS Score</h1>
      <p className="text-muted-foreground mt-1">See how your profile matches against open positions</p>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 bg-card rounded-2xl border border-border p-8 shadow-card text-center">
        <div className="w-32 h-32 rounded-full border-4 border-primary mx-auto flex items-center justify-center">
          <div>
            <p className="text-4xl font-bold text-foreground">{avgScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Match</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Based on your skills: {userSkills.join(", ") || "No skills added"}</p>
      </motion.div>

      <div className="mt-8 space-y-4">
        {jobScores.map((item, i) => (
          <motion.div key={item.job.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-2xl border border-border p-6 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{item.job.title}</h3>
                <p className="text-sm text-muted-foreground">{item.job.department} · {item.job.location}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-sm font-bold ${item.score >= 70 ? "bg-emerald-50 text-emerald-600" : item.score >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                {item.score}%
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${item.score}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full gradient-primary rounded-full" />
              </div>
            </div>
            <div className="mt-3 flex gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-1">Matched</p>
                <div className="flex flex-wrap gap-1">
                  {item.matchedSkills.map((s) => <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs">{s}</span>)}
                  {item.matchedSkills.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1">Missing</p>
                <div className="flex flex-wrap gap-1">
                  {item.missingSkills.map((s) => <span key={s} className="px-2 py-0.5 bg-red-50 text-red-500 rounded-lg text-xs">{s}</span>)}
                  {item.missingSkills.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </PageLayout>
  );
};

export default ATSScore;
