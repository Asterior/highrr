import { Job, Application, Interview, Conversation, CurrentUser } from "./types";

export const currentUser: CurrentUser = {
  id: "user-1",
  name: "Rajesh Kumar",
  email: "rajesh@highrr.com",
  avatar: "RK",
  company: "Highrr Inc.",
  role: "recruiter",
};

export const candidateUser: CurrentUser = {
  id: "cand-1",
  name: "Priya Sharma",
  email: "priya@gmail.com",
  avatar: "PS",
  company: "",
  role: "candidate",
  phone: "+91 9876543210",
  skills: ["React", "TypeScript", "Node.js", "GraphQL", "Next.js", "Tailwind CSS"],
  experience_years: 6,
  cgpa: 8.7,
  bio: "Passionate frontend engineer with 6+ years of experience building scalable React applications. Love clean code and great UX.",
  projects: [
    { name: "E-commerce Platform", desc: "Built scalable microservices architecture serving 2M+ users" },
    { name: "Real-time Analytics Dashboard", desc: "Designed real-time data pipeline processing 10K events/sec" },
    { name: "Design System Library", desc: "Created reusable component library used across 5 products" },
  ],
  certifications: ["AWS Solutions Architect", "Google Cloud Professional", "Meta Frontend Developer"],
};

export const mockUsers: { email: string; password: string; user: CurrentUser }[] = [
  { email: "rajesh@highrr.com", password: "admin123", user: currentUser },
  { email: "priya@gmail.com", password: "candidate123", user: candidateUser },
  { email: "admin@highrr.com", password: "admin123", user: { id: "admin-1", name: "Admin User", email: "admin@highrr.com", avatar: "AU", company: "Highrr Inc.", role: "admin" } },
];

export const mockJobs: Job[] = [
  { id: "job-1", title: "Sr. Frontend Engineer", description: "Build and maintain modern React applications with TypeScript. You will work closely with our design and product teams to deliver pixel-perfect UIs with exceptional performance. Responsibilities include architecting component libraries, optimizing bundle sizes, implementing CI/CD pipelines for frontend, and mentoring junior developers.", location: "Bangalore, IN", salary: "₹25-35 LPA", job_type: "full-time", required_skills: ["React", "TypeScript", "Node.js", "GraphQL"], experience_required: "5+ years", is_active: true, created_by: "user-1", created_at: "2026-03-15T10:00:00Z", application_count: 86, department: "Engineering", status: "Active" },
  { id: "job-2", title: "Product Designer", description: "Design intuitive user experiences for our SaaS platform. Lead the design process from research to high-fidelity prototypes.", location: "Remote", salary: "₹18-28 LPA", job_type: "full-time", required_skills: ["Figma", "UX Research", "Prototyping", "Design Systems"], experience_required: "3-5 years", is_active: true, created_by: "user-1", created_at: "2026-03-18T10:00:00Z", application_count: 52, department: "Design", status: "Active" },
  { id: "job-3", title: "Backend Developer", description: "Design and implement scalable backend services using Go and PostgreSQL.", location: "Mumbai, IN", salary: "₹22-32 LPA", job_type: "full-time", required_skills: ["Go", "PostgreSQL", "AWS", "gRPC"], experience_required: "4+ years", is_active: true, created_by: "user-1", created_at: "2026-03-20T10:00:00Z", application_count: 124, department: "Engineering", status: "Active" },
  { id: "job-4", title: "Product Manager", description: "Lead product strategy and roadmap for hiring tools.", location: "Delhi, IN", salary: "₹30-45 LPA", job_type: "full-time", required_skills: ["Product Strategy", "Agile", "SQL", "Analytics"], experience_required: "5+ years", is_active: false, created_by: "user-1", created_at: "2026-03-22T10:00:00Z", application_count: 38, department: "Product", status: "Draft" },
  { id: "job-5", title: "DevOps Engineer", description: "Manage cloud infrastructure and CI/CD pipelines.", location: "Hyderabad, IN", salary: "₹20-30 LPA", job_type: "full-time", required_skills: ["Kubernetes", "Terraform", "CI/CD", "AWS"], experience_required: "3+ years", is_active: true, created_by: "user-1", created_at: "2026-03-25T10:00:00Z", application_count: 67, department: "Engineering", status: "Active" },
  { id: "job-6", title: "Data Scientist", description: "Build ML models for candidate matching and scoring.", location: "Remote", salary: "₹28-40 LPA", job_type: "full-time", required_skills: ["Python", "ML", "TensorFlow", "SQL"], experience_required: "3+ years", is_active: false, created_by: "user-1", created_at: "2026-03-28T10:00:00Z", application_count: 93, department: "Data", status: "Paused" },
];

