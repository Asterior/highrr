import { Link, useLocation } from "react-router-dom";
import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";

const navItems = [
  { label: "Jobs", path: "/jobs" },
  { label: "Candidates", path: "/candidates" },
  { label: "Pipeline", path: "/pipeline" },
  { label: "Interviews", path: "/interviews" },
  { label: "Messages", path: "/messages" },
  { label: "Analytics", path: "/analytics" },
];

const Navbar = () => {
  const location = useLocation();
  const { user, logout } = useStore();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b border-border shadow-card">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        <Link to="/" className="text-xl font-bold text-primary tracking-tight">
          Highrr
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full gradient-primary"
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm outline-none w-32 placeholder:text-muted-foreground"
            />
          </div>

          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full gradient-primary" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                {user.avatar}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-12 w-48 bg-background rounded-xl border border-border shadow-elevated p-1">
                <div className="px-3 py-2 border-b border-border mb-1">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
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

export default Navbar;
