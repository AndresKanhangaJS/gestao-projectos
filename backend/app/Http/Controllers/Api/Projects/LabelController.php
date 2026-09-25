<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\StoreLabelRequest;
use App\Http\Requests\Projects\UpdateLabelRequest;
use App\Http\Resources\Projects\LabelResource;
use App\Models\Projects\Label;
use App\Models\Projects\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class LabelController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return LabelResource::collection($project->labels()->get())->response();
    }

    public function store(StoreLabelRequest $request, Project $project): JsonResponse
    {
        $label = $project->labels()->create($request->validated());

        return LabelResource::make($label)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Label $label): JsonResponse
    {
        $this->authorize('view', $label->project);

        return LabelResource::make($label)->response();
    }

    public function update(UpdateLabelRequest $request, Label $label): JsonResponse
    {
        $label->update($request->validated());

        return LabelResource::make($label)->response();
    }

    public function destroy(Label $label): Response
    {
        $this->authorize('manageLabels', $label->project);

        $label->delete();

        return response()->noContent();
    }
}