export const mockApplications: Application[] = [
  { id: "app-1", user_id: "cand-1", job_id: "job-1", candidate_name: "Priya Sharma", candidate_email: "priya@gmail.com", status: "interview", score: 94, assigned_to: "user-1", notes: "Strong React skills, excellent portfolio", applied_at: "2026-03-16T10:00:00Z", skills: ["React", "TypeScript", "Node.js", "GraphQL"], experience_years: 6, avatar: "PS", role: "Sr. Frontend Engineer", location: "Bangalore, IN", phone: "+91 9876543210", cgpa: 8.7, status_history: [{ status: "applied", date: "2026-03-16" }, { status: "shortlisted", date: "2026-03-18" }, { status: "interview", date: "2026-03-22" }] },
  { id: "app-2", user_id: "cand-2", job_id: "job-3", candidate_name: "Alex Chen", candidate_email: "alex@gmail.com", status: "shortlisted", score: 91, assigned_to: "user-1", notes: "Great backend experience", applied_at: "2026-03-17T10:00:00Z", skills: ["Go", "PostgreSQL", "AWS", "Docker"], experience_years: 5, avatar: "AC", role: "Backend Developer", location: "Remote", phone: "+1 5551234567", cgpa: 9.1, status_history: [{ status: "applied", date: "2026-03-17" }, { status: "shortlisted", date: "2026-03-20" }] },
  { id: "app-3", user_id: "cand-3", job_id: "job-2", candidate_name: "Maria Garcia", candidate_email: "maria@gmail.com", status: "applied", score: 89, assigned_to: null, notes: null, applied_at: "2026-03-19T10:00:00Z", skills: ["Figma", "UX Research", "Prototyping"], experience_years: 4, avatar: "MG", role: "Product Designer", location: "Remote", phone: "+34 612345678", cgpa: 8.2, status_history: [{ status: "applied", date: "2026-03-19" }] },
  { id: "app-4", user_id: "cand-4", job_id: "job-1", candidate_name: "David Kim", candidate_email: "david@gmail.com", status: "interview", score: 87, assigned_to: "user-1", notes: "Full stack expertise", applied_at: "2026-03-20T10:00:00Z", skills: ["React", "Python", "Docker", "AWS"], experience_years: 5, avatar: "DK", role: "Full Stack Developer", location: "Seoul, KR", phone: "+82 1012345678", status_history: [{ status: "applied", date: "2026-03-20" }, { status: "shortlisted", date: "2026-03-23" }, { status: "interview", date: "2026-03-26" }] },
  { id: "app-5", user_id: "cand-5", job_id: "job-5", candidate_name: "Sarah Johnson", candidate_email: "sarah@gmail.com", status: "applied", score: 85, assigned_to: null, notes: null, applied_at: "2026-03-21T10:00:00Z", skills: ["Kubernetes", "Terraform", "CI/CD", "AWS"], experience_years: 4, avatar: "SJ", role: "DevOps Engineer", location: "Austin, US", phone: "+1 5559876543", status_history: [{ status: "applied", date: "2026-03-21" }] },
  { id: "app-6", user_id: "cand-6", job_id: "job-6", candidate_name: "Raj Patel", candidate_email: "raj@gmail.com", status: "selected", score: 82, assigned_to: "user-1", notes: "Strong ML background", applied_at: "2026-03-22T10:00:00Z", skills: ["Python", "ML", "TensorFlow", "SQL"], experience_years: 3, avatar: "RP", role: "Data Scientist", location: "Mumbai, IN", phone: "+91 9123456789", cgpa: 8.9, status_history: [{ status: "applied", date: "2026-03-22" }, { status: "shortlisted", date: "2026-03-24" }, { status: "interview", date: "2026-03-27" }, { status: "selected", date: "2026-03-30" }] },
  { id: "app-7", user_id: "cand-7", job_id: "job-1", candidate_name: "Emily Watson", candidate_email: "emily@gmail.com", status: "rejected", score: 62, assigned_to: "user-1", notes: "Lacks required experience", applied_at: "2026-03-23T10:00:00Z", skills: ["React", "JavaScript", "CSS"], experience_years: 2, avatar: "EW", role: "Frontend Developer", location: "London, UK", phone: "+44 7911123456", status_history: [{ status: "applied", date: "2026-03-23" }, { status: "rejected", date: "2026-03-25" }] },
  { id: "app-8", user_id: "cand-8", job_id: "job-3", candidate_name: "James Wilson", candidate_email: "james@gmail.com", status: "shortlisted", score: 78, assigned_to: null, notes: null, applied_at: "2026-03-24T10:00:00Z", skills: ["Go", "Redis", "PostgreSQL"], experience_years: 3, avatar: "JW", role: "Backend Developer", location: "Chicago, US", phone: "+1 5551112233", status_history: [{ status: "applied", date: "2026-03-24" }, { status: "shortlisted", date: "2026-03-27" }] },
  { id: "app-9", user_id: "cand-9", job_id: "job-2", candidate_name: "Lisa Park", candidate_email: "lisa@gmail.com", status: "applied", score: 76, assigned_to: null, notes: null, applied_at: "2026-03-25T10:00:00Z", skills: ["Figma", "Sketch", "UI Design"], experience_years: 2, avatar: "LP", role: "UI Designer", location: "Tokyo, JP", phone: "+81 9012345678", status_history: [{ status: "applied", date: "2026-03-25" }] },
  { id: "app-10", user_id: "cand-10", job_id: "job-5", candidate_name: "Omar Hassan", candidate_email: "omar@gmail.com", status: "interview", score: 88, assigned_to: "user-1", notes: "Excellent infrastructure knowledge", applied_at: "2026-03-26T10:00:00Z", skills: ["Kubernetes", "Docker", "Terraform", "GCP"], experience_years: 6, avatar: "OH", role: "Sr. DevOps Engineer", location: "Dubai, UAE", phone: "+971 501234567", cgpa: 7.8, status_history: [{ status: "applied", date: "2026-03-26" }, { status: "shortlisted", date: "2026-03-28" }, { status: "interview", date: "2026-03-31" }] },
];

