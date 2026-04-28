import api from "../lib/axios";

export const dashboardApi = {
  get: () => api.get("/dashboard"),
  projectSummary: (projectId) => api.get(`/projects/${projectId}/summary`),
};