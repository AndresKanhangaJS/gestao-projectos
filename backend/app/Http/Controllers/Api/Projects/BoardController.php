<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreBoardRequest;
use App\Http\Requests\Projects\UpdateBoardRequest;
use App\Http\Resources\Projects\BoardResource;
use App\Models\Projects\Board;
use App\Models\Projects\Project;
use App\Services\Projects\ProjectDeletionService;
use App\Services\Projects\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class BoardController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $boards = $project->boards()->with('columns')->get();

        return BoardResource::collection($boards)->response();
    }

    /** Cria um quadro; por omissão com as colunas base (`with_default_columns`, default true). */
    public function store(StoreBoardRequest $request, Project $project, ProjectService $projects): JsonResponse
    {
        $this->authorize('update', $project);

        $board = $projects->createBoard(
            $project,
            $request->safe()->except('with_default_columns'),
            $request->withDefaultColumns(),
        );

        return BoardResource::make($board->load('columns'))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Board $board): JsonResponse
    {
        $this->authorize('view', $board->project);

        return BoardResource::make($board->load('columns'))->response();
    }

    public function update(UpdateBoardRequest $request, Board $board): JsonResponse
    {
        $this->authorize('update', $board->project);

        $data = $request->validated();

        if (! empty($data['is_default'])) {
            $board->project->boards()->where('id', '!=', $board->id)->update(['is_default' => false]);
        }

        $board->update($data);

        return BoardResource::make($board->load('columns'))->response();
    }

    public function destroy(Board $board, ProjectDeletionService $deletion): Response
    {
        $this->authorize('delete', $board->project);

        // Remove primeiro as tarefas (FK restrict em board_column_id) — ver ProjectDeletionService.
        $deletion->deleteBoard($board);

        return response()->noContent();
    }
}
