import { useEffect, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import TaskDescription from "./TaskDescription";
import TaskComments from "./TaskComments";
import { taskApi } from "../../api/tasks";
import { attachmentApi } from "../../api/attachments";
import { workspaceApi } from "../../api/workspaces";

function formatDateForInput(dateValue) {
  if (!dateValue) return "";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    bg: "bg-gray-100",
    color: "text-gray-600",
    border: "border-gray-200",
  },
  {
    value: "medium",
    label: "Medium",
    bg: "bg-sage/20",
    color: "text-sage",
    border: "border-sage",
  },
  {
    value: "high",
    label: "High",
    bg: "bg-orange-100",
    color: "text-orange-700",
    border: "border-orange-200",
  },
  {
    value: "urgent",
    label: "Urgent",
    bg: "bg-red-100",
    color: "text-red-600",
    border: "border-red-200",
  },
];

function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, "").trim() ?? "";
}

function cleanDescription(html) {
  if (!html || !stripHtml(html)) return null;
  return html;
}

// ── Main drawer ───────────────────────────────────────────────────────────────
export default function TaskDrawer({
  task,
  workspaceId,
  boardTasks = [],
  isCreateMode = false,
  columns = [],
  selectedColumnId,
  onColumnChange,
  onClose,
  onSave,
}) {
  const queryClient = useQueryClient();
  const [editedTask, setEditedTask] = useState(task);
  const [activeTab, setActiveTab] = useState("details");
  const [pendingAssignees, setPendingAssignees] = useState(() =>
    isCreateMode ? [] : task.assignees || [],
  );
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [selectedBlockingTaskId, setSelectedBlockingTaskId] = useState("");
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);
  const syncedRef = useRef(false);

  const { data: fullTask, isLoading: taskLoading } = useQuery({
    queryKey: ["task", task.id],
    queryFn: () => taskApi.get(task.id).then((r) => r.data),
    enabled: !isCreateMode,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!isCreateMode && fullTask && !syncedRef.current) {
      syncedRef.current = true;
      setEditedTask((prev) => ({
        ...prev,
        due_date: fullTask.due_date ?? "",
        description: fullTask.description ?? prev.description,
        priority: fullTask.priority ?? prev.priority,
        title: fullTask.title ?? prev.title,
      }));
      setPendingAssignees(fullTask.assignees || []);
    }
  }, [isCreateMode, fullTask]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await taskApi.update(task.id, data);
      const savedIds = (fullTask?.assignees || []).map((a) => a.id);
      const pendingIds = pendingAssignees.map((a) => a.id);
      const toAdd = pendingIds.filter((id) => !savedIds.includes(id));
      const toRemove = savedIds.filter((id) => !pendingIds.includes(id));
      await Promise.all(toAdd.map((id) => taskApi.assign(task.id, id)));
      await Promise.all(toRemove.map((id) => taskApi.unassign(task.id, id)));
      for (const file of pendingAttachments) {
        await attachmentApi.create(task.id, file);
      }
    },
    onMutate: () => toast.loading("Saving…", { id: "task-save" }),
    onSuccess: async () => {
      setPendingAttachments([]);
      // Await both refetches so the UI is updated before the toast changes
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["task", task.id] }),
        queryClient.refetchQueries({ queryKey: ["board-tasks"] }),
      ]);
      toast.success("Task saved", { id: "task-save" });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to save task", {
        id: "task-save",
      }),
  });

  const addDependencyMutation = useMutation({
    mutationFn: (blockingTaskId) =>
      taskApi.dependencies.create(task.id, blockingTaskId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["task", task.id] }),
        queryClient.refetchQueries({ queryKey: ["board-tasks"] }),
      ]);
      setSelectedBlockingTaskId("");
      toast.success("Dependency added");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to add dependency"),
  });

  const removeDependencyMutation = useMutation({
    mutationFn: (blockingTaskId) =>
      taskApi.dependencies.delete(task.id, blockingTaskId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["task", task.id] }),
        queryClient.refetchQueries({ queryKey: ["board-tasks"] }),
      ]);
      toast.success("Dependency removed");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to remove dependency"),
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSave = () => {
    const payload = {
      ...editedTask,
      description: cleanDescription(editedTask.description),
    };
    if (isCreateMode) {
      onSave?.(payload, pendingAssignees, pendingAttachments);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const blockedByTasks = fullTask?.blocked_by_tasks || [];
  const dependentTasks = fullTask?.dependent_tasks || [];
  const availableBlockingTasks = boardTasks.filter((candidate) => {
    if (!task?.id || candidate.id === task.id) return false;
    return !blockedByTasks.some(
      (blockingTask) => blockingTask.id === candidate.id,
    );
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-cream/70" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden bg-white rounded-l-2xl"
        style={{
          width: "40%",
          maxWidth: "500px",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-border shrink-0">
          <h2 className="text-lg font-semibold text-charcoal">
            {isCreateMode ? "Create Task" : "Task Details"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-medium"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* ── Tabs (edit mode only) ── */}
        {!isCreateMode && (
          <div className="flex border-b border-cream-border gap-1 px-6 pt-2 pb-0 bg-white shrink-0">
            {["details", "comments", "activity"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? "border-ocean text-ocean"
                    : "border-transparent text-gray-medium hover:text-charcoal"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading skeleton */}
          {!isCreateMode && taskLoading ? (
            <div className="p-6 space-y-5 animate-pulse">
              <div className="h-7 bg-cream-border rounded-lg w-3/4" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-cream-border rounded-lg" />
                <div className="h-10 bg-cream-border rounded-lg" />
              </div>
              <div className="h-4 bg-cream-border rounded w-1/4" />
              <div className="h-24 bg-cream-border rounded-lg" />
              <div className="space-y-2">
                <div className="h-4 bg-cream-border rounded w-1/3" />
                <div className="h-14 bg-cream-border rounded-xl" />
                <div className="h-14 bg-cream-border rounded-xl" />
              </div>
            </div>
          ) : (
            <>
              {/* ── Details tab ── */}
              {(isCreateMode || activeTab === "details") && (
                <div className="p-6 space-y-6">
                  <input
                    type="text"
                    value={editedTask.title || ""}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask, title: e.target.value })
                    }
                    placeholder="Task title"
                    className="w-full text-xl font-semibold bg-transparent border-none outline-none text-charcoal placeholder-gray-medium"
                    autoFocus={isCreateMode}
                  />

                  {/* Column selector — create mode only */}
                  {isCreateMode && columns.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">
                        Add to Column
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {columns.map((col) => (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => onColumnChange?.(col.id)}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                              (selectedColumnId || columns[0]?.id) === col.id
                                ? "bg-ocean text-white border-ocean"
                                : "bg-transparent text-gray-medium border-cream-border hover:border-ocean/40"
                            }`}
                          >
                            {col.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority + Due Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">
                        Priority
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {PRIORITY_OPTIONS.map((p) => (
                          <button
                            key={p.value}
                            onClick={() =>
                              setEditedTask({
                                ...editedTask,
                                priority: p.value,
                              })
                            }
                            className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                              (editedTask.priority || fullTask?.priority) ===
                              p.value
                                ? `${p.bg} ${p.color} ${p.border}`
                                : "bg-transparent text-gray-medium border-cream-border"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={
                          formatDateForInput(editedTask.due_date) ||
                          formatDateForInput(fullTask?.due_date) ||
                          ""
                        }
                        onChange={(e) =>
                          setEditedTask({
                            ...editedTask,
                            due_date: e.target.value,
                          })
                        }
                        className="px-3 py-1.5 text-sm rounded-lg border border-cream-border text-charcoal"
                      />
                    </div>
                  </div>

                  {/* Assignees */}
                  <div>
                    <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">
                      Assignees
                    </label>
                    <CreateModeAssignees
                      workspaceId={workspaceId}
                      selected={pendingAssignees}
                      onChange={setPendingAssignees}
                    />
                  </div>

                  {!isCreateMode && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <label className="block text-xs font-medium uppercase text-gray-medium">
                            Dependencies
                          </label>
                          <p className="text-sm text-charcoal mt-1">
                            {fullTask?.is_blocked
                              ? `${fullTask.open_blocking_dependencies_count} blocking task${fullTask.open_blocking_dependencies_count === 1 ? "" : "s"} still open`
                              : "No open blockers"}
                          </p>
                        </div>
                        {fullTask?.is_blocked && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                            Blocked
                          </span>
                        )}
                      </div>

                      <DependencyTaskPicker
                        availableTasks={availableBlockingTasks}
                        selectedId={selectedBlockingTaskId}
                        onSelect={setSelectedBlockingTaskId}
                        show={showDependencyPicker}
                        onToggle={() => setShowDependencyPicker((v) => !v)}
                        onClose={() => setShowDependencyPicker(false)}
                        onAdd={() => {
                          addDependencyMutation.mutate(selectedBlockingTaskId);
                          setShowDependencyPicker(false);
                        }}
                        isAdding={addDependencyMutation.isPending}
                      />

                      <DependencyList
                        title="Blocked by"
                        tasks={blockedByTasks}
                        emptyLabel="No blocking tasks"
                        onRemove={(blockingTaskId) =>
                          removeDependencyMutation.mutate(blockingTaskId)
                        }
                        isRemoving={removeDependencyMutation.isPending}
                      />

                      <DependencyList
                        title="Blocking"
                        tasks={dependentTasks}
                        emptyLabel="No dependent tasks"
                      />
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-charcoal">
                      Description
                    </label>
                    <div className="rounded-lg p-4 bg-cream-light border border-cream-border">
                      <TaskDescription
                        content={
                          isCreateMode
                            ? editedTask.description || ""
                            : fullTask?.description || ""
                        }
                        editable={true}
                        onUpdate={(html) =>
                          setEditedTask({ ...editedTask, description: html })
                        }
                      />
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-charcoal">
                      Attachments
                    </label>
                    <AttachmentsPanel
                      taskId={task.id}
                      attachments={fullTask?.attachments || []}
                      pendingAttachments={pendingAttachments}
                      onPendingChange={setPendingAttachments}
                    />
                  </div>
                </div>
              )}

              {/* ── Comments tab ── */}
              {!isCreateMode && activeTab === "comments" && (
                <div className="p-6">
                  <TaskComments
                    taskId={task.id}
                    workspaceId={workspaceId}
                    comments={fullTask?.comments || []}
                  />
                </div>
              )}

              {/* ── Activity tab ── */}
              {!isCreateMode && activeTab === "activity" && (
                <div className="p-6">
                  <ActivityLog taskId={task.id} />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-cream-border shrink-0">
          <button
            onClick={handleSave}
            disabled={
              isCreateMode
                ? !editedTask.title?.trim()
                : updateMutation.isPending
            }
            className="w-full py-2.5 font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50 transition-colors"
          >
            {isCreateMode
              ? "Create Task"
              : updateMutation.isPending
                ? "Saving…"
                : "Save Changes"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Dependency task picker ───────────────────────────────────────────────────
const PRIORITY_BADGE = {
  low: { dot: "bg-gray-400", label: "Low", text: "text-gray-500" },
  medium: { dot: "bg-sage", label: "Med", text: "text-sage" },
  high: { dot: "bg-orange-500", label: "High", text: "text-orange-600" },
  urgent: { dot: "bg-red-500", label: "Urgent", text: "text-red-600" },
};

function DependencyTaskPicker({
  availableTasks,
  selectedId,
  onSelect,
  show,
  onToggle,
  onClose,
  onAdd,
  isAdding,
}) {
  const [query, setQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Focus search when opened
  useEffect(() => {
    if (show) setTimeout(() => searchRef.current?.focus(), 50);
    else setQuery("");
  }, [show]);

  const selectedTask = availableTasks.find((t) => t.id === selectedId) || null;

  const filtered = availableTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      (t.column?.name || "").toLowerCase().includes(query.toLowerCase()),
  );

  // Group by column
  const grouped = filtered.reduce((acc, task) => {
    const col = task.column?.name || "Unknown";
    if (!acc[col]) acc[col] = [];
    acc[col].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {/* Trigger row */}
      <div className="flex gap-2">
        <div ref={dropdownRef} className="relative flex-1">
          <button
            type="button"
            onClick={onToggle}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
              show
                ? "border-ocean ring-2 ring-ocean/20 bg-white"
                : selectedTask
                  ? "border-ocean/40 bg-ocean/5 text-charcoal"
                  : "border-cream-border bg-white text-gray-medium hover:border-ocean/40"
            }`}
          >
            {/* Left icon */}
            <svg
              className="w-4 h-4 shrink-0 text-gray-medium"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>

            {selectedTask ? (
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-medium text-charcoal truncate">
                  {selectedTask.title}
                </span>
                <span className="text-[11px] text-gray-medium">
                  {selectedTask.column?.name || "Unknown column"}
                </span>
              </span>
            ) : (
              <span className="flex-1 text-left text-sm text-gray-medium">
                Select a task to block this one…
              </span>
            )}

            {/* Priority dot if selected */}
            {selectedTask && (
              <span
                className={`flex items-center gap-1 text-[11px] font-medium shrink-0 ${
                  PRIORITY_BADGE[selectedTask.priority]?.text || "text-gray-500"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    PRIORITY_BADGE[selectedTask.priority]?.dot || "bg-gray-400"
                  }`}
                />
                {PRIORITY_BADGE[selectedTask.priority]?.label ||
                  selectedTask.priority}
              </span>
            )}

            {/* Chevron */}
            <svg
              className={`w-4 h-4 shrink-0 text-gray-medium transition-transform ${show ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown panel */}
          {show && (
            <div
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-cream-border overflow-hidden"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
            >
              {/* Search */}
              <div className="p-2 border-b border-cream-border">
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-cream-light border border-cream-border focus-within:border-ocean focus-within:ring-2 focus-within:ring-ocean/20 transition-all">
                  <svg
                    className="w-3.5 h-3.5 text-gray-medium shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && onClose()}
                    placeholder="Search tasks…"
                    className="flex-1 bg-transparent text-sm text-charcoal placeholder-gray-medium outline-none"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="p-0.5 rounded text-gray-medium hover:text-charcoal transition-colors"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="max-h-56 overflow-y-auto">
                {availableTasks.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm font-medium text-charcoal">
                      No tasks available
                    </p>
                    <p className="text-xs text-gray-medium mt-1">
                      All board tasks are already dependencies
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-medium">
                      No tasks match &ldquo;{query}&rdquo;
                    </p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([colName, tasks]) => (
                    <div key={colName}>
                      {/* Column header */}
                      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-medium">
                          {colName}
                        </span>
                        <div className="flex-1 h-px bg-cream-border" />
                        <span className="text-[10px] text-gray-medium">
                          {tasks.length}
                        </span>
                      </div>

                      {tasks.map((t) => {
                        const badge =
                          PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.medium;
                        const isSelected = selectedId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              onSelect(t.id);
                              onClose();
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                              isSelected
                                ? "bg-ocean/10 text-ocean"
                                : "hover:bg-cream-light text-charcoal"
                            }`}
                          >
                            {/* Priority dot */}
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${badge.dot}`}
                            />

                            {/* Title */}
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium truncate">
                                {t.title}
                              </span>
                              {t.assignees?.length > 0 && (
                                <span className="text-[11px] text-gray-medium">
                                  {t.assignees
                                    .map((a) => a.name || a.email)
                                    .filter(Boolean)
                                    .join(", ")}
                                </span>
                              )}
                            </span>

                            {/* Priority label */}
                            <span
                              className={`text-[11px] font-medium shrink-0 ${badge.text}`}
                            >
                              {badge.label}
                            </span>

                            {/* Check */}
                            {isSelected && (
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
                  ))
                )}
              </div>

              {/* Footer count */}
              {availableTasks.length > 0 && (
                <div className="px-3 py-2 border-t border-cream-border bg-cream-light/40">
                  <p className="text-[11px] text-gray-medium">
                    {filtered.length} of {availableTasks.length} task
                    {availableTasks.length !== 1 ? "s" : ""}
                    {query ? " match" : " available"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={onAdd}
          disabled={!selectedId || isAdding}
          className="px-3 py-2 rounded-xl text-sm font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-1.5"
        >
          {isAdding ? (
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
          {isAdding ? "Adding…" : "Add"}
        </button>
      </div>
    </div>
  );
}

// ── Dependency list ───────────────────────────────────────────────────────────
function DependencyList({
  title,
  tasks,
  emptyLabel,
  onRemove,
  isRemoving = false,
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase mb-2 text-gray-medium">
        {title}
      </p>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-medium">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((dependencyTask) => (
            <div
              key={dependencyTask.id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl border border-cream-border bg-cream-light/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal truncate">
                  {dependencyTask.title}
                </p>
                <p className="text-xs text-gray-medium mt-0.5">
                  {dependencyTask.column?.name || "Unknown column"}
                </p>
              </div>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(dependencyTask.id)}
                  disabled={isRemoving}
                  className="p-1.5 rounded-lg text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Remove dependency"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Assignee picker (works for both create and edit via pendingAssignees) ─────
function CreateModeAssignees({ workspaceId, selected, onChange }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () =>
      workspaceId
        ? workspaceApi.members.list(workspaceId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!workspaceId,
  });

  const selectedIds = selected.map((u) => u.id);
  const available = members.filter((m) => !selectedIds.includes(m.user_id));

  const add = (member) => {
    onChange([
      ...selected,
      {
        id: member.user_id,
        name: member.user?.name,
        email: member.user?.email,
      },
    ]);
    setShowDropdown(false);
  };
  const remove = (userId) => onChange(selected.filter((u) => u.id !== userId));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.length === 0 && (
          <span className="text-sm text-gray-medium">No assignees</span>
        )}
        {selected.map((u) => (
          <span
            key={u.id}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-mint-light border border-cream-border text-charcoal"
          >
            <div className="w-5 h-5 rounded-full bg-mint flex items-center justify-center text-xs text-white">
              {u.name?.[0]?.toUpperCase()}
            </div>
            {u.name}
            <button
              onClick={() => remove(u.id)}
              className="text-gray-medium hover:text-red-500"
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
          </span>
        ))}
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-mint text-mint hover:bg-mint-light transition-colors"
        >
          + Add Assignee
        </button>
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-48 bg-white border border-cream-border rounded-lg shadow-lg max-h-40 overflow-y-auto"
          >
            {available.length === 0 ? (
              <p className="p-3 text-sm text-gray-medium">No more members</p>
            ) : (
              available.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => add(m)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-cream-light text-left"
                >
                  <div className="w-5 h-5 rounded-full bg-mint flex items-center justify-center text-xs text-white">
                    {m.user?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  {m.user?.name || "Unknown"}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Attachments panel ─────────────────────────────────────────────────────────
function fileIcon(mime = "") {
  if (mime.startsWith("image/"))
    return {
      icon: "🖼",
      color: "text-purple-500",
      bg: "bg-purple-50",
      border: "border-purple-100",
    };
  if (mime.includes("pdf"))
    return {
      icon: "📄",
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-100",
    };
  if (mime.includes("word") || mime.includes("document"))
    return {
      icon: "📝",
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-100",
    };
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv"))
    return {
      icon: "📊",
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    };
  if (mime.includes("zip") || mime.includes("rar") || mime.includes("tar"))
    return {
      icon: "🗜",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-100",
    };
  if (mime.startsWith("video/"))
    return {
      icon: "🎬",
      color: "text-pink-500",
      bg: "bg-pink-50",
      border: "border-pink-100",
    };
  if (mime.startsWith("audio/"))
    return {
      icon: "🎵",
      color: "text-indigo-500",
      bg: "bg-indigo-50",
      border: "border-indigo-100",
    };
  return {
    icon: "📎",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-100",
  };
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function AttachmentsPanel({
  taskId,
  attachments = [],
  pendingAttachments = [],
  onPendingChange,
}) {
  const queryClient = useQueryClient();
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => attachmentApi.delete(id),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      toast.success("File removed");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to remove file"),
    onSettled: () => setDeletingId(null),
  });

  const addFiles = (files) => {
    if (!files.length) return;
    onPendingChange([...pendingAttachments, ...files]);
  };
  const removePending = (index) =>
    onPendingChange(pendingAttachments.filter((_, i) => i !== index));
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };
  const isEmpty = attachments.length === 0 && pendingAttachments.length === 0;

  return (
    <div className="space-y-3">
      {/* Saved files */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => {
            const { icon, color, bg, border } = fileIcon(att.mime_type);
            const isDeleting = deletingId === att.id;
            return (
              <div
                key={att.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white transition-opacity ${isDeleting ? "opacity-40" : ""} ${border}`}
              >
                <div
                  className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-base shrink-0`}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block text-sm font-medium truncate hover:underline ${color}`}
                  >
                    {att.file_name}
                  </a>
                  {att.file_size && (
                    <p className="text-xs text-gray-medium">
                      {formatBytes(att.file_size)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-medium hover:text-ocean hover:bg-ocean/10 transition-colors"
                    title="Download"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </a>
                  <button
                    onClick={() => deleteMutation.mutate(att.id)}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                    title="Remove"
                  >
                    {isDeleting ? (
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pending files */}
      {pendingAttachments.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-ocean uppercase tracking-wide">
            Pending — will upload on Save
          </p>
          {pendingAttachments.map((file, index) => {
            const { icon, bg, border } = fileIcon(file.type);
            return (
              <div
                key={`pending-${index}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed ${border} bg-ocean/5`}
              >
                <div
                  className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center text-base shrink-0`}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-medium">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <button
                  onClick={() => removePending(index)}
                  className="p-1.5 rounded-lg text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Cancel"
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
            );
          })}
        </div>
      )}

      {/* Drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 w-full py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          isDragOver
            ? "border-ocean bg-ocean/5 scale-[1.01]"
            : "border-cream-border hover:border-ocean/40 hover:bg-cream-light/60"
        }`}
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isDragOver ? "bg-ocean/20" : "bg-cream-light"}`}
        >
          <svg
            className={`w-5 h-5 transition-colors ${isDragOver ? "text-ocean" : "text-gray-medium"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        {isEmpty ? (
          <div className="text-center">
            <p className="text-sm font-medium text-charcoal">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-medium mt-0.5">
              Any file type · max 20 MB each
            </p>
          </div>
        ) : (
          <p className="text-sm text-ocean font-medium">Add more files</p>
        )}
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            addFiles(Array.from(e.target.files));
            e.target.value = "";
          }}
          accept="*/*"
          multiple
        />
      </label>
    </div>
  );
}

// ── Activity log ──────────────────────────────────────────────────────────────
function ActivityLog({ taskId }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["task-activity", taskId],
    queryFn: () => taskApi.getActivity(taskId).then((r) => r.data),
  });

  const ACTION_LABELS = {
    created: "created this task",
    updated: "updated this task",
    deleted: "deleted this task",
    moved: "moved this task",
    assigned: "assigned a user",
    unassigned: "unassigned a user",
    commented: "added a comment",
    attachment_added: "attached a file",
  };

  if (isLoading)
    return (
      <div className="py-8 text-center text-sm text-gray-medium">
        Loading activity…
      </div>
    );
  if (logs.length === 0)
    return (
      <div className="py-8 text-center text-sm text-gray-medium">
        No activity yet.
      </div>
    );

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 items-start">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white bg-ocean shrink-0">
            {log.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-charcoal">
              <span className="font-medium">{log.user?.name || "Someone"}</span>{" "}
              {ACTION_LABELS[log.action] || log.action}
              {log.metadata?.file_name && (
                <span className="text-gray-medium">
                  {" "}
                  &ldquo;{log.metadata.file_name}&rdquo;
                </span>
              )}
            </p>
            <p className="text-xs text-gray-medium mt-0.5">
              {log.created_at
                ? formatDistanceToNow(new Date(log.created_at), {
                    addSuffix: true,
                  })
                : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