export const mockInterviews: Interview[] = [
  { id: "int-1", application_id: "app-1", candidate_name: "Priya Sharma", job_title: "Sr. Frontend Engineer", interviewer_id: "user-1", interviewer_name: "Amit Kumar", scheduled_at: "2026-04-01T10:00:00Z", status: "scheduled", interview_type: "technical", notes: "Focus on React architecture and system design", meeting_link: "https://meet.google.com/abc-defg-hij" },
  { id: "int-2", application_id: "app-2", candidate_name: "Alex Chen", job_title: "Backend Developer", interviewer_id: "user-2", interviewer_name: "Neha Singh", scheduled_at: "2026-04-01T14:00:00Z", status: "scheduled", interview_type: "technical", notes: "Go proficiency and distributed systems", meeting_link: "https://meet.google.com/klm-nopq-rst" },
  { id: "int-3", application_id: "app-4", candidate_name: "David Kim", job_title: "Sr. Frontend Engineer", interviewer_id: "user-3", interviewer_name: "Rahul Verma", scheduled_at: "2026-04-02T11:00:00Z", status: "scheduled", interview_type: "hr", notes: "Culture fit and team collaboration" },
  { id: "int-4", application_id: "app-10", candidate_name: "Omar Hassan", job_title: "DevOps Engineer", interviewer_id: "user-1", interviewer_name: "Amit Kumar", scheduled_at: "2026-04-03T15:00:00Z", status: "scheduled", interview_type: "manager", notes: "Infrastructure strategy discussion" },
  { id: "int-5", application_id: "app-6", candidate_name: "Raj Patel", job_title: "Data Scientist", interviewer_id: "user-2", interviewer_name: "Neha Singh", scheduled_at: "2026-03-28T10:00:00Z", status: "completed", interview_type: "technical", notes: "Strong ML fundamentals, recommended for offer" },
];

