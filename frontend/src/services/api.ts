/**
 * Centralized API service module for frontend network communication.
 * Exposes auth, jobs, applications, and other backend request helpers.
 */
import axios, { AxiosError, AxiosInstance } from "axios";
import type {
  ForumCategory,
  ForumModerationItem,
  ForumPost,
  ForumThreadDetail,
  ForumThreadPage,
  ForumUpvoteResponse,
} from "@/data/types";

const DEFAULT_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn("VITE_API_BASE_URL is not set. Falling back to current host.");
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status;
    const url = error.config?.url || "unknown";
    const detail = error.response?.data?.detail || error.message;

    if (status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      console.error("Session expired");
    } else if (status === 503) {
      console.error(`AI service unavailable - ${url}`);
    } else if (status === 500) {
      console.error(`Server error - ${url}: ${detail}`);
    } else if (!error.response) {
      console.error(`Network error - ${url}`);
    }

    return Promise.reject(error);
  }
);

export async function loginWithBackend(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", email); // FastAPI OAuth2 uses "username" field
  formData.append("password", password);

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Invalid credentials");
  }

  return res.json(); // returns { access_token, token_type }
}

export async function getMe(token: string) {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("Failed to fetch user info");
  return res.json(); // returns { id, name, email, role }
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
  role: "recruiter" | "candidate" | "admin";
}) {
  const res = await fetch(`${BASE_URL}/users/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to register account");
  }

  return res.json();
}

// ============ JOB APIs ============

interface JobPayload {
  title: string;
  description: string;
  location?: string;
  salary: string;
  job_type: string;
  responsibilities: string;
  hiring_timeline: string;
  actively_hiring: boolean;
  required_skills?: string[];
  experience_required?: string;
  department?: string;
  status?: string;
  is_active?: boolean;
  application_count?: number;
}

  export interface JobMatchScore {
    total_score: number;
    match_label: "Excellent" | "Good" | "Fair" | "Low";
    breakdown: {
      skills: number;
      experience: number;
      location: number;
      salary: number;
    };
    matched_skills: string[];
    missing_skills: string[];
  }

  export interface AlertCreate {
    role_keywords: string[];
    location?: string;
    min_salary?: number;
    max_experience?: number;
  }

  export interface AlertResponse {
    id: number;
    candidate_id: number;
    role_keywords: string[];
    location: string | null;
    min_salary: number | null;
    max_experience: number | null;
    is_active: boolean;
    created_at: string;
    last_triggered_at: string | null;
  }

  export interface NotificationResponse {
    id: number;
    user_id: number;
    type: string;
    title: string;
    body: string;
    job_id: number | null;
    is_read: boolean;
    created_at: string;
  }

  export interface NotificationListResponse {
    items: NotificationResponse[];
    total_count: number;
    unread_count: number;
  }

  export interface AlertOptionsResponse {
    role_keywords: string[];
    locations: string[];
    min_salary_options: number[];
    max_experience_options: number[];
  }

  export interface EmployerBadgeResponse {
    recruiter_id: number;
    badge_level: "verified" | "partial" | "unverified";
    gst_verified: boolean;
    domain_verified: boolean;
    linkedin_verified: boolean;
    verified_at: string | null;
  }

  export interface RecruiterVerificationProfileResponse {
    recruiter_id: number;
    company_name: string;
    company_email: string | null;
    company_domain: string | null;
    website_url: string | null;
    business_registry_id: string | null;
    business_country: string | null;
    domain_age_years: number;
    has_https: boolean;
    contact_matches_submission: boolean;
    office_proof_verified: boolean;
    linkedin_company_url: string | null;
    employee_count: number;
    user_reports_penalty: number;
    verification_level: string;
    trust_score: number;
    can_post_jobs: boolean;
    review_status: string;
    is_locked: boolean;
    admin_notes: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
  }

/**
 * Fetch jobs from database with optional filters
 * @param skip - Number of records to skip (pagination)
 * @param limit - Number of records to return
 * @param isActive - Filter by active status (default: true)
 * @param department - Filter by department
 * @param status - Filter by job status
 * @param token - Auth token
 */
export async function getJobs(
  token?: string,
  skip = 0,
  limit = 100,
  isActive?: boolean,
  department?: string,
  status?: string
) {
  const params = new URLSearchParams();
  params.append("skip", skip.toString());
  params.append("limit", limit.toString());
  if (isActive !== undefined) params.append("is_active", isActive.toString());
  if (department) params.append("department", department);
  if (status) params.append("status", status);

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/jobs/?${params.toString()}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch jobs");
  }

  return res.json();
}

/**
 * Get a single job by ID
 */
export async function getJobById(jobId: number | string, token?: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch job");
  }

  return res.json();
}

  /**
   * Fetch candidate-specific job match score for a given job.
   */
  export async function getJobMatchScore(jobId: number | string, token: string): Promise<JobMatchScore> {
    const res = await fetch(`${BASE_URL}/jobs/${jobId}/match-score`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to fetch match score");
    }

    return res.json();
  }

/**
 * Create a new job
 */
export async function createJob(jobData: JobPayload, token: string) {
  const res = await fetch(`${BASE_URL}/jobs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(jobData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create job");
  }

  return res.json();
}

export async function getNotifications(page = 1, pageSize = 20): Promise<NotificationListResponse> {
  const token = localStorage.getItem("token") || "";
  const params = new URLSearchParams();
  params.append("page", String(page));
  params.append("page_size", String(pageSize));

  const res = await fetch(`${BASE_URL}/notifications?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load notifications");
  }

  return res.json();
}

export async function markAllNotificationsRead(): Promise<{ marked_read: number }> {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${BASE_URL}/notifications/read-all`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to mark notifications as read");
  }

  return res.json();
}

export async function getAlerts(): Promise<AlertResponse[]> {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${BASE_URL}/alerts`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load alerts");
  }

  return res.json();
}

export async function createAlert(data: AlertCreate): Promise<AlertResponse> {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${BASE_URL}/alerts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create alert");
  }

  return res.json();
}

export async function deleteAlert(alertId: number): Promise<void> {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${BASE_URL}/alerts/${alertId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to delete alert");
  }
}

export async function getForumCategories(): Promise<ForumCategory[]> {
  const { data } = await apiClient.get("/forum/categories");
  return data;
}

export async function getForumThreads(categorySlug: string, page = 1, pageSize = 12): Promise<ForumThreadPage> {
  const { data } = await apiClient.get(`/forum/categories/${categorySlug}/threads`, {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function getForumThread(threadId: number | string): Promise<ForumThreadDetail> {
  const { data } = await apiClient.get(`/forum/threads/${threadId}`);
  return data;
}

export async function createForumThread(payload: {
  category_id: number;
  title: string;
  body: string;
}): Promise<ForumThreadDetail> {
  const { data } = await apiClient.post("/forum/threads", payload);
  return data;
}

export async function createForumPost(payload: {
  thread_id: number;
  body: string;
}): Promise<ForumPost> {
  const { data } = await apiClient.post("/forum/posts", payload);
  return data;
}

export async function toggleForumUpvote(payload: {
  thread_id?: number | null;
  post_id?: number | null;
}): Promise<ForumUpvoteResponse> {
  const { data } = await apiClient.post("/forum/upvote", payload);
  return data;
}

export async function reportForumContent(payload: {
  thread_id?: number | null;
  post_id?: number | null;
  reason: string;
}): Promise<{ message: string }> {
  const { data } = await apiClient.post("/forum/report", payload);
  return data;
}

export async function getForumModerationQueue(): Promise<ForumModerationItem[]> {
  const { data } = await apiClient.get("/forum/moderation-queue");
  return data;
}

export async function lockForumThread(threadId: number | string): Promise<{ message: string }> {
  const { data } = await apiClient.patch(`/forum/threads/${threadId}/lock`);
  return data;
}

export async function deleteForumThread(threadId: number | string): Promise<{ message: string }> {
  const { data } = await apiClient.delete(`/forum/threads/${threadId}`);
  return data;
}

export async function deleteForumPost(postId: number | string): Promise<{ message: string }> {
  const { data } = await apiClient.delete(`/forum/posts/${postId}`);
  return data;
}

export async function resolveForumReport(reportId: number | string): Promise<{ message: string }> {
  const { data } = await apiClient.patch(`/forum/reports/${reportId}/resolve`);
  return data;
}

/**
 * Update an existing job
 */
export async function updateJob(
  jobId: number | string,
  jobData: Partial<JobPayload>,
  token: string
) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(jobData),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update job");
  }

  return res.json();
}

/**
 * Delete a job
 */
export async function deleteJob(jobId: number | string, token: string) {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to delete job");
  }

  return res.json();
}

// ============ APPLICATION APIs ============

/**
 * Get applications for recruiter's jobs with pagination and filtering
 * For recruiters: Only shows applicants to jobs they posted
 * For admins: Shows all applications
 * @param token - Auth token
 * @param skip - Number of records to skip (pagination)
 * @param limit - Number of records to return
 * @param status - Filter by application status
 */
export async function getApplications(
  token: string,
  skip = 0,
  limit = 100,
  status?: string
) {
  const rawUser = localStorage.getItem("auth_user");
  let authUser: any = null;
  if (rawUser) {
    try {
      authUser = JSON.parse(rawUser);
    } catch {
      authUser = null;
    }
  }
  const isCandidate = authUser?.role === "candidate";

  const params = new URLSearchParams();
  params.append("skip", skip.toString());
  params.append("limit", limit.toString());
  if (status) params.append("status", status);

  const endpoint = isCandidate
    ? `${BASE_URL}/applications/me`
    : `${BASE_URL}/applications/?${params.toString()}`;

  const res = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch applications");
  }

  return res.json();
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  applicationId: number | string,
  status: string,
  token: string,
  assignedTo?: number | null,
  notes?: string | null
) {
  const res = await fetch(`${BASE_URL}/applications/${applicationId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status,
      assigned_to: assignedTo,
      notes,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update application");
  }

  return res.json();
}

/**
 * Apply to a job as a candidate
 * @param jobId - ID of the job to apply to (string or number)
 * @param token - Auth token
 * @param applicationData - Candidate application data (skills, experience, etc.)
 */
export async function applyToJob(
  jobId: number | string,
  token: string,
  applicationData: {
    score?: number;
    skills?: string[];
    experience_years?: number;
    avatar?: string;
    role?: string;
    location?: string;
    phone?: string;
    cgpa?: number;
    notes?: string;
  } = {}
) {
  const res = await fetch(`${BASE_URL}/applications/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      job_id: parseInt(String(jobId), 10),  // Convert to integer for backend
      score: applicationData.score || 0,
      skills: applicationData.skills || [],
      experience_years: applicationData.experience_years || 0,
      avatar: applicationData.avatar,
      role: applicationData.role,
      location: applicationData.location,
      phone: applicationData.phone,
      cgpa: applicationData.cgpa,
      notes: applicationData.notes,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to apply to job");
  }

  return res.json();
}

// ============ INTERVIEW APIs ============

interface InterviewPayload {
  application_id: number | string;
  interviewer_id: number | string;
  scheduled_at: string;
  interview_type: string;
  mode?: string;
  timezone?: string | null;
  notes?: string | null;
  meeting_link?: string | null;
  location?: string | null;
}

export async function getInterviews(token: string, mine = false) {
  const endpoint = mine ? "/interviews/me" : "/interviews/";
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch interviews");
  }

  return res.json();
}

export async function createInterview(payload: InterviewPayload, token: string) {
  const res = await fetch(`${BASE_URL}/interviews/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to schedule interview");
  }

  return res.json();
}

export async function updateInterview(
  interviewId: number | string,
  payload: Record<string, unknown>,
  token: string,
) {
  const res = await fetch(`${BASE_URL}/interviews/${interviewId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update interview");
  }

  return res.json();
}

export async function deleteInterview(interviewId: number | string, token: string) {
  const res = await fetch(`${BASE_URL}/interviews/${interviewId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to delete interview");
  }

  return res.json();
}

export async function respondToInterview(
  interviewId: number | string,
  token: string,
  payload: { action: string; reason?: string; preferred_slots?: string[]; preferred_timezone?: string },
) {
  const res = await fetch(`${BASE_URL}/interviews/${interviewId}/candidate-response`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update interview response");
  }

  return res.json();
}

export async function captureInterviewFeedback(
  interviewId: number | string,
  token: string,
  payload: { rating?: number; notes?: string; decision?: string },
) {
  const res = await fetch(`${BASE_URL}/interviews/${interviewId}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to capture interview feedback");
  }

  return res.json();
}

export async function getATSScore(token: string, jobId?: number | string) {
  const params = new URLSearchParams();
  if (jobId !== undefined) params.append("job_id", String(jobId));

  const res = await fetch(`${BASE_URL}/analytics/ats-score${params.toString() ? `?${params.toString()}` : ""}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch ATS score");
  }

  return res.json();
}

export async function uploadResume(token: string, file: File, title = "My Resume", isPrimary = true) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("is_primary", String(isPrimary));

  const res = await fetch(`${BASE_URL}/profile/upload/resume`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to upload resume");
  }
  return res.json();
}

export async function listResumes(token: string) {
  const res = await fetch(`${BASE_URL}/profile/upload/resumes`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch resumes");
  }
  return res.json();
}

export async function refreshResumeATS(token: string, resumeId: number | string, jobId?: number | string) {
  const params = new URLSearchParams();
  if (jobId !== undefined) params.append("job_id", String(jobId));
  const url = `${BASE_URL}/profile/upload/ats-score/${resumeId}${params.toString() ? `?${params.toString()}` : ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to run ATS analysis");
  }
  return res.json();
}

export async function extractJDFields(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/jobs/extract-jd`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to extract JD fields");
  }
  return res.json();
}

