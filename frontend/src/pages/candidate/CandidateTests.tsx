import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import { listCandidateTests, submitCandidateTest } from "@/services/api";
import { toast } from "@/hooks/use-toast";

type CandidateTest = {
  id: number;
  title: string;
  description?: string;
  due_at?: string;
  questions: Array<{ id: string; question: string; expected_keywords?: string[]; max_points?: number }>;
  already_submitted: boolean;
  last_score?: number;
};

const CandidateTests = () => {
  const [tests, setTests] = useState<CandidateTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTestId, setActiveTestId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const token = localStorage.getItem("token") || "";

  const loadTests = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await listCandidateTests(token);
      setTests(data || []);
      if (!activeTestId && data.length > 0) {
        setActiveTestId(data[0].id);
      }
    } catch (error: any) {
      toast({ title: "Failed to load tests", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeTest = useMemo(() => tests.find((t) => t.id === activeTestId) || null, [tests, activeTestId]);

  const canSubmit = useMemo(() => {
    if (!activeTest || activeTest.already_submitted) return false;
    return activeTest.questions.every((q) => (answers[q.id] || "").trim().length > 0);
  }, [activeTest, answers]);

  const handleSubmit = async () => {
    if (!token || !activeTest || !canSubmit) return;

    try {
      setSubmitting(true);
      const payload: Record<string, string> = {};
      activeTest.questions.forEach((q) => {
        payload[q.id] = answers[q.id] || "";
      });

      const result = await submitCandidateTest(token, activeTest.id, payload);
      toast({
        title: "Test submitted",
        description: `Score: ${Math.round(result.score || 0)}%`,
      });

      setAnswers({});
      await loadTests();
    } catch (error: any) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">Candidate Tests</h1>
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-accent-foreground">{tests.length} available</span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold text-foreground">Available Tests</h2>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading tests...</p>
          ) : tests.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No tests available right now.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {tests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => setActiveTestId(test.id)}
                  className={`w-full rounded-xl border p-3 text-left ${activeTestId === test.id ? "border-violet-300 bg-violet-50" : "border-border bg-background"}`}
                >
                  <p className="font-semibold text-foreground">{test.title}</p>
                  <p className="text-xs text-muted-foreground">Questions: {(test.questions || []).length}</p>
                  <p className="text-xs text-muted-foreground">Due: {test.due_at ? new Date(test.due_at).toLocaleString() : "No deadline"}</p>
                  {test.already_submitted && (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">Submitted · Last score {Math.round(test.last_score || 0)}%</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          {!activeTest ? (
            <p className="text-sm text-muted-foreground">Select a test to begin.</p>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">{activeTest.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activeTest.description || "Answer all questions carefully before submitting."}</p>

              <div className="mt-4 space-y-4">
                {activeTest.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm font-semibold text-foreground">Q{idx + 1}. {q.question}</p>
                    <textarea
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      disabled={activeTest.already_submitted}
                      rows={4}
                      className="mt-3 w-full rounded-xl bg-muted px-3 py-2 text-sm outline-none disabled:opacity-60"
                      placeholder="Type your answer"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  disabled={!canSubmit || submitting}
                  onClick={handleSubmit}
                  className="rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {activeTest.already_submitted ? "Already Submitted" : submitting ? "Submitting..." : "Submit Test"}
                </button>
                {activeTest.already_submitted && <span className="text-xs text-emerald-700 font-semibold">Your latest score: {Math.round(activeTest.last_score || 0)}%</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default CandidateTests;
