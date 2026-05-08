<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    public static function send(string $userId, string $type, string $title, ?string $body = null, array $data = []): Notification
    {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $data,
        ]);
    }

    public static function taskAssigned(string $assigneeId, string $taskTitle, string $taskId, string $assignerName): void
    {
        self::send(
            $assigneeId,
            Notification::TYPE_TASK_ASSIGNED,
            'You were assigned a task',
            "{$assignerName} assigned you to \"{$taskTitle}\"",
            ['task_id' => $taskId]
        );
    }

    public static function commentAdded(string $userId, string $taskTitle, string $taskId, string $commenterName): void
    {
        self::send(
            $userId,
            Notification::TYPE_COMMENT_ADDED,
            'New comment on your task',
            "{$commenterName} commented on \"{$taskTitle}\"",
            ['task_id' => $taskId]
        );
    }

    public static function mention(string $userId, string $taskTitle, string $taskId, string $projectId, string $commentId, string $commenterName): void
    {
        self::send(
            $userId,
            Notification::TYPE_MENTION,
            'You were mentioned in a comment',
            "{$commenterName} mentioned you on \"{$taskTitle}\"",
            [
                'task_id' => $taskId,
                'project_id' => $projectId,
                'comment_id' => $commentId,
            ]
        );
    }
}
