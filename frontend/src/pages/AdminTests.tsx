import { useEffect, useMemo, useState } from "react";
import { createAdminTest, listAdminTests, listAdminTestSubmissions } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";

type AdminQuestion = {
  id: string;
  question: string;
  expected_keywords: string;
  max_points: number;
};

const emptyQuestion = (idx: number): AdminQuestion => ({
  id: `q${idx}`,
  question: "",
  expected_keywords: "",
  max_points: 10,
});

const AdminTests = () => {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tests, setTests] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<AdminQuestion[]>([emptyQuestion(1)]);

  const token = localStorage.getItem("token") || "";

  const loadData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [testsRes, submissionsRes] = await Promise.all([
        listAdminTests(token),
        listAdminTestSubmissions(token),
      ]);
      setTests(testsRes || []);
      setSubmissions(submissionsRes || []);
    } catch (error: any) {
      toast({ title: "Failed to load tests", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = useMemo(() => {
    return Boolean(
      title.trim() &&
      questions.length > 0 &&
      questions.every((q) => q.id.trim() && q.question.trim() && q.max_points > 0),
    );
  }, [title, questions]);

  const updateQuestion = (idx: number, patch: Partial<AdminQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion(prev.length + 1)]);
  };

  const removeQuestion = (idx: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!token || !canSubmit) return;

    try {
      setCreating(true);
      await createAdminTest(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
        questions: questions.map((q) => ({
          id: q.id.trim(),
          question: q.question.trim(),
          expected_keywords: q.expected_keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          max_points: Number(q.max_points || 10),
        })),
      });

      setTitle("");
      setDescription("");
      setDueAt("");
      setQuestions([emptyQuestion(1)]);
      await loadData();
      toast({ title: "Test created", description: "Candidates can now attempt this test." });
    } catch (error: any) {
      toast({ title: "Failed to create test", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <PageLayout>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-3xl font-bold text-foreground">Admin Tests</h1>
        <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-accent-foreground">
          {tests.length} tests · {submissions.length} submissions
        </span>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold text-foreground">Create Test</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Test title"
            className="rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
          />
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="mt-3 w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
          rows={3}
        />

        <div className="mt-4 space-y-3">
          {questions.map((q, idx) => (
            <div key={`${q.id}-${idx}`} className="rounded-xl border border-border bg-background p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <input
                  value={q.id}
                  onChange={(e) => updateQuestion(idx, { id: e.target.value })}
                  placeholder="Question id"
                  className="rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                />
                <input
                  value={q.max_points}
                  onChange={(e) => updateQuestion(idx, { max_points: Number(e.target.value || 0) })}
                  type="number"
                  min={1}
                  placeholder="Max points"
                  className="rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                />
                <input
                  value={q.expected_keywords}
                  onChange={(e) => updateQuestion(idx, { expected_keywords: e.target.value })}
                  placeholder="Keywords (comma separated)"
                  className="rounded-lg bg-muted px-3 py-2 text-sm outline-none md:col-span-2"
                />
              </div>
              <textarea
                value={q.question}
                onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                placeholder="Question text"
                className="mt-3 w-full rounded-lg bg-muted px-3 py-2 text-sm outline-none"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(idx)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={addQuestion} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted">
            Add Question
          </button>
          <button
            disabled={!canSubmit || creating}
            onClick={handleCreate}
            className="rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create Test"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-base font-semibold text-foreground">Published Tests</h3>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading tests...</p>
          ) : tests.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No tests created yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {tests.map((test) => (
                <div key={test.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="font-semibold text-foreground">{test.title}</p>
                  <p className="text-xs text-muted-foreground">Questions: {(test.questions || []).length}</p>
                  <p className="text-xs text-muted-foreground">Due: {test.due_at ? new Date(test.due_at).toLocaleString() : "No deadline"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h3 className="text-base font-semibold text-foreground">Latest Submissions</h3>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading submissions...</p>
          ) : submissions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {submissions.slice(0, 12).map((submission) => (
                <div key={submission.id} className="rounded-xl border border-border bg-background p-3">
                  <p className="font-semibold text-foreground">Test #{submission.test_id} · Candidate #{submission.candidate_id}</p>
                  <p className="text-xs text-muted-foreground">Score: {Math.round(submission.score || 0)}%</p>
                  <p className="text-xs text-muted-foreground">Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "-"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default AdminTests;
