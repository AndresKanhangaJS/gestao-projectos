<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Http\Requests\Projects\ProjectLinkOptionsRequest;
use App\Services\Projects\ProjectLinkService;
use Illuminate\Http\JsonResponse;

/**
 * Opções para ligar um projecto a software/cliente/módulos, sem depender das
 * permissões de leitura do módulo Infra (só ids e nomes, nada sensível).
 */
class ProjectLinkOptionsController extends Controller
{
    public function index(ProjectLinkOptionsRequest $request, ProjectLinkService $links): JsonResponse
    {
        return response()->json(['software_products' => $links->linkOptions()]);
    }
}
