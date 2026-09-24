<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\SearchTasksRequest;
use App\Http\Resources\Projects\TaskResource;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    private const int LIMIT = 50;

    /** Pesquisa simples (LIKE) por título/descrição da tarefa ou nome de etiqueta, nos projectos visíveis. */
    public function index(SearchTasksRequest $request): JsonResponse
    {
        $term = $request->term();

        $tasks = Task::query()
            ->whereIn('project_id', Project::query()->visibleTo($request->user())->select('id'))
            ->where(function ($query) use ($term) {
                $query->where('title', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhereHas('labels', fn ($labelQuery) => $labelQuery->where('name', 'like', "%{$term}%"));
            })
            ->with(['reporter', 'assignees', 'labels'])
            ->withCount(['comments', 'children', 'attachments'])
            ->limit(self::LIMIT)
            ->get();

        return TaskResource::collection($tasks)->response();
    }
}
