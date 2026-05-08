import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { workspaceApi } from "../api/workspaces";
import { projectApi } from "../api/projects";
import { useConfirm } from "../components/ui/useConfirm";
import { EditWorkspaceModal } from "../components/ui/EditWorkspaceModal";
import { useWorkspaceRole } from "../hooks/useWorkspaceRole";

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => workspaceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["workspaces"]);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      toast.success("Workspace created");
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create workspace"),
  });

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Workspaces</h1>
          <p className="text-sm text-gray-medium mt-0.5">Organize your teams and projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Workspace
        </button>
      </div>

      {showCreate && (
        <div className="mb-8 p-6 rounded-2xl bg-white shadow-sm border border-cream-border">
          <h3 className="text-base font-semibold text-charcoal mb-4">Create a new workspace</h3>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!form.name.trim()) return; createMutation.mutate(form); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Name <span className="text-red-400">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Design Team" className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean" autoFocus required />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Description <span className="text-gray-medium font-normal">(optional)</span></label>
                <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What is this workspace for?" className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={createMutation.isPending || !form.name.trim()} className="px-5 py-2 rounded-lg font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? "Creating…" : "Create Workspace"}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setForm({ name: "", description: "" }); }} className="px-5 py-2 rounded-lg border border-cream-border text-sm text-gray-medium hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-gray-medium">Loading…</div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-cream-border">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-cream-light flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-charcoal font-medium">No workspaces yet</p>
          <p className="text-sm text-gray-medium mt-1">Create a workspace to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceCard({ workspace }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirm, ConfirmDialog] = useConfirm();
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");

  // Role check for this specific workspace
  const { isAdmin } = useWorkspaceRole(workspace.id);

  const { data: fullWorkspace } = useQuery({
    queryKey: ["workspace", workspace.id],
    queryFn: () => workspaceApi.show(workspace.id).then((r) => r.data),
    initialData: workspace,
    staleTime: 30_000,
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => projectApi.create(workspace.id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["workspace", workspace.id]);
      queryClient.invalidateQueries(["workspaces"]);
      setShowCreateProject(false);
      setProjectName("");
      toast.success("Project created");
      if (res.data.id) navigate(`/projects/${res.data.id}/board`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to create project"),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => workspaceApi.delete(workspace.id),
    onSuccess: () => {
      queryClient.invalidateQueries(["workspaces"]);
      toast.success(`"${workspace.name}" deleted`);
    },
    onError: (err) => toast.error(err.response?.data?.message || "Failed to delete workspace"),
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${workspace.name}"?`,
      message: "All projects and tasks inside will be permanently deleted. This cannot be undone.",
      confirmLabel: "Delete Workspace",
    });
    if (ok) deleteWorkspaceMutation.mutate();
  };

  const projects = fullWorkspace?.projects || [];

  return (
    <>
      {ConfirmDialog}
      {editingWorkspace && <EditWorkspaceModal workspace={workspace} onClose={() => setEditingWorkspace(false)} />}

      <div className="flex flex-col rounded-2xl bg-white shadow-sm border border-cream-border overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-cream-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-charcoal truncate">{workspace.name}</h3>
              {workspace.description && (
                <p className="text-xs text-gray-medium mt-0.5 line-clamp-2">{workspace.description}</p>
              )}
            </div>
            {/* Admin-only actions */}
            {isAdmin && (
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditingWorkspace(true)} className="p-1.5 rounded-lg text-gray-medium hover:text-ocean hover:bg-ocean/10 transition-colors" title="Edit workspace">
                  <EditIcon />
                </button>
                <button onClick={handleDelete} disabled={deleteWorkspaceMutation.isPending} className="p-1.5 rounded-lg text-gray-medium hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40" title="Delete workspace">
                  <TrashIcon />
                </button>
              </div>
            )}
          </div>
          {/* Role badge */}
          {!isAdmin && (
            <span className="mt-2 inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-cream-light text-gray-medium border border-cream-border">
              Member
            </span>
          )}
        </div>

        {/* Projects list */}
        <div className="flex-1 p-4 space-y-2">
          {projects.length === 0 ? (
            <p className="text-xs text-gray-medium text-center py-3">No projects yet</p>
          ) : (
            projects.map((project) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}/board`)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-light transition-colors text-left group/proj"
              >
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color || "#6366f1" }} />
                <span className="flex-1 text-sm font-medium text-charcoal truncate">{project.name}</span>
                <svg className="w-3.5 h-3.5 text-gray-medium opacity-0 group-hover/proj:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}

          {/* Add project — admin only */}
          {isAdmin && (
            showCreateProject ? (
              <form
                onSubmit={(e) => { e.preventDefault(); if (!projectName.trim()) return; createProjectMutation.mutate({ name: projectName }); }}
                className="flex gap-2 pt-1"
              >
                <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-cream-border text-charcoal focus:ring-1 focus:ring-ocean focus:border-ocean" autoFocus onKeyDown={(e) => e.key === "Escape" && setShowCreateProject(false)} />
                <button type="submit" disabled={createProjectMutation.isPending} className="text-xs px-3 py-1.5 rounded-lg font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50">
                  {createProjectMutation.isPending ? "…" : "Add"}
                </button>
                <button type="button" onClick={() => { setShowCreateProject(false); setProjectName(""); }} className="text-xs px-2.5 py-1.5 rounded-lg border border-cream-border text-gray-medium hover:bg-gray-50">✕</button>
              </form>
            ) : (
              <button onClick={() => setShowCreateProject(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-medium hover:text-ocean hover:bg-cream-light transition-colors border border-dashed border-cream-border">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add project
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-cream-border bg-cream-light/50">
          <button onClick={() => navigate(`/workspaces/${workspace.id}`)} className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-ocean hover:text-ocean/80 transition-colors">
            Open workspace
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
