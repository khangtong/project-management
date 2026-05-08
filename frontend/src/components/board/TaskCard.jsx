import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { taskApi } from "../../api/tasks";
import { useConfirm } from "../ui/useConfirm";
import UserAvatar from "../ui/UserAvatar";
import { PRIORITY_LABELS, PRIORITY_STYLES } from "./taskPriority";

export default function TaskCard({
  task,
  onClick,
  desaturated = false,
  isAdmin = false,
}) {
  const queryClient = useQueryClient();
  const [confirm, ConfirmDialog] = useConfirm();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task, column_id: task.column_id },
  });

  const deleteMutation = useMutation({
    mutationFn: () => taskApi.delete(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["board-tasks"]);
      toast.success(`"${task.title}" deleted`);
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to delete task"),
  });

  const handleDelete = async (e) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete task?",
      message: `"${task.title}" will be permanently deleted including all its comments and attachments.`,
      confirmLabel: "Delete Task",
    });
    if (ok) deleteMutation.mutate();
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    filter: desaturated ? "grayscale(30%)" : "none",
  };

  return (
    <>
      {ConfirmDialog}
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onClick?.(task)}
        className="group p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md bg-white rounded-xl border border-cream-border shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium leading-snug text-charcoal pr-1">
            {task.title}
          </h4>
          <div>
            {task.is_blocked && (
              <div className="mr-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Blocked
              </div>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium}`}
            >
              {PRIORITY_LABELS[task.priority] || "Medium"}
            </span>
          </div>
        </div>

        {task.description && (
          <p
            className="mt-1 text-xs text-gray-medium line-clamp-2"
            dangerouslySetInnerHTML={{
              __html: task.description
                ?.replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim(),
            }}
          />
        )}

        <div className="mt-2 flex items-center justify-between">
          {task.due_date && (
            <span
              className="text-xs"
              style={{
                color: isOverdue(task.due_date) ? "#DC2626" : "#6B6B6B",
              }}
            >
              {format(new Date(task.due_date), "MMM d")}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {task.assignees?.slice(0, 3).map((assignee) => (
              <UserAvatar
                key={assignee.id}
                user={assignee}
                size="w-6 h-6"
                textSize="text-[10px]"
                rounded="rounded-full"
                className="border-2 border-white"
              />
            ))}
            {task.assignees?.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] bg-cream text-gray-medium">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task.comments_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-medium">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.026 3 11c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {task.comments_count}
              </div>
            )}
            {isAdmin && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="p-1 rounded text-gray-medium hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                title="Delete task"
              >
                <svg
                  className="w-3.5 h-3.5"
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
        </div>
      </div>
    </>
  );
}

function isOverdue(dueDate) {
  return new Date(dueDate) < new Date();
}
