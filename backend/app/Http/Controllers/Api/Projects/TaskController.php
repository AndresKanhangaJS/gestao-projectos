<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\IndexTaskRequest;
use App\Http\Requests\Projects\MoveTaskRequest;
use App\Http\Requests\Projects\StoreSubtaskRequest;
use App\Http\Requests\Projects\StoreTaskRequest;
use App\Http\Requests\Projects\UpdateTaskRequest;
use App\Http\Resources\Projects\TaskResource;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Services\Projects\TaskService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TaskController extends Controller
{
    private const array EAGER_LOAD = ['reporter', 'assignees', 'labels'];

    private const array EAGER_COUNT = ['comments', 'children', 'attachments'];

    public function index(IndexTaskRequest $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $filters = $request->validated();

        $tasks = $project->tasks()
            ->with(self::EAGER_LOAD)
            ->withCount(self::EAGER_COUNT)
            ->when($filters['board_column_id'] ?? null, fn (Builder $q, $id) => $q->where('board_column_id', (int) $id))
            ->when($filters['sprint_id'] ?? null, fn (Builder $q, $id) => $q->where('sprint_id', (int) $id))
            ->when($filters['priority'] ?? null, fn (Builder $q, $priority) => $q->where('priority', $priority))
            ->when($filters['type'] ?? null, fn (Builder $q, $type) => $q->where('type', $type))
            ->when($filters['assignee_id'] ?? null, fn (Builder $q, $id) => $q->whereRelation('assignees', 'users.id', (int) $id))
            ->when($filters['label_id'] ?? null, fn (Builder $q, $id) => $q->whereRelation('labels', 'labels.id', (int) $id))
            ->orderBy('position')
            ->get();

        return TaskResource::collection($tasks)->response();
    }

    public function store(StoreTaskRequest $request, Project $project, TaskService $tasks): JsonResponse
    {
        $this->authorize('create', [Task::class, $project]);

        $task = $tasks->create($project, $request->validated(), $request->user());

        return TaskResource::make($task->load(self::EAGER_LOAD)->loadCount(self::EAGER_COUNT))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * Detalhe completo da tarefa: inclui comentários (mais antigos primeiro),
     * subtarefas, responsáveis, observadores e etiquetas.
     */
    public function show(Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        $task->load([
            ...self::EAGER_LOAD,
            'watchers',
            'boardColumn',
            'comments' => fn ($q) => $q->with('user')->orderBy('created_at')->orderBy('id'),
            'children' => fn ($q) => $q->with('boardColumn')->orderBy('position')->orderBy('id'),
        ])->loadCount(self::EAGER_COUNT);

        return TaskResource::make($task)->response();
    }

    public function update(UpdateTaskRequest $request, Task $task, TaskService $tasks): JsonResponse
    {
        $this->authorize('update', $task);

        $tasks->update($task, $request->validated(), $request->user());

        return TaskResource::make($task->load(self::EAGER_LOAD)->loadCount(self::EAGER_COUNT))->response();
    }

    public function destroy(Request $request, Task $task, TaskService $tasks): Response
    {
        $this->authorize('delete', $task);

        $tasks->delete($task, $request->user());

        return response()->noContent();
    }

    /** Cria uma subtarefa (parent_id = $task->id). Por omissão herda a coluna e o sprint da tarefa-mãe. */
    public function storeSubtask(StoreSubtaskRequest $request, Task $task, TaskService $tasks): JsonResponse
    {
        $this->authorize('create', [Task::class, $task->project]);

        $subtask = $tasks->createSubtask($task, $request->validated(), $request->user());

        return TaskResource::make($subtask->load(self::EAGER_LOAD)->loadCount(self::EAGER_COUNT))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /** Move a tarefa para outra coluna e/ou posição (drag-and-drop no quadro Kanban). */
    public function move(MoveTaskRequest $request, Task $task, TaskService $tasks): JsonResponse
    {
        $this->authorize('update', $task);

        $tasks->move(
            $task,
            (int) $request->validated('board_column_id'),
            (int) $request->validated('position'),
            $request->user(),
        );

        return TaskResource::make($task->fresh(self::EAGER_LOAD)?->loadCount(self::EAGER_COUNT))->response();
    }
}