export async function getConversations(token: string) {
  const res = await fetch(`${BASE_URL}/conversations/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load conversations");
  }
  return res.json();
}

export async function startConversation(token: string, participantId: number | string) {
  const res = await fetch(`${BASE_URL}/conversations/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ participant_id: Number(participantId) }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to start conversation");
  }
  return res.json();
}

export async function getConversationMessages(token: string, conversationId: number | string) {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load messages");
  }
  return res.json();
}

export async function sendConversationMessage(
  token: string,
  conversationId: number | string,
  payload: { receiver_id: number | string; message: string },
) {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receiver_id: Number(payload.receiver_id),
      message: payload.message,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to send message");
  }
  return res.json();
}

export async function markMessageAsRead(token: string, messageId: number | string) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}/read`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to mark message as read");
  }
  return res.json();
}

export async function createAdminTest(
  token: string,
  payload: {
    title: string;
    description?: string;
    due_at?: string;
    questions: Array<{ id: string; question: string; expected_keywords: string[]; max_points: number }>;
  },
) {
  const res = await fetch(`${BASE_URL}/tests/admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to create admin test");
  }
  return res.json();
}

export async function listAdminTests(token: string) {
  const res = await fetch(`${BASE_URL}/tests/admin`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load admin tests");
  }
  return res.json();
}

