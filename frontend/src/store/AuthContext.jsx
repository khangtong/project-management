import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            api.get('/auth/me')
                .then(res => setUser(res.data))
                .catch(() => localStorage.removeItem('auth_token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
    };

    const register = async (name, email, password, password_confirmation) => {
        const { data } = await api.post('/auth/register', { name, email, password, password_confirmation });
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
    };

    const logout = async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('auth_token');
        setUser(null);
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, register, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};