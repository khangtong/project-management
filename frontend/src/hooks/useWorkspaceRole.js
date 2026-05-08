import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../store/useAuth";
import { workspaceApi } from "../api/workspaces";

/**
 * Returns the current user's role in a given workspace.
 * role: "owner" | "admin" | "member" | null (not loaded yet)
 * isAdmin: true if role is owner or admin
 */
export function useWorkspaceRole(workspaceId) {
  const { user } = useAuth();

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () =>
      workspaceId
        ? workspaceApi.members.list(workspaceId).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });

  const membership = members.find((m) => m.user_id === user?.id);
  const role = membership?.role ?? null;
  const isAdmin = role === "owner" || role === "admin";

  return { role, isAdmin };
}
