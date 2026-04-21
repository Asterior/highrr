import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell as BellIcon, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useStore } from "@/stores/useStore";
import { getNotifications, markAllNotificationsRead, type NotificationResponse } from "@/services/api";

const timeAgo = (value: string): string => {
  const createdAt = new Date(value).getTime();
  const elapsed = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
};

const parseTitle = (title: string): { jobTitle: string; companyName: string } => {
  const match = title.match(/^New job match: (.+) at (.+)$/i);
  if (match) {
    return { jobTitle: match[1], companyName: match[2] };
  }
  return { jobTitle: title, companyName: "" };
};

const NotificationBell = () => {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const recentNotifications = useMemo(() => notifications.slice(0, 10), [notifications]);

  const loadNotifications = async () => {
    const data = await getNotifications(1, 50);
    setNotifications(data.items || []);
    setUnreadCount(data.unread_count || 0);
  };

  useEffect(() => {
    if (user.role !== "candidate") {
      return;
    }

    loadNotifications().catch(() => {
      setNotifications([]);
      setUnreadCount(0);
    });

    const timer = window.setInterval(() => {
      loadNotifications().catch(() => {
        // Non-blocking polling.
      });
    }, 60000);

    return () => window.clearInterval(timer);
  }, [user.role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (user.role !== "candidate") {
    return null;
  }

  const toggleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      try {
        await markAllNotificationsRead();
        setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
        setUnreadCount(0);
      } catch {
        // Keep UI usable even if read-all fails.
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button onClick={toggleOpen} className="relative rounded-full p-2 hover:bg-muted transition-colors" aria-label="Open notifications">
        <BellIcon className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute right-0 top-12 z-50 w-[380px] max-h-[480px] overflow-hidden rounded-lg border border-border bg-white shadow-md"
        >
          <div className="max-h-[420px] overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="p-5 text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              recentNotifications.map((notification) => {
                const parsed = parseTitle(notification.title);
                return (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-100 px-4 py-3 ${notification.is_read ? "bg-white border-l-2 border-transparent" : "bg-violet-50 border-l-2 border-purple-500"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{parsed.jobTitle}</p>
                        {parsed.companyName && <p className="text-xs text-gray-500">{parsed.companyName}</p>}
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{notification.body}</p>
                        <p className="mt-2 text-xs text-gray-400">{timeAgo(notification.created_at)}</p>
                      </div>
                      {notification.job_id && (
                        <Link
                          to={`/candidate/jobs?job=${notification.job_id}&apply=1`}
                          className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700"
                        >
                          Apply <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-border bg-white p-3 text-center">
            <Link to="/notifications" className="text-sm font-medium text-purple-600 hover:text-purple-700">
              View all notifications
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default NotificationBell;