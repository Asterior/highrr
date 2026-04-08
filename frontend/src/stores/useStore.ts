import { create } from "zustand";
import { Job, Application, Interview, Conversation, CurrentUser, Message, isValidTransition, PipelineStatus } from "@/data/types";
import { mockConversations, currentUser } from "@/data/mockData";
import {
  getJobs,
  createJob,
  updateJob as updateJobAPI,
  deleteJob as deleteJobAPI,
  getApplications,
  updateApplicationStatus as updateApplicationStatusAPI,
  applyToJob as applyToJobAPI,
  getInterviews,
  createInterview as createInterviewAPI,
  updateInterview as updateInterviewAPI,
  deleteInterview as deleteInterviewAPI,
  respondToInterview as respondToInterviewAPI,
  captureInterviewFeedback as captureInterviewFeedbackAPI,
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
  addJob: (job: {
    title: string;
    description: string;
    location?: string;
    salary: string;
    department?: string;
    job_type: Job["job_type"];
    responsibilities: string;
    hiring_timeline: string;
    actively_hiring: boolean;
    required_skills: string[];
    experience_required?: string;
    status: string;
    is_active: boolean;
    application_deadline: string;
  }) => Promise<void>;
  updateJob: (id: string, data: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  applications: Application[];
  loadApplications: (filterStatus?: string) => Promise<void>;
  updateApplicationStatus: (id: string, status: PipelineStatus) => Promise<boolean>;
  updateApplication: (id: string, data: Partial<Application>) => void;
  applyToJob: (jobId: string) => Promise<boolean>;
  bulkUpdateStatus: (ids: string[], status: PipelineStatus) => number;

  interviews: Interview[];
  loadInterviews: (mine?: boolean) => Promise<void>;
  scheduleInterview: (data: {
    application_id: string;
    interviewer_id: string;
    scheduled_at: string;
    interview_type: Interview["interview_type"];
    mode?: "online" | "offline";
    timezone?: string | null;
    notes?: string | null;
    meeting_link?: string | null;
    location?: string | null;
  }) => Promise<boolean>;
  updateInterviewRemote: (id: string, data: Partial<Interview>) => Promise<boolean>;
  respondToInterview: (id: string, action: "confirm" | "reschedule" | "cancel", data?: { reason?: string; preferred_slots?: string[]; preferred_timezone?: string }) => Promise<boolean>;
  captureInterviewFeedback: (id: string, data: { rating?: number; notes?: string; decision?: "hire" | "reject" | "hold" }) => Promise<boolean>;
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

const getInitialAuthState = () => {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("auth_user");
  if (!token || !rawUser) return { isAuthenticated: false, user: currentUser };

  try {
    const parsedUser = JSON.parse(rawUser) as CurrentUser;
    return { isAuthenticated: true, user: parsedUser };
  } catch {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("token");
    return { isAuthenticated: false, user: currentUser };
  }
};

const initialAuthState = getInitialAuthState();

const mapJobFromApi = (job: any): Job => ({
  id: job.id.toString(),
  title: job.title,
  description: job.description,
  location: job.location,
  salary: job.salary,
  job_type: job.job_type,
  responsibilities: job.responsibilities,
  hiring_timeline: job.hiring_timeline,
  actively_hiring: Boolean(job.actively_hiring),
  required_skills: job.required_skills || [],
  experience_required: job.experience_required,
  is_active: job.is_active,
  application_deadline: job.application_deadline || null,
  posted_expires_at: job.posted_expires_at || null,
  renewed_count: job.renewed_count || 0,
  created_by: job.created_by.toString(),
  created_at: job.created_at,
  application_count: job.application_count || 0,
  department: job.department || "Engineering",
  status: job.status || "Inactive",
  recruiter_response_rate: job.recruiter_response_rate || 0,
  is_flagged: Boolean(job.is_flagged),
  fraud_flags: job.fraud_flags || [],
  company_verification_level: job.company_verification_level || "basic",
  company_trust_score: job.company_trust_score || 0,
  recruiter_status: job.recruiter_status || job.status || "Inactive",
  candidate_status: job.candidate_status || job.status || "Inactive",
  has_applied: Boolean(job.has_applied),
  can_apply: Boolean(job.can_apply),
  deadline_passed: Boolean(job.deadline_passed),
  applications_label: job.applications_label || "No applications received",
});

export const useStore = create<AppState>((set, get) => ({
  user: initialAuthState.user,
  isAuthenticated: initialAuthState.isAuthenticated,

  login: (user: CurrentUser) => {
    localStorage.setItem("auth_user", JSON.stringify(user));
    set({ isAuthenticated: true, user });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    set({ isAuthenticated: false, user: currentUser });
  },

  restoreSession: () => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("auth_user");
    if (!token || !rawUser) return;

    try {
      const parsedUser = JSON.parse(rawUser) as CurrentUser;
      set({ isAuthenticated: true, user: parsedUser });
    } catch {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("token");
      set({ isAuthenticated: false, user: currentUser });
    }
  },

  updateProfile: (data) => set((s) => ({ user: { ...s.user, ...data } })),

  jobs: [],
  
  /**
   * Load jobs from API database
   */
  loadJobs: async () => {
    try {
      if (get().jobs.length > 0) {
        return;
      }
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      const jobsData = await getJobs(token, 0, 100);
      set({ jobs: jobsData.map(mapJobFromApi) });
    } catch (error) {
      console.error("Failed to load jobs:", error);
      set({ jobs: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Create a new job via API
   */
  addJob: async (job) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const newJobData = await createJob(
        {
          title: job.title,
          description: job.description,
          location: job.location,
          salary: job.salary,
          job_type: job.job_type,
          responsibilities: job.responsibilities,
          hiring_timeline: job.hiring_timeline,
          actively_hiring: job.actively_hiring,
          required_skills: job.required_skills,
          experience_required: job.experience_required,
          department: job.department,
          status: job.status,
          is_active: job.is_active,
          application_deadline: job.application_deadline,
        },
        token
      );
      set((s) => ({ jobs: [mapJobFromApi(newJobData), ...s.jobs] }));
    } catch (error) {
      console.error("Failed to create job:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Update an existing job via API
   */
  updateJob: async (id, data) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const updatePayload: any = {};
      if (data.title !== undefined) updatePayload.title = data.title;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.location !== undefined) updatePayload.location = data.location;
      if (data.salary !== undefined) updatePayload.salary = data.salary;
      if (data.job_type !== undefined) updatePayload.job_type = data.job_type;
      if (data.responsibilities !== undefined) updatePayload.responsibilities = data.responsibilities;
      if (data.hiring_timeline !== undefined) updatePayload.hiring_timeline = data.hiring_timeline;
      if (data.actively_hiring !== undefined) updatePayload.actively_hiring = data.actively_hiring;
      if (data.required_skills !== undefined) updatePayload.required_skills = data.required_skills;
      if (data.experience_required !== undefined) updatePayload.experience_required = data.experience_required;
      if (data.department !== undefined) updatePayload.department = data.department;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
      if (data.application_deadline !== undefined) updatePayload.application_deadline = data.application_deadline;

      const updatedJob = await updateJobAPI(id, updatePayload, token);

      set((s) => ({
        jobs: s.jobs.map((j) => (j.id === id ? mapJobFromApi(updatedJob) : j)),
      }));
    } catch (error) {
      console.error("Failed to update job:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Delete a job via API
   */
  deleteJob: async (id) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      await deleteJobAPI(id, token);
      
      // Remove from local state
      set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }));
    } catch (error) {
      console.error("Failed to delete job:", error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  applications: [],

  /**
   * Load applications from API (filtered by recruiter's jobs)
   */
  loadApplications: async (filterStatus?: string) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const appData = await getApplications(token, 0, 500, filterStatus);
      
      // Convert API response to frontend format
      const convertedApps: Application[] = appData.map((app: any) => ({
        id: app.id.toString(),
        user_id: app.user_id.toString(),
        job_id: app.job_id.toString(),
        candidate_name: app.candidate_name || app.user_name || "Candidate",
        candidate_email: app.candidate_email || "",
        candidate_location: app.candidate_location || app.location || "",
        current_role: app.current_role || app.role || "",
        current_company: app.current_company || "",
        highest_qualification: app.highest_qualification || "",
        profile_completion_percentage: app.profile_completion_percentage || 0,
        status: app.status,
        score: app.score || 0,
        assigned_to: app.assigned_to?.toString() || null,
        notes: app.notes || null,
        applied_at: app.applied_at,
        skills: app.skills || [],
        experience_years: app.experience_years || 0,
        avatar: app.avatar,
        role: app.role,
        location: app.location,
        phone: app.phone,
        cgpa: app.cgpa,
        resume_url: app.resume_url,
        status_history: app.status_history || [],
      }));
      
      set({ applications: convertedApps });
    } catch (error) {
      console.error("Failed to load applications:", error);
      set({ applications: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Update application status via API with optimistic updates
   */
  updateApplicationStatus: async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const app = get().applications.find((a) => a.id === id);
      if (!app) return false;
      if (!isValidTransition(app.status, status)) return false;
      
      // Store old state for potential rollback
      const oldStatus = app.status;
      
      // Optimistic update: update UI immediately
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
      
      try {
        // Call API to persist the change
        await updateApplicationStatusAPI(id, status, token);
        return true;
      } catch (error) {
        console.error("Failed to update on server, reverting:", error);
        // Revert to old state if API fails
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: oldStatus,
                  status_history: (a.status_history || []).slice(0, -1), // Remove last entry
                }
              : a
          ),
        }));
        throw error;
      }
    } catch (error) {
      console.error("Failed to update application status:", error);
      return false;
    }
  },

  updateApplication: (id, data) =>
    set((s) => ({ applications: s.applications.map((a) => (a.id === id ? { ...a, ...data } : a)) })),

  applyToJob: async (jobId) => {
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
        skills: user.skills || [],
        experience_years: user.experience_years || 0,
        avatar: user.avatar,
        role: job.title,
        location: user.location,
        phone: user.phone,
        cgpa: user.cgpa,
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
    } catch (error) {
      console.error("Failed to apply to job:", error);
      return false;
    }
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

  interviews: [],
  loadInterviews: async (mine = false) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const interviewData = await getInterviews(token, mine);
      const convertedInterviews: Interview[] = interviewData.map((interview: any) => ({
        id: interview.id.toString(),
        application_id: interview.application_id.toString(),
        candidate_name: interview.candidate_name,
        job_title: interview.job_title,
        interviewer_id: interview.interviewer_id.toString(),
        interviewer_name: interview.interviewer_name,
        scheduled_at: interview.scheduled_at,
        status: interview.status,
        interview_type: interview.interview_type,
        mode: interview.mode,
        timezone: interview.timezone,
        notes: interview.notes || "",
        meeting_link: interview.meeting_link,
        location: interview.location,
        candidate_response_status: interview.candidate_response_status,
        candidate_response_reason: interview.candidate_response_reason,
        candidate_preferred_slots: interview.candidate_preferred_slots || [],
        feedback_rating: interview.feedback_rating,
        feedback_notes: interview.feedback_notes,
        recruiter_decision: interview.recruiter_decision,
        status_history: interview.status_history || [],
      }));

      set({ interviews: convertedInterviews });
    } catch (error) {
      console.error("Failed to load interviews:", error);
      set({ interviews: [] });
    } finally {
      set({ isLoading: false });
    }
  },
  scheduleInterview: async (data) => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const created = await createInterviewAPI({
        application_id: data.application_id,
        interviewer_id: data.interviewer_id,
        scheduled_at: data.scheduled_at,
        interview_type: data.interview_type,
        mode: data.mode,
        timezone: data.timezone,
        notes: data.notes,
        meeting_link: data.meeting_link,
        location: data.location,
      }, token);

      const newInterview: Interview = {
        id: created.id.toString(),
        application_id: created.application_id.toString(),
        candidate_name: created.candidate_name,
        job_title: created.job_title,
        interviewer_id: created.interviewer_id.toString(),
        interviewer_name: created.interviewer_name,
        scheduled_at: created.scheduled_at,
        status: created.status,
        interview_type: created.interview_type,
        mode: created.mode,
        timezone: created.timezone,
        notes: created.notes || "",
        meeting_link: created.meeting_link,
        location: created.location,
        candidate_response_status: created.candidate_response_status,
        candidate_response_reason: created.candidate_response_reason,
        candidate_preferred_slots: created.candidate_preferred_slots || [],
        feedback_rating: created.feedback_rating,
        feedback_notes: created.feedback_notes,
        recruiter_decision: created.recruiter_decision,
        status_history: created.status_history || [],
      };

      set((s) => ({ interviews: [newInterview, ...s.interviews] }));
      return true;
    } catch (error) {
      console.error("Failed to schedule interview:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  updateInterviewRemote: async (id, data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      await updateInterviewAPI(id, data, token);
      set((s) => ({ interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...data } : i)) }));
      return true;
    } catch (error) {
      console.error("Failed to update interview:", error);
      return false;
    }
  },
  respondToInterview: async (id, action, data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const updated = await respondToInterviewAPI(id, token, {
        action,
        reason: data?.reason,
        preferred_slots: data?.preferred_slots,
        preferred_timezone: data?.preferred_timezone,
      });

      set((s) => ({ interviews: s.interviews.map((i) => (i.id === id ? {
        ...i,
        status: updated.status,
        mode: updated.mode,
        timezone: updated.timezone,
        notes: updated.notes || i.notes,
        meeting_link: updated.meeting_link,
        location: updated.location,
        candidate_response_status: updated.candidate_response_status,
        candidate_response_reason: updated.candidate_response_reason,
        candidate_preferred_slots: updated.candidate_preferred_slots || [],
        status_history: updated.status_history || i.status_history,
      } : i)) }));
      return true;
    } catch (error) {
      console.error("Failed to update candidate response:", error);
      return false;
    }
  },
  captureInterviewFeedback: async (id, data) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const updated = await captureInterviewFeedbackAPI(id, token, data);
      set((s) => ({
        interviews: s.interviews.map((i) => (i.id === id ? {
          ...i,
          status: updated.status,
          feedback_rating: updated.feedback_rating,
          feedback_notes: updated.feedback_notes,
          recruiter_decision: updated.recruiter_decision,
          status_history: updated.status_history || i.status_history,
        } : i)),
        applications: s.applications.map((a) => {
          if (a.id !== String(updated.application_id)) return a;

          const mappedStatus = updated.recruiter_decision === "hire"
            ? "selected"
            : updated.recruiter_decision === "reject"
            ? "rejected"
            : "interview";

          return {
            ...a,
            status: mappedStatus,
            status_history: [...(a.status_history || []), { status: mappedStatus, date: new Date().toISOString() }],
          };
        }),
      }));

      await get().loadApplications();
      return true;
    } catch (error) {
      console.error("Failed to capture interview feedback:", error);
      return false;
    }
  },
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

    const userId = String(user.id);
    const participantId = String(conv.participant_id);
    const inferredPeerFromMessages = conv.messages.find(
      (m) => String(m.sender_id) !== userId || String(m.receiver_id) !== userId
    );
    const fallbackPeer = inferredPeerFromMessages
      ? String(inferredPeerFromMessages.sender_id) === userId
        ? String(inferredPeerFromMessages.receiver_id)
        : String(inferredPeerFromMessages.sender_id)
      : participantId;
    const receiverId = participantId === userId ? fallbackPeer : participantId;

    const newMsg: Message = {
      id: genId("msg"),
      sender_id: user.id,
      sender_name: user.name,
      receiver_id: receiverId,
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
