import { Link, useLocation } from "react-router-dom";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";

const navItems = [
  { label: "Dashboard", path: "/candidate" },
  { label: "Jobs", path: "/candidate/jobs" },
  { label: "Applications", path: "/candidate/applications" },
  { label: "Shortlisted", path: "/candidate/shortlisted" },
  { label: "Resume", path: "/candidate/resume" },
  { label: "ATS Score", path: "/candidate/ats-score" },
  { label: "Messages", path: "/candidate/messages" },
];

const CandidateNavbar = () => {
  const location = useLocation();
  const { user, logout } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b border-border shadow-card">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
<Link to="/" className="flex items-center">
  <img 
    src="/highrrlogo.png" 
    alt="Highrr Logo" 
    className="h-8 w-auto object-contain"
  />
</Link>

        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="cand-nav-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full gradient-primary"
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="relative">
            <div className="flex items-center gap-1">
              <Link
                to="/candidate/profile"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                title="Open profile"
              >
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {user.avatar}
                </div>
              </Link>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Open user menu"
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            {showDropdown && (
              <div className="absolute right-0 top-12 w-48 bg-background rounded-xl border border-border shadow-elevated p-1">
                <Link
                  to="/candidate/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  to="/login"
                  onClick={() => { setShowDropdown(false); logout(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default CandidateNavbar;
