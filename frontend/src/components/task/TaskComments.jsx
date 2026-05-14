import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import { commentApi } from "../../api/comments";
import { workspaceApi } from "../../api/workspaces";
import { useAuth } from "../../store/useAuth";
import { useConfirm } from "../ui/useConfirm";
import UserAvatar from "../ui/UserAvatar";

function useAutoResize(value) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);
  return ref;
}

function getMentionQuery(value, cursor) {
  const prefix = value.slice(0, cursor);
  const match = prefix.match(/(?:^|\s)@([^\s@]*)$/);
  return match ? match[1] : "";
}

function replaceMentionAtCursor(value, cursor, memberName) {
  const prefix = value.slice(0, cursor);
  const atIndex = prefix.lastIndexOf("@");
  if (atIndex === -1) return value;
  return `${value.slice(0, atIndex)}@${memberName} ${value.slice(cursor)}`;
}

function activeMentionIds(text, mentions) {
  return mentions
    .filter((mention) => text.includes(`@${mention.name}`))
    .map((mention) => mention.id);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderCommentBody(body, mentions = [], isOwn = false) {
  if (!mentions?.length) return body;

  const names = mentions
    .map((mention) => mention.name)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  if (!names.length) return body;

  const parts = body.split(
    new RegExp(`(@(?:${names.map(escapeRegex).join("|")}))`, "g"),
  );

  return parts.map((part, index) => {
    if (!part.startsWith("@"))
      return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <span
        key={`${part}-${index}`}
        className={
          isOwn ? "font-semibold text-white/95" : "font-semibold text-ocean"
        }
      >
        {part}
      </span>
    );
  });
}

