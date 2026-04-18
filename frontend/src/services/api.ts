//frontend/src/services/api.ts
const DEFAULT_BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;

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
  application_deadline?: string;
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
  isActive = true,
  department?: string,
  status?: string
) {
  const params = new URLSearchParams();
  params.append("skip", skip.toString());
  params.append("limit", limit.toString());
  params.append("is_active", isActive.toString());
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
// ─── Messaging API ────────────────────────────────────────────────────────────

export async function getConversations(token: string) {
  const res = await fetch(`${BASE_URL}/conversations/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function startConversation(token: string, participantId: number) {
  const res = await fetch(`${BASE_URL}/conversations/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ participant_id: participantId }),
  });
  if (!res.ok) throw new Error("Failed to start conversation");
  return res.json();
}

export async function getMessages(token: string, conversationId: number | string) {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function sendMessageApi(
  token: string,
  conversationId: number | string,
  receiverId: number | string,
  message: string,
) {
  const res = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ receiver_id: Number(receiverId), message }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function markMessageRead(token: string, messageId: number | string) {
  const res = await fetch(`${BASE_URL}/messages/${messageId}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to mark message as read");
  return res.json();
}

export const getTotalUnreadCount = async (): Promise<number> => {
  const token = localStorage.getItem("token");
  if (!token) return 0;
  try {
    const res = await fetch(`${BASE_URL}/messages/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.unread_count ?? 0;
  } catch {
    return 0;
  }
};

export async function reportUser(
  token: string,
  payload: {
    recruiter_id?: number;
    job_id?: number;
    category: "scam" | "no_response" | "fake_job";
    details?: string;
  }
) {
  const res = await fetch(`${BASE_URL}/trust/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to submit report");
  }
  return res.json();
}