export type UserRole = "admin" | "recruiter" | "candidate";

export interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  job_type: "full-time" | "intern" | "contract";
  required_skills: string[];
  experience_required: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  application_count: number;
  department: string;
  status: "Active" | "Draft" | "Paused";
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  candidate_name: string;
  candidate_email: string;
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
  status: "scheduled" | "completed" | "cancelled";
  interview_type: "technical" | "hr" | "manager";
  notes: string;
  meeting_link?: string;
  location?: string;
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
  id: string;
  name: string;
  email: string;
  avatar: string;
  company: string;
  role: UserRole;
  phone?: string;
  skills?: string[];
  experience_years?: number;
  cgpa?: number;
  bio?: string;
  projects?: { name: string; desc: string }[];
  certifications?: string[];
}

export type PipelineStatus = "applied" | "shortlisted" | "interview" | "selected" | "rejected";

export const PIPELINE_ORDER: PipelineStatus[] = ["applied", "shortlisted", "interview", "selected"];

export const isValidTransition = (from: PipelineStatus, to: PipelineStatus): boolean => {
  if (to === "rejected") return true;
  const fromIdx = PIPELINE_ORDER.indexOf(from);
  const toIdx = PIPELINE_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) return false;
  return Math.abs(toIdx - fromIdx) <= 1;
};