function MentionList({ items, onSelect }) {
  if (items.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 bottom-full mb-2 z-20 bg-white border border-cream-border rounded-xl shadow-lg overflow-hidden">
      {items.map((member) => (
        <button
          key={member.user_id}
          type="button"
          onClick={() => onSelect(member)}
          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-cream-light transition-colors"
        >
          <UserAvatar
            user={member.user}
            size="w-7 h-7"
            textSize="text-xs"
            rounded="rounded-full"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-charcoal truncate">
              {member.user?.name || "Unknown"}
            </p>
            <p className="text-xs text-gray-medium truncate">
              {member.user?.email || ""}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function TaskComments({ taskId, workspaceId, comments = [] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirm, ConfirmDialog] = useConfirm();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [editMentions, setEditMentions] = useState([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [editMentionQuery, setEditMentionQuery] = useState("");
  const inputRef = useAutoResize(body);
  const editRef = useAutoResize(editBody);
  const bottomRef = useRef(null);

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () =>
      workspaceId
        ? workspaceApi.members.list(workspaceId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (comments.length > 0) {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [comments.length]);

  const createMutation = useMutation({
    mutationFn: (data) => commentApi.create(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      setBody("");
      setMentions([]);
      setMentionQuery("");
      toast.success("Comment posted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to post comment"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => commentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      setEditingId(null);
      setEditMentions([]);
      setEditMentionQuery("");
      toast.success("Comment updated");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to update comment"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => commentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["task", taskId]);
      toast.success("Comment deleted");
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Failed to delete comment"),
  });

  const createSuggestions = members.filter((member) => {
    const name = member.user?.name || "";
    if (!mentionQuery) return false;
    return name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  const editSuggestions = members.filter((member) => {
    const name = member.user?.name || "";
    if (!editMentionQuery) return false;
    return name.toLowerCase().includes(editMentionQuery.toLowerCase());
  });

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!body.trim() || createMutation.isPending) return;
    createMutation.mutate({
      body: body.trim(),
      mentioned_user_ids: activeMentionIds(body, mentions),
    });
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
  };

  const handleEditStart = (comment) => {
    setEditingId(comment.id);
    setEditBody(comment.body);
    setEditMentions(comment.mentions || []);
  };

  const handleEditSave = (id) => {
    if (!editBody.trim() || updateMutation.isPending) return;
    updateMutation.mutate({
      id,
      data: {
        body: editBody.trim(),
        mentioned_user_ids: activeMentionIds(editBody, editMentions),
      },
    });
  };

  const handleEditKeyDown = (e, id) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleEditSave(id);
    if (e.key === "Escape") setEditingId(null);
  };

  const handleDelete = async (comment) => {
    const ok = await confirm({
      title: "Delete comment?",
      message: "This comment will be permanently removed.",
      confirmLabel: "Delete",
    });
    if (ok) deleteMutation.mutate(comment.id);
  };

  const handleCreateSelect = (member) => {
    const cursor = inputRef.current?.selectionStart ?? body.length;
    const nextBody = replaceMentionAtCursor(
      body,
      cursor,
      member.user?.name || "",
    );
    setBody(nextBody);
    setMentionQuery("");
    setMentions((current) => {
      const nextMention = { id: member.user_id, name: member.user?.name || "" };
      if (current.some((mention) => mention.id === nextMention.id))
        return current;
      return [...current, nextMention];
    });
  };

  const handleEditSelect = (member) => {
    const cursor = editRef.current?.selectionStart ?? editBody.length;
    const nextBody = replaceMentionAtCursor(
      editBody,
      cursor,
      member.user?.name || "",
    );
    setEditBody(nextBody);
    setEditMentionQuery("");
    setEditMentions((current) => {
      const nextMention = { id: member.user_id, name: member.user?.name || "" };
      if (current.some((mention) => mention.id === nextMention.id))
        return current;
      return [...current, nextMention];
    });
  };

  return (
    <>
      {ConfirmDialog}

      <div className="flex flex-col gap-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-12 h-12 rounded-full bg-cream-light flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-medium"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.026 3 11c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">
                No comments yet
              </p>
              <p className="text-xs text-gray-medium mt-0.5">
                Be the first to leave a comment
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1 scroll-smooth">
            {comments.map((comment, index) => {
              const isOwn = comment.user?.id === user?.id;
              const isEditing = editingId === comment.id;
              const showAvatar =
                index === 0 ||
                comments[index - 1]?.user?.id !== comment.user?.id;

              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 group ${isOwn ? "flex-row-reverse" : "mb-5"}`}
                >
                  <div className="w-7 shrink-0 flex flex-col items-center">
                    {showAvatar ? (
                      <UserAvatar
                        user={comment.user}
                        size="w-7 h-7"
                        textSize="text-xs"
                        rounded="rounded-full"
                        className="mt-5 shrink-0"
                      />
                    ) : (
                      <div className="w-7" />
                    )}
                  </div>

                  <div
                    className={`flex-1 min-w-0 ${isOwn ? "flex flex-col items-end" : ""}`}
                  >
                    {showAvatar && (
                      <div
                        className={`flex items-baseline gap-2 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        <span className="text-xs font-semibold text-charcoal">
                          {isOwn ? "You" : comment.user?.name || "User"}
                        </span>
                        <span
                          className="text-[10px] text-gray-medium"
                          title={format(new Date(comment.created_at), "PPpp")}
                        >
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}

                    {isEditing ? (
                      <div className="w-full space-y-2">
                        <div className="relative">
                          <MentionList
                            items={editSuggestions}
                            onSelect={handleEditSelect}
                          />
                          <textarea
                            ref={editRef}
                            value={editBody}
                            onChange={(e) => {
                              setEditBody(e.target.value);
                              setEditMentionQuery(
                                getMentionQuery(
                                  e.target.value,
                                  e.target.selectionStart,
                                ),
                              );
                            }}
                            onKeyDown={(e) => handleEditKeyDown(e, comment.id)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-xl border border-ocean bg-white text-charcoal resize-none focus:outline-none focus:ring-2 focus:ring-ocean/30"
                            autoFocus
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs rounded-lg border border-cream-border text-gray-medium hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(comment.id)}
                            disabled={
                              !editBody.trim() || updateMutation.isPending
                            }
                            className="px-3 py-1 text-xs rounded-lg text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
                          >
                            {updateMutation.isPending ? "Saving…" : "Save"}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-medium text-right">
                          @ to mention · ⌘↵ to save
                        </p>
                      </div>
                    ) : (
                      <div
                        className={`relative max-w-[85%] ${isOwn ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`px-3.5 py-2.5 text-sm rounded-2xl whitespace-pre-wrap wrap-break-word leading-relaxed ${
                            isOwn
                              ? "bg-ocean text-white rounded-tr-sm"
                              : "bg-cream-light text-charcoal rounded-tl-sm border border-cream-border"
                          }`}
                        >
                          {renderCommentBody(
                            comment.body,
                            comment.mentions,
                            isOwn,
                          )}
                        </div>

                        {isOwn && (
                          <div className="flex gap-1 mt-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditStart(comment)}
                              className="p-1 rounded text-gray-medium hover:text-ocean hover:bg-ocean/10 transition-colors"
                              title="Edit"
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
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(comment)}
                              disabled={deleteMutation.isPending}
                              className="p-1 rounded text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                              title="Delete"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="border-t border-cream-border pt-4">
          <div className="flex gap-2.5 items-center">
            <UserAvatar
              user={user}
              size="w-7 h-7"
              textSize="text-xs"
              rounded="rounded-full"
              className="shrink-0 mb-0.5"
            />

            <div className="flex-1 relative">
              <MentionList
                items={createSuggestions}
                onSelect={handleCreateSelect}
              />
              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setMentionQuery(
                    getMentionQuery(e.target.value, e.target.selectionStart),
                  );
                }}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment…"
                rows={1}
                className="w-full px-3.5 py-2.5 pr-11 text-sm rounded-2xl border border-cream-border bg-white text-charcoal resize-none focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-colors placeholder-gray-medium"
                style={{ minHeight: "42px", maxHeight: "200px" }}
              />
              <button
                onClick={handleSubmit}
                disabled={!body.trim() || createMutation.isPending}
                className="absolute right-2 top-2 w-7 h-7 flex items-center justify-center rounded-full bg-ocean text-white transition-all hover:bg-ocean/90 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Send (⌘↵)"
              >
                {createMutation.isPending ? (
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
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
                    className="w-3.5 h-3.5 translate-x-px"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <p className="text-[10px] text-gray-medium mt-1.5 ml-9">
            @ to mention · ⌘↵ to send
          </p>
        </div>
      </div>
    </>
  );
}
