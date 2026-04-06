import { create } from "zustand";
import { Job, Application, Interview, Conversation, CurrentUser, Message, isValidTransition, PipelineStatus, UserRole } from "@/data/types";
import { mockInterviews, mockConversations, currentUser, mockUsers } from "@/data/mockData";
import { getJobs, createJob, updateJob as updateJobAPI, deleteJob as deleteJobAPI, getApplications, updateApplicationStatus as updateApplicationStatusAPI, applyToJob as applyToJobAPI } from "@/services/api";

interface AppState {
  user: CurrentUser;
  isAuthenticated: boolean;
  login: (user: CurrentUser) => void;
  logout: () => void;
  updateProfile: (data: Partial<CurrentUser>) => void;

  jobs: Job[];
  loadJobs: () => Promise<void>;
  addJob: (job: Omit<Job, "id" | "created_at" | "application_count" | "created_by">) => Promise<void>;
  updateJob: (id: string, data: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;

  applications: Application[];
  loadApplications: (filterStatus?: string) => Promise<void>;
  updateApplicationStatus: (id: string, status: PipelineStatus) => Promise<boolean>;
  updateApplication: (id: string, data: Partial<Application>) => void;
  applyToJob: (jobId: string) => Promise<boolean>;
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

  jobs: [],
  
  /**
   * Load jobs from API database
   */
  loadJobs: async () => {
    try {
      set({ isLoading: true });
      const token = localStorage.getItem("token");
      const jobsData = await getJobs(token, 0, 100, true);
      
      // Convert API response (with numeric IDs) to frontend format (with string IDs)
      const convertedJobs: Job[] = jobsData.map((job: any) => ({
        id: job.id.toString(),
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary,
        job_type: job.job_type,
        required_skills: job.required_skills || [],
        experience_required: job.experience_required,
        is_active: job.is_active,
        created_by: job.created_by.toString(),
        created_at: job.created_at,
        application_count: job.application_count || 0,
        department: job.department || "Engineering",
        status: job.status || "Active",
      }));
      
      set({ jobs: convertedJobs });
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
          required_skills: job.required_skills,
          experience_required: job.experience_required,
          department: job.department,
          status: job.status,
          is_active: job.is_active,
        },
        token
      );
      
      // Convert response to frontend format
      const newJob: Job = {
        id: newJobData.id.toString(),
        title: newJobData.title,
        description: newJobData.description,
        location: newJobData.location,
        salary: newJobData.salary,
        job_type: newJobData.job_type,
        required_skills: newJobData.required_skills || [],
        experience_required: newJobData.experience_required,
        is_active: newJobData.is_active,
        created_by: newJobData.created_by.toString(),
        created_at: newJobData.created_at,
        application_count: newJobData.application_count || 0,
        department: newJobData.department || "Engineering",
        status: newJobData.status || "Active",
      };
      
      set((s) => ({ jobs: [newJob, ...s.jobs] }));
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
      if (data.required_skills !== undefined) updatePayload.required_skills = data.required_skills;
      if (data.experience_required !== undefined) updatePayload.experience_required = data.experience_required;
      if (data.department !== undefined) updatePayload.department = data.department;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
      
      await updateJobAPI(id, updatePayload, token);
      
      // Update local state
      set((s) => ({
        jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...data } : j)),
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
        candidate_name: app.candidate_name,
        candidate_email: app.candidate_email,
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
   * Update application status via API
   */
  updateApplicationStatus: async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");
      
      const app = get().applications.find((a) => a.id === id);
      if (!app) return false;
      if (!isValidTransition(app.status, status)) return false;
      
      // Call API to update status
      await updateApplicationStatusAPI(id, status, token);
      
      // Update local state
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
        status_history: [{ status: "applied", date: new Date().toISOString().split("T")[0] }],
      };

      set((s) => ({
        applications: [...s.applications, newApp],
        jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, application_count: j.application_count + 1 } : j)),
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