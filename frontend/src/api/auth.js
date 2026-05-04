import api from '../lib/axios';

export const authApi = {
    login:         (email, password) => api.post('/auth/login', { email, password }),
    register:      (data) => api.post('/auth/register', data),
    logout:        () => api.post('/auth/logout'),
    me:            () => api.get('/auth/me'),
    updateProfile: (data) => api.patch('/auth/profile', data),
    updateAvatar:  (file) => {
        const form = new FormData();
        form.append('avatar', file);
        return api.post('/auth/avatar', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    removeAvatar:  () => api.delete('/auth/avatar'),
};