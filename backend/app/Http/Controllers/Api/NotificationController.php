<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json($request->user()->notifications()->paginate(20));
    }

    public function unreadCount(Request $request)
    {
        return response()->json(['count' => $request->user()->notifications()->whereNull('read_at')->count()]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json(['message' => 'Marked as read.']);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->notifications()->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(['message' => 'All marked as read.']);
    }

    public function destroy(Request $request, $id)
    {
        $request->user()->notifications()->findOrFail($id)->delete();
        return response()->json(['message' => 'Deleted.']);
    }
}