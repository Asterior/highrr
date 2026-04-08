import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import CandidateNavbar from "@/components/CandidateNavbar";
import ChatBot from "@/components/ChatBot";
import { useStore } from "@/stores/useStore";

const Overview = lazy(() => import("@/pages/Overview"));
const Jobs = lazy(() => import("@/pages/Jobs"));
const JobCreate = lazy(() => import("@/pages/JobCreate"));
const JobDetails = lazy(() => import("@/pages/JobDetails"));
const Candidates = lazy(() => import("@/pages/Candidates"));
const CandidateProfile = lazy(() => import("@/pages/CandidateProfile"));
const ShortlistedCandidates = lazy(() => import("@/pages/ShortlistedCandidates"));
const Pipeline = lazy(() => import("@/pages/Pipeline"));
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
const ResumeBuilder = lazy(() => import("@/pages/candidate/ResumeBuilder"));
const ATSScore = lazy(() => import("@/pages/candidate/ATSScore"));
const CandidateMessages = lazy(() => import("@/pages/candidate/CandidateMessages"));
const CandidateCompany = lazy(() => import("@/pages/candidate/CandidateCompany"));
const RecruiterVerification = lazy(() => import("@/pages/RecruiterVerification"));
const RecruiterRegister = lazy(() => import("@/pages/RecruiterRegister"));
const StudentRegister = lazy(() => import("@/pages/StudentRegister"));
const AdminVerificationQueue = lazy(() => import("@/pages/AdminVerificationQueue"));

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
  const isLogin = location.pathname === "/login";
  const isRecruiterRegister = location.pathname === "/register-recruiter";
  const isStudentRegister = location.pathname === "/register-student";
  const isVerificationPage = location.pathname === "/verify-company";
  const isCandidate = user.role === "candidate";
  const isCandidateRoute = location.pathname.startsWith("/candidate/") || location.pathname === "/candidate";

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

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

            {/* Employer / Admin routes */}
            <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/create" element={<ProtectedRoute><JobCreate /></ProtectedRoute>} />
            <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
            <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
            <Route path="/candidates/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
            <Route path="/shortlisted" element={<ProtectedRoute><ShortlistedCandidates /></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
            <Route path="/interviews" element={<ProtectedRoute><Interviews /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

            {/* Candidate routes */}
            <Route path="/candidate" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/candidate/jobs" element={<ProtectedRoute><CandidateJobs /></ProtectedRoute>} />
            <Route path="/candidate/applications" element={<ProtectedRoute><CandidateApplications /></ProtectedRoute>} />
            <Route path="/candidate/shortlisted" element={<ProtectedRoute><CandidateShortlisted /></ProtectedRoute>} />
            <Route path="/candidate/profile" element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>} />
            <Route path="/candidate/resume" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
            <Route path="/candidate/ats-score" element={<ProtectedRoute><ATSScore /></ProtectedRoute>} />
            <Route path="/candidate/messages" element={<ProtectedRoute><CandidateMessages /></ProtectedRoute>} />
            <Route path="/candidate/company/:recruiterId" element={<ProtectedRoute><CandidateCompany /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {isAuthenticated && !isLogin && <ChatBot />}
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
