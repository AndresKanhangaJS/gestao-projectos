<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Notificações in-app do utilizador autenticado (partilhado pelos dois módulos). */
class NotificationController extends Controller
{
    private const int PER_PAGE = 15;

    /** Lista paginada; `?unread=1` devolve só as não lidas. Inclui `meta.unread_count`. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = $request->boolean('unread')
            ? $user->unreadNotifications()->paginate(self::PER_PAGE)
            : $user->notifications()->paginate(self::PER_PAGE);

        return NotificationResource::collection($notifications)
            ->additional(['meta' => ['unread_count' => $user->unreadNotifications()->count()]])
            ->response();
    }

    /** Marca uma notificação do próprio utilizador como lida (404 se não lhe pertencer). */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);

        $notification->markAsRead();

        return NotificationResource::make($notification)->response();
    }

    public function markAllAsRead(Request $request): Response
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->noContent();
    }
}
