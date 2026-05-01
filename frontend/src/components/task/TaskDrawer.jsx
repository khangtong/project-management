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
    bg: "bg-ocean/20",
    color: "text-ocean",
    border: "border-ocean",
  },
  {
    value: "urgent",
    label: "Urgent",
    bg: "bg-red-100",
    color: "text-red-600",
    border: "border-red-200",
  },
];

/** Strip HTML tags and return plain text — used to detect empty Tiptap output */
function stripHtml(html) {
  return html?.replace(/<[^>]*>/g, "").trim() ?? "";
}

/** Normalise description before saving: treat empty Tiptap output as null */
function cleanDescription(html) {
  if (!html || !stripHtml(html)) return null;
  return html;
}

export default function TaskDrawer({
  task,
  projectId,
  workspaceId,
  isCreateMode = false,
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

  const { data: fullTask } = useQuery({
    queryKey: ["task", task.id],
    queryFn: () => taskApi.get(task.id).then((r) => r.data),
    initialData: task,
    enabled: !isCreateMode,
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await taskApi.update(task.id, data);
      const currentAssigneeIds = (fullTask?.assignees || []).map((a) => a.id);
      const pendingIds = pendingAssignees.map((a) => a.id);
      const toAdd = pendingIds.filter((id) => !currentAssigneeIds.includes(id));
      const toRemove = currentAssigneeIds.filter(
        (id) => !pendingIds.includes(id),
      );
      for (const userId of toAdd) {
        await taskApi.assign(task.id, userId);
      }
      for (const userId of toRemove) {
        await taskApi.unassign(task.id, userId);
      }
      for (const file of pendingAttachments) {
        await attachmentApi.create(task.id, file);
      }
    },
    onSuccess: () => {
      setPendingAttachments([]);
      queryClient.invalidateQueries(["task", task.id]);
      queryClient.invalidateQueries(["board-tasks"]);
      toast.success("Task saved");
    },
    onError: (err) => {
      console.error("Save error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to save task");
    },
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

  return (
    <>
      <div className="fixed inset-0 z-40 bg-cream/70" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden bg-white rounded-l-2xl shadow-lg"
        style={{
          width: "40%",
          maxWidth: "500px",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream-border">
          <h2 className="text-lg font-semibold text-charcoal">
            {isCreateMode ? "Create Task" : "Task Details"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-50 text-gray-medium"
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

        {/* Tabs (edit mode only) */}
        {!isCreateMode && (
          <div className="flex border-b border-cream-border gap-1 px-6 pt-2 pb-0 bg-white">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ── Details ── */}
          {(isCreateMode || activeTab === "details") && (
            <>
              {/* Title */}
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
                          setEditedTask({ ...editedTask, priority: p.value })
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
                      setEditedTask({ ...editedTask, due_date: e.target.value })
                    }
                    className="px-3 py-1.5 text-sm rounded-lg border border-cream-border text-charcoal"
                  />
                </div>
              </div>

              {/* Assignees — works in both create and edit mode */}
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
            </>
          )}

          {!isCreateMode && activeTab === "comments" && (
            <TaskComments
              taskId={task.id}
              comments={fullTask?.comments || []}
            />
          )}

          {!isCreateMode && activeTab === "activity" && (
            <ActivityLog taskId={task.id} />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-cream-border">
          <button
            onClick={handleSave}
            disabled={
              isCreateMode
                ? !editedTask.title?.trim()
                : updateMutation.isPending
            }
            className="w-full py-2.5 font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
          >
            {isCreateMode
              ? "Create Task"
              : updateMutation.isPending
                ? "Saving..."
                : "Save Changes"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Create-mode assignee picker (no task ID yet, so no API calls) ─────────────
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
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-mint-light border border-cream-dark text-charcoal"
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
          className="text-xs px-3 py-1.5 rounded-lg border border-mint text-mint"
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
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-mint text-left"
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

// ── Edit-mode assignees (with live API calls) ────────────────────────────────
function AssigneesPanel({ taskId, task, workspaceId }) {
  const queryClient = useQueryClient();
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

  const assignMutation = useMutation({
    mutationFn: (userId) => taskApi.assign(taskId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      queryClient.invalidateQueries(["board-tasks"]);
      setShowDropdown(false);
      toast.success("Assignee added");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to assign"),
  });

  const unassignMutation = useMutation({
    mutationFn: (userId) => taskApi.unassign(taskId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      queryClient.invalidateQueries(["board-tasks"]);
      toast.success("Assignee removed");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to remove"),
  });

  const assignees = task?.assignees || [];
  const assignedIds = assignees.map((a) => a.id);
  const available = members.filter((m) => !assignedIds.includes(m.user_id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {assignees.length === 0 && (
          <span className="text-sm text-gray-medium">No assignees</span>
        )}
        {assignees.map((a) => (
          <span
            key={a.id}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-mint-light border border-cream-dark text-charcoal"
          >
            <div className="w-5 h-5 rounded-full bg-mint flex items-center justify-center text-xs text-white">
              {a.name?.[0]?.toUpperCase()}
            </div>
            {a.name}
            <button
              onClick={() => unassignMutation.mutate(a.id)}
              disabled={unassignMutation.isPending}
              className="text-gray-medium hover:text-red-500 disabled:opacity-50"
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
          onClick={() => setShowDropdown((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-lg border border-mint text-mint"
        >
          + Add Assignee
        </button>
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-10 mt-1 w-48 bg-white border border-cream-border rounded-lg shadow-lg max-h-40 overflow-y-auto"
          >
            {available.length === 0 ? (
              <p className="p-3 text-sm text-gray-medium">
                No more members to add
              </p>
            ) : (
              available.map((m) => (
                <button
                  key={m.user_id}
                  onClick={() => assignMutation.mutate(m.user_id)}
                  disabled={assignMutation.isPending}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-mint text-left disabled:opacity-50"
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

// ── Attachments ───────────────────────────────────────────────────────────────
function AttachmentsPanel({
  taskId,
  attachments = [],
  pendingAttachments = [],
  onPendingChange,
}) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id) => attachmentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      toast.success("File removed");
    },
    onError: (err) => {
      console.error("Delete error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to delete file");
    },
  });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      onPendingChange([...pendingAttachments, ...files]);
    }
    e.target.value = "";
  };

  const removePending = (index) => {
    onPendingChange(pendingAttachments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pendingAttachments.map((file, index) => (
            <div
              key={`pending-${index}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ocean/10 border border-ocean/20"
            >
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
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <span className="text-sm text-charcoal">{file.name}</span>
              <span className="text-xs text-ocean">(pending)</span>
              <button
                onClick={() => removePending(index)}
                className="text-xs text-gray-medium hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mint-light"
            >
              <svg
                className="w-4 h-4 text-mint"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
              <a
                href={att.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-ocean hover:underline"
              >
                {att.file_name}
              </a>
              <button
                onClick={() => deleteMutation.mutate(att.id)}
                className="text-xs text-gray-medium hover:text-red-500"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-mint text-mint cursor-pointer">
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
        Upload file
        <input
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="*/*"
          multiple
        />
      </label>
    </div>
  );
}

// ── Activity Log ──────────────────────────────────────────────────────────────
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
        Loading activity...
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
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white bg-ocean flex-shrink-0">
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
