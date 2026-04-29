import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { workspaceApi } from "../api/workspaces";
import { useAuth } from "../store/AuthContext";

export default function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState(null);

  const { data: invitation, isLoading, error: fetchError } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => workspaceApi.showInvitation(token).then((r) => r.data),
    retry: false,
  });

  // Once we know the user is not logged in, redirect to login with the
  // invitation token so they can come back after authenticating.
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?invitation=${token}`, { replace: true, state: { from: location } });
    }
  }, [authLoading, user, token, navigate, location]);

  if (authLoading || (!user && !fetchError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-light">
        <div className="text-gray-medium">Checking authentication...</div>
      </div>
    );
  }

  const acceptMutation = useMutation({
    mutationFn: () => workspaceApi.acceptInvitation(token),
    onSuccess: (res) => {
      navigate(`/workspaces/${res.data.workspace_id}`);
    },
    onError: (err) => {
      setError(err.response?.data?.message || "Failed to accept invitation");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-light">
        <div className="text-gray-medium">Loading invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-light">
        <div className="max-w-md w-full p-8 rounded-xl bg-white shadow-sm border border-cream-border text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-charcoal mb-2">Invalid Invitation</h2>
          <p className="text-gray-medium mb-6">{error}</p>
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 rounded-lg font-medium text-white bg-ocean hover:bg-ocean/90"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-light">
      <div className="max-w-md w-full p-8 rounded-xl bg-white shadow-sm border border-cream-border">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ocean/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-ocean"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m0 0h-3m-3 0H9m0 0V6m0 3V3m0 0h3m-3 0H9m0 0V6m0 0h3m-3 0H9"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-charcoal">You've Been Invited!</h2>
          <p className="text-gray-medium mt-2">
            You have been invited to join a workspace.
          </p>
        </div>

        <div className="bg-mint-light rounded-lg p-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-medium">Workspace</p>
            <p className="text-lg font-semibold text-charcoal">
              {invitation?.workspace?.name}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-cream-border text-center">
            <p className="text-sm text-gray-medium">Invited by</p>
            <p className="text-charcoal">{invitation?.inviter?.name}</p>
          </div>
          <div className="mt-3 pt-3 border-t border-cream-border text-center">
            <p className="text-sm text-gray-medium">Role</p>
            <p className="text-charcoal capitalize">{invitation?.role}</p>
          </div>
        </div>

        <button
          onClick={() => acceptMutation.mutate()}
          disabled={acceptMutation.isPending}
          className="w-full py-3 rounded-lg font-medium text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
        >
          {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
        </button>

        <p className="text-center text-sm text-gray-medium mt-4">
          Log in to an account with{" "}
          <span className="font-medium">{invitation?.email}</span> to accept this
          invitation.
        </p>
      </div>
    </div>
  );
}