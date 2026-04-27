import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';

export const PRIORITY_STYLES = {
    low: 'bg-gray-100 text-gray-600 border-gray-200',
    medium: 'bg-sage/20 text-sage border-sage',
    high: 'bg-ocean/20 text-ocean border-ocean',
    urgent: 'bg-red-100 text-red-600 border-red-200',
};

export const PRIORITY_LABELS = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
};

export default function TaskCard({ task, onClick, desaturated = false }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: task.id,
        data: { type: 'task', task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        filter: desaturated ? 'grayscale(30%)' : 'none',
    };

    const priorityClasses = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick?.(task)}
            className="group p-3 cursor-grab active:cursor-grabbing transition-all hover:shadow-md bg-white rounded-xl border border-cream-border shadow-sm"
        >
            <h4 className="text-sm font-medium leading-snug text-charcoal">{task.title}</h4>

            {task.description && (
                <p className="mt-1 text-xs text-gray-medium line-clamp-2">{task.description}</p>
            )}

            <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${priorityClasses}`}>
                    {PRIORITY_LABELS[task.priority] || 'Medium'}
                </span>

                {task.due_date && (
                    <span className="text-xs" style={{ color: isOverdue(task.due_date) ? '#DC2626' : '#6B6B6B' }}>
                        {format(new Date(task.due_date), 'MMM d')}
                    </span>
                )}
            </div>

            {/* Meta row with assignees and comments count */}
            <div className="mt-2 flex items-center justify-between">
                <div className="flex -space-x-1.5">
                    {task.assignees?.slice(0, 3).map((assignee) => (
                        <div
                            key={assignee.id}
                            className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-medium text-white bg-mint"
                            title={assignee.name}
                        >
                            {assignee.name?.[0]?.toUpperCase() || '?'}
                        </div>
                    ))}
                    {task.assignees?.length > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] bg-cream text-gray-medium">
                            +{task.assignees.length - 3}
                        </div>
                    )}
                </div>

                {task.comments_count > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-medium">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.026 3 11c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {task.comments_count}
                    </div>
                )}
            </div>
        </div>
    );
}

function isOverdue(dueDate) {
    return new Date(dueDate) < new Date();
}