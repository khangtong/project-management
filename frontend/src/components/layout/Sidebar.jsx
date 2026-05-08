import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../store/useAuth";
import { workspaceApi } from "../../api/workspaces";
import { projectApi } from "../../api/projects";
import UserAvatar from "../ui/UserAvatar";

export default function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { workspaceId, projectId } = useParams();

  const { data: currentWorkspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () =>
      workspaceId
        ? workspaceApi.show(workspaceId).then((r) => r.data)
        : Promise.resolve(null),
    enabled: !!workspaceId,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["workspace-projects", workspaceId],
    queryFn: () =>
      workspaceId
        ? projectApi.list(workspaceId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!workspaceId,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="h-screen flex flex-col w-64 bg-cream border-r border-cream-border">
      {/* Logo + Mobile Close */}
      <div className="h-16 px-5 border-b border-cream-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center bg-ocean rounded-lg">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-charcoal">
            Project Manager
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-cream-dark"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Workspace Section */}
      <div className="flex-1 p-4 overflow-y-auto">
        {currentWorkspace && (
          <div className="mb-4">
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3 text-gray-medium">
              {currentWorkspace.name}
            </h3>
            <nav className="space-y-1">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}/board`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal ${
                    project.id === projectId ? "bg-white/70 font-medium" : ""
                  }`}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: project.color || "#4CACBC" }}
                  />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider mb-3 text-gray-medium">
            Navigation
          </h3>
          <nav className="space-y-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal"
            >
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
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              Dashboard
            </Link>

            <Link
              to="/workspaces"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal"
            >
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
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Workspaces
            </Link>

            <Link
              to="/my-tasks"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              My Tasks
            </Link>
          </nav>
        </div>
      </div>

      {/* User section */}
      <div className="p-3 border-t border-cream-border">
        <Link
          to="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-colors group mb-1"
        >
          {/* Avatar — uses UserAvatar so avatar_url is respected */}
          <UserAvatar user={user} size="w-9 h-9" textSize="text-sm" rounded="rounded-xl" className="shrink-0 shadow-sm" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-charcoal leading-tight">{user?.name || "User"}</p>
            <p className="text-xs truncate text-gray-medium leading-tight mt-0.5">{user?.email || ""}</p>
          </div>

          {/* Profile hint */}
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-ocean font-medium">Profile</span>
            <svg className="w-3 h-3 text-ocean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm hover:bg-red-50 hover:text-red-500 text-gray-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
