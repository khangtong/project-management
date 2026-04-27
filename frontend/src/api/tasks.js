import api from '../lib/axios';

export const taskApi = {
    list:       (boardId) => api.get(`/boards/${boardId}/tasks`),
    create:     (columnId, data) => api.post(`/columns/${columnId}/tasks`, data),
    get:        (id) => api.get(`/tasks/${id}`),
    update:     (id, data) => api.patch(`/tasks/${id}`, data),
    move:       (id, data) => api.patch(`/tasks/${id}/move`, data),
    delete:     (id) => api.delete(`/tasks/${id}`),
    myTasks:    () => api.get('/me/tasks'),
    assign:     (taskId, userId) => api.post(`/tasks/${taskId}/assignees`, { user_id: userId }),
    unassign:   (taskId, userId) => api.delete(`/tasks/${taskId}/assignees/${userId}`),
    getActivity:(taskId) => api.get(`/tasks/${taskId}/activity`),
    column: {
        create: (projectId, data) => api.post(`/projects/${projectId}/board/columns`, data),
        update: (columnId, data) => api.patch(`/columns/${columnId}`, data),
        delete: (columnId) => api.delete(`/columns/${columnId}`),
        reorder: (data) => api.patch('/columns/reorder', data),
    },
};