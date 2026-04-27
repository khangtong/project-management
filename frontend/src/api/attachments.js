import api from '../lib/axios';

export const attachmentApi = {
    create: (taskId, file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post(`/tasks/${taskId}/attachments`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    delete: (id) => api.delete(`/attachments/${id}`),
};