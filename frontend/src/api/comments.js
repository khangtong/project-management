import api from '../lib/axios';

export const commentApi = {
    list:    (taskId) => api.get(`/tasks/${taskId}/comments`),
    create:  (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
    update:  (commentId, data) => api.patch(`/tasks/comments/${commentId}`, data),
    delete:  (commentId) => api.delete(`/tasks/comments/${commentId}`),
};