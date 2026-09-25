<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreBoardColumnRequest;
use App\Http\Requests\Projects\UpdateBoardColumnRequest;
use App\Http\Resources\Projects\BoardColumnResource;
use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class BoardColumnController extends Controller
{
    public function index(Board $board): JsonResponse
    {
        $this->authorize('view', $board->project);

        $columns = $board->columns()->withCount('tasks')->get();

        return BoardColumnResource::collection($columns)->response();
    }

    public function store(StoreBoardColumnRequest $request, Board $board): JsonResponse
    {
        $data = $request->validated();
        // 0 num quadro vazio, senão a seguir à última coluna.
        $max = $board->columns()->max('position');
        $data['position'] ??= $max === null ? 0 : (int) $max + 1;
        $data['is_done_column'] ??= false;

        $column = $board->columns()->create($data);

        return BoardColumnResource::make($column)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(BoardColumn $column): JsonResponse
    {
        $this->authorize('view', $column->board->project);

        $column->loadCount('tasks');

        return BoardColumnResource::make($column)->response();
    }

    public function update(UpdateBoardColumnRequest $request, BoardColumn $column): JsonResponse
    {
        $column->update($request->validated());

        return BoardColumnResource::make($column)->response();
    }

    public function destroy(BoardColumn $column): Response
    {
        $this->authorize('manageBoard', $column->board->project);

        // tasks.board_column_id é FK restrict: sem esta verificação o DELETE rebentaria com 500.
        if ($column->tasks()->exists()) {
            throw ValidationException::withMessages([
                'column' => 'A coluna tem tarefas; mova-as antes de a apagar.',
            ]);
        }

        $column->delete();

        return response()->noContent();
    }
}
