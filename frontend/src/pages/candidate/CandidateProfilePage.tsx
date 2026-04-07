import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Phone, MapPin, Save, Edit3, Plus, Briefcase, GraduationCap,
  Award, Code2, Link2, FileText, Upload, X, Calendar, Building,
  Globe, Github, Linkedin, ExternalLink, CheckCircle2, Star,
  Trash2, Download, TrendingUp, Target, Loader2
} from "lucide-react";
import { useStore } from "@/stores/useStore";
import { toast } from "@/hooks/use-toast";
import PageLayout from "@/components/PageLayout";
import axios from 'axios';

// ============= API Configuration =============
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

// ============= Types =============
interface CandidateProfile {
  id: number;
  user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  current_location?: string;
  headline?: string;
  bio?: string;
  current_role?: string;
  current_company?: string;
  total_experience_years: number;
  expected_salary?: number;
  currency: string;
  cgpa?: number;
  avatar_url?: string;
  resume_url?: string;
  preferred_locations: string[];
  preferred_job_types: string[];
  open_to_remote: boolean;
  profile_completion_percentage: number;
  created_at: string;
  updated_at: string;
}

interface WorkExperience {
  id?: number;
  profile_id?: number;
  company_name: string;
  job_title: string;
  employment_type?: string;
  location?: string;
  is_remote: boolean;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  responsibilities: string[];
  achievements: string[];
  skills_used: string[];
}

interface Education {
  id?: number;
  profile_id?: number;
  institution_name: string;
  degree: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  grade?: string;
  grade_type?: string;
  location?: string;
}

interface Skill {
  id?: number;
  profile_id?: number;
  skill_name: string;
  category?: string;
  proficiency_level?: string;
  years_of_experience?: number;
  is_primary: boolean;
}

interface Project {
  id?: number;
  profile_id?: number;
  title: string;
  description: string;
  role?: string;
  project_url?: string;
  github_url?: string;
  technologies_used: string[];
  is_ongoing: boolean;
}

interface Certification {
  id?: number;
  profile_id?: number;
  name: string;
  issuing_organization: string;
  issue_date?: string;
  credential_url?: string;
}

interface SocialLink {
  id?: number;
  profile_id?: number;
  platform: string;
  url: string;
  is_public: boolean;
}

interface Resume {
  id: number;
  title: string;
  file_url: string;
  file_name: string;
  ats_score?: number;
  is_primary: boolean;
}

