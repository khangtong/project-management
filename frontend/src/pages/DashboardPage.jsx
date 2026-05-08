import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, isToday, parseISO } from "date-fns";
import { dashboardApi } from "../api/dashboard";
import { workspaceApi } from "../api/workspaces";
import { useAuth } from "../store/useAuth";
import UserAvatar from "../components/ui/UserAvatar";

// ─── Greeting helper ────────────────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// ─── Priority badge ──────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const styles = {
    urgent: "bg-red-50 text-red-600 border border-red-200",
    high: "bg-orange-100 text-orange-700 border border-orange-200",
    medium: "bg-sage/15 text-[#3a7a30] border border-sage/30",
    low: "bg-gray-100 text-gray-medium border border-gray-200",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${styles[priority] || styles.low}`}
    >
      {priority}
    </span>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  subColor = "text-gray-medium",
  accent,
}) {
  return (
    <div className="bg-white rounded-2xl border border-cream-border p-5 flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-medium">
        {label}
      </p>
      <p className="text-3xl font-bold text-charcoal leading-none">{value}</p>
      {sub && <p className={`text-xs ${subColor}`}>{sub}</p>}
      {accent && (
        <div
          className="mt-1 h-1 rounded-full w-12"
          style={{ background: accent }}
        />
      )}
    </div>
  );
}

// ─── Project progress row ─────────────────────────────────────────────────────
function ProjectProgressRow({ project }) {
  const done = project.tasks_done_count ?? 0;
  const total = project.tasks_total_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isOnHold = project.status === "on_hold";

  // Mute the progress bar colour for on-hold projects
  const barColor = isOnHold ? "#B0B0B0" : project.color || "#4CACBC";

  return (
    <div
      className={`flex items-center gap-3 py-3 border-b border-cream-card last:border-none ${
        isOnHold ? "opacity-60" : ""
      }`}
    >
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: barColor }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-charcoal truncate">
            {project.name}
          </p>
          {isOnHold && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-medium border border-gray-200 shrink-0">
              On hold
            </span>
          )}
        </div>
        <p className="text-xs text-gray-medium mt-0.5">
          {done} / {total} tasks done
        </p>
      </div>
      <div className="w-24 shrink-0">
        <div className="h-1.5 rounded-full bg-cream-dark overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: project.color || "#4CACBC" }}
          />
        </div>
        <p className="text-[10px] text-gray-medium text-right mt-1">{pct}%</p>
      </div>
    </div>
  );
}

// ─── Activity feed item ───────────────────────────────────────────────────────
function ActivityItem({ log }) {
  const actionLabel = {
    created: "created",
    updated: "updated",
    moved: "moved",
    assigned: "was assigned",
    unassigned: "was unassigned from",
    commented: "commented on",
    deleted: "deleted",
    attachment_added: "added a file to",
  };

  const label = actionLabel[log.action] || log.action;
  const taskTitle = log.metadata?.title || log.metadata?.file_name || "a task";
  const timeAgo = log.created_at ? formatTimeAgo(new Date(log.created_at)) : "";

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-cream-card last:border-none">
      <UserAvatar
        user={log.user}
        size="w-7 h-7"
        textSize="text-[10px]"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-medium leading-snug">
          <span className="font-medium text-charcoal">
            {log.user?.name || "Someone"}
          </span>{" "}
          {label} <span className="font-medium text-charcoal">{taskTitle}</span>
        </p>
        <p className="text-[10px] text-gray-light mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return format(date, "MMM d");
}

// ─── Focus task card ──────────────────────────────────────────────────────────
function FocusTaskCard({ task }) {
  const projectId = task.column?.board?.project?.id;
  const projectName = task.column?.board?.project?.name || "Unknown Project";

  return (
    <Link
      to={projectId ? `/projects/${projectId}/board` : "#"}
      className="flex-1 bg-white rounded-xl border border-cream-border p-3.5 hover:border-ocean/40 hover:shadow-sm transition-all group"
    >
      <PriorityBadge priority={task.priority} />
      <p className="text-sm font-medium text-charcoal mt-2 leading-snug group-hover:text-ocean transition-colors line-clamp-2">
        {task.title}
      </p>
      <p className="text-[11px] text-gray-medium mt-2 truncate">
        {projectName}
      </p>
    </Link>
  );
}

// ─── Main DashboardPage ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.get().then((r) => r.data),
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.list().then((r) => r.data),
  });

  if (dashLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-5">
          <div className="h-24 bg-cream-dark rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 bg-cream-dark rounded-2xl" />
            ))}
          </div>
          <div className="h-40 bg-cream-dark rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-cream-dark rounded-2xl" />
            <div className="h-64 bg-cream-dark rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const {
    my_tasks = [],
    overdue_tasks = [],
    upcoming_tasks = [],
    recent_activity = [],
    projects = [],
  } = dashData || {};

  const todayTasks = my_tasks.filter(
    (t) => t.due_date && isToday(parseISO(t.due_date)),
  );
  const completedThisWeek = my_tasks.filter((t) => t.completed_at).length;

  // Top 3 focus tasks: overdue first, then urgent/high due today, then upcoming
  const focusTasks = [
    ...overdue_tasks,
    ...todayTasks.filter(
      (t) => t.priority === "urgent" || t.priority === "high",
    ),
    ...upcoming_tasks,
  ]
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .slice(0, 3);

  const greeting = getGreeting();
  const todayLabel = format(new Date(), "EEEE, MMMM d");

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* ── Daily Brief Header ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-cream-border px-6 py-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-charcoal">
            {greeting}, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-sm text-gray-medium mt-1">
            {todayLabel} · Here's where things stand
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {overdue_tasks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {overdue_tasks.length} overdue
            </span>
          )}
          {todayTasks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              📅 {todayTasks.length} due today
            </span>
          )}
          {completedThisWeek > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-sage/15 text-[#3a7a30] border border-sage/30">
              ✓ {completedThisWeek} done this week
            </span>
          )}
        </div>
      </div>

      {/* ── Focus Strip ───────────────────────────────────────────────────── */}
      {focusTasks.length > 0 && (
        <div className="bg-linear-to-r from-ocean/8 to-teal/8 border border-teal/25 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-ocean mb-3">
            ⚡ Your focus for today
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {focusTasks.map((task) => (
              <FocusTaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard
          label="Assigned to you"
          value={my_tasks.length}
          sub={my_tasks.length === 1 ? "task in progress" : "tasks in progress"}
          accent="#4CACBC"
        />
        <StatCard
          label="Overdue"
          value={overdue_tasks.length}
          sub={
            overdue_tasks.length === 0 ? "All on track 🎉" : "need attention"
          }
          subColor={
            overdue_tasks.length > 0 ? "text-red-500" : "text-[#3a7a30]"
          }
          accent={overdue_tasks.length > 0 ? "#ef4444" : "#A0D995"}
        />
        <StatCard
          label="Due this week"
          value={upcoming_tasks.length}
          sub="upcoming deadlines"
          accent="#6CC4A1"
        />
      </div>

      {/* ── Bottom: Project Progress + Activity ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Project progress */}
        <div className="bg-white rounded-2xl border border-cream-border p-5">
          <h2 className="text-sm font-semibold text-charcoal mb-1">
            Project progress
          </h2>
          <p className="text-xs text-gray-medium mb-4">
            Across all your workspaces
          </p>
          {projects.length === 0 ? (
            <p className="text-sm text-gray-medium py-6 text-center">
              No active projects yet.
            </p>
          ) : (
            <div>
              {projects.slice(0, 6).map((p) => (
                <ProjectProgressRow key={p.id} project={p} />
              ))}
            </div>
          )}
          {workspaces.length > 0 && (
            <Link
              to={`/workspaces/${workspaces[0].id}`}
              className="inline-flex items-center gap-1 text-xs text-ocean font-medium mt-4 hover:underline"
            >
              View all projects
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-2xl border border-cream-border p-5">
          <h2 className="text-sm font-semibold text-charcoal mb-1">
            Team activity
          </h2>
          <p className="text-xs text-gray-medium mb-4">
            Recent actions across your projects
          </p>
          {recent_activity.length === 0 ? (
            <p className="text-sm text-gray-medium py-6 text-center">
              No recent activity yet.
            </p>
          ) : (
            <div>
              {recent_activity.slice(0, 8).map((log) => (
                <ActivityItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
