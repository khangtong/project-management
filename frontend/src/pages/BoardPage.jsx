import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import Sidebar from '../components/layout/Sidebar';
import KanbanColumn from '../components/board/KanbanColumn';
import TaskDrawer from '../components/task/TaskDrawer';
import { taskApi } from '../api/tasks';
import { boardApi } from '../api/boards';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

export default function BoardPage() {
    const { boardId } = useParams();
    const queryClient = useQueryClient();
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
    const [selectedTask, setSelectedTask] = useState(null);
    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');

    const { data: board, isLoading } = useQuery({
        queryKey: ['board', boardId],
        queryFn: async () => {
            const boards = await boardApi.show(boardId).then(r => r.data);
            return boards;
        },
    });

    const { data: tasksByColumn = {}, isLoading: tasksLoading } = useQuery({
        queryKey: ['board-tasks', boardId],
        queryFn: () => taskApi.list(boardId).then(r => r.data),
    });

    const moveMutation = useMutation({
        mutationFn: ({ taskId, columnId, position }) =>
            taskApi.move(taskId, { column_id: columnId, position }),
        onSuccess: () => queryClient.invalidateQueries(['board-tasks', boardId]),
    });

    const addColumnMutation = useMutation({
        mutationFn: (data) => taskApi.column.create(boardId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['board', boardId]);
            setShowAddColumn(false);
            setNewColumnName('');
        },
    });

    useEffect(() => {
        const channel = supabase
            .channel(`board:${boardId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
                queryClient.invalidateQueries(['board-tasks', boardId]);
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [boardId, queryClient]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeData = active.data.current;
        const overData = over.data.current;

        if (activeData?.type === 'task') {
            const targetColumnId = overData?.columnId || over.id;
            moveMutation.mutate({
                taskId: active.id,
                columnId: targetColumnId,
                position: overData?.position ?? 0,
            });
        } else {
            const columns = board?.columns || [];
            const oldIndex = columns.findIndex(c => c.id === over.id);
            const newIndex = columns.findIndex(c => c.id === active.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const reordered = arrayMove(columns, oldIndex, newIndex);
                taskApi.column.reorder(reordered.map((c, i) => ({ id: c.id, position: i })));
                queryClient.invalidateQueries(['board', boardId]);
            }
        }
    };

    const handleTaskClick = (task) => {
        setSelectedTask(task);
    };

    if (isLoading || tasksLoading) {
        return (
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center bg-cream-light">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean"></div>
                </div>
            </div>
        );
    }

    const columns = board?.columns || [];

    return (
        <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden bg-cream-light">
                {/* Top Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-white border-cream-border">
                    <div>
                        <h1 className="text-xl font-semibold text-charcoal">{board?.name || 'Board'}</h1>
                        <p className="text-sm text-gray-medium">{board?.project?.name}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Filter/Sort buttons - outlined Teal Mint */}
                        <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-mint text-mint hover:bg-mint-light transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                            Filter
                        </button>
                        
                        <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-mint text-mint hover:bg-mint-light transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0h3m-3 0h-3m-2-5h6" />
                            </svg>
                            Sort
                        </button>

                        {/* + Add Task - Ocean Blue primary */}
                        <button
                            onClick={() => setShowAddColumn(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-ocean hover:bg-ocean/90 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Column
                        </button>
                    </div>
                </div>

                {showAddColumn && (
                    <div className="px-6 py-3 border-b bg-cream-light border-cream-border">
                        <form onSubmit={(e) => { e.preventDefault(); addColumnMutation.mutate({ name: newColumnName }); }} className="flex gap-2">
                            <input
                                type="text"
                                value={newColumnName}
                                onChange={(e) => setNewColumnName(e.target.value)}
                                placeholder="Column name"
                                className="px-3 py-2 text-sm rounded-lg border border-cream-border text-charcoal"
                                autoFocus
                            />
                            <button type="submit" className="px-3 py-2 text-sm rounded-lg text-white bg-ocean hover:bg-ocean/90 disabled:opacity-50">
                                {addColumnMutation.isPending ? '...' : 'Add'}
                            </button>
                            <button type="button" onClick={() => { setShowAddColumn(false); setNewColumnName(''); }} className="px-3 py-2 text-sm rounded-lg text-gray-medium hover:bg-white/50">
                                Cancel
                            </button>
                        </form>
                    </div>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                    <div className="flex-1 overflow-x-auto">
                        <div className="flex gap-6 p-6 h-full">
                            {columns.map((column) => (
                                <KanbanColumn
                                    key={column.id}
                                    column={column}
                                    tasks={tasksByColumn[column.id] || []}
                                    onTaskClick={handleTaskClick}
                                />
                            ))}
                        </div>
                    </div>
                </DndContext>
            </main>

            {selectedTask && (
                <TaskDrawer task={selectedTask} boardId={boardId} onClose={() => setSelectedTask(null)} />
            )}
        </div>
    );
}