import { useState } from "react";
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

export default function BoardPage() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTask, setActiveTask] = useState(null); // task being dragged (for DragOverlay)
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [showAddTaskDrawer, setShowAddTaskDrawer] = useState(false);

  const { data: board, isLoading } = useQuery({
    queryKey: ["board", projectId],
    queryFn: async () => {
      const boardData = await boardApi.show(projectId).then((r) => r.data);
      return boardData;
    },
  });

  const boardId = board?.id;
  const columns = board?.columns || [];
  const firstColumnId = columns[0]?.id;
  const [selectedColumnId, setSelectedColumnId] = useState(null);
  const targetColumnId = selectedColumnId || firstColumnId;

  const handleAddTask = (taskData, pendingAssignees = [], pendingAttachments = []) => {
    const toastId = toast.loading("Creating task…");
    taskApi.create(targetColumnId, taskData).then(async (res) => {
      const newTask = res.data;
      if (pendingAssignees.length > 0) {
        await Promise.all(pendingAssignees.map((u) => taskApi.assign(newTask.id, u.id)));
      }
      if (pendingAttachments.length > 0) {
        await Promise.all(pendingAttachments.map((file) => attachmentApi.create(newTask.id, file)));
      }
      queryClient.invalidateQueries(["board-tasks", boardId]);
      setShowAddTaskDrawer(false);
      toast.success("Task created", { id: toastId });
    }).catch((err) => {
      toast.error(err.response?.data?.message || "Failed to create task", { id: toastId });
    });
  };

  const workspaceId = board?.project?.workspace_id;
  const { user } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceId ? workspaceApi.members.list(workspaceId).then((r) => r.data) : Promise.resolve([]),
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

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, position }) =>
      taskApi.move(taskId, { column_id: columnId, position }),
    onMutate: () => toast.loading("Moving task…", { id: "move" }),
    onSuccess: () => {
      queryClient.invalidateQueries(["board-tasks", boardId]);
      toast.success("Task moved", { id: "move" });
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to move task", { id: "move" }),
  });

  const addColumnMutation = useMutation({
    mutationFn: (data) => taskApi.column.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["board", projectId]);
      queryClient.invalidateQueries(["board-tasks", boardId]);
      setShowAddColumn(false);
      setNewColumnName("");
      toast.success("Column added");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to add column"),
  });

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === "task") {
      setActiveTask(active.data.current.task);
    }
  };

  const handleDragEnd = (event) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;

    if (activeData?.type === "task") {
      // Determine the target column: over could be a column droppable or a task
      const overData = over.data.current;
      const targetColumnId = overData?.type === "task"
        ? overData.task.column_id          // dropped onto another task
        : over.id;                          // dropped onto a column droppable

      if (!targetColumnId) return;

      // Determine position: if dropped onto a task, slot above it; else append
      const targetTasks = tasksByColumn[targetColumnId] || [];
      let position = targetTasks.length; // default: end of column
      if (overData?.type === "task" && overData.task.id !== active.id) {
        const overIndex = targetTasks.findIndex((t) => t.id === over.id);
        if (overIndex !== -1) position = overIndex;
      }

      moveMutation.mutate({ taskId: active.id, columnId: targetColumnId, position });
    } else {
      // Column reorder
      if (active.id === over.id) return;
      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columns, oldIndex, newIndex);
        taskApi.column.reorder(reordered.map((c, i) => ({ id: c.id, position: i })));
        queryClient.invalidateQueries(["board", projectId]);
      }
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
  };

  if (isLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full border-2 border-cream flex items-center justify-center text-xs font-medium text-white bg-mint"
                  style={{ backgroundColor: "#6CC4A1" }}
                  title={member.user?.name}
                >
                  {member.user?.name?.[0]?.toUpperCase() || "?"}
                </div>
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
          <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-teal text-teal hover:bg-teal/10 transition-colors">
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
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowAddColumn((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-ocean text-ocean hover:bg-ocean/10 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Column
            </button>
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

      {showAddColumn && (
        <div className="px-6 py-3 border-b bg-cream-light border-cream-border shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addColumnMutation.mutate({ name: newColumnName });
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Column name"
              className="px-3 py-2 text-sm rounded-lg border border-cream-border text-charcoal"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-2 text-sm rounded-lg text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
            >
              {addColumnMutation.isPending ? "..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddColumn(false);
                setNewColumnName("");
              }}
              className="px-3 py-2 text-sm rounded-lg text-gray-medium hover:bg-white/50"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

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
                tasks={tasksByColumn[column.id] || []}
                onTaskClick={handleTaskClick}
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

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {showAddTaskDrawer && (
        <TaskDrawer
          task={{ title: "", priority: "medium", description: "" }}
          projectId={projectId}
          workspaceId={workspaceId}
          isCreateMode={true}
          columns={columns}
          selectedColumnId={selectedColumnId}
          onColumnChange={setSelectedColumnId}
          onClose={() => { setShowAddTaskDrawer(false); setSelectedColumnId(null); }}
          onSave={handleAddTask}
        />
      )}
    </div>
  );
}
