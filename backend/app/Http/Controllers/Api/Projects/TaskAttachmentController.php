<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreTaskAttachmentRequest;
use App\Http\Resources\Projects\TaskAttachmentResource;
use App\Models\Projects\Task;
use App\Models\Projects\TaskAttachment;
use App\Services\Projects\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Anexos vivem no disco PRIVADO (`local` → storage/app/private), nunca no
 * disco `public`: o único acesso ao conteúdo é o endpoint `download`,
 * autorizado pela TaskPolicy::view da tarefa.
 */
class TaskAttachmentController extends Controller
{
    public const string DISK = TaskAttachment::DISK;

    public function index(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $attachments = $task->attachments()->with('uploader')->latest()->get();

        return TaskAttachmentResource::collection($attachments)->response();
    }

    public function store(StoreTaskAttachmentRequest $request, Task $task, ActivityLogger $activity): JsonResponse
    {
        $this->authorize('update', $task);

        $file = $request->file('file');
        $path = $file->store("task-attachments/{$task->id}", self::DISK);

        /** @var TaskAttachment $attachment */
        $attachment = $task->attachments()->create([
            'uploaded_by' => $request->user()->id,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
        ]);

        $activity->attachmentAdded($task, $attachment, $request->user());

        return TaskAttachmentResource::make($attachment->load('uploader'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /** Descarrega (stream) o ficheiro com o nome original. */
    public function download(Task $task, TaskAttachment $attachment): StreamedResponse
    {
        $this->authorize('view', $task);

        abort_unless($attachment->task_id === $task->id, Response::HTTP_NOT_FOUND);
        abort_unless(Storage::disk(self::DISK)->exists($attachment->path), Response::HTTP_NOT_FOUND, 'Ficheiro não encontrado.');

        return Storage::disk(self::DISK)->download($attachment->path, $attachment->original_name);
    }

    public function destroy(Request $request, Task $task, TaskAttachment $attachment, ActivityLogger $activity): Response
    {
        $this->authorize('update', $task);

        abort_unless($attachment->task_id === $task->id, Response::HTTP_NOT_FOUND);

        $activity->attachmentRemoved($task, $attachment, $request->user());

        Storage::disk(self::DISK)->delete($attachment->path);
        $attachment->delete();

        return response()->noContent();
    }
}
