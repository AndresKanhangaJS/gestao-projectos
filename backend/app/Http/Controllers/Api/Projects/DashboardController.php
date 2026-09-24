<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Projects;

use App\Http\Controllers\Controller;
use App\Services\Projects\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Contagens agregadas simples para o painel do módulo de Gestão de Projectos. */
    public function index(Request $request, DashboardService $dashboard): JsonResponse
    {
        return response()->json($dashboard->summary($request->user()));
    }
}