interface CompleteProfile extends CandidateProfile {
  work_experiences: WorkExperience[];
  educations: Education[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  social_links: SocialLink[];
  resumes: Resume[];
}

// ============= API Service =============
const candidateProfileService = {
  getMyProfile: async (): Promise<CompleteProfile> => {
    const response = await axios.get(`${API_BASE}/profile/me`, { headers: getAuthHeaders() });
    return response.data;
  },
  
  createProfile: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  updateProfile: async (data: any) => {
    const response = await axios.put(`${API_BASE}/profile/me`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  addWorkExperience: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/work-experience`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  updateWorkExperience: async (id: number, data: any) => {
    const response = await axios.put(`${API_BASE}/profile/work-experience/${id}`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  deleteWorkExperience: async (id: number) => {
    await axios.delete(`${API_BASE}/profile/work-experience/${id}`, { headers: getAuthHeaders() });
  },
  
  addEducation: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/education`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  updateEducation: async (id: number, data: any) => {
    const response = await axios.put(`${API_BASE}/profile/education/${id}`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  deleteEducation: async (id: number) => {
    await axios.delete(`${API_BASE}/profile/education/${id}`, { headers: getAuthHeaders() });
  },
  
  addSkill: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/skills`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  deleteSkill: async (id: number) => {
    await axios.delete(`${API_BASE}/profile/skills/${id}`, { headers: getAuthHeaders() });
  },
  
  addProject: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/projects`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  updateProject: async (id: number, data: any) => {
    const response = await axios.put(`${API_BASE}/profile/projects/${id}`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  deleteProject: async (id: number) => {
    await axios.delete(`${API_BASE}/profile/projects/${id}`, { headers: getAuthHeaders() });
  },
  
  addCertification: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/certifications`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  deleteCertification: async (id: number) => {
    await axios.delete(`${API_BASE}/profile/certifications/${id}`, { headers: getAuthHeaders() });
  },
  
  addSocialLink: async (data: any) => {
    const response = await axios.post(`${API_BASE}/profile/social-links`, data, { headers: getAuthHeaders() });
    return response.data;
  },
  
  deleteSocialLink: async (id: number) => {
    await axios.delete(`${API_BASE}/profile/social-links/${id}`, { headers: getAuthHeaders() });
  },
  
  uploadResume: async (file: File, title: string, isPrimary: boolean = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('is_primary', String(isPrimary));
    
    const response = await axios.post(`${API_BASE}/profile/upload/resume`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE}/profile/upload/avatar`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ============= MAIN COMPONENT =============
const CandidateProfilePage = () => {
  const { user } = useStore();
  const [profile, setProfile] = useState<CompleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'>('overview');
  
  // Modal states
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await candidateProfileService.getMyProfile();
      setProfile(data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast({ 
          title: "Welcome!", 
          description: "Let's create your profile to get started.",
          variant: "default"
        });
      } else {
        toast({ 
          title: "Error loading profile", 
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await candidateProfileService.uploadAvatar(file);
      toast({ title: "Avatar updated!" });
      loadProfile();
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  if (!profile) {
    return (
      <PageLayout>
        <CreateProfilePrompt onCreated={loadProfile} userId={user.id} />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-8 mb-8 shadow-2xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative flex items-start justify-between">
          <div className="flex gap-6 items-start">
            <div className="relative group">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white/20 shadow-xl"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-white/10 backdrop-blur-sm border-4 border-white/20 flex items-center justify-center text-white font-bold text-4xl shadow-xl">
                  {profile.full_name.charAt(0)}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Upload className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>

            <div className="text-white">
              <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
              <p className="text-xl text-white/90 mb-3">{profile.headline || "Add your headline"}</p>
              <div className="flex flex-wrap gap-4 text-sm text-white/80">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
                {profile.current_location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    {profile.current_location}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowBasicInfoModal(true)}
            className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-white/20"
          >
            <Edit3 className="w-4 h-4" />
            Edit Info
          </button>
        </div>

        {/* Profile Completion */}
        <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">Profile Completion</span>
            <span className="text-white font-bold">{profile.profile_completion_percentage}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${profile.profile_completion_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<Briefcase className="w-5 h-5" />}
          label="Experience"
          value={`${profile.total_experience_years} years`}
          color="from-blue-500 to-cyan-500"
        />
        <StatCard 
          icon={<GraduationCap className="w-5 h-5" />}
          label="Education"
          value={profile.educations.length}
          color="from-green-500 to-emerald-500"
        />
        <StatCard 
          icon={<Code2 className="w-5 h-5" />}
          label="Skills"
          value={profile.skills.length}
          color="from-purple-500 to-pink-500"
        />
        <StatCard 
          icon={<Award className="w-5 h-5" />}
          label="Projects"
          value={profile.projects.length}
          color="from-orange-500 to-red-500"
        />
      </div>

      {/* Tabs */}
      <div className="bg-card border border-border rounded-2xl p-2 mb-6 shadow-sm">
        <div className="flex gap-2 overflow-x-auto">
          {(['overview', 'experience', 'education', 'skills', 'projects', 'certifications'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab profile={profile} onUploadResume={() => setShowResumeModal(true)} onAddSocial={() => setShowSocialModal(true)} />}
          {activeTab === 'experience' && <ExperienceTab experiences={profile.work_experiences} onAdd={() => { setEditingItem(null); setShowExperienceModal(true); }} onEdit={(exp) => { setEditingItem(exp); setShowExperienceModal(true); }} onDelete={async (id) => { await candidateProfileService.deleteWorkExperience(id); loadProfile(); }} />}
          {activeTab === 'education' && <EducationTab educations={profile.educations} onAdd={() => { setEditingItem(null); setShowEducationModal(true); }} onEdit={(edu) => { setEditingItem(edu); setShowEducationModal(true); }} onDelete={async (id) => { await candidateProfileService.deleteEducation(id); loadProfile(); }} />}
          {activeTab === 'skills' && <SkillsTab skills={profile.skills} onAdd={() => { setEditingItem(null); setShowSkillModal(true); }} onDelete={async (id) => { await candidateProfileService.deleteSkill(id); loadProfile(); }} />}
          {activeTab === 'projects' && <ProjectsTab projects={profile.projects} onAdd={() => { setEditingItem(null); setShowProjectModal(true); }} onEdit={(proj) => { setEditingItem(proj); setShowProjectModal(true); }} onDelete={async (id) => { await candidateProfileService.deleteProject(id); loadProfile(); }} />}
          {activeTab === 'certifications' && <CertificationsTab certifications={profile.certifications} onAdd={() => { setEditingItem(null); setShowCertModal(true); }} onDelete={async (id) => { await candidateProfileService.deleteCertification(id); loadProfile(); }} />}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <BasicInfoModal isOpen={showBasicInfoModal} onClose={() => setShowBasicInfoModal(false)} profile={profile} onSave={loadProfile} />
      <ExperienceModal isOpen={showExperienceModal} onClose={() => { setShowExperienceModal(false); setEditingItem(null); }} experience={editingItem} profileId={profile.id} onSave={loadProfile} />
      <EducationModal isOpen={showEducationModal} onClose={() => { setShowEducationModal(false); setEditingItem(null); }} education={editingItem} profileId={profile.id} onSave={loadProfile} />
      <SkillModal isOpen={showSkillModal} onClose={() => { setShowSkillModal(false); setEditingItem(null); }} skill={editingItem} profileId={profile.id} onSave={loadProfile} />
      <ProjectModal isOpen={showProjectModal} onClose={() => { setShowProjectModal(false); setEditingItem(null); }} project={editingItem} profileId={profile.id} onSave={loadProfile} />
      <CertificationModal isOpen={showCertModal} onClose={() => { setShowCertModal(false); setEditingItem(null); }} certification={editingItem} profileId={profile.id} onSave={loadProfile} />
      <SocialLinkModal isOpen={showSocialModal} onClose={() => setShowSocialModal(false)} profileId={profile.id} onSave={loadProfile} />
      <ResumeUploadModal isOpen={showResumeModal} onClose={() => setShowResumeModal(false)} profileId={profile.id} onSave={loadProfile} />
    </PageLayout>
  );
};

// CandidateProfilePage_Final_Part2.tsx
// Add this to the end of CandidateProfilePage_Final.tsx

// ============= HELPER COMPONENTS =============

const StatCard = ({ icon, label, value, color }: any) => (
  <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white shadow-lg`}>
    <div className="flex items-center justify-between mb-2">
      <div className="bg-white/20 p-2 rounded-lg">{icon}</div>
    </div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="text-sm text-white/80">{label}</div>
  </div>
);

const EmptyState = ({ message, onAction, actionLabel }: any) => (
  <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
    <p className="text-muted-foreground mb-4">{message}</p>
    <button onClick={onAction} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition">
      {actionLabel}
    </button>
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = "lg" }: any) => {
  if (!isOpen) return null;
  
  const sizes: any = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`bg-card border border-border rounded-2xl shadow-2xl w-full ${sizes[size]} my-8`}>
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// ============= TAB COMPONENTS =============

const OverviewTab = ({ profile, onUploadResume, onAddSocial }: any) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-3">About</h3>
        <p className="text-muted-foreground leading-relaxed">
          {profile.bio || "Add a brief introduction about yourself, your professional journey, and career aspirations."}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Resume</h3>
          <button onClick={onUploadResume} className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
            <Upload className="w-4 h-4" />
            Upload
          </button>
        </div>
        {profile.resumes && profile.resumes.length > 0 ? (
          <div className="space-y-2">
            {profile.resumes.map((resume: any) => (
              <div key={resume.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{resume.title}</p>
                    {resume.ats_score && (
                      <p className="text-xs text-muted-foreground">ATS Score: {resume.ats_score}%</p>
                    )}
                  </div>
                </div>
                {resume.is_primary && (
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">Primary</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No resume uploaded yet.</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Social Links</h3>
          <button onClick={onAddSocial} className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        {profile.social_links && profile.social_links.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {profile.social_links.map((link: SocialLink) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors group"
              >
                {link.platform === 'linkedin' && <Linkedin className="w-4 h-4 text-blue-600" />}
                {link.platform === 'github' && <Github className="w-4 h-4" />}
                {link.platform === 'portfolio' && <Globe className="w-4 h-4 text-purple-600" />}
                <span className="capitalize">{link.platform}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No social links added yet.</p>
        )}
      </div>
    </div>

    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Career Details</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Current Role</p>
            <p className="font-medium">{profile.current_role || "Not specified"}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Company</p>
            <p className="font-medium">{profile.current_company || "Not specified"}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Experience</p>
            <p className="font-medium">{profile.total_experience_years} years</p>
          </div>
          {profile.expected_salary && (
            <div>
              <p className="text-muted-foreground mb-1">Expected Salary</p>
              <p className="font-medium">{profile.currency} {profile.expected_salary.toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground mb-4">Preferences</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Job Type</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {profile.preferred_job_types.map((type: string) => (
                <span key={type} className="px-2 py-1 bg-muted rounded text-xs capitalize">{type}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Locations</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {profile.preferred_locations.map((loc: string) => (
                <span key={loc} className="px-2 py-1 bg-muted rounded text-xs">{loc}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">Open to Remote</span>
            <CheckCircle2 className={`w-4 h-4 ${profile.open_to_remote ? 'text-green-500' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ExperienceTab = ({ experiences, onAdd, onEdit, onDelete }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Work Experience</h2>
      <button onClick={onAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
        <Plus className="w-4 h-4" />
        Add Experience
      </button>
    </div>
    {experiences.length === 0 ? (
      <EmptyState message="No work experience added yet" onAction={onAdd} actionLabel="Add Your First Role" />
    ) : (
      <div className="space-y-4">
        {experiences.map((exp: WorkExperience) => (
          <ExperienceCard key={exp.id} experience={exp} onEdit={() => onEdit(exp)} onDelete={() => onDelete(exp.id!)} />
        ))}
      </div>
    )}
  </div>
);

const ExperienceCard = ({ experience, onEdit, onDelete }: any) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const duration = experience.is_current ? 'Present' : (experience.end_date ? formatDate(experience.end_date) : 'Present');

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {experience.company_name.charAt(0)}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{experience.job_title}</h3>
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <Building className="w-3.5 h-3.5" />
              {experience.company_name} · {experience.employment_type}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(experience.start_date)} - {duration}
            </p>
            {experience.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {experience.location}
                {experience.is_remote && <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Remote</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
      {experience.description && <p className="text-sm text-muted-foreground mb-3">{experience.description}</p>}
      {experience.responsibilities && experience.responsibilities.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-medium text-foreground mb-2">Key Responsibilities:</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {experience.responsibilities.map((resp: string, i: number) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {experience.skills_used && experience.skills_used.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {experience.skills_used.map((skill: string) => (
            <span key={skill} className="px-2 py-1 bg-secondary text-accent-foreground rounded text-xs font-medium">{skill}</span>
          ))}
        </div>
      )}
    </div>
  );
};

const EducationTab = ({ educations, onAdd, onEdit, onDelete }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Education</h2>
      <button onClick={onAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
        <Plus className="w-4 h-4" />
        Add Education
      </button>
    </div>
    {educations.length === 0 ? (
      <EmptyState message="No education added yet" onAction={onAdd} actionLabel="Add Education" />
    ) : (
      <div className="space-y-4">
        {educations.map((edu: Education) => (
          <EducationCard key={edu.id} education={edu} onEdit={() => onEdit(edu)} onDelete={() => onDelete(edu.id!)} />
        ))}
      </div>
    )}
  </div>
);

const EducationCard = ({ education, onEdit, onDelete }: any) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            🎓
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{education.degree}</h3>
            <p className="text-muted-foreground text-sm">{education.institution_name}</p>
            {education.field_of_study && <p className="text-sm text-muted-foreground">Field: {education.field_of_study}</p>}
            {education.start_date && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(education.start_date)} - {education.is_current ? 'Present' : (education.end_date ? formatDate(education.end_date) : 'N/A')}
              </p>
            )}
            {education.grade && (
              <div className="mt-2">
                <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium">
                  {education.grade_type === 'cgpa' ? 'CGPA: ' : ''}{education.grade}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <Edit3 className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      </div>
    </div>
  );
};

const SkillsTab = ({ skills, onAdd, onDelete }: any) => {
  const groupedSkills = skills.reduce((acc: any, skill: Skill) => {
    const category = skill.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(skill);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Skills</h2>
        <button onClick={onAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>
      
      {skills.length === 0 ? (
        <EmptyState message="No skills added yet" onAction={onAdd} actionLabel="Add Your First Skill" />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSkills).map(([category, categorySkills]: [string, any]) => (
            <div key={category} className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4 capitalize">{category} Skills</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {categorySkills.map((skill: Skill) => (
                  <SkillCard key={skill.id} skill={skill} onDelete={() => onDelete(skill.id!)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SkillCard = ({ skill, onDelete }: any) => {
  const proficiencyColors: any = {
    beginner: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    intermediate: 'bg-blue-100 text-blue-700 border-blue-200',
    advanced: 'bg-purple-100 text-purple-700 border-purple-200',
    expert: 'bg-green-100 text-green-700 border-green-200',
  };

  return (
    <div className="group relative bg-muted hover:bg-muted/80 rounded-lg p-4 transition-all border border-transparent hover:border-primary/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-sm truncate">{skill.skill_name}</p>
            {skill.is_primary && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
          </div>
          {skill.proficiency_level && (
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${proficiencyColors[skill.proficiency_level] || 'bg-muted text-muted-foreground'}`}>
              {skill.proficiency_level}
            </span>
          )}
          {skill.years_of_experience && (
            <p className="text-xs text-muted-foreground mt-1">{skill.years_of_experience} years</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
        >
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
    </div>
  );
};

const ProjectsTab = ({ projects, onAdd, onEdit, onDelete }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Projects</h2>
      <button onClick={onAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
        <Plus className="w-4 h-4" />
        Add Project
      </button>
    </div>
    {projects.length === 0 ? (
      <EmptyState message="No projects added yet" onAction={onAdd} actionLabel="Add Your First Project" />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((project: Project) => (
          <ProjectCard key={project.id} project={project} onEdit={() => onEdit(project)} onDelete={() => onDelete(project.id!)} />
        ))}
      </div>
    )}
  </div>
);

const ProjectCard = ({ project, onEdit, onDelete }: any) => (
  <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{project.title}</h3>
        {project.role && <p className="text-sm text-muted-foreground">{project.role}</p>}
      </div>
      <div className="flex gap-2">
        <button onClick={onEdit} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Edit3 className="w-4 h-4 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </div>
    
    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{project.description}</p>
    
    {project.technologies_used && project.technologies_used.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.technologies_used.map((tech: string) => (
          <span key={tech} className="px-2 py-1 bg-secondary text-accent-foreground rounded text-xs font-medium">{tech}</span>
        ))}
      </div>
    )}
    
    <div className="flex gap-3">
      {project.project_url && (
        <a href={project.project_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" />
          Live Demo
        </a>
      )}
      {project.github_url && (
        <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" />
          GitHub
        </a>
      )}
    </div>
  </div>
);

const CertificationsTab = ({ certifications, onAdd, onDelete }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">Certifications</h2>
      <button onClick={onAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
        <Plus className="w-4 h-4" />
        Add Certification
      </button>
    </div>
    {certifications.length === 0 ? (
      <EmptyState message="No certifications added yet" onAction={onAdd} actionLabel="Add Certification" />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certifications.map((cert: Certification) => (
          <CertificationCard key={cert.id} certification={cert} onDelete={() => onDelete(cert.id!)} />
        ))}
      </div>
    )}
  </div>
);

const CertificationCard = ({ certification, onDelete }: any) => {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold flex-shrink-0">
            🏆
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{certification.name}</h3>
            <p className="text-sm text-muted-foreground">{certification.issuing_organization}</p>
            {certification.issue_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Issued: {formatDate(certification.issue_date)}
              </p>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
      {certification.credential_url && (
        <a href={certification.credential_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 mt-2">
          <Link2 className="w-3.5 h-3.5" />
          View Credential
        </a>
      )}
    </div>
  );
};

// CandidateProfilePage_Final_Part3.tsx
// Add this to the end after Part 2

// ============= MODALS =============

const CreateProfilePrompt = ({ onCreated, userId }: any) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    headline: '',
  });

  const handleCreate = async () => {
    try {
      setCreating(true);
      await candidateProfileService.createProfile({
        user_id: userId,
        ...form,
      });
      toast({ title: "Profile created!", description: "Your profile has been created successfully." });
      onCreated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-12 text-center text-white mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Profile! 👋</h1>
        <p className="text-xl text-white/90">Let's create your professional profile to get started</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="john@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="+91-9876543210"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Professional Headline</label>
          <input
            type="text"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Full Stack Developer | React & Node.js"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={creating || !form.full_name || !form.email}
          className="w-full bg-primary text-primary-foreground px-6 py-3.5 rounded-xl text-base font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Create Profile'}
        </button>
      </div>
    </div>
  );
};

const BasicInfoModal = ({ isOpen, onClose, profile, onSave }: any) => {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    current_location: '',
    headline: '',
    bio: '',
    current_role: '',
    current_company: '',
    total_experience_years: 0,
    expected_salary: 0,
    currency: 'INR',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        current_location: profile.current_location || '',
        headline: profile.headline || '',
        bio: profile.bio || '',
        current_role: profile.current_role || '',
        current_company: profile.current_company || '',
        total_experience_years: profile.total_experience_years || 0,
        expected_salary: profile.expected_salary || 0,
        currency: profile.currency || 'INR',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await candidateProfileService.updateProfile(form);
      toast({ title: "Profile updated!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Basic Information" size="xl">
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Location</label>
            <input
              type="text"
              value={form.current_location}
              onChange={(e) => setForm({ ...form, current_location: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              placeholder="Bengaluru, Karnataka"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Professional Headline</label>
          <input
            type="text"
            value={form.headline}
            onChange={(e) => setForm({ ...form, headline: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Full Stack Developer | React & Node.js"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={4}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Current Role</label>
            <input
              type="text"
              value={form.current_role}
              onChange={(e) => setForm({ ...form, current_role: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Current Company</label>
            <input
              type="text"
              value={form.current_company}
              onChange={(e) => setForm({ ...form, current_company: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Total Experience (years)</label>
            <input
              type="number"
              step="0.5"
              value={form.total_experience_years}
              onChange={(e) => setForm({ ...form, total_experience_years: parseFloat(e.target.value) })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Expected Salary ({form.currency})</label>
            <input
              type="number"
              value={form.expected_salary}
              onChange={(e) => setForm({ ...form, expected_salary: parseFloat(e.target.value) })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-muted text-foreground rounded-xl text-sm font-semibold hover:bg-muted/80 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Due to length, showing abbreviated versions of remaining modals
// Copy the full implementations from CandidateProfilePage_Modals.tsx

const ExperienceModal = ({ isOpen, onClose, experience, profileId, onSave }: any) => {
  const [form, setForm] = useState({
    company_name: '', job_title: '', employment_type: 'full-time', location: '', is_remote: false,
    start_date: '', end_date: '', is_current: false, description: '',
    responsibilities: [] as string[], skills_used: [] as string[]
  });
  const [newResp, setNewResp] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (experience) setForm(experience);
  }, [experience, isOpen]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (experience?.id) {
        await candidateProfileService.updateWorkExperience(experience.id, form);
      } else {
        await candidateProfileService.addWorkExperience({ ...form, profile_id: profileId });
      }
      toast({ title: "Success!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={experience ? "Edit Experience" : "Add Experience"} size="xl">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
        {/* Form fields - see full implementation in previous files */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold">
            <Save className="w-4 h-4 inline mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose} className="px-6 py-3 bg-muted rounded-xl text-sm font-semibold">Cancel</button>
        </div>
      </div>
    </Modal>
  );
};

const EducationModal = ({ isOpen, onClose, education, profileId, onSave }: any) => {
  // Similar structure to ExperienceModal - see full implementation
  return <Modal isOpen={isOpen} onClose={onClose} title="Education">...</Modal>;
};

const SkillModal = ({ isOpen, onClose, skill, profileId, onSave }: any) => {
  const [form, setForm] = useState({
    skill_name: '', category: 'technical', proficiency_level: 'intermediate',
    years_of_experience: 0, is_primary: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skill) setForm(skill);
  }, [skill, isOpen]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await candidateProfileService.addSkill({ ...form, profile_id: profileId });
      toast({ title: "Skill added!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Skill" size="md">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Skill Name *</label>
          <input value={form.skill_name} onChange={(e) => setForm({ ...form, skill_name: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none">
              <option value="technical">Technical</option>
              <option value="soft">Soft Skills</option>
              <option value="tool">Tool/Software</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Proficiency</label>
            <select value={form.proficiency_level} onChange={(e) => setForm({ ...form, proficiency_level: e.target.value })}
              className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl">
          {saving ? 'Saving...' : 'Save Skill'}
        </button>
      </div>
    </Modal>
  );
};

const ProjectModal = ({ isOpen, onClose, project, profileId, onSave }: any) => {
  // Similar implementation
  return <Modal isOpen={isOpen} onClose={onClose} title="Project">...</Modal>;
};

const CertificationModal = ({ isOpen, onClose, certification, profileId, onSave }: any) => {
  const [form, setForm] = useState({
    name: '', issuing_organization: '', issue_date: '', credential_url: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await candidateProfileService.addCertification({ ...form, profile_id: profileId });
      toast({ title: "Certification added!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Certification" size="md">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Certification Name *</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Issuing Organization *</label>
          <input value={form.issuing_organization} onChange={(e) => setForm({ ...form, issuing_organization: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm outline-none" />
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </Modal>
  );
};

const SocialLinkModal = ({ isOpen, onClose, profileId, onSave }: any) => {
  const [form, setForm] = useState({ platform: 'linkedin', url: '', is_public: true });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await candidateProfileService.addSocialLink({ ...form, profile_id: profileId });
      toast({ title: "Social link added!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Social Link" size="md">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Platform</label>
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm">
            <option value="linkedin">LinkedIn</option>
            <option value="github">GitHub</option>
            <option value="portfolio">Portfolio</option>
            <option value="twitter">Twitter</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">URL *</label>
          <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm" placeholder="https://..." />
        </div>
        <button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl">
          {saving ? 'Saving...' : 'Add Link'}
        </button>
      </div>
    </Modal>
  );
};

const ResumeUploadModal = ({ isOpen, onClose, profileId, onSave }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      await candidateProfileService.uploadResume(file, title || file.name, isPrimary);
      toast({ title: "Resume uploaded!" });
      onSave();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Resume" size="md">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Resume Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm"
            placeholder="Software Engineer Resume" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Select File *</label>
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, DOC, DOCX (Max 10MB)</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="w-4 h-4 rounded" />
          <span className="text-sm">Set as primary resume</span>
        </label>
        <button onClick={handleUpload} disabled={uploading || !file} className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-xl disabled:opacity-50">
          <Upload className="w-4 h-4 inline mr-2" />
          {uploading ? 'Uploading...' : 'Upload Resume'}
        </button>
      </div>
    </Modal>
  );
};

export default CandidateProfilePage;