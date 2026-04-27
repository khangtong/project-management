import api from '../lib/axios';

export const searchApi = {
    search: (q) => api.get('/search', { params: { q } }),
};