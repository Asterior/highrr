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

  const res = await fetch(`${BASE_URL}/jobs?${params.toString()}`, {
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
  const res = await fetch(`${BASE_URL}/jobs`, {
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