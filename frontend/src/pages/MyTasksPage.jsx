import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  format,
  isToday,
  isTomorrow,
  isThisWeek,
  isPast,
  parseISO,
  startOfWeek,
  addDays,
} from "date-fns";
import { taskApi } from "../api/tasks";
import { useAuth } from "../store/AuthContext";
import UserAvatar from "../components/ui/UserAvatar";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHorizon(task) {
  if (!task.due_date) return "later";
  const d = parseISO(task.due_date);
  if (isPast(d) && !isToday(d)) return "overdue";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isThisWeek(d)) return "week";
  return "later";
}

function getPriorityWeight(p) {
  return { urgent: 4, high: 3, medium: 2, low: 1 }[p] ?? 0;
}

function sortTasks(tasks) {
  return [...tasks].sort(
    (a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority),
  );
}

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const styles = {
    urgent: "bg-red-50 text-red-600 border border-red-200",
    high: "bg-orange-100 text-orange-700 border border-orange-200",
    medium: "bg-sage/15 text-[#3a7a30] border border-sage/30",
    low: "bg-gray-100 text-gray-medium border border-gray-200",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap ${styles[priority] || styles.low}`}
    >
      {priority}
    </span>
  );
}

// ─── Calendar strip ───────────────────────────────────────────────────────────
function CalendarStrip({ tasks, selectedDate, onSelectDate }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Mon

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Count tasks per day (by due_date)
  const countByDay = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.due_date) return;
      const key = t.due_date.slice(0, 10);
      map[key] = map[key] || [];
      map[key].push(t.priority);
    });
    return map;
  }, [tasks]);

  return (
    <div className="bg-white rounded-2xl border border-cream-border p-4 mb-4">
      <div className="flex gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dots = countByDay[key] || [];
          const isSelected = selectedDate === key;
          const isTod = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(isSelected ? null : key)}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl transition-all ${
                isSelected
                  ? "bg-ocean text-white"
                  : isTod
                    ? "bg-ocean/10 text-ocean"
                    : "hover:bg-cream-card"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  isSelected
                    ? "text-white/75"
                    : isWeekend
                      ? "text-gray-light"
                      : "text-gray-medium"
                }`}
              >
                {format(day, "EEE")}
              </span>
              <span
                className={`text-base font-bold mt-0.5 leading-none ${
                  isSelected
                    ? "text-white"
                    : isTod
                      ? "text-ocean"
                      : isWeekend
                        ? "text-gray-light"
                        : "text-charcoal"
                }`}
              >
                {format(day, "d")}
              </span>
              {/* Priority dots */}
              <div className="flex gap-0.5 mt-1.5 h-1.5 items-center justify-center">
                {dots.slice(0, 3).map((priority, idx) => {
                  const dotColor =
                    {
                      urgent: isSelected ? "bg-red-300" : "bg-red-400",
                      high: isSelected ? "bg-orange-200" : "bg-orange",
                      medium: isSelected ? "bg-green-200" : "bg-sage",
                      low: isSelected ? "bg-gray-300" : "bg-gray-300",
                    }[priority] ?? "bg-gray-300";
                  return (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
      {selectedDate && (
        <p className="text-[11px] text-ocean font-medium mt-2 text-center">
          Showing tasks for {format(parseISO(selectedDate), "EEEE, MMMM d")}
          <button
            onClick={() => onSelectDate(null)}
            className="ml-2 text-gray-medium hover:text-charcoal"
          >
            ✕ clear
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function TodayProgress({ tasks }) {
  const todayTasks = tasks.filter(
    (t) => t.due_date && isToday(parseISO(t.due_date)),
  );
  const done = todayTasks.filter(
    (t) => t.column?.name?.toLowerCase() === "done",
  ).length;
  const total = todayTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-cream-border px-5 py-4 mb-4 flex items-center gap-4">
      <p className="text-sm text-gray-medium whitespace-nowrap">
        Today's progress
      </p>
      <div className="flex-1">
        <div className="h-2.5 rounded-full bg-cream-dark overflow-hidden">
          <div
            className="h-full rounded-full bg-sage transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <p className="text-sm font-bold text-charcoal whitespace-nowrap">
        {done} / {total}{" "}
        <span className="font-normal text-gray-medium">done</span>
      </p>
    </div>
  );
}

// ─── Group section header ─────────────────────────────────────────────────────
function GroupHeader({ label, count, color = "text-gray-medium", badge = "" }) {
  return (
    <div className={`flex items-center gap-2 mb-2 ${color}`}>
      <span className="text-[10px] font-bold uppercase tracking-widest">
        {label}
      </span>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cream-dark text-gray-medium">
        {count}
      </span>
      <div className="flex-1 h-px bg-cream-dark" />
      {badge && <span className="text-[10px] text-gray-light">{badge}</span>}
    </div>
  );
}

// ─── Task row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, isOverdue = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const projectId = task.column?.board?.project?.id;
  const projectName = task.column?.board?.project?.name || "Unknown project";
  const columnName = task.column?.name || "";

  const isDone = columnName.toLowerCase() === "done";

  const dueDateStr = task.due_date
    ? (() => {
        const d = parseISO(task.due_date);
        if (isToday(d)) return "Today";
        if (isTomorrow(d)) return "Tomorrow";
        return format(d, "MMM d");
      })()
    : null;

  const handleRowClick = () => {
    if (projectId) navigate(`/projects/${projectId}/board`);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-cream-border transition-all cursor-pointer
        hover:border-ocean/30 hover:shadow-sm
        ${isDone ? "opacity-60" : ""}
      `}
    >
      {/* Completion dot */}
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
        ${
          isDone
            ? "bg-sage border-sage"
            : isOverdue
              ? "border-red-400"
              : "border-cream-dark group-hover:border-ocean/50"
        }`}
      >
        {isDone && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>

      {/* Title + project */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${isDone ? "line-through text-gray-medium" : "text-charcoal"}`}
        >
          {task.title}
        </p>
        <p className="text-xs text-gray-medium mt-0.5 truncate">
          {projectName}
          {columnName ? <span className="mx-1 text-gray-light">·</span> : ""}
          {columnName}
        </p>
      </div>

      {/* Assignees */}
      {task.assignees?.length > 0 && (
        <div className="hidden sm:flex -space-x-1.5 shrink-0">
          {task.assignees.slice(0, 3).map((a) => (
            <UserAvatar
              key={a.id}
              user={a}
              size="w-5 h-5"
              textSize="text-[8px]"
              className="ring-1 ring-white"
            />
          ))}
        </div>
      )}

      {/* Due date chip */}
      {dueDateStr && (
        <span
          className={`hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap
          ${
            isOverdue
              ? "bg-red-50 text-red-500 border border-red-200"
              : isToday(parseISO(task.due_date))
                ? "bg-amber-50 text-amber-600 border border-amber-200"
                : "bg-cream-card text-gray-medium border border-cream-border"
          }`}
        >
          {isOverdue ? `${dueDateStr} · late` : dueDateStr}
        </span>
      )}

      {/* Priority */}
      <PriorityBadge priority={task.priority} />

      {/* Arrow hint */}
      <svg
        className="w-4 h-4 text-gray-light opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
    </div>
  );
}

// ─── Sort toggle ────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  {
    value: "priority",
    label: "Priority",
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d="M3 4h13M3 8h9M3 12h5" />
      </svg>
    ),
  },
  {
    value: "due_date",
    label: "Due date",
    icon: (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
];

function SortToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-cream-card rounded-xl border border-cream-border">
      {SORT_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? "bg-white text-charcoal shadow-sm border border-cream-border"
                : "text-gray-medium hover:text-charcoal"
            }`}
          >
            <span className={active ? "text-ocean" : "text-gray-light"}>
              {opt.icon}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ label }) {
  return (
    <div className="text-center py-10">
      <div className="text-3xl mb-2">🌿</div>
      <p className="text-sm text-gray-medium">{label}</p>
    </div>
  );
}

// ─── MyTasksPage ──────────────────────────────────────────────────────────────
export default function MyTasksPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [sortBy, setSortBy] = useState("priority"); // "priority" | "due_date" | "project"

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: () => taskApi.myTasks().then((r) => r.data),
  });

  // Filter by selected calendar day
  const filteredTasks = useMemo(() => {
    if (!selectedDate) return tasks;
    return tasks.filter((t) => t.due_date?.slice(0, 10) === selectedDate);
  }, [tasks, selectedDate]);

  // Group tasks by horizon
  const grouped = useMemo(() => {
    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      week: [],
      later: [],
    };
    filteredTasks.forEach((t) => {
      const horizon = getHorizon(t);
      groups[horizon].push(t);
    });
    // Sort within each group
    Object.keys(groups).forEach((k) => {
      groups[k] = sortTasks(groups[k]);
    });
    return groups;
  }, [filteredTasks]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(
    (t) => t.column?.name?.toLowerCase() === "done",
  ).length;

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-cream-dark rounded-lg" />
          <div className="h-28 bg-cream-dark rounded-2xl" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-cream-dark rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">My Tasks</h1>
          <p className="text-sm text-gray-medium mt-0.5">
            {totalTasks} total · {doneTasks} completed
          </p>
        </div>
        <SortToggle value={sortBy} onChange={setSortBy} />
      </div>

      {/* Calendar strip */}
      <CalendarStrip
        tasks={tasks}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Today progress */}
      <TodayProgress tasks={tasks} />

      {/* Task groups */}
      {totalTasks === 0 ? (
        <EmptyState label="No tasks assigned to you — enjoy the calm! 🎉" />
      ) : filteredTasks.length === 0 ? (
        <EmptyState label="No tasks on this day." />
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {grouped.overdue.length > 0 && (
            <section>
              <GroupHeader
                label="Overdue"
                count={grouped.overdue.length}
                color="text-red-500"
              />
              <div className="space-y-2">
                {grouped.overdue.map((t) => (
                  <TaskRow key={t.id} task={t} isOverdue />
                ))}
              </div>
            </section>
          )}

          {/* Today */}
          {grouped.today.length > 0 && (
            <section>
              <GroupHeader
                label="Today"
                count={grouped.today.length}
                badge={format(new Date(), "MMM d")}
              />
              <div className="space-y-2">
                {grouped.today.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Tomorrow */}
          {grouped.tomorrow.length > 0 && !selectedDate && (
            <section>
              <GroupHeader label="Tomorrow" count={grouped.tomorrow.length} />
              <div className="space-y-2">
                {grouped.tomorrow.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* This week */}
          {grouped.week.length > 0 && !selectedDate && (
            <section>
              <GroupHeader label="This week" count={grouped.week.length} />
              <div className="space-y-2">
                {grouped.week.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}

          {/* Later */}
          {grouped.later.length > 0 && !selectedDate && (
            <section>
              <GroupHeader label="Later" count={grouped.later.length} />
              <div className="space-y-2">
                {grouped.later.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
