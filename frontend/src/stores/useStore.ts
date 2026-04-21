// frontend/src/stores/useStore.ts
import { create } from "zustand";
import { Job, Application, Interview, Conversation, CurrentUser, Message, isValidTransition, PipelineStatus } from "@/data/types";
import { mockConversations, currentUser } from "@/data/mockData";
import {
  getJobs, createJob, updateJob as updateJobAPI, deleteJob as deleteJobAPI,
  getApplications, updateApplicationStatus as updateApplicationStatusAPI,
  applyToJob as applyToJobAPI, getInterviews, createInterview as createInterviewAPI,
  updateInterview as updateInterviewAPI, deleteInterview as deleteInterviewAPI,
  respondToInterview as respondToInterviewAPI,
  captureInterviewFeedback as captureInterviewFeedbackAPI,
  getConversations, getMessages, sendMessageApi,
  startConversation as startConversationApi, getTotalUnreadCount,
} from "@/services/api";

interface AppState {
  user: CurrentUser;
  isAuthenticated: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;
  restoreSession: () => void;
  updateProfile: (data: Partial<CurrentUser>) => void;

  jobs: Job[];
  loadJobs: () => Promise<void>;
  addJob: (job: { title: string; description: string; location?: string; salary: string; department?: string; job_type: Job["job_type"]; responsibilities: string; hiring_timeline: string; actively_hiring: boolean; required_skills: string[]; experience_required?: string; status: string; is_active: boolean; application_deadline: string; }) => Promise<void>;
  updateJob: (id: string, data: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  applications: Application[];
  loadApplications: (filterStatus?: string) => Promise<void>;
  updateApplicationStatus: (id: string, status: PipelineStatus) => Promise<boolean>;
  updateApplication: (id: string, data: Partial<Application>) => void;
  applyToJob: (jobId: string, applicationData?: {
    score?: number;
    skills?: string[];
    experience_years?: number;
    avatar?: string;
    role?: string;
    location?: string;
    phone?: string;
    cgpa?: number;
    notes?: string;
  }) => Promise<boolean>;
  bulkUpdateStatus: (ids: string[], status: PipelineStatus) => number;

  interviews: Interview[];
  loadInterviews: (mine?: boolean) => Promise<void>;
  scheduleInterview: (data: { application_id: string; interviewer_id: string; scheduled_at: string; interview_type: Interview["interview_type"]; mode?: "online" | "offline"; timezone?: string | null; notes?: string | null; meeting_link?: string | null; location?: string | null; }) => Promise<boolean>;
  updateInterviewRemote: (id: string, data: Partial<Interview>) => Promise<boolean>;
  respondToInterview: (id: string, action: "confirm" | "reschedule" | "cancel", data?: { reason?: string; preferred_slots?: string[]; preferred_timezone?: string }) => Promise<boolean>;
  captureInterviewFeedback: (id: string, data: { rating?: number; notes?: string; decision?: "hire" | "reject" | "hold" }) => Promise<boolean>;
  addInterview: (interview: Omit<Interview, "id">) => void;
  updateInterview: (id: string, data: Partial<Interview>) => void;
  deleteInterview: (id: string) => void;

  // ── Messaging ──────────────────────────────────────────────────
  conversations: Conversation[];
  totalUnread: number;
  loadConversations: () => Promise<void>;
  loadTotalUnread: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  startConversation: (participantId: number) => Promise<string | null>;
  appendIncomingMessage: (conversationId: string, rawMsg: any) => void;

  isLoading: boolean;
  setLoading: (v: boolean) => void;
}

let idCounter = 100;
const genId = (prefix: string) => `${prefix}-${++idCounter}`;

const getInitialAuthState = () => {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("auth_user");
  if (!token || !rawUser) return { isAuthenticated: false, user: currentUser };
  try {
    return { isAuthenticated: true, user: JSON.parse(rawUser) as CurrentUser };
  } catch {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("token");
    return { isAuthenticated: false, user: currentUser };
  }
};

const initialAuthState = getInitialAuthState();

const mapJobFromApi = (job: any): Job => ({
  id: job.id.toString(), title: job.title, description: job.description, location: job.location,
  salary: job.salary, job_type: job.job_type, responsibilities: job.responsibilities,
  hiring_timeline: job.hiring_timeline, actively_hiring: Boolean(job.actively_hiring),
  required_skills: job.required_skills || [], experience_required: job.experience_required,
  is_active: job.is_active, application_deadline: job.application_deadline || null,
  posted_expires_at: job.posted_expires_at || null, renewed_count: job.renewed_count || 0,
  created_by: job.created_by.toString(), created_at: job.created_at,
  application_count: job.application_count || 0, department: job.department || "Engineering",
  status: job.status || "Inactive", recruiter_response_rate: job.recruiter_response_rate || 0,
  is_flagged: Boolean(job.is_flagged), fraud_flags: job.fraud_flags || [],
  company_verification_level: job.company_verification_level || "basic",
  company_trust_score: job.company_trust_score || 0,
  recruiter_status: job.recruiter_status || job.status || "Inactive",
  candidate_status: job.candidate_status || job.status || "Inactive",
  has_applied: Boolean(job.has_applied), can_apply: Boolean(job.can_apply),
  deadline_passed: Boolean(job.deadline_passed),
  applications_label: job.applications_label || "No applications received",
});

const mapMessage = (m: any) => ({
  id: String(m.id), sender_id: String(m.sender_id), sender_name: "",
  receiver_id: String(m.receiver_id), receiver_name: "",
  message: m.message, sent_at: m.sent_at, is_read: m.is_read,
  is_flagged: m.is_flagged ?? false,
});

export const useStore = create<AppState>((set, get) => ({
  user: initialAuthState.user,
  isAuthenticated: initialAuthState.isAuthenticated,

  login: (user: CurrentUser) => { localStorage.setItem("auth_user", JSON.stringify(user)); set({ isAuthenticated: true, user }); },
  logout: () => { localStorage.removeItem("token"); localStorage.removeItem("auth_user"); set({ isAuthenticated: false, user: currentUser }); },
  restoreSession: () => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("auth_user");
    if (!token || !rawUser) return;
    try { set({ isAuthenticated: true, user: JSON.parse(rawUser) as CurrentUser }); }
    catch { localStorage.removeItem("auth_user"); localStorage.removeItem("token"); set({ isAuthenticated: false, user: currentUser }); }
  },
  updateProfile: (data) => set((s) => ({ user: { ...s.user, ...data } })),

  jobs: [],
  loadJobs: async () => {
    try {
      if (get().jobs.length > 0) return;
      set({ isLoading: true });
      const jobsData = await getJobs(localStorage.getItem("token"), 0, 100);
      set({ jobs: jobsData.map(mapJobFromApi) });
    } catch { set({ jobs: [] }); } finally { set({ isLoading: false }); }
  },
  addJob: async (job) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const newJobData = await createJob({ title: job.title, description: job.description, location: job.location, salary: job.salary, job_type: job.job_type, responsibilities: job.responsibilities, hiring_timeline: job.hiring_timeline, actively_hiring: job.actively_hiring, required_skills: job.required_skills, experience_required: job.experience_required, department: job.department, status: job.status, is_active: job.is_active, application_deadline: job.application_deadline }, token);
      set((s) => ({ jobs: [mapJobFromApi(newJobData), ...s.jobs] }));
    } catch (error) { console.error("Failed to create job:", error); throw error; }
    finally { set({ isLoading: false }); }
  },
  updateJob: async (id, data) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const p: any = {};
      if (data.title !== undefined) p.title = data.title;
      if (data.description !== undefined) p.description = data.description;
      if (data.location !== undefined) p.location = data.location;
      if (data.salary !== undefined) p.salary = data.salary;
      if (data.job_type !== undefined) p.job_type = data.job_type;
      if (data.responsibilities !== undefined) p.responsibilities = data.responsibilities;
      if (data.hiring_timeline !== undefined) p.hiring_timeline = data.hiring_timeline;
      if (data.actively_hiring !== undefined) p.actively_hiring = data.actively_hiring;
      if (data.required_skills !== undefined) p.required_skills = data.required_skills;
      if (data.experience_required !== undefined) p.experience_required = data.experience_required;
      if (data.department !== undefined) p.department = data.department;
      if (data.status !== undefined) p.status = data.status;
      if (data.is_active !== undefined) p.is_active = data.is_active;
      if (data.application_deadline !== undefined) p.application_deadline = data.application_deadline;
      const updated = await updateJobAPI(id, p, token);
      set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? mapJobFromApi(updated) : j)) }));
    } catch (error) { console.error("Failed to update job:", error); throw error; }
    finally { set({ isLoading: false }); }
  },
  deleteJob: async (id) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      await deleteJobAPI(id, token);
      set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
    } catch (error) { console.error("Failed to delete job:", error); throw error; }
    finally { set({ isLoading: false }); }
  },

  applications: [],
  loadApplications: async (filterStatus?: string) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const data = await getApplications(token, 0, 500, filterStatus);
      set({ applications: data });
    } catch (error) { console.error("Failed to load applications:", error); set({ applications: [] }); }
    finally { set({ isLoading: false }); }
  },
  updateApplicationStatus: async (id: string, status: PipelineStatus) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const current = get().applications.find((a) => a.id === id);
      if (!current) return false;
      if (!isValidTransition(current.status as PipelineStatus, status)) return false;
      await updateApplicationStatusAPI(id, status, token);
      set((s) => ({
        applications: s.applications.map((a) =>
          a.id === id ? { ...a, status, status_history: [...(a.status_history || []), { status, date: new Date().toISOString() }] } : a
        ),
      }));
      return true;
    } catch { return false; }
  },

  updateApplication: (id, data) =>
    set((s) => ({ applications: s.applications.map((a) => (a.id === id ? { ...a, ...data } : a)) })),

  applyToJob: async (jobId, applicationData = {}) => {
      try {
        const user = get().user;
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Not authenticated");

        // Check if already applied
        const existing = get().applications.find((a) => a.user_id === user.id && a.job_id === jobId);
        if (existing) return false;

        const job = get().jobs.find((j) => j.id === jobId);
        if (!job) return false;

        // Calculate skill match score
        const skillMatch = user.skills
          ? Math.round((user.skills.filter((s) => job.required_skills.some((rs) => rs.toLowerCase() === s.toLowerCase())).length / Math.max(job.required_skills.length, 1)) * 100)
          : Math.floor(Math.random() * 30) + 60;

        const score = Math.min(skillMatch + Math.floor(Math.random() * 10), 100);

        // Call API to apply to job
        const response = await applyToJobAPI(jobId, token, {
          score,
          skills: applicationData.skills ?? user.skills ?? [],
          experience_years: applicationData.experience_years ?? user.experience_years ?? 0,
          avatar: applicationData.avatar ?? user.avatar,
          role: applicationData.role ?? job.title,
          location: applicationData.location ?? user.location,
          phone: applicationData.phone ?? user.phone,
          cgpa: applicationData.cgpa ?? user.cgpa,
          notes: applicationData.notes ?? undefined,
      });

      // Add to local state with converted ID (ensure job_id is string for consistency)
      const newApp: Application = {
        id: response.id.toString(),
        user_id: user.id,
        job_id: String(response.job_id),  // Ensure job_id is stored as string
        candidate_name: user.name,
        candidate_email: user.email,
        status: "applied",
        score: response.score,
        assigned_to: null,
        notes: null,
        applied_at: response.applied_at || new Date().toISOString(),
        skills: response.skills || user.skills || [],
        experience_years: response.experience_years || user.experience_years || 0,
        avatar: response.avatar || user.avatar,
        role: response.role || job.title,
        location: response.location || user.location,
        phone: response.phone || user.phone,
        cgpa: response.cgpa || user.cgpa,
        resume_url: response.resume_url || user.resume_url,
        status_history: [{ status: "applied", date: new Date().toISOString().split("T")[0] }],
      };

      set((s) => ({
        applications: [...s.applications, newApp],
        jobs: s.jobs.map((j) => {
          if (j.id !== jobId) return j;
          const nextCount = j.application_count + 1;
          return {
            ...j,
            application_count: nextCount,
            has_applied: true,
            can_apply: false,
            candidate_status: "Applied",
            applications_label: nextCount === 1 ? "1 application" : `${nextCount} applications`,
          };
        }),
      }));
      return true;
    } catch { return false; }
  },
  bulkUpdateStatus: (ids, status) => {
    let count = 0;
    set((s) => ({
      applications: s.applications.map((a) => {
        if (!ids.includes(a.id)) return a;
        if (!isValidTransition(a.status as PipelineStatus, status)) return a;
        count++;
        return { ...a, status, status_history: [...(a.status_history || []), { status, date: new Date().toISOString() }] };
      }),
    }));
    return count;
  },

  interviews: [],
  loadInterviews: async (mine = false) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const data = await getInterviews(token, mine);
      set({ interviews: data });
    } catch { set({ interviews: [] }); } finally { set({ isLoading: false }); }
  },
  scheduleInterview: async (data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const newInterview = await createInterviewAPI(data, token);
      set((s) => ({ interviews: [...s.interviews, newInterview] }));
      return true;
    } catch { return false; }
  },
  updateInterviewRemote: async (id, data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const updated = await updateInterviewAPI(id, data, token);
      set((s) => ({ interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...updated } : i)) }));
      return true;
    } catch { return false; }
  },
  respondToInterview: async (id, action, data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const u = await respondToInterviewAPI(id, token, { action, reason: data?.reason, preferred_slots: data?.preferred_slots, preferred_timezone: data?.preferred_timezone });
      set((s) => ({ interviews: s.interviews.map((i) => i.id === id ? { ...i, status: u.status, mode: u.mode, timezone: u.timezone, notes: u.notes || i.notes, meeting_link: u.meeting_link, location: u.location, candidate_response_status: u.candidate_response_status, candidate_response_reason: u.candidate_response_reason, candidate_preferred_slots: u.candidate_preferred_slots || [], status_history: u.status_history || i.status_history } : i) }));
      return true;
    } catch { return false; }
  },
  captureInterviewFeedback: async (id, data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      const u = await captureInterviewFeedbackAPI(id, token, data);
      set((s) => ({
        interviews: s.interviews.map((i) => i.id === id ? { ...i, status: u.status, feedback_rating: u.feedback_rating, feedback_notes: u.feedback_notes, recruiter_decision: u.recruiter_decision, status_history: u.status_history || i.status_history } : i),
        applications: s.applications.map((a) => { if (a.id !== String(u.application_id)) return a; const ms = u.recruiter_decision === "hire" ? "selected" : u.recruiter_decision === "reject" ? "rejected" : "interview"; return { ...a, status: ms, status_history: [...(a.status_history || []), { status: ms, date: new Date().toISOString() }] }; }),
      }));
      await get().loadApplications();
      return true;
    } catch { return false; }
  },
  addInterview: (interview) => set((s) => ({ interviews: [...s.interviews, { ...interview, id: genId("int") }] })),
  updateInterview: (id, data) => set((s) => ({ interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...data } : i)) })),
  deleteInterview: (id) => set((s) => ({ interviews: s.interviews.filter((i) => i.id !== id) })),

  // ── Messaging ──────────────────────────────────────────────────
  conversations: [],
  totalUnread: 0,

  loadTotalUnread: async () => {
    const count = await getTotalUnreadCount();
    set({ totalUnread: count });
  },

  loadConversations: async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const data = await getConversations(token);
      const mapped = data.map((c: any) => ({
        id: String(c.id),
        // FIX: backend now consistently sends participant_id (not other_user_id)
        participant_id: String(c.participant_id),
        participant_name: c.participant_name ?? "Unknown",
        participant_avatar: c.participant_avatar ?? "??",
        last_message: c.last_message ?? "",
        last_message_time: c.last_message_time
          ? new Date(c.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        unread_count: c.unread_count ?? 0,
        messages: [],
      }));
      const unread = mapped.reduce((sum: number, c: any) => sum + (c.unread_count ?? 0), 0);
      set({ conversations: mapped, totalUnread: unread });
    } catch (err) { console.error("Failed to load conversations:", err); }
  },

  loadMessages: async (conversationId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const data = await getMessages(token, conversationId);
      set((s) => {
        const updatedConvs = s.conversations.map((c) =>
          c.id === conversationId ? { ...c, messages: data.map(mapMessage), unread_count: 0 } : c
        );
        return { conversations: updatedConvs, totalUnread: updatedConvs.reduce((sum, c) => sum + (c.unread_count ?? 0), 0) };
      });
    } catch (err) { console.error("Failed to load messages:", err); }
  },

  sendMessage: async (conversationId: string, text: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const conv = get().conversations.find((c) => c.id === conversationId);
    if (!conv) return;
    try {
      // FIX: participant_id is now always correctly the other person (not current user)
      const newMsg = await sendMessageApi(token, conversationId, conv.participant_id, text);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, mapMessage(newMsg)], last_message: text, last_message_time: "Just now" }
            : c
        ),
      }));
    } catch (err) { console.error("Failed to send message:", err); }
  },

  // Called by useChat to append real-time incoming WS messages
  appendIncomingMessage: (conversationId: string, rawMsg: any) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, mapMessage(rawMsg)], last_message: rawMsg.message, last_message_time: "Just now" }
          : c
      ),
    }));
  },

  startConversation: async (participantId: number) => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
      const conv = await startConversationApi(token, participantId);
      const convId = String(conv.id);

      // FIX: backend now always returns participant_id directly
      const mapped = {
        id: convId,
        participant_id: String(conv.participant_id),
        participant_name: conv.participant_name ?? "Unknown",
        participant_avatar: conv.participant_avatar ?? "??",
        last_message: conv.last_message ?? "",
        last_message_time: conv.last_message_time
          ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        unread_count: 0,
        messages: [],
      };

      set((s) => ({
        conversations: s.conversations.some((c) => c.id === convId)
          ? s.conversations.map((c) => (c.id === convId ? { ...c, ...mapped } : c))
          : [mapped, ...s.conversations],
      }));

      // Load existing message history immediately
      const rawMsgs = await getMessages(token, convId);
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === convId ? { ...c, messages: rawMsgs.map(mapMessage) } : c
        ),
      }));

      return convId;
    } catch (err) { console.error("Failed to start conversation:", err); return null; }
  },

  isLoading: false,
  setLoading: (v) => set({ isLoading: v }),
}));