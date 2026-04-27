import api from '../lib/axios';

export const projectApi = {
    list:   (workspaceId) => api.get(`/workspaces/${workspaceId}/projects`),
    create: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/projects`, data),
    show:   (id) => api.get(`/projects/${id}`),
    update: (id, data) => api.patch(`/projects/${id}`, data),
    delete: (id) => api.delete(`/projects/${id}`),
    board:  (id) => api.get(`/projects/${id}/board`),
};