import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import KanbanColumn from "../components/board/KanbanColumn";
import TaskDrawer from "../components/task/TaskDrawer";
import { taskApi } from "../api/tasks";
import { boardApi } from "../api/boards";
import { workspaceApi } from "../api/workspaces";
import { supabase } from "../lib/supabase";

export default function BoardPage() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [selectedTask, setSelectedTask] = useState(null);
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

  const handleAddTask = (taskData) => {
    taskApi.create(firstColumnId, taskData).then(() => {
      queryClient.invalidateQueries(["board-tasks", boardId]);
      setShowAddTaskDrawer(false);
    });
  };

  const workspaceId = board?.project?.workspace_id;

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => workspaceId ? workspaceApi.members.list(workspaceId).then((r) => r.data) : Promise.resolve([]),
    enabled: !!workspaceId,
  });

  const { data: tasksByColumn = {}, isLoading: tasksLoading } = useQuery({
    queryKey: ["board-tasks", boardId],
    queryFn: () =>
      boardId ? taskApi.list(boardId).then((r) => r.data) : Promise.resolve({}),
    enabled: !!boardId,
  });

  const moveMutation = useMutation({
    mutationFn: ({ taskId, columnId, position }) =>
      taskApi.move(taskId, { column_id: columnId, position }),
    onSuccess: () => queryClient.invalidateQueries(["board-tasks", boardId]),
  });

  const addColumnMutation = useMutation({
    mutationFn: (data) => taskApi.column.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["board", projectId]);
      setShowAddColumn(false);
      setNewColumnName("");
    },
  });

  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          queryClient.invalidateQueries(["board-tasks", boardId]);
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [boardId, queryClient]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type === "task") {
      const targetColumnId = overData?.columnId || over.id;
      moveMutation.mutate({
        taskId: active.id,
        columnId: targetColumnId,
        position: overData?.position ?? 0,
      });
    } else {
      const oldIndex = columns.findIndex((c) => c.id === over.id);
      const newIndex = columns.findIndex((c) => c.id === active.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(columns, oldIndex, newIndex);
        taskApi.column.reorder(
          reordered.map((c, i) => ({ id: c.id, position: i })),
        );
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
        collisionDetection={closestCorners}
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
              />
            ))}
          </div>
        </div>
      </DndContext>

      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          projectId={projectId}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {showAddTaskDrawer && (
        <TaskDrawer
          task={{ title: "", priority: "medium", description: "" }}
          projectId={projectId}
          isCreateMode={true}
          onClose={() => setShowAddTaskDrawer(false)}
          onSave={handleAddTask}
        />
      )}
    </div>
  );
}
