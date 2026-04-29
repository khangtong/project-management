import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { taskApi } from '../api/tasks';
import { useAuth } from '../store/AuthContext';

export default function MyTasksPage() {
    const { user } = useAuth();

    const { data: tasks = [], isLoading } = useQuery({
        queryKey: ['my-tasks'],
        queryFn: () => taskApi.myTasks().then(r => r.data),
    });

    return (
        <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-charcoal mb-8">My Tasks</h1>

            {isLoading ? (
                <div className="text-center py-12 text-gray-medium">Loading...</div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-medium">No tasks assigned to you.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map((task) => (
                        <MyTaskRow key={task.id} task={task} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MyTaskRow({ task }) {
    const navigate = useNavigate();
    const isOverdue = task.due_date && new Date(task.due_date) < new Date();
    const projectId = task.column?.board?.project?.id;

    const handleClick = () => {
        if (projectId) navigate(`/projects/${projectId}/board`);
    };

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-cream-border transition-shadow ${
                projectId ? 'cursor-pointer hover:shadow-md hover:border-ocean/30' : ''
            }`}
        >
            <div className="flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-ocean'}`}></div>
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-charcoal">{task.title}</h3>
                <p className="text-xs text-gray-medium mt-0.5">
                    {task.column?.board?.project?.name}
                    {task.column?.name ? ` / ${task.column.name}` : ''}
                </p>
            </div>
            {task.due_date && (
                <div className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-medium'}`}>
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                </div>
            )}
            <div className={`text-xs px-2 py-0.5 rounded border ${
                task.priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-200'
                : task.priority === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200'
                : task.priority === 'medium' ? 'bg-sage/20 text-sage border-sage/30'
                : 'bg-gray-100 text-gray-medium border-gray-200'
            }`}>
                {task.priority}
            </div>
            {projectId && (
                <svg className="w-4 h-4 text-gray-medium shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            )}
        </div>
    );
}