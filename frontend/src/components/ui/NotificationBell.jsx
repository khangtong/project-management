import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../../api/notifications";
import { formatDistanceToNow } from "date-fns";

function BellIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

const TYPE_ICONS = {
  task_assigned: (
    <svg
      className="w-4 h-4 text-ocean"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  comment_added: (
    <svg
      className="w-4 h-4 text-sage"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  mention: (
    <svg
      className="w-4 h-4 text-orange-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 8a6 6 0 10-8 5.657V16a2 2 0 102 2h4a2 2 0 102-2v-2.343A6 6 0 0016 8z"
      />
    </svg>
  ),
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const { data: notifications = [], isLoading: loadingList } = useQuery({
    queryKey: ["notifications-list"],
    queryFn: () => notificationApi.list().then((r) => r.data),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications-unread-count"]);
      queryClient.invalidateQueries(["notifications-list"]);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications-unread-count"]);
      queryClient.invalidateQueries(["notifications-list"]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["notifications-unread-count"]);
      queryClient.invalidateQueries(["notifications-list"]);
    },
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const unreadCount = countData?.count ?? 0;
  const items = notifications?.data ?? notifications ?? [];

  const handleNotificationClick = (notification) => {
    const projectId = notification.data?.project_id;
    const taskId = notification.data?.task_id;

    if (projectId && taskId) {
      if (!notification.read_at) {
        markReadMutation.mutate(notification.id);
      }
      setOpen(false);
      navigate(`/projects/${projectId}/board?task=${taskId}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-cream-dark transition-colors text-charcoal"
        title="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-ocean text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-cream-card border border-cream-border rounded-xl shadow-lg z-50 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-cream-border">
            <h3 className="text-sm font-semibold text-charcoal">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="flex items-center gap-1 text-xs text-ocean hover:text-ocean-dark transition-colors"
              >
                <CheckIcon />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ocean" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-mid">
                <BellIcon />
                <p className="text-sm mt-2">All caught up!</p>
              </div>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex gap-3 px-4 py-3 border-b border-cream-border/50 hover:bg-cream-dark/30 transition-colors ${n.read_at ? "opacity-60" : ""} ${n.data?.project_id && n.data?.task_id ? "cursor-pointer" : ""}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type] ?? <BellIcon />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal leading-snug">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-mid mt-0.5 leading-snug line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-light mt-1">
                      {n.created_at
                        ? formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                          })
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {!n.read_at && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markReadMutation.mutate(n.id);
                        }}
                        className="p-1 rounded hover:bg-cream-border/50 text-gray-light hover:text-ocean transition-colors"
                        title="Mark as read"
                      >
                        <CheckIcon />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(n.id);
                      }}
                      className="p-1 rounded hover:bg-cream-border/50 text-gray-light hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <XIcon />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
