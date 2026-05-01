import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { workspaceApi } from "../../api/workspaces";

export function EditWorkspaceModal({ workspace, onClose }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description || "");

  const mutation = useMutation({
    mutationFn: (data) => workspaceApi.update(workspace.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["workspace", workspace.id]);
      queryClient.invalidateQueries(["workspaces"]);
      toast.success("Workspace updated");
      onClose();
    },
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
            <button onClick={onClose} className="p-1 rounded-lg text-gray-medium hover:bg-gray-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate({ name, description }); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Name</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
                className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                placeholder="Optional description…"
                className="w-full px-3 py-2 rounded-lg border border-cream-border text-charcoal resize-none focus:ring-2 focus:ring-ocean focus:border-ocean"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={mutation.isPending || !name.trim()} className="flex-1 py-2.5 rounded-xl font-medium text-sm text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50">
                {mutation.isPending ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-cream-border text-sm text-gray-medium hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
