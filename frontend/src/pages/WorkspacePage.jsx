import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "../api/workspaces";
import { projectApi } from "../api/projects";

export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspaceApi.show(id).then((r) => r.data),
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => projectApi.create(id, data),
    onSuccess: (project) => {
      queryClient.invalidateQueries(["workspace", id]);
      setShowCreateProject(false);
      setProjectName("");
      if (project.data.board?.id) {
        navigate(`/projects/${project.data.id}/board`);
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => workspaceApi.inviteByEmail(id, data),
    onSuccess: () => {
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("member");
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to send invitation");
    },
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    createProjectMutation.mutate({ name: projectName });
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-medium">Loading...</div>
      </div>
    );
  }

  const projects = workspace?.projects || [];

  return (
    <div className="max-w-5xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <button
                onClick={() => navigate("/workspaces")}
                className="text-sm text-gray-medium hover:text-charcoal mb-2"
              >
                ← Back to Workspaces
              </button>
              <h1 className="text-2xl font-semibold text-charcoal">
                {workspace?.name}
              </h1>
              {workspace?.description && (
                <p className="text-gray-medium mt-1">{workspace.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors"
            >
              Invite Member
            </button>
          </div>

          {showInvite && (
            <div className="mb-6 p-6 rounded-xl bg-white shadow-sm border border-cream-border">
              <h3 className="text-lg font-semibold mb-4 text-charcoal">
                Invite Member
              </h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="px-4 py-2 rounded-lg font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
                  >
                    {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInvite(false);
                      setInviteEmail("");
                      setInviteRole("member");
                    }}
                    className="px-4 py-2 rounded-lg border border-cream-border text-gray-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-charcoal">Projects</h2>
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90"
            >
              + New Project
            </button>
          </div>

          {showCreateProject && (
            <div className="mb-6 p-6 rounded-xl bg-white shadow-sm border border-cream-border">
              <form onSubmit={handleCreateProject} className="flex gap-3">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="flex-1 px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
                >
                  {createProjectMutation.isPending ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateProject(false);
                    setProjectName("");
                  }}
                  className="px-4 py-2 rounded-lg border border-cream-border text-gray-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-medium">
                No projects yet. Create your first project to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-6 rounded-xl bg-white shadow-sm border border-cream-border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: project.color || "#6366f1" }}
                    />
                    <h3 className="text-lg font-semibold text-charcoal">
                      {project.name}
                    </h3>
                  </div>
                  {project.description && (
                    <p className="mt-2 text-sm text-gray-medium">
                      {project.description}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        project.status === "active"
                          ? "bg-mint-light text-green-700"
                          : project.status === "archived"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-yellow-50 text-yellow-700"
                      }`}
                    >
                      {project.status}
                    </span>
                    <button
                      onClick={() => project.id && navigate(`/projects/${project.id}/board`)}
                      className="text-sm font-medium text-ocean hover:text-ocean/80"
                    >
                      Open Board →
                    </button>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}