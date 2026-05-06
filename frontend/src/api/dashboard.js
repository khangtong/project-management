import api from "../lib/axios";

export const dashboardApi = {
  // Returns: { my_tasks, overdue_tasks, upcoming_tasks, recent_activity, projects }
  get: () => api.get("/dashboard"),

  projectSummary: (projectId) => api.get(`/projects/${projectId}/summary`),
};
