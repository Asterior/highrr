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

// ============ JOB APIs ============

interface JobPayload {
  title: string;
  description: string;
  location?: string;
  salary?: string;
  job_type: string;
  required_skills?: string[];
  experience_required?: string;
  department?: string;
  status?: string;
  is_active?: boolean;
  application_deadline?: string;
  application_count?: number;
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
  const params = new URLSearchParams();
  params.append("skip", skip.toString());
  params.append("limit", limit.toString());
  if (status) params.append("status", status);

  const res = await fetch(`${BASE_URL}/applications/?${params.toString()}`, {
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
