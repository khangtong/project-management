import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { workspaceApi } from "../api/workspaces";
import { projectApi } from "../api/projects";
import { userApi } from "../api/users";
import { useConfirm } from "../components/ui/useConfirm";
import { useWorkspaceRole } from "../hooks/useWorkspaceRole";

const EditIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const TrashIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// ── User search combobox ──────────────────────────────────────────────────────
function UserSearchCombobox({ workspaceId, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["user-search", query, workspaceId],
    queryFn: () => userApi.search({ email: query, workspace_id: workspaceId }).then((r) => r.data),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user) => { setSelected(user); setQuery(user.email); setOpen(false); onSelect(user); };
  const handleClear = () => { setSelected(null); setQuery(""); onSelect(null); setTimeout(() => inputRef.current?.focus(), 0); };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); onSelect(null); setOpen(true); }} onFocus={() => query.length >= 2 && setOpen(true)} placeholder="Search by name or email…" autoComplete="off"
          className={`w-full px-3 py-2 pr-9 rounded-lg border text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-ocean transition-colors ${selected ? "border-sage bg-sage/5" : "border-cream-border bg-white"}`}
        />
        <div className="absolute right-2.5 pointer-events-none flex items-center">
          {isFetching && !selected && <svg className="w-4 h-4 animate-spin text-gray-medium" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
          {selected && <button type="button" onClick={handleClear} className="pointer-events-auto text-gray-medium hover:text-charcoal"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
        </div>
      </div>

      {open && query.length >= 2 && (
        <div ref={dropdownRef} className="absolute z-20 mt-1 w-full bg-white border border-cream-border rounded-xl shadow-lg overflow-hidden">
          {results.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-medium bg-cream-light border-b border-cream-border">{results.length} user{results.length !== 1 ? "s" : ""} found</div>
              <ul>
                {results.map((user) => (
                  <li key={user.id}>
                    <button type="button" onMouseDown={(e) => { e.preventDefault(); handleSelect(user); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-light text-left">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-ocean shrink-0">{user.name?.[0]?.toUpperCase() || "?"}</div>
                      <div className="min-w-0"><p className="text-sm font-medium text-charcoal truncate">{user.name}</p><p className="text-xs text-gray-medium truncate">{user.email}</p></div>
                    </button>
                  </li>
                ))}
              </ul>
              <EmailFallback query={query} onSelect={handleSelect} />
            </>
          ) : !isFetching ? (
            <><div className="px-3 py-3 text-sm text-gray-medium text-center">No users found for <span className="font-medium text-charcoal">{query}</span></div><EmailFallback query={query} onSelect={handleSelect} /></>
          ) : null}
        </div>
      )}

      {selected && (
        <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-full w-fit ${selected._emailOnly ? "bg-cream-light text-gray-medium border border-cream-border" : "bg-sage/20 text-charcoal border border-sage/30"}`}>
          {selected._emailOnly
            ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>Will send invitation to <strong>{selected.email}</strong></>
            : <><svg className="w-3.5 h-3.5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Will add <strong>{selected.name}</strong> directly</>
          }
        </div>
      )}
    </div>
  );
}

function EmailFallback({ query, onSelect }) {
  return (
    <div className="border-t border-cream-border">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); onSelect({ id: null, name: query, email: query, _emailOnly: true }); }} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-light text-left">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cream-border shrink-0">
          <svg className="w-4 h-4 text-gray-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        </div>
        <div><p className="text-sm font-medium text-charcoal">Invite via email</p><p className="text-xs text-gray-medium">{query}</p></div>
      </button>
    </div>
  );
}

// ── Edit workspace modal ──────────────────────────────────────────────────────
function EditWorkspaceModal({ workspace, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");

  const mutation = useMutation({
    mutationFn: (data) => workspaceApi.update(workspace.id, data),
    onSuccess: () => { queryClient.invalidateQueries(["workspace", workspace.id]); queryClient.invalidateQueries(["workspaces"]); toast.success("Workspace updated"); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update workspace"),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-cream-border overflow-hidden">
        <div className="h-1 bg-ocean w-full" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-charcoal">Edit Workspace</h3>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-medium hover:bg-gray-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ name, description }); }} className="space-y-4">
            <div><label className="block text-sm font-medium text-charcoal mb-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean" /></div>
            <div><label className="block text-sm font-medium text-charcoal mb-1">Description <span className="text-gray-medium font-normal">(optional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this workspace for?" className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal resize-none focus:ring-2 focus:ring-ocean focus:border-ocean" /></div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutation.isPending || !name.trim()} className="flex-1 py-2.5 rounded-xl font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50">{mutation.isPending ? "Saving…" : "Save Changes"}</button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-cream-border text-sm text-gray-medium hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Edit project modal ────────────────────────────────────────────────────────
const PROJECT_COLORS = ["#6366f1", "#4CACBC", "#6CC4A1", "#A0D995", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function EditProjectModal({ project, workspaceId, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [color, setColor] = useState(project.color || "#6366f1");
  const [status, setStatus] = useState(project.status || "active");

  const mutation = useMutation({
    mutationFn: (data) => projectApi.update(project.id, data),
    onSuccess: () => { queryClient.invalidateQueries(["workspace", workspaceId]); queryClient.invalidateQueries(["workspaces"]); toast.success("Project updated"); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to update project"),
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-cream-border overflow-hidden">
        <div className="h-1 w-full transition-colors" style={{ backgroundColor: color }} />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-charcoal">Edit Project</h3>
            <button onClick={onClose} className="p-1 rounded-lg text-gray-medium hover:bg-gray-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ name, description, color, status }); }} className="space-y-4">
            <div><label className="block text-sm font-medium text-charcoal mb-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean" /></div>
            <div><label className="block text-sm font-medium text-charcoal mb-1">Description <span className="text-gray-medium font-normal">(optional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this project about?" className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal resize-none focus:ring-2 focus:ring-ocean focus:border-ocean" /></div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">{PROJECT_COLORS.map((c) => (<button key={c} type="button" onClick={() => setColor(c)} className={`w-7 h-7 rounded-full transition-all ${color === c ? "scale-125 ring-2 ring-offset-2 ring-charcoal/20" : "hover:scale-110"}`} style={{ backgroundColor: c }} />))}</div>
            </div>
            <div><label className="block text-sm font-medium text-charcoal mb-1">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal text-sm focus:ring-2 focus:ring-ocean focus:border-ocean"><option value="active">Active</option><option value="on_hold">On Hold</option><option value="archived">Archived</option></select></div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutation.isPending || !name.trim()} className="flex-1 py-2.5 rounded-xl font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50">{mutation.isPending ? "Saving…" : "Save Changes"}</button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-cream-border text-sm text-gray-medium hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Create project form ───────────────────────────────────────────────────────
function CreateProjectForm({ workspaceId, onSuccess, onCancel }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [status, setStatus] = useState("active");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => projectApi.create(workspaceId, data),
    onSuccess: (res) => { queryClient.invalidateQueries(["workspace", workspaceId]); toast.success("Project created"); onSuccess(res.data); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create project"),
  });

  return (
    <div className="mb-6 rounded-2xl bg-white shadow-sm border border-cream-border overflow-hidden">
      <div className="h-1 transition-colors" style={{ backgroundColor: color }} />
      <div className="p-6">
        <h3 className="text-base font-semibold text-charcoal mb-4">New Project</h3>
        <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; mutation.mutate({ name, description, color, status }); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Name <span className="text-red-400">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website Redesign" className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean" autoFocus required onKeyDown={(e) => e.key === "Escape" && onCancel()} />
          </div>
          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium text-ocean hover:text-ocean/80 transition-colors">
            <svg className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            {showAdvanced ? "Hide" : "Add"} description, color & status
          </button>
          {showAdvanced && (
            <div className="space-y-4 pt-1">
              <div><label className="block text-sm font-medium text-charcoal mb-1">Description <span className="text-gray-medium font-normal">(optional)</span></label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What is this project about?" className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal resize-none focus:ring-2 focus:ring-ocean focus:border-ocean text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">Color</label>
                  <div className="flex gap-1.5 flex-wrap">{PROJECT_COLORS.map((c) => (<button key={c} type="button" onClick={() => setColor(c)} className={`w-6 h-6 rounded-full transition-all ${color === c ? "scale-125 ring-2 ring-offset-1 ring-charcoal/20" : "hover:scale-110"}`} style={{ backgroundColor: c }} />))}</div>
                </div>
                <div><label className="block text-sm font-medium text-charcoal mb-1">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal text-sm focus:ring-2 focus:ring-ocean focus:border-ocean"><option value="active">Active</option><option value="on_hold">On Hold</option><option value="archived">Archived</option></select></div>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={mutation.isPending || !name.trim()} className="px-5 py-2 rounded-lg font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50 transition-colors">{mutation.isPending ? "Creating…" : "Create Project"}</button>
            <button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg border border-cream-border text-sm text-gray-medium hover:bg-gray-50 transition-colors">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirm, ConfirmDialog] = useConfirm();

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [inviteRole, setInviteRole] = useState("member");
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspaceApi.show(id).then((r) => r.data),
  });

  // Role-based permissions
  const { isAdmin, role } = useWorkspaceRole(id);

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId) => projectApi.delete(projectId),
    onSuccess: () => { queryClient.invalidateQueries(["workspace", id]); toast.success("Project deleted"); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete project"),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => workspaceApi.delete(id),
    onSuccess: () => { toast.success(`"${workspace?.name}" deleted`); navigate("/workspaces"); },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete workspace"),
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => workspaceApi.inviteByEmail(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["workspace-members", id]);
      toast.success(res.data.added_directly ? `${selectedUser?.name} added to workspace` : `Invitation sent to ${selectedUser?.email}`);
      setSelectedUser(null); setInviteRole("member"); setShowInvite(false);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to send invitation"),
  });

  const handleDeleteProject = async (project) => {
    const ok = await confirm({ title: `Delete "${project.name}"?`, message: "All tasks, comments, and attachments will be permanently deleted.", confirmLabel: "Delete Project" });
    if (ok) deleteProjectMutation.mutate(project.id);
  };

  const handleDeleteWorkspace = async () => {
    const ok = await confirm({ title: `Delete "${workspace?.name}"?`, message: "All projects and tasks inside will be permanently deleted. This cannot be undone.", confirmLabel: "Delete Workspace" });
    if (ok) deleteWorkspaceMutation.mutate();
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="text-gray-medium">Loading…</div></div>;

  const projects = workspace?.projects || [];

  return (
    <>
      {ConfirmDialog}
      {editingWorkspace && <EditWorkspaceModal workspace={workspace} onClose={() => setEditingWorkspace(false)} />}
      {editingProject && <EditProjectModal project={editingProject} workspaceId={id} onClose={() => setEditingProject(null)} />}

      <div className="max-w-5xl mx-auto p-8">

        {/* ── Workspace header card ── */}
        <div className="mb-8 rounded-2xl bg-white shadow-sm border border-cream-border overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-ocean via-teal to-sage" />
          <div className="p-6">
            <button onClick={() => navigate("/workspaces")} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-medium hover:text-ocean transition-colors mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              All Workspaces
            </button>

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold text-charcoal leading-tight">{workspace?.name}</h1>
                  {/* Role badge */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    role === "owner" ? "bg-ocean/10 text-ocean border border-ocean/20"
                    : role === "admin" ? "bg-sage/20 text-green-700 border border-sage/30"
                    : "bg-cream-light text-gray-medium border border-cream-border"
                  }`}>
                    {role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member"}
                  </span>
                </div>
                {workspace?.description && <p className="text-sm text-gray-medium mt-1.5 leading-relaxed max-w-lg">{workspace.description}</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0 mt-0.5">
                {/* Invite — admin only */}
                {isAdmin && (
                  <button onClick={() => setShowInvite((v) => !v)} className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                    Invite
                  </button>
                )}

                {isAdmin && <div className="w-px h-6 bg-cream-border" />}

                {/* Edit & Delete — admin only */}
                {isAdmin && (
                  <>
                    <button onClick={() => setEditingWorkspace(true)} className="p-2 rounded-lg text-gray-medium hover:text-ocean hover:bg-ocean/10 transition-colors" title="Edit workspace">
                      <EditIcon />
                    </button>
                    <button onClick={handleDeleteWorkspace} disabled={deleteWorkspaceMutation.isPending} className="p-2 rounded-lg text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40" title="Delete workspace">
                      <TrashIcon />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-cream-border">
              <div className="flex items-center gap-1.5 text-xs text-gray-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
                <span><strong className="text-charcoal">{projects.length}</strong> project{projects.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                <span>Owned by <strong className="text-charcoal">{workspace?.owner?.name || "you"}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Invite panel — admin only ── */}
        {isAdmin && showInvite && (
          <div className="mb-6 p-6 rounded-2xl bg-white shadow-sm border border-cream-border">
            <div className="flex items-center justify-between mb-4">
              <div><h3 className="text-base font-semibold text-charcoal">Invite a Member</h3><p className="text-xs text-gray-medium mt-0.5">Existing users are added instantly. Others receive an email link.</p></div>
              <button onClick={() => { setShowInvite(false); setSelectedUser(null); }} className="p-1.5 rounded-lg text-gray-medium hover:bg-gray-100 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (!selectedUser?.email) return; inviteMutation.mutate({ email: selectedUser.email, role: inviteRole }); }} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-charcoal mb-1">Search user</label><UserSearchCombobox workspaceId={id} onSelect={setSelectedUser} /></div>
                <div><label className="block text-sm font-medium text-charcoal mb-1">Role</label><select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal text-sm focus:ring-2 focus:ring-ocean"><option value="member">Member</option><option value="admin">Admin</option></select></div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={!selectedUser || inviteMutation.isPending} className="px-5 py-2 rounded-lg font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{inviteMutation.isPending ? "Adding…" : selectedUser?._emailOnly ? "Send Invite" : "Add Member"}</button>
                <button type="button" onClick={() => { setShowInvite(false); setSelectedUser(null); }} className="px-5 py-2 rounded-lg border border-cream-border text-sm text-gray-medium hover:bg-gray-50 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Projects section ── */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-charcoal">Projects</h2>
          {isAdmin && !showCreateProject && (
            <button onClick={() => setShowCreateProject(true)} className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              New Project
            </button>
          )}
        </div>

        {isAdmin && showCreateProject && (
          <CreateProjectForm
            workspaceId={id}
            onSuccess={(project) => { setShowCreateProject(false); if (project?.id) navigate(`/projects/${project.id}/board`); }}
            onCancel={() => setShowCreateProject(false)}
          />
        )}

        {projects.length === 0 && !showCreateProject ? (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed border-cream-border">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cream-light flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>
            </div>
            <p className="text-charcoal font-medium">No projects yet</p>
            <p className="text-sm text-gray-medium mt-1">{isAdmin ? "Create your first project to start managing tasks" : "No projects have been created yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="flex flex-col rounded-2xl bg-white shadow-sm border border-cream-border overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: project.color || "#6366f1" }} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-charcoal leading-snug">{project.name}</h3>
                    {/* Edit/delete — admin only */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setEditingProject(project)} className="p-1.5 rounded-lg text-gray-medium hover:text-ocean hover:bg-ocean/10 transition-colors" title="Edit"><EditIcon /></button>
                        <button onClick={() => handleDeleteProject(project)} disabled={deleteProjectMutation.isPending} className="p-1.5 rounded-lg text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30" title="Delete"><TrashIcon /></button>
                      </div>
                    )}
                  </div>
                  {project.description && <p className="text-sm text-gray-medium line-clamp-2 mb-3">{project.description}</p>}
                  <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${
                    project.status === "active" ? "bg-sage/20 text-green-700"
                    : project.status === "archived" ? "bg-gray-100 text-gray-500"
                    : "bg-amber-50 text-amber-700"
                  }`}>
                    {project.status === "on_hold" ? "On Hold" : project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>
                <div className="px-5 py-3 border-t border-cream-border bg-cream-light/50">
                  <button onClick={() => navigate(`/projects/${project.id}/board`)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-ocean hover:text-ocean/80 transition-colors">
                    Open Board
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
