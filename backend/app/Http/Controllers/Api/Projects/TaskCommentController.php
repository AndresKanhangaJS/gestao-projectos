<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreTaskCommentRequest;
use App\Http\Resources\Projects\TaskCommentResource;
use App\Models\Projects\Task;
use App\Models\Projects\TaskComment;
use App\Notifications\Projects\TaskCommented;
use App\Services\Projects\ActivityLogger;
use App\Services\Projects\TaskNotifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TaskCommentController extends Controller
{
    public function index(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $comments = $task->comments()->with('user')->latest()->get();

        return TaskCommentResource::collection($comments)->response();
    }

    public function store(
        StoreTaskCommentRequest $request,
        Task $task,
        TaskNotifier $notifier,
        ActivityLogger $activity,
    ): JsonResponse {
        /** @var TaskComment $comment */
        $comment = $task->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $request->validated('body'),
        ]);

        $activity->commentAdded($task, $comment, $request->user());
        $notifier->notifyParticipants($task, $request->user(), new TaskCommented($task, $request->user()));

        return TaskCommentResource::make($comment->load('user'))->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
