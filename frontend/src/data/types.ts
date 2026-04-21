export type UserRole = "admin" | "recruiter" | "candidate";

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  job_type: "full-time" | "intern" | "contract";
  responsibilities?: string;
  hiring_timeline?: string;
  actively_hiring?: boolean;
  required_skills: string[];
  experience_required: string;
  is_active: boolean;
  application_deadline?: string | null;
  posted_expires_at?: string | null;
  renewed_count?: number;
  created_by: string;
  created_at: string;
  application_count: number;
  department: string;
  status: "Active" | "Draft" | "Paused";
  recruiter_response_rate?: number;
  is_flagged?: boolean;
  fraud_flags?: string[];
  company_verification_level?: string;
  company_trust_score?: number;
  recruiter_status?: string;
  candidate_status?: string;
  has_applied?: boolean;
  can_apply?: boolean;
  deadline_passed?: boolean;
  applications_label?: string;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  candidate_name: string;
  candidate_email: string;
  candidate_location?: string;
  current_role?: string;
  current_company?: string;
  highest_qualification?: string;
  profile_completion_percentage?: number;
  status: "applied" | "shortlisted" | "interview" | "selected" | "rejected";
  score: number;
  assigned_to: string | null;
  notes: string | null;
  applied_at: string;
  skills: string[];
  experience_years: number;
  avatar: string;
  role: string;
  location: string;
  phone?: string;
  cgpa?: number;
  resume_url?: string;
  status_history?: { status: string; date: string }[];
}

export interface Interview {
  id: string;
  application_id: string;
  candidate_name: string;
  job_title: string;
  interviewer_id: string;
  interviewer_name: string;
  scheduled_at: string;
  status: "scheduled" | "rescheduled" | "completed" | "no-show" | "cancelled";
  interview_type: "technical" | "hr" | "manager";
  mode?: "online" | "offline";
  timezone?: string | null;
  notes: string;
  meeting_link?: string;
  location?: string;
  candidate_response_status?: "pending" | "confirmed" | "reschedule_requested" | "cancelled";
  candidate_response_reason?: string | null;
  candidate_preferred_slots?: string[];
  feedback_rating?: number | null;
  feedback_notes?: string | null;
  recruiter_decision?: "hire" | "reject" | "hold" | null;
  status_history?: { status: string; date: string }[];
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  receiver_name: string;
  message: string;
  sent_at: string;
  is_read: boolean;
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_avatar: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role?: UserRole;
  avatar?: string;
  company?: string;
  location?: string;
  experience_years?: number;

  // ✅ Add all missing fields
  full_name?: string;
  headline?: string;
  bio?: string;
  phone?: string;

  city?: string;
  state?: string;
  country?: string;

  current_role?: string;
  current_company?: string;

  total_experience_years?: number;

  notice_period_days?: number;

  current_salary?: string;
  expected_salary?: string;
  currency?: string;

  highest_qualification?: string;
  cgpa?: string;

  availability?: string;
  willing_to_relocate?: boolean;
  open_to_remote?: boolean;
  is_active_job_seeker?: boolean;

  preferred_locations?: string[];
  preferred_job_types?: string[];

  work_experiences?: any[];
  educations?: any[];
  skills?: any[];
  certifications?: any[];
  projects?: any[];
  social_links?: any[];
  languages?: any[];

  resume_url?: string;

  profile_completion_percentage?: number;
}

export type PipelineStatus = "applied" | "shortlisted" | "interview" | "selected" | "rejected";

export const PIPELINE_ORDER: PipelineStatus[] = ["applied", "shortlisted", "interview", "selected"];

export const isValidTransition = (from: PipelineStatus, to: PipelineStatus): boolean => {
  // Can always move to rejected (terminal state)
  if (to === "rejected") return true;
  
  // Can't move back from rejected
  if (from === "rejected") return false;
  
  const fromIdx = PIPELINE_ORDER.indexOf(from);
  const toIdx = PIPELINE_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  
  // Only allow forward moves to adjacent stages (one step forward)
  return toIdx === fromIdx + 1;
};

export interface CandidateProfile {
  id: number;
  user_id: number;

  full_name: string;
  email: string;
  phone: string;

  current_location: string;
  city: string;
  state: string;
  country: string;

  headline: string;
  bio: string;

  current_role: string;
  current_company: string;
  total_experience_years: number;
  notice_period_days: number;

  current_salary: number;
  expected_salary: number;
  currency: string;

  highest_qualification: string;
  cgpa: number;

  availability: string;
  willing_to_relocate: boolean;
  open_to_remote: boolean;
  is_active_job_seeker: boolean;

  preferred_locations: string[];
  preferred_job_types: string[];

  resume_url: string;

  work_experiences: any[];
  educations: any[];
  skills: any[];
  projects: any[];
  certifications: any[];
  social_links: any[];
  languages: any[];

  profile_completion_percentage: number;
}