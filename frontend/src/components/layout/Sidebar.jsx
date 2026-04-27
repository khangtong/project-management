import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../store/AuthContext';
import { workspaceApi } from '../../api/workspaces';

export default function Sidebar() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    
    const { data: workspaces = [] } = useQuery({
        queryKey: ['workspaces'],
        queryFn: () => workspaceApi.list().then(r => r.data),
    });

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <aside className="h-screen flex flex-col w-64 bg-cream border-r border-cream-border">
            {/* Logo */}
            <div className="p-5 border-b border-cream-border">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-ocean rounded-lg">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                    </div>
                    <h2 className="text-base font-semibold text-charcoal">Project Manager</h2>
                </div>
            </div>

            {/* Workspace Section */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="mb-4">
                    <h3 className="text-xs font-medium uppercase tracking-wider mb-3 text-gray-medium">
                        Workspaces
                    </h3>
                    <nav className="space-y-1">
                        {workspaces.map((workspace) => (
                            <Link
                                key={workspace.id}
                                to={`/workspaces/${workspace.id}`}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal"
                            >
                                <div className="w-2 h-2 rounded-full bg-ocean" />
                                <span className="truncate">{workspace.name}</span>
                            </Link>
                        ))}
                    </nav>
                </div>

                <div>
                    <h3 className="text-xs font-medium uppercase tracking-wider mb-3 text-gray-medium">
                        Navigation
                    </h3>
                    <nav className="space-y-1">
                        <Link
                            to="/workspaces"
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            All Workspaces
                        </Link>

                        <Link
                            to="/my-tasks"
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/50 transition-colors text-sm text-charcoal"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            My Tasks
                        </Link>
                    </nav>
                </div>
            </div>

            {/* User section */}
            <div className="p-4 border-t border-cream-border">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white bg-mint">
                        {user?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-charcoal">{user?.name || 'User'}</p>
                        <p className="text-xs truncate text-gray-medium">{user?.email || ''}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md transition-colors text-sm hover:bg-white/50 text-gray-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                </button>
            </div>
        </aside>
    );
}