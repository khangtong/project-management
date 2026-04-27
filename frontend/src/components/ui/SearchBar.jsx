import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { searchApi } from '../../api/search';

function SearchIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function TaskIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
    );
}

const PRIORITY_COLORS = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
};

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const { data, isLoading } = useQuery({
        queryKey: ['search', query],
        queryFn: () => searchApi.search(query).then(r => r.data),
        enabled: query.length >= 2,
        staleTime: 30_000,
    });

    const tasks = data?.tasks ?? [];
    const projects = data?.projects ?? [];

    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                inputRef.current && !inputRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    function handleResultClick(type, item) {
        if (type === 'task') {
            const boardId = item.column?.board?.id;
            if (boardId) navigate(`/projects/${item.column.board.project.id}/board?highlight=${item.id}`);
        } else {
            navigate(`/workspaces/${item.workspace_id || item.workspace?.id}`);
        }
        setQuery('');
        setOpen(false);
    }

    function handleClear() {
        setQuery('');
        inputRef.current?.focus();
    }

    return (
        <div className="relative">
            <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-mid pointer-events-none">
                    <SearchIcon />
                </span>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.length >= 2) setOpen(true);
                        else setOpen(false);
                    }}
                    onFocus={() => query.length >= 2 && setOpen(true)}
                    placeholder="Search tasks & projects..."
                    className="pl-9 pr-8 py-2 w-64 lg:w-80 bg-cream-card border border-cream-border rounded-lg text-sm text-charcoal placeholder-gray-mid focus:outline-none focus:ring-2 focus:ring-ocean/30 focus:border-ocean transition-all"
                />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 p-1 rounded hover:bg-cream-dark text-gray-mid hover:text-charcoal transition-colors"
                    >
                        <XIcon />
                    </button>
                )}
            </div>

            {open && query.length >= 2 && (
                <div
                    ref={dropdownRef}
                    className="absolute left-0 top-full mt-2 w-80 lg:w-96 bg-cream-card border border-cream-border rounded-xl shadow-lg z-50 animate-fade-in overflow-hidden"
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ocean" />
                        </div>
                    ) : tasks.length === 0 && projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-mid">
                            <SearchIcon />
                            <p className="text-sm mt-2">No results for "{query}"</p>
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto">
                            {tasks.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-mid uppercase tracking-wider bg-cream-dark/30">
                                        Tasks
                                    </div>
                                    {tasks.map((task) => (
                                        <button
                                            key={task.id}
                                            onClick={() => handleResultClick('task', task)}
                                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-cream-dark/30 transition-colors text-left"
                                        >
                                            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-charcoal truncate">{task.title}</p>
                                                {task.column?.board?.project && (
                                                    <p className="text-xs text-gray-mid mt-0.5 truncate">
                                                        {task.column.board.project.name}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {projects.length > 0 && (
                                <div className={tasks.length > 0 ? 'border-t border-cream-border' : ''}>
                                    <div className="px-4 py-2 text-xs font-semibold text-gray-mid uppercase tracking-wider bg-cream-dark/30">
                                        Projects
                                    </div>
                                    {projects.map((project) => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleResultClick('project', project)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cream-dark/30 transition-colors text-left"
                                        >
                                            <span className="shrink-0 text-ocean">
                                                <FolderIcon />
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-charcoal">{project.name}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}