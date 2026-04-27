import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TaskDescription from './TaskDescription';
import TaskComments from './TaskComments';
import { taskApi } from '../../api/tasks';
import { attachmentApi } from '../../api/attachments';
import { workspaceApi } from '../../api/workspaces';

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', bg: 'bg-gray-100', color: 'text-gray-600', border: 'border-gray-200' },
    { value: 'medium', label: 'Medium', bg: 'bg-sage/20', color: 'text-sage', border: 'border-sage' },
    { value: 'high', label: 'High', bg: 'bg-ocean/20', color: 'text-ocean', border: 'border-ocean' },
    { value: 'urgent', label: 'Urgent', bg: 'bg-red-100', color: 'text-red-600', border: 'border-red-200' },
];

export default function TaskDrawer({ task, onClose }) {
    const queryClient = useQueryClient();
    const [editedTask, setEditedTask] = useState(task);
    
    const { data: fullTask } = useQuery({
        queryKey: ['task', task.id],
        queryFn: () => taskApi.get(task.id).then(r => r.data),
        initialData: task,
    });

    const updateMutation = useMutation({
        mutationFn: (data) => taskApi.update(task.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', task.id]);
            queryClient.invalidateQueries(['board-tasks']);
        },
    });

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const handleSave = () => updateMutation.mutate(editedTask);

    return (
        <>
            <div className="fixed inset-0 z-40 bg-cream/70" onClick={onClose} />
            <aside className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden bg-white rounded-l-2xl shadow-lg" style={{ width: '40%', maxWidth: '500px', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-cream-border">
                    <h2 className="text-lg font-semibold text-charcoal">Task Details</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50 text-gray-medium">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <input
                        type="text"
                        value={editedTask.title || fullTask?.title || ''}
                        onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                        className="w-full text-xl font-semibold bg-transparent border-none outline-none text-charcoal"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">Priority</label>
                            <div className="flex flex-wrap gap-2">
                                {PRIORITY_OPTIONS.map((p) => (
                                    <button
                                        key={p.value}
                                        onClick={() => setEditedTask({ ...editedTask, priority: p.value })}
                                        className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-colors ${
                                            (editedTask.priority || fullTask?.priority) === p.value
                                                ? `${p.bg} ${p.color} ${p.border}`
                                                : 'bg-transparent text-gray-medium border-cream-border'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">Due Date</label>
                            <input
                                type="date"
                                value={editedTask.due_date || fullTask?.due_date || ''}
                                onChange={(e) => setEditedTask({ ...editedTask, due_date: e.target.value })}
                                className="px-3 py-1.5 text-sm rounded-lg border border-cream-border text-charcoal"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium uppercase mb-2 text-gray-medium">Assignees</label>
                        <AssigneesPanel taskId={task.id} task={fullTask} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-charcoal">Description</label>
                        <div className="rounded-lg p-4 bg-cream-light border border-cream-border">
                            <TaskDescription 
                                content={fullTask?.description || ''} 
                                editable={true}
                                onUpdate={(html) => setEditedTask({ ...editedTask, description: html })} 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-charcoal">Comments</label>
                        <TaskComments taskId={task.id} comments={fullTask?.comments || []} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 text-charcoal">Attachments</label>
                        <AttachmentsPanel taskId={task.id} attachments={fullTask?.attachments || []} />
                    </div>
                </div>

                <div className="p-6 border-t border-cream-border">
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="w-full py-2.5 font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50"
                    >
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </aside>
        </>
    );
}

function AttachmentsPanel({ taskId, attachments = [] }) {
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: (file) => attachmentApi.create(taskId, file),
        onSuccess: () => queryClient.invalidateQueries(['task', taskId]),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => attachmentApi.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['task', taskId]),
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) uploadMutation.mutate(file);
        e.target.value = '';
    };

    return (
        <div className="space-y-3">
            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mint-light">
                            <svg className="w-4 h-4 text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-ocean hover:underline">
                                {att.file_name}
                            </a>
                            <button onClick={() => deleteMutation.mutate(att.id)} className="text-xs text-gray-medium hover:text-red-500">
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-mint text-mint cursor-pointer hover:bg-mint-light">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload file
                <input type="file" className="hidden" onChange={handleFileChange} accept="*/*" />
            </label>
        </div>
    );
}

function AssigneesPanel({ taskId, task }) {
    const queryClient = useQueryClient();
    const [showDropdown, setShowDropdown] = useState(false);
    
    const workspaceId = task?.column?.board?.project?.workspace_id;
    
    const { data: members = [] } = useQuery({
        queryKey: ['workspace-members', workspaceId],
        queryFn: () => workspaceId ? workspaceApi.members.list(workspaceId).then(r => r.data) : Promise.resolve([]),
        enabled: !!workspaceId,
    });

    const assignMutation = useMutation({
        mutationFn: (userId) => taskApi.assign(taskId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', taskId]);
            queryClient.invalidateQueries(['board-tasks']);
            setShowDropdown(false);
        },
    });

    const unassignMutation = useMutation({
        mutationFn: (userId) => taskApi.unassign(taskId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', taskId]);
            queryClient.invalidateQueries(['board-tasks']);
        },
    });

    const assignees = task?.assignees || [];
    const assignedIds = assignees.map(a => a.id);
    const availableMembers = members.filter(m => !assignedIds.includes(m.user_id));

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {assignees.length > 0 ? (
                    assignees.map((a) => (
                        <span key={a.id} className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-mint-light text-charcoal">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white bg-mint">{a.name?.[0]?.toUpperCase()}</div>
                            {a.name}
                            <button 
                                onClick={() => unassignMutation.mutate(a.id)} 
                                className="ml-1 text-gray-medium hover:text-red-500"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </span>
                    ))
                ) : (
                    <span className="text-sm text-gray-medium">No assignees</span>
                )}
            </div>
            
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-mint text-mint hover:bg-mint-light"
                >
                    + Add Assignee
                </button>
                
                {showDropdown && availableMembers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-48 bg-white border border-cream-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {availableMembers.map((member) => (
                            <button
                                key={member.user_id}
                                onClick={() => assignMutation.mutate(member.user_id)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-mint-light flex items-center gap-2"
                            >
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white bg-mint">
                                    {member.user?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                {member.user?.name || 'Unknown'}
                            </button>
                        ))}
                    </div>
                )}
                
                {showDropdown && availableMembers.length === 0 && (
                    <div className="absolute z-10 mt-1 w-48 bg-white border border-cream-border rounded-lg shadow-lg p-2 text-sm text-gray-medium">
                        No more members to add
                    </div>
                )}
            </div>
        </div>
    );
}