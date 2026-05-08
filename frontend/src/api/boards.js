import api from '../lib/axios';

export const boardApi = {
    show: (projectId) => api.get(`/projects/${projectId}/board`),
    views: {
        list: (boardId) => api.get(`/boards/${boardId}/views`),
        create: (boardId, data) => api.post(`/boards/${boardId}/views`, data),
        update: (boardId, viewId, data) => api.patch(`/boards/${boardId}/views/${viewId}`, data),
        delete: (boardId, viewId) => api.delete(`/boards/${boardId}/views/${viewId}`),
    },
};
