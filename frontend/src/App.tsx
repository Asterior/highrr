import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import CandidateNavbar from "@/components/CandidateNavbar";
import ChatBot from "@/components/ChatBot";
import { useStore } from "@/stores/useStore";
import Overview from "@/pages/Overview";
import Jobs from "@/pages/Jobs";
import JobCreate from "@/pages/JobCreate";
import JobDetails from "@/pages/JobDetails";
import Candidates from "@/pages/Candidates";
import CandidateProfile from "@/pages/CandidateProfile";
import Pipeline from "@/pages/Pipeline";
import Interviews from "@/pages/Interviews";
import Messages from "@/pages/Messages";
import Analytics from "@/pages/Analytics";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Candidate pages
import CandidateDashboard from "@/pages/candidate/CandidateDashboard";
import CandidateJobs from "@/pages/candidate/CandidateJobs";
import CandidateApplications from "@/pages/candidate/CandidateApplications";
import CandidateProfilePage from "@/pages/candidate/CandidateProfilePage";
import ResumeBuilder from "@/pages/candidate/ResumeBuilder";
import ATSScore from "@/pages/candidate/ATSScore";
import CandidateMessages from "@/pages/candidate/CandidateMessages";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppLayout = () => {
  const location = useLocation();
  const { isAuthenticated, user } = useStore();
  const isLogin = location.pathname === "/login";
  const isCandidate = user.role === "candidate";
  const isCandidateRoute = location.pathname.startsWith("/candidate");

  return (
    <>
      {!isLogin && isAuthenticated && (isCandidateRoute || isCandidate ? <CandidateNavbar /> : <Navbar />)}
      <main className={isLogin || !isAuthenticated ? "" : "pt-16"}>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Employer / Admin routes */}
          <Route path="/" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/jobs/create" element={<ProtectedRoute><JobCreate /></ProtectedRoute>} />
          <Route path="/jobs/:id" element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />
          <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
          <Route path="/candidates/:id" element={<ProtectedRoute><CandidateProfile /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
          <Route path="/interviews" element={<ProtectedRoute><Interviews /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />

          {/* Candidate routes */}
          <Route path="/candidate" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/candidate/jobs" element={<ProtectedRoute><CandidateJobs /></ProtectedRoute>} />
          <Route path="/candidate/applications" element={<ProtectedRoute><CandidateApplications /></ProtectedRoute>} />
          <Route path="/candidate/profile" element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>} />
          <Route path="/candidate/resume" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
          <Route path="/candidate/ats-score" element={<ProtectedRoute><ATSScore /></ProtectedRoute>} />
          <Route path="/candidate/messages" element={<ProtectedRoute><CandidateMessages /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
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
