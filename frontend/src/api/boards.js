import api from '../lib/axios';

export const boardApi = {
    show: (projectId) => api.get(`/projects/${projectId}/board`),
};