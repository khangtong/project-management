import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceApi } from "../api/workspaces";
import { projectApi } from "../api/projects";
import { userApi } from "../api/users";

// ── User search combobox ──────────────────────────────────────────────────────
function UserSearchCombobox({ workspaceId, onSelect }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced search — only fires when query >= 2 chars
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["user-search", query, workspaceId],
    queryFn: () =>
      userApi.search({ email: query, workspace_id: workspaceId }).then((r) => r.data),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (user) => {
    setSelected(user);
    setQuery(user.email);
    setOpen(false);
    onSelect(user);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    onSelect(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(null);
    onSelect(null);
    setOpen(true);
  };

  const showDropdown = open && query.length >= 2;

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search by name or email…"
          autoComplete="off"
          className={`w-full px-3 py-2 pr-9 rounded-lg border text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean transition-colors ${
            selected ? "border-sage bg-sage/5" : "border-cream-border bg-white"
          }`}
        />

        {/* Status icon */}
        <div className="absolute right-2.5 flex items-center pointer-events-none">
          {isFetching && query.length >= 2 && !selected && (
            <svg className="w-4 h-4 animate-spin text-gray-medium" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {selected && (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto text-gray-medium hover:text-charcoal"
              title="Clear selection"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-20 mt-1 w-full bg-white border border-cream-border rounded-xl shadow-lg overflow-hidden"
        >
          {results.length > 0 ? (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-gray-medium bg-cream-light border-b border-cream-border">
                {results.length} user{results.length !== 1 ? "s" : ""} found
              </div>
              <ul>
                {results.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent input blur before click registers
                        handleSelect(user);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-light text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-ocean shrink-0">
                        {user.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal truncate">{user.name}</p>
                        <p className="text-xs text-gray-medium truncate">{user.email}</p>
                      </div>
                      <svg className="w-4 h-4 text-ocean ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
              {/* Always show the "invite by email" fallback at the bottom */}
              <div className="border-t border-cream-border">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect({ id: null, name: query, email: query, _emailOnly: true });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-light text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cream-border shrink-0">
                    <svg className="w-4 h-4 text-gray-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">Invite via email</p>
                    <p className="text-xs text-gray-medium">{query}</p>
                  </div>
                </button>
              </div>
            </>
          ) : !isFetching ? (
            <>
              <div className="px-3 py-3 text-sm text-gray-medium text-center">
                No users found for <span className="font-medium text-charcoal">{query}</span>
              </div>
              <div className="border-t border-cream-border">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect({ id: null, name: query, email: query, _emailOnly: true });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cream-light text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-cream-border shrink-0">
                    <svg className="w-4 h-4 text-gray-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">Send invitation email</p>
                    <p className="text-xs text-gray-medium">{query}</p>
                  </div>
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Selection confirmation pill */}
      {selected && (
        <div className={`mt-2 flex items-center gap-2 text-xs px-3 py-1.5 rounded-full w-fit ${
          selected._emailOnly
            ? "bg-cream-light text-gray-medium border border-cream-border"
            : "bg-sage/20 text-charcoal border border-sage/30"
        }`}>
          {selected._emailOnly ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Will send invitation email to <strong>{selected.email}</strong>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 text-sage" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Will add <strong>{selected.name}</strong> directly
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // { id, name, email, _emailOnly? }
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteSuccess, setInviteSuccess] = useState(null); // success message string

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
      if (project.data.id) navigate(`/projects/${project.data.id}/board`);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data) => workspaceApi.inviteByEmail(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["workspace-members", id]);
      const msg = res.data.added_directly
        ? `${selectedUser?.name} has been added to the workspace.`
        : `Invitation email sent to ${selectedUser?.email}.`;
      setInviteSuccess(msg);
      setSelectedUser(null);
      setInviteRole("member");
      // Auto-dismiss after 4 s
      setTimeout(() => setInviteSuccess(null), 4000);
    },
    onError: (err) => {
      alert(err.response?.data?.message || "Failed to send invitation");
    },
  });

  const handleInvite = (e) => {
    e.preventDefault();
    if (!selectedUser?.email) return;
    inviteMutation.mutate({ email: selectedUser.email, role: inviteRole });
  };

  const handleCloseInvite = () => {
    setShowInvite(false);
    setSelectedUser(null);
    setInviteRole("member");
    setInviteSuccess(null);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => navigate("/workspaces")}
            className="text-sm text-gray-medium hover:text-charcoal mb-2"
          >
            ← Back to Workspaces
          </button>
          <h1 className="text-2xl font-semibold text-charcoal">{workspace?.name}</h1>
          {workspace?.description && (
            <p className="text-gray-medium mt-1">{workspace.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Success toast */}
      {inviteSuccess && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-sage/20 border border-sage/30 text-charcoal text-sm">
          <svg className="w-5 h-5 text-sage shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {inviteSuccess}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="mb-6 p-6 rounded-xl bg-white shadow-sm border border-cream-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-charcoal">Invite Member</h3>
            <button
              onClick={handleCloseInvite}
              className="p-1 rounded-lg text-gray-medium hover:text-charcoal hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">
                Search by name or email
              </label>
              <UserSearchCombobox
                workspaceId={id}
                onSelect={setSelectedUser}
              />
              <p className="mt-1.5 text-xs text-gray-medium">
                Existing users are added instantly. Unknown emails receive an invitation link.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-ocean focus:border-ocean"
              >
                <option value="member">Member — can view and edit tasks</option>
                <option value="admin">Admin — can manage members and projects</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={!selectedUser || inviteMutation.isPending}
                className="px-4 py-2 rounded-lg font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {inviteMutation.isPending
                  ? "Adding…"
                  : selectedUser?._emailOnly
                  ? "Send Invite Email"
                  : "Add Member"}
              </button>
              <button
                type="button"
                onClick={handleCloseInvite}
                className="px-4 py-2 rounded-lg border border-cream-border text-sm text-gray-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects header */}
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!projectName.trim()) return;
              createProjectMutation.mutate({ name: projectName });
            }}
            className="flex gap-3"
          >
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
              {createProjectMutation.isPending ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateProject(false); setProjectName(""); }}
              className="px-4 py-2 rounded-lg border border-cream-border text-gray-medium hover:bg-gray-50"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-medium">No projects yet. Create your first project to get started.</p>
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
                <h3 className="text-lg font-semibold text-charcoal">{project.name}</h3>
              </div>
              {project.description && (
                <p className="mt-2 text-sm text-gray-medium">{project.description}</p>
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
