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

export interface ForumCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
  icon?: string | null;
  thread_count: number;
}

export interface ForumThread {
  id: number;
  author_id: number;
  title: string;
  body: string;
  author_name: string;
  author_role: UserRole;
  category_name: string;
  category_slug?: string | null;
  is_pinned: boolean;
  is_locked: boolean;
  is_flagged: boolean;
  view_count: number;
  reply_count: number;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  is_upvoted?: boolean | null;
}

export interface ForumPost {
  id: number;
  thread_id: number;
  author_id: number;
  author_name: string;
  author_role: UserRole;
  body: string;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  is_upvoted?: boolean | null;
}

export interface ForumThreadDetail extends ForumThread {
  posts: ForumPost[];
}

export interface ForumThreadPage {
  items: ForumThread[];
  total: number;
  page: number;
  pages: number;
}

export interface ForumUpvoteResponse {
  upvoted: boolean;
  upvote_count: number;
}

export interface ForumReportPayload {
  thread_id?: number | null;
  post_id?: number | null;
  reason: string;
}

export interface ForumModerationItem {
  type: "thread" | "post";
  id: number;
  content_preview: string;
  author_name: string;
  report_count: number;
  reasons: string[];
  report_ids: number[];
  created_at: string;
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
  if (from === to) return true;

  const transitions: Record<PipelineStatus, PipelineStatus[]> = {
    applied: ["shortlisted", "rejected"],
    shortlisted: ["interview", "rejected"],
    interview: ["selected", "rejected"],
    selected: [],
    rejected: [],
  };

  return transitions[from]?.includes(to) ?? false;
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