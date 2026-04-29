import api from '../lib/axios';

export const userApi = {
    search: (params) => api.get('/users/search', { params }),
};
