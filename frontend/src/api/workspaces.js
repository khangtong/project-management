import api from '../lib/axios';

export const workspaceApi = {
    list:   () => api.get('/workspaces'),
    create: (data) => api.post('/workspaces', data),
    show:   (id) => api.get(`/workspaces/${id}`),
    update: (id, data) => api.patch(`/workspaces/${id}`, data),
    delete: (id) => api.delete(`/workspaces/${id}`),
    invite: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/invite`, data),
    inviteByEmail: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/invite-by-email`, data),
    showInvitation: (token) => api.get(`/auth/invitations/${token}/accept`),
    acceptInvitation: (token) => api.get(`/auth/invitations/${token}/accept`),
    members: {
        list: (workspaceId) => api.get(`/workspaces/${workspaceId}/members`),
        updateRole: (workspaceId, memberId, data) => api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, data),
        remove: (workspaceId, memberId) => api.delete(`/workspaces/${workspaceId}/members/${memberId}`),
    },
};