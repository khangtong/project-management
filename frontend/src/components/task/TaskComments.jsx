import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { commentApi } from '../../api/comments';

export default function TaskComments({ taskId, comments = [] }) {
    const queryClient = useQueryClient();
    const [body, setBody] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createMutation = useMutation({
        mutationFn: (data) => commentApi.create(taskId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['task', taskId]);
            setBody('');
        },
        onSettled: () => setIsSubmitting(false),
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setIsSubmitting(true);
        createMutation.mutate({ body });
    };

    return (
        <div className="space-y-4">
            {comments.length > 0 ? (
                <div className="space-y-3">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium text-white bg-mint flex-shrink-0">
                                {comment.user?.name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-charcoal">{comment.user?.name || 'User'}</span>
                                    <span className="text-xs text-gray-medium">
                                        {format(new Date(comment.created_at), 'MMM d, yyyy')}
                                    </span>
                                </div>
                                <div className="text-sm px-4 py-2 rounded-2xl inline-block bg-mint-light text-charcoal">
                                    {comment.body}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-medium">No comments yet.</p>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-lg resize-none bg-white border border-cream-border text-charcoal focus:ring-2 focus:ring-ocean focus:border-ocean"
                />
                <button
                    type="submit"
                    disabled={isSubmitting || !body.trim()}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-white bg-mint hover:bg-mint/90 disabled:opacity-50"
                >
                    {isSubmitting ? 'Posting...' : 'Comment'}
                </button>
            </form>
        </div>
    );
}