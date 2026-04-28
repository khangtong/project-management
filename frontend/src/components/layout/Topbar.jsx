import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "../../api/notifications";
import NotificationBell from "../ui/NotificationBell";
import SearchBar from "../ui/SearchBar";

export default function Topbar({ onMenuClick }) {
  const { data } = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => notificationApi.unreadCount().then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <header className="h-16 bg-cream border-b border-cream-border px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-cream-dark"
        >
          <svg
            className="w-5 h-5 text-charcoal"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <SearchBar />
      </div>
      <NotificationBell unreadCount={data?.count ?? 0} />
    </header>
  );
}
