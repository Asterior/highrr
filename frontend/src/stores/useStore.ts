import { create } from "zustand";
import { Job, Application, Interview, Conversation, CurrentUser, Message, isValidTransition, PipelineStatus, UserRole } from "@/data/types";
import { mockJobs, mockApplications, mockInterviews, mockConversations, currentUser, mockUsers } from "@/data/mockData";

interface AppState {
  user: CurrentUser;
  isAuthenticated: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;
  updateProfile: (data: Partial<CurrentUser>) => void;

  jobs: Job[];
  addJob: (job: Omit<Job, "id" | "created_at" | "application_count" | "created_by">) => void;
  updateJob: (id: string, data: Partial<Job>) => void;
  deleteJob: (id: string) => void;

  applications: Application[];
  updateApplicationStatus: (id: string, status: PipelineStatus) => boolean;
  updateApplication: (id: string, data: Partial<Application>) => void;
  applyToJob: (jobId: string) => boolean;
  bulkUpdateStatus: (ids: string[], status: PipelineStatus) => number;

  interviews: Interview[];
  addInterview: (interview: Omit<Interview, "id">) => void;
  updateInterview: (id: string, data: Partial<Interview>) => void;
  deleteInterview: (id: string) => void;

  conversations: Conversation[];
  sendMessage: (conversationId: string, text: string) => void;

  isLoading: boolean;
  setLoading: (v: boolean) => void;
}

let idCounter = 100;
const genId = (prefix: string) => `${prefix}-${++idCounter}`;

export const useStore = create<AppState>((set, get) => ({
  user: currentUser,
  isAuthenticated: false,

  login: (user: CurrentUser) => {
    set({ isAuthenticated: true, user });
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ isAuthenticated: false, user: currentUser });
  },

  updateProfile: (data) => set((s) => ({ user: { ...s.user, ...data } })),

  jobs: mockJobs,
  addJob: (job) => {
    const newJob: Job = {
      ...job,
      id: genId("job"),
      created_at: new Date().toISOString(),
      application_count: 0,
      created_by: get().user.id,
    };
    set((s) => ({ jobs: [newJob, ...s.jobs] }));
  },
  updateJob: (id, data) =>
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)) })),
  deleteJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

  applications: mockApplications,
  updateApplicationStatus: (id, status) => {
    const app = get().applications.find((a) => a.id === id);
    if (!app) return false;
    if (!isValidTransition(app.status, status)) return false;
    set((s) => ({
      applications: s.applications.map((a) =>
        a.id === id
          ? {
              ...a,
              status,
              status_history: [...(a.status_history || []), { status, date: new Date().toISOString().split("T")[0] }],
            }
          : a
      ),
    }));
    return true;
  },
  updateApplication: (id, data) =>
    set((s) => ({ applications: s.applications.map((a) => (a.id === id ? { ...a, ...data } : a)) })),

  applyToJob: (jobId) => {
    const user = get().user;
    const existing = get().applications.find((a) => a.user_id === user.id && a.job_id === jobId);
    if (existing) return false;
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return false;
    const skillMatch = user.skills
      ? Math.round((user.skills.filter((s) => job.required_skills.some((rs) => rs.toLowerCase() === s.toLowerCase())).length / Math.max(job.required_skills.length, 1)) * 100)
      : Math.floor(Math.random() * 30) + 60;
    const newApp: Application = {
      id: genId("app"),
      user_id: user.id,
      job_id: jobId,
      candidate_name: user.name,
      candidate_email: user.email,
      status: "applied",
      score: Math.min(skillMatch + Math.floor(Math.random() * 10), 100),
      assigned_to: null,
      notes: null,
      applied_at: new Date().toISOString(),
      skills: user.skills || [],
      experience_years: user.experience_years || 0,
      avatar: user.avatar,
      role: job.title,
      location: "",
      phone: user.phone,
      cgpa: user.cgpa,
      status_history: [{ status: "applied", date: new Date().toISOString().split("T")[0] }],
    };
    set((s) => ({
      applications: [...s.applications, newApp],
      jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, application_count: j.application_count + 1 } : j)),
    }));
    return true;
  },

  bulkUpdateStatus: (ids, status) => {
    let count = 0;
    const apps = get().applications;
    const updated = apps.map((a) => {
      if (ids.includes(a.id) && isValidTransition(a.status, status)) {
        count++;
        return {
          ...a,
          status,
          status_history: [...(a.status_history || []), { status, date: new Date().toISOString().split("T")[0] }],
        };
      }
      return a;
    });
    set({ applications: updated });
    return count;
  },

  interviews: mockInterviews,
  addInterview: (interview) => {
    set((s) => ({ interviews: [...s.interviews, { ...interview, id: genId("int") }] }));
  },
  updateInterview: (id, data) =>
    set((s) => ({ interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...data } : i)) })),
  deleteInterview: (id) => set((s) => ({ interviews: s.interviews.filter((i) => i.id !== id) })),

  conversations: mockConversations,
  sendMessage: (conversationId, text) => {
    const user = get().user;
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    const newMsg: Message = {
      id: genId("msg"),
      sender_id: user.id,
      sender_name: user.name,
      receiver_id: conv.participant_id,
      receiver_name: conv.participant_name,
      message: text,
      sent_at: new Date().toISOString(),
      is_read: true,
    };
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, newMsg], last_message: text, last_message_time: "Just now" }
          : c
      ),
    }));
  },

  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),
}));