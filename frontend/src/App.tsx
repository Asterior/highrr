import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import CandidateNavbar from "@/components/CandidateNavbar";
import ChatBot from "@/components/ChatBot";
import { getRecruiterVerificationStatus } from "@/services/api";
import { useStore } from "@/stores/useStore";

const Overview = lazy(() => import("@/pages/Overview"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobCreate = lazy(() => import("@/pages/JobCreate"));
const JobDetails = lazy(() => import("@/pages/JobDetails"));
const Candidates = lazy(() => import("@/pages/Candidates"));
const CandidateProfile = lazy(() => import("@/pages/CandidateProfile"));
const ShortlistedCandidates = lazy(() => import("@/pages/ShortlistedCandidates"));
const Hierarchy = lazy(() => import("@/pages/Hierarchy"));
const Interviews = lazy(() => import("@/pages/Interviews"));
const Messages = lazy(() => import("@/pages/Messages"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const CandidateDashboard = lazy(() => import("@/pages/candidate/CandidateDashboard"));
const CandidateJobs = lazy(() => import("@/pages/candidate/CandidateJobs"));
const CandidateApplications = lazy(() => import("@/pages/candidate/CandidateApplications"));
const CandidateShortlisted = lazy(() => import("@/pages/candidate/CandidateShortlisted"));
const CandidateProfilePage = lazy(() => import("@/pages/candidate/CandidateProfilePage"));
const ATSScore = lazy(() => import("@/pages/candidate/ATSScore"));
const CandidateMessages = lazy(() => import("@/pages/candidate/CandidateMessages"));
const CandidateCompany = lazy(() => import("@/pages/candidate/CandidateCompany"));
const Notifications = lazy(() => import("@/pages/candidate/Notifications"));
const JobAlerts = lazy(() => import("@/pages/candidate/JobAlerts"));
const RecruiterVerification = lazy(() => import("@/pages/RecruiterVerification"));
const RecruiterRegister = lazy(() => import("@/pages/RecruiterRegister"));
const StudentRegister = lazy(() => import("@/pages/StudentRegister"));
const AdminVerificationQueue = lazy(() => import("@/pages/AdminVerificationQueue"));
const AdminTests = lazy(() => import("@/pages/AdminTests"));
const CandidateTests = lazy(() => import("@/pages/candidate/CandidateTests"));
const ForumHome = lazy(() => import("@/pages/ForumHome"));
const ForumCategory = lazy(() => import("@/pages/ForumCategory"));
const ForumThread = lazy(() => import("@/pages/ForumThread"));
const ForumModeration = lazy(() => import("@/pages/ForumModeration"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RouteLoader = () => (
  <div className="min-h-[50vh] flex items-center justify-center">
    <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const AppLayout = () => {
  const location = useLocation();
  const { isAuthenticated, user, restoreSession } = useStore();
  const [verificationState, setVerificationState] = useState<{
    reviewStatus: string | null;
    verificationLevel: string | null;
    canPostJobs: boolean;
  }>({
    reviewStatus: null,
    verificationLevel: null,
    canPostJobs: false,
  });
  const [verificationLoading, setVerificationLoading] = useState(isAuthenticated && user.role === "recruiter");
  const isLogin = location.pathname === "/login";
  const isRecruiterRegister = location.pathname === "/register-recruiter";
  const isStudentRegister = location.pathname === "/register-student";
  const isVerificationPage = location.pathname === "/verify-company";
  const isCandidate = user.role === "candidate";
  const isCandidateRoute = location.pathname.startsWith("/candidate/") || location.pathname === "/candidate";
  const isRecruiter = user.role === "recruiter";
  const recruiterVerified =
    verificationState.reviewStatus === "approved" ||
    verificationState.verificationLevel === "verified" ||
    verificationState.verificationLevel === "trusted" ||
    verificationState.canPostJobs;
  const recruiterNeedsVerification = isAuthenticated && isRecruiter && !recruiterVerified;

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const loadVerificationStatus = async () => {
      if (!isAuthenticated || !isRecruiter) {
        setVerificationState({ reviewStatus: null, verificationLevel: null, canPostJobs: false });
        setVerificationLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setVerificationState({ reviewStatus: null, verificationLevel: null, canPostJobs: false });
        setVerificationLoading(false);
        return;
      }

      setVerificationLoading(true);
      try {
        const data = await getRecruiterVerificationStatus(token);
        setVerificationState({
          reviewStatus: data.review_status || null,
          verificationLevel: data.verification_level || null,
          canPostJobs: Boolean(data.can_post_jobs),
        });
      } catch {
        setVerificationState({ reviewStatus: null, verificationLevel: null, canPostJobs: false });
      } finally {
        setVerificationLoading(false);
      }
    };

    loadVerificationStatus();
  }, [isAuthenticated, isRecruiter, user.email]);

  if (verificationLoading) {
    return <RouteLoader />;
  }

  if (recruiterNeedsVerification && !isVerificationPage && !isLogin && !isRecruiterRegister && !isStudentRegister) {
    return <Navigate to="/verify-company" replace />;
  }

  return (
    <>
      {!isLogin && !isRecruiterRegister && !isStudentRegister && !isVerificationPage && isAuthenticated && (isCandidateRoute || isCandidate ? <CandidateNavbar /> : <Navbar />)}
      <main className={isLogin || !isAuthenticated ? "" : "pt-16"}>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register-recruiter" element={<RecruiterRegister />} />
            <Route path="/register-student" element={<StudentRegister />} />
            <Route path="/verify-company" element={<ProtectedRoute><RecruiterVerification /></ProtectedRoute>} />
            <Route path="/verification-queue" element={<ProtectedRoute><AdminVerificationQueue /></ProtectedRoute>} />
            <Route path="/tests/admin" element={<ProtectedRoute><AdminTests /></ProtectedRoute>} />
            <Route path="/forums" element={<ProtectedRoute><ForumHome /></ProtectedRoute>} />
            <Route path="/forums/moderation" element={<ProtectedRoute><ForumModeration /></ProtectedRoute>} />
            <Route path="/forums/:slug" element={<ProtectedRoute><ForumCategory /></ProtectedRoute>} />
            <Route path="/forums/:slug/threads/:threadId" element={<ProtectedRoute><ForumThread /></ProtectedRoute>} />
            <Route path="/forums/threads/:threadId" element={<ProtectedRoute><ForumThread /></ProtectedRoute>} />

            {/* Employer / Admin routes */}
            <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/create" element={<ProtectedRoute><JobCreate /></ProtectedRoute>} />
            <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
            <Route path="/candidates/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
            <Route path="/shortlisted" element={<ProtectedRoute><ShortlistedCandidates /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Hierarchy /></ProtectedRoute>} />
            <Route path="/interviews" element={<ProtectedRoute><Interviews /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

            {/* Candidate routes */}
            <Route path="/candidate" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/candidate/jobs" element={<ProtectedRoute><CandidateJobs /></ProtectedRoute>} />
            <Route path="/candidate/applications" element={<ProtectedRoute><CandidateApplications /></ProtectedRoute>} />
            <Route path="/candidate/shortlisted" element={<ProtectedRoute><CandidateShortlisted /></ProtectedRoute>} />
            <Route path="/candidate/profile" element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>} />
            <Route path="/candidate/ats-score" element={<ProtectedRoute><ATSScore /></ProtectedRoute>} />
            <Route path="/candidate/tests" element={<ProtectedRoute><CandidateTests /></ProtectedRoute>} />
            <Route path="/candidate/messages" element={<ProtectedRoute><CandidateMessages /></ProtectedRoute>} />
            <Route path="/candidate/company/:recruiterId" element={<ProtectedRoute><CandidateCompany /></ProtectedRoute>} />
            <Route path="/candidate/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/candidate/job-alerts" element={<ProtectedRoute><JobAlerts /></ProtectedRoute>} />
            <Route path="/notifications" element={<Navigate to="/candidate/notifications" replace />} />
            <Route path="/job-alerts" element={<Navigate to="/candidate/job-alerts" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {isAuthenticated && !isLogin && !isVerificationPage && !(isRecruiter && recruiterNeedsVerification) && <ChatBot />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
