import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import TaskCard from "./TaskCard";
import { taskApi } from "../../api/tasks";

const COLUMN_ACCENT_COLORS = {
  "To Do": "#6CC4A1",
  "In Progress": "#4CACBC",
  "In Review": "#A0D995",
  Done: "#F6E3C5",
};

export default function KanbanColumn({ column, tasks = [], onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  const queryClient = useQueryClient();
  const boardId = column.board_id || column.boardId;
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);

  const accentColor = COLUMN_ACCENT_COLORS[column.name] || "#6CC4A1";
  const isDone = column.name === "Done";

  const createTaskMutation = useMutation({
    mutationFn: (data) => taskApi.create(column.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["board-tasks", boardId]);
      setNewTaskTitle("");
      setIsAdding(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskApi.column.delete(column.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["board"]);
    },
  });

  const renameMutation = useMutation({
    mutationFn: (data) => taskApi.column.update(column.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["board"]);
      setIsEditing(false);
    },
  });

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    createTaskMutation.mutate({ title: newTaskTitle });
  };

  const handleRename = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    renameMutation.mutate({ name: editName });
  };

  return (
    <div
      className={`group flex-shrink-0 w-72 rounded-xl flex flex-col max-h-full transition-all ${isOver ? "ring-2 ring-ocean ring-offset-2" : ""}`}
      style={{
        backgroundColor: "#FAF0E4",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        borderLeft: `4px solid ${accentColor}`,
      }}
    >
      <div className="flex items-center justify-between p-3">
        {isEditing ? (
          <form onSubmit={handleRename} className="flex-1 flex gap-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-2 py-1 text-sm font-semibold bg-white rounded border border-cream-border text-charcoal"
              autoFocus
            />
            <button
              type="submit"
              className="text-xs px-2 py-1 rounded font-medium text-white bg-ocean"
            >
              Save
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h3
                className="text-sm font-semibold cursor-pointer text-charcoal"
                onDoubleClick={() => {
                  setEditName(column.name);
                  setIsEditing(true);
                }}
              >
                {column.name}
              </h3>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: accentColor }}
              >
                {tasks.length}
              </span>
            </div>
            <button
              onClick={() => {
                if (window.confirm(`Delete column "${column.name}" and all its tasks?`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="p-1 rounded text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete column"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-3 pb-3 space-y-2"
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
              desaturated={isDone}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isAdding && (
          <div className="py-8 text-center text-sm text-gray-medium">
            No tasks
          </div>
        )}
      </div>

      {isAdding ? (
        <form
          onSubmit={handleAddTask}
          className="p-3 border-t border-cream-border space-y-2"
        >
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title"
            className="w-full px-3 py-2 text-sm rounded-lg border border-cream-border text-charcoal"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="flex-1 py-1.5 text-sm rounded-lg font-medium text-white bg-ocean disabled:opacity-50"
            >
              {createTaskMutation.isPending ? "..." : "Add"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTaskTitle("");
              }}
              className="px-3 py-1.5 text-sm rounded-md text-gray-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mx-3 mb-3 py-2 text-sm flex items-center gap-1 rounded-md hover:bg-white/50 transition-colors text-mint"
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
          Add task
        </button>
      )}
    </div>
  );
}
