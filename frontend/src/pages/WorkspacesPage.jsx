import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "../components/layout/Sidebar";
import { workspaceApi } from "../api/workspaces";
import { projectApi } from "../api/projects";

export default function WorkspacesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => workspaceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["workspaces"]);
      setShowCreate(false);
      setNewWorkspaceName("");
    },
  });

  const handleCreateWorkspace = (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    createMutation.mutate({ name: newWorkspaceName });
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-cream-light">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-charcoal">Workspaces</h1>
            <button
              onClick={() => setShowCreate(true)}
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
              New Workspace
            </button>
          </div>

          {showCreate && (
            <div className="mb-6 p-6 rounded-xl bg-white shadow-sm border border-cream-border">
              <h3 className="text-lg font-semibold mb-4 text-charcoal">
                Create Workspace
              </h3>
              <form onSubmit={handleCreateWorkspace} className="flex gap-3">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="flex-1 px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewWorkspaceName("");
                  }}
                  className="px-4 py-2 rounded-lg border border-cream-border text-gray-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12 text-gray-medium">Loading...</div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-medium">
                No workspaces yet. Create your first workspace to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function WorkspaceCard({ workspace }) {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const queryClient = useQueryClient();

  const { data: fullWorkspace } = useQuery({
    queryKey: ["workspace", workspace.id],
    queryFn: () => workspaceApi.show(workspace.id).then((r) => r.data),
    initialData: workspace,
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => projectApi.create(workspace.id, data),
    onSuccess: (project) => {
      queryClient.invalidateQueries(["workspace", workspace.id]);
      setShowCreateProject(false);
      setProjectName("");
      if (project.data.board?.id) {
        window.location.href = `/boards/${project.data.board.id}`;
      }
    },
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    createProjectMutation.mutate({ name: projectName });
  };

  const projects = fullWorkspace?.projects || [];

  return (
    <div className="p-6 rounded-xl bg-white shadow-sm border border-cream-border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-charcoal">{workspace.name}</h3>
        <button
          onClick={() => (window.location.href = `/workspaces/${workspace.id}`)}
          className="text-sm font-medium text-ocean hover:text-ocean/80"
        >
          Open →
        </button>
      </div>
      {workspace.description && (
        <p className="mt-1 text-sm text-gray-medium">{workspace.description}</p>
      )}

      <div className="mt-4 space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between p-3 rounded-lg bg-mint-light"
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-ocean" />
              <span className="text-sm font-medium text-charcoal">
                {project.name}
              </span>
            </div>
            <button
              onClick={() =>
                project.board?.id &&
                (window.location.href = `/boards/${project.board.id}`)
              }
              className="text-sm font-medium text-ocean hover:text-ocean/80"
            >
              Open
            </button>
          </div>
        ))}
      </div>

      {showCreateProject ? (
        <form onSubmit={handleCreateProject} className="mt-4 flex gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Project name"
            className="flex-1 px-2 py-1 text-sm rounded border border-cream-border text-charcoal"
            autoFocus
          />
          <button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="text-sm px-3 py-1 rounded font-medium text-white bg-ocean disabled:opacity-50"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreateProject(false);
              setProjectName("");
            }}
            className="text-sm px-3 py-1 rounded border border-cream-border text-gray-medium"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowCreateProject(true)}
          className="mt-4 w-full py-2 rounded-lg text-sm border-dashed border-cream-border text-gray-medium hover:border-gray-400 hover:text-charcoal transition-colors"
        >
          + New Project
        </button>
      )}
    </div>
  );
}