export async function listAdminTestSubmissions(token: string) {
  const res = await fetch(`${BASE_URL}/tests/admin/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load test submissions");
  }
  return res.json();
}

export async function listCandidateTests(token: string) {
  const res = await fetch(`${BASE_URL}/tests/candidate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load candidate tests");
  }
  return res.json();
}

export async function submitCandidateTest(
  token: string,
  testId: number | string,
  answers: Record<string, string>,
) {
  const res = await fetch(`${BASE_URL}/tests/candidate/${testId}/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to submit test");
  }
  return res.json();
}

export type AssistantHistoryItem = {
  role: "user" | "assistant";
  text: string;
};

export async function askAssistant(token: string, message: string, history: AssistantHistoryItem[] = []) {
  const res = await fetch(`${BASE_URL}/assistant/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Assistant is unavailable");
  }

  return res.json();
}

export async function getRecruiterVerificationStatus(token: string) {
  const res = await fetch(`${BASE_URL}/trust/me/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch verification status");
  }

  return res.json();
}

export async function getRecruiterVerificationProfile(token: string) {
  const res = await fetch(`${BASE_URL}/trust/me/profile`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch verification profile");
  }

  return res.json();
}

export async function assessCompanyVerification(
  token: string,
  payload: {
    company_name: string;
    company_email: string;
    company_domain?: string;
    website_url?: string;
    business_registry_id?: string;
    business_country?: string;
    domain_age_years: number;
    has_https: boolean;
    contact_matches_submission: boolean;
    office_proof_verified: boolean;
    linkedin_company_url?: string;
    employee_count: number;
    user_reports_penalty: number;
  },
) {
  const res = await fetch(`${BASE_URL}/trust/company/assess`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Verification assessment failed");
  }

  return res.json();
}

export async function unlockCompanyVerificationProfile(token: string) {
  const res = await fetch(`${BASE_URL}/trust/company/unlock`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to unlock verification profile");
  }

  return res.json();
}

export async function getCompanyTrust(token: string, recruiterId: number | string) {
  const res = await fetch(`${BASE_URL}/trust/company/${recruiterId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch company trust");
  }

  return res.json();
}

export async function getEmployerBadge(recruiterId: number): Promise<EmployerBadgeResponse> {
  const res = await fetch(`${BASE_URL}/trust/employer-badge/${recruiterId}`, {
    method: "GET",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch employer badge");
  }

  return res.json();
}

export async function getAdminVerificationProfile(token: string, recruiterId: number | string): Promise<RecruiterVerificationProfileResponse> {
  const res = await fetch(`${BASE_URL}/trust/admin/verification-profile/${recruiterId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load verification profile");
  }

  return res.json();
}

export async function getCandidateProfileByUser(token: string, userId: number | string) {
  const res = await fetch(`${BASE_URL}/profile/by-user/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to fetch candidate profile");
  }

  return res.json();
}

export async function getVerificationQueue(token: string) {
  const res = await fetch(`${BASE_URL}/trust/admin/verification-queue`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load verification queue");
  }

  return res.json();
}

export async function reviewVerificationSubmission(
  token: string,
  recruiterId: number | string,
  payload: {
    action: "approve" | "reject";
    verification_level?: string;
    trust_score?: number;
    admin_notes?: string;
  },
) {
  const res = await fetch(`${BASE_URL}/trust/admin/verification-queue/${recruiterId}/review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to update verification review");
  }

  return res.json();
}

export async function getAlertOptions(): Promise<AlertOptionsResponse> {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${BASE_URL}/alerts/options`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to load alert options");
  }

  return res.json();
}