export const mockConversations: Conversation[] = [
  {
    id: "conv-1", participant_id: "cand-1", participant_name: "Priya Sharma", participant_avatar: "PS",
    last_message: "Thanks for the update!", last_message_time: "2m ago", unread_count: 2,
    messages: [
      { id: "msg-1", sender_id: "cand-1", sender_name: "Priya Sharma", receiver_id: "user-1", receiver_name: "Rajesh Kumar", message: "Hi, I wanted to follow up on my application for the Frontend role.", sent_at: "2026-04-01T10:30:00Z", is_read: true },
      { id: "msg-2", sender_id: "user-1", sender_name: "Rajesh Kumar", receiver_id: "cand-1", receiver_name: "Priya Sharma", message: "Hi Priya! Thanks for reaching out. We've reviewed your application and would love to schedule an interview.", sent_at: "2026-04-01T10:35:00Z", is_read: true },
      { id: "msg-3", sender_id: "cand-1", sender_name: "Priya Sharma", receiver_id: "user-1", receiver_name: "Rajesh Kumar", message: "That's great news! I'm available any time this week.", sent_at: "2026-04-01T10:37:00Z", is_read: true },
      { id: "msg-4", sender_id: "user-1", sender_name: "Rajesh Kumar", receiver_id: "cand-1", receiver_name: "Priya Sharma", message: "Perfect. How about Tuesday at 2 PM? We'll do a technical round followed by a culture fit discussion.", sent_at: "2026-04-01T10:40:00Z", is_read: true },
      { id: "msg-5", sender_id: "cand-1", sender_name: "Priya Sharma", receiver_id: "user-1", receiver_name: "Rajesh Kumar", message: "Thanks for the update!", sent_at: "2026-04-01T10:42:00Z", is_read: false },
    ],
  },
  {
    id: "conv-2", participant_id: "cand-2", participant_name: "Alex Chen", participant_avatar: "AC",
    last_message: "Looking forward to the interview", last_message_time: "1h ago", unread_count: 0,
    messages: [
      { id: "msg-6", sender_id: "user-1", sender_name: "Rajesh Kumar", receiver_id: "cand-2", receiver_name: "Alex Chen", message: "Hi Alex, we'd like to invite you for a technical interview for the Backend Developer role.", sent_at: "2026-04-01T09:00:00Z", is_read: true },
      { id: "msg-7", sender_id: "cand-2", sender_name: "Alex Chen", receiver_id: "user-1", receiver_name: "Rajesh Kumar", message: "Looking forward to the interview", sent_at: "2026-04-01T09:30:00Z", is_read: true },
    ],
  },
  {
    id: "conv-3", participant_id: "cand-3", participant_name: "Maria Garcia", participant_avatar: "MG",
    last_message: "I've sent my portfolio", last_message_time: "3h ago", unread_count: 1,
    messages: [
      { id: "msg-8", sender_id: "cand-3", sender_name: "Maria Garcia", receiver_id: "user-1", receiver_name: "Rajesh Kumar", message: "I've sent my portfolio", sent_at: "2026-04-01T07:00:00Z", is_read: false },
    ],
  },
  {
    id: "conv-4", participant_id: "cand-4", participant_name: "David Kim", participant_avatar: "DK",
    last_message: "Can we reschedule?", last_message_time: "1d ago", unread_count: 0,
    messages: [
      { id: "msg-9", sender_id: "cand-4", sender_name: "David Kim", receiver_id: "user-1", receiver_name: "Rajesh Kumar", message: "Can we reschedule?", sent_at: "2026-03-31T10:00:00Z", is_read: true },
    ],
  },
];
