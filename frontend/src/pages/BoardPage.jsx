import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import KanbanColumn from "../components/board/KanbanColumn";
import TaskCard from "../components/board/TaskCard";
import TaskDrawer from "../components/task/TaskDrawer";
import { taskApi } from "../api/tasks";
import { boardApi } from "../api/boards";
import { workspaceApi } from "../api/workspaces";
import { attachmentApi } from "../api/attachments";
import { useAuth } from "../store/AuthContext";
import UserAvatar from "../components/ui/UserAvatar";

// ── Filter panel ──────────────────────────────────────────────────────────────
const PRIORITIES = ["low", "medium", "high", "urgent"];
const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};
const PRIORITY_COLORS = {
  low: "bg-gray-100 text-gray-600 border-gray-200",
  medium: "bg-sage/20 text-sage border-sage",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-600 border-red-200",
};
const PRIORITY_DOT = {
  low: "bg-gray-400",
  medium: "bg-sage",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function FilterDropdown({
  members,
  filters,
  onChange,
  onClear,
  onClose,
  totalTasks,
  filteredTasks,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const hasFilters =
    filters.priorities.length > 0 || filters.assigneeId || filters.overdue;

  const togglePriority = (p) => {
    const next = filters.priorities.includes(p)
      ? filters.priorities.filter((x) => x !== p)
      : [...filters.priorities, p];
    onChange({ ...filters, priorities: next });
  };

  const toggleAssignee = (userId) => {
    onChange({
      ...filters,
      assigneeId: filters.assigneeId === userId ? "" : userId,
    });
  };

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 z-50 w-80 bg-white rounded-2xl shadow-xl border border-cream-border overflow-hidden"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-border">
        <div className="flex items-center gap-2">
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
              d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
            />
          </svg>
          <span className="text-sm font-semibold text-charcoal">Filters</span>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={onClear}
              className="text-xs text-gray-medium hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-medium hover:bg-gray-200 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
        {/* Priority */}
        <div>
          <p className="text-xs font-semibold text-gray-medium uppercase tracking-wide mb-2.5">
            Priority
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PRIORITIES.map((p) => {
              const active = filters.priorities.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePriority(p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                    active
                      ? PRIORITY_COLORS[p] + " shadow-sm"
                      : "bg-gray-50 text-gray-medium border-transparent hover:bg-cream-light hover:border-cream-border"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[p]}`}
                  />
                  {PRIORITY_LABELS[p]}
                  {active && (
                    <svg
                      className="w-3 h-3 ml-auto"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-cream-border" />

        {/* Assignee */}
        {members.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-medium uppercase tracking-wide mb-2.5">
              Assignee
            </p>
            <div className="space-y-1">
              {members.map((m) => {
                const active = filters.assigneeId === m.user_id;
                const name = m.user?.name || m.user?.email || "Unknown";
                return (
                  <button
                    key={m.user_id}
                    onClick={() => toggleAssignee(m.user_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                      active
                        ? "bg-ocean/10 text-ocean border border-ocean/20"
                        : "hover:bg-cream-light text-charcoal border border-transparent"
                    }`}
                  >
                    <UserAvatar
                      user={m.user}
                      size="w-7 h-7"
                      textSize="text-xs"
                      rounded="rounded-full"
                      className="shrink-0"
                    />
                    <span className="flex-1 text-left truncate font-medium">
                      {name}
                    </span>
                    {m.role && (
                      <span className="text-[10px] text-gray-medium capitalize shrink-0">
                        {m.role}
                      </span>
                    )}
                    {active && (
                      <svg
                        className="w-4 h-4 text-ocean shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-cream-border" />

        {/* Due date */}
        <div>
          <p className="text-xs font-semibold text-gray-medium uppercase tracking-wide mb-2.5">
            Due Date
          </p>
          <button
            onClick={() => onChange({ ...filters, overdue: !filters.overdue })}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
              filters.overdue
                ? "bg-red-50 text-red-600 border-red-200"
                : "bg-gray-50 text-gray-medium border-transparent hover:bg-cream-light hover:border-cream-border"
            }`}
          >
            <svg
              className={`w-4 h-4 shrink-0 ${filters.overdue ? "text-red-500" : "text-gray-medium"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Overdue tasks only
            {filters.overdue && (
              <svg
                className="w-3.5 h-3.5 ml-auto text-red-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Results footer */}
      <div
        className={`px-4 py-3 border-t border-cream-border text-xs ${
          hasFilters ? "bg-ocean/5" : "bg-cream-light/50"
        }`}
      >
        {hasFilters ? (
          <span className="text-ocean font-medium">
            Showing {filteredTasks} of {totalTasks} task
            {totalTasks !== 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-gray-medium">
            No filters applied — showing all {totalTasks} task
            {totalTasks !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Add column dropdown ─────────────────────────────────────────────────────
const COLUMN_PRESET_COLORS = [
  "#6CC4A1",
  "#4CACBC",
  "#A0D995",
  "#818cf8",
  "#fb923c",
  "#f472b6",
  "#facc15",
  "#2dd4bf",
  "#60a5fa",
  "#a78bfa",
  "#34d399",
  "#f87171",
];

function AddColumnDropdown({ onAdd, isPending, onClose }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLUMN_PRESET_COLORS[0]);

  useEffect(() => {
    // Close on outside click
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    // Auto-focus the input when the dropdown opens
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), color });
  };

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 z-50 w-72 bg-white rounded-2xl shadow-xl border border-cream-border overflow-hidden"
      style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
    >
      {/* Live preview strip */}
      <div
        className="h-1.5 w-full transition-colors duration-150"
        style={{ backgroundColor: color }}
      />

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm font-semibold text-charcoal">
              New Column
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-medium hover:bg-gray-200 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Name input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-medium uppercase tracking-wide mb-1">
              Column Name
            </label>
            <div className="relative">
              {/* Colored left border indicator */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg transition-colors duration-150"
                style={{ backgroundColor: color }}
              />
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                }}
                placeholder="e.g. In Review, Blocked…"
                maxLength={40}
                className="w-full pl-4 pr-3 py-2.5 text-sm rounded-lg border border-cream-border text-charcoal focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-colors"
              />
            </div>
            <p className="text-[10px] text-gray-medium mt-1 text-right">
              {name.length}/40
            </p>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-medium uppercase tracking-wide mb-2">
              Accent Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative w-6 h-6 rounded-full transition-all hover:scale-110 focus:outline-none"
                  style={{ backgroundColor: c }}
                  title={c}
                >
                  {color === c && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg
                        className="w-3.5 h-3.5 text-white drop-shadow"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!name.trim() || isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              )}
              {isPending ? "Adding…" : "Add Column"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-medium border border-cream-border hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Board page ────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS = { priorities: [], assigneeId: "", overdue: false };

export default function BoardPage() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showAddTaskDrawer, setShowAddTaskDrawer] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedColumnId, setSelectedColumnId] = useState(null);

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", projectId],
    queryFn: () => boardApi.show(projectId).then((r) => r.data),
  });

  const boardId = board?.id;
  const columns = board?.columns || [];
  const firstColumnId = columns[0]?.id;
  const targetColumnId = selectedColumnId || firstColumnId;
  const workspaceId = board?.project?.workspace_id;

  const { user } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () =>
      workspaceId
        ? workspaceApi.members.list(workspaceId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!workspaceId,
  });

  const currentUserMember = members.find((m) => m.user_id === user?.id);
  const currentUserRole = currentUserMember?.role ?? "member";
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

  const { data: tasksByColumn = {}, isLoading: tasksLoading } = useQuery({
    queryKey: ["board-tasks", boardId],
    queryFn: () =>
      boardId ? taskApi.list(boardId).then((r) => r.data) : Promise.resolve({}),
    enabled: !!boardId,
  });

  // Apply filters client-side — tasks are already loaded
  const filteredTasksByColumn = useMemo(() => {
    const hasFilters =
      filters.priorities.length > 0 || filters.assigneeId || filters.overdue;
    if (!hasFilters) return tasksByColumn;

    const now = new Date();
    const result = {};
    for (const [colId, tasks] of Object.entries(tasksByColumn)) {
      result[colId] = tasks.filter((task) => {
        if (
          filters.priorities.length > 0 &&
          !filters.priorities.includes(task.priority)
        )
          return false;
        if (
          filters.assigneeId &&
          !task.assignees?.some((a) => a.id === filters.assigneeId)
        )
          return false;
        if (
          filters.overdue &&
          (!task.due_date || new Date(task.due_date) >= now)
        )
          return false;
        return true;
      });
    }
    return result;
  }, [tasksByColumn, filters]);

  const totalTasks = Object.values(tasksByColumn).flat().length;
  const filteredTotal = Object.values(filteredTasksByColumn).flat().length;
  const activeFilterCount =
    filters.priorities.length +
    (filters.assigneeId ? 1 : 0) +
    (filters.overdue ? 1 : 0);

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, position }) =>
      taskApi.move(taskId, { column_id: columnId, position }),
    onMutate: () => toast.loading("Moving task…", { id: "move" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["board-tasks", boardId]);
      toast.success("Task moved", { id: "move" });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to move task", {
        id: "move",
      }),
  });

  const addColumnMutation = useMutation({
    mutationFn: (data) => taskApi.column.create(projectId, data),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["board", projectId] }),
        queryClient.refetchQueries({ queryKey: ["board-tasks", boardId] }),
      ]);
      setShowAddColumn(false);
      toast.success("Column added");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to add column"),
  });

  const handleAddTask = (
    taskData,
    pendingAssignees = [],
    pendingAttachments = [],
  ) => {
    const toastId = toast.loading("Creating task…");
    taskApi
      .create(targetColumnId, taskData)
      .then(async (res) => {
        const newTask = res.data;
        if (pendingAssignees.length > 0)
          await Promise.all(
            pendingAssignees.map((u) => taskApi.assign(newTask.id, u.id)),
          );
        if (pendingAttachments.length > 0)
          await Promise.all(
            pendingAttachments.map((file) =>
              attachmentApi.create(newTask.id, file),
            ),
          );
        queryClient.invalidateQueries(["board-tasks", boardId]);
        setShowAddTaskDrawer(false);
        toast.success("Task created", { id: toastId });
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || "Failed to create task", {
          id: toastId,
        }),
      );
  };

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === "task")
      setActiveTask(active.data.current.task);
  };

  const handleDragEnd = (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    if (activeData?.type === "task") {
      const overData = over.data.current;
      const targetColId =
        overData?.type === "task" ? overData.task.column_id : over.id;
      if (!targetColId) return;

      const targetTasks = tasksByColumn[targetColId] || [];
      let position = targetTasks.length;
      if (overData?.type === "task" && overData.task.id !== active.id) {
        const overIndex = targetTasks.findIndex((t) => t.id === over.id);
        if (overIndex !== -1) position = overIndex;
      }
      moveMutation.mutate({
        taskId: active.id,
        columnId: targetColId,
        position,
      });
    } else {
      if (active.id === over.id) return;
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columns, oldIndex, newIndex);
        taskApi.column.reorder(
          reordered.map((c, i) => ({ id: c.id, position: i })),
        );
        queryClient.invalidateQueries(["board", projectId]);
      }
    }
  };

  if (isLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Topbar ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-cream border-cream-border shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-semibold text-charcoal">
              {board?.name || "Board"}
            </h1>
            <p className="text-sm text-gray-medium">{board?.project?.name}</p>
          </div>
          {members.length > 0 && (
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member) => (
                <UserAvatar
                  key={member.id}
                  user={member.user}
                  size="w-8 h-8"
                  textSize="text-xs"
                  rounded="rounded-full"
                  className="border-2 border-cream"
                />
              ))}
              {members.length > 5 && (
                <div className="w-8 h-8 rounded-full border-2 border-cream flex items-center justify-center text-xs font-medium bg-cream-dark text-charcoal">
                  +{members.length - 5}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Filter button with floating dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? "border-ocean text-ocean bg-ocean/5"
                  : "border-teal text-teal hover:bg-teal/10"
              }`}
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
                  d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ocean text-white text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {showFilters && (
              <FilterDropdown
                members={members}
                filters={filters}
                onChange={setFilters}
                onClear={() => setFilters(DEFAULT_FILTERS)}
                onClose={() => setShowFilters(false)}
                totalTasks={totalTasks}
                filteredTasks={filteredTotal}
              />
            )}
          </div>

          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowAddColumn((v) => !v)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  showAddColumn
                    ? "border-ocean text-ocean bg-ocean/5"
                    : "border-ocean text-ocean hover:bg-ocean/10"
                }`}
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Column
              </button>
              {showAddColumn && (
                <AddColumnDropdown
                  onAdd={(data) => addColumnMutation.mutate(data)}
                  isPending={addColumnMutation.isPending}
                  onClose={() => setShowAddColumn(false)}
                />
              )}
            </div>
          )}

          <button
            onClick={() => setShowAddTaskDrawer(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Task
          </button>
        </div>
      </div>

      {/* ── Board ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 p-6 h-full">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={filteredTasksByColumn[column.id] || []}
                onTaskClick={(task) => setSelectedTask(task)}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask ? (
            <div className="rotate-1 scale-105 opacity-90 shadow-xl">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Task drawers ── */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          projectId={projectId}
          workspaceId={workspaceId}
          isAdmin={isAdmin}
          onClose={() => setSelectedTask(null)}
        />
      )}
      {showAddTaskDrawer && (
        <TaskDrawer
          task={{ title: "", priority: "medium", description: "" }}
          projectId={projectId}
          workspaceId={workspaceId}
          isAdmin={isAdmin}
          isCreateMode={true}
          columns={columns}
          selectedColumnId={selectedColumnId}
          onColumnChange={setSelectedColumnId}
          onClose={() => {
            setShowAddTaskDrawer(false);
            setSelectedColumnId(null);
          }}
          onSave={handleAddTask}
        />
      )}
    </div>
  );
}
