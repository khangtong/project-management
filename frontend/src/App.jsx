import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import WorkspacesPage from './pages/WorkspacesPage';
import WorkspacePage from './pages/WorkspacePage';
import BoardPage from './pages/BoardPage';
import MyTasksPage from './pages/MyTasksPage';
import InvitationPage from './pages/InvitationPage';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
        },
    },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/invitations/:token" element={<InvitationPage />} />
                        <Route path="/workspaces" element={
                            <ProtectedRoute><WorkspacesPage /></ProtectedRoute>
                        } />
                        <Route path="/workspaces/:id" element={
                            <ProtectedRoute><WorkspacePage /></ProtectedRoute>
                        } />
                        <Route path="/boards/:boardId" element={
                            <ProtectedRoute><BoardPage /></ProtectedRoute>
                        } />
                        <Route path="/my-tasks" element={
                            <ProtectedRoute><MyTasksPage /></ProtectedRoute>
                        } />
                        <Route path="/" element={<Navigate to="/workspaces" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;