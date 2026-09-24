<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Enums\Infra\MachineEnvironment;
use App\Http\Controllers\Controller;
use App\Http\Resources\Infra\ClientSoftwareResource;
use App\Http\Resources\Infra\DeploymentResource;
use App\Http\Resources\Infra\MachineResource;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

/**
 * Endpoint de dashboard (não crítico) com os alertas descritos no PRD:
 * máquinas "tradicionais", software sem backup e deployments não verificados
 * recentemente.
 */
class AlertController extends Controller
{
    private const STALE_DEPLOYMENT_DAYS = 30;

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Machine::class);

        $tradicionalMachines = Machine::query()
            ->where('environment', MachineEnvironment::Tradicional)
            ->get();

        $clientSoftwareWithoutBackup = ClientSoftware::query()
            ->with(['client', 'softwareProduct'])
            ->whereDoesntHave('deployments', fn ($query) => $query->whereHas('backupPolicies'))
            ->get();

        $staleDeployments = Deployment::query()
            ->with(['clientSoftware.client', 'clientSoftware.softwareProduct', 'machine'])
            ->where(function ($query) {
                $query->whereNull('last_checked_at')
                    ->orWhere('last_checked_at', '<', Carbon::now()->subDays(self::STALE_DEPLOYMENT_DAYS));
            })
            ->get();

        return response()->json([
            'machines_tradicional' => MachineResource::collection($tradicionalMachines),
            'software_without_backup' => ClientSoftwareResource::collection($clientSoftwareWithoutBackup),
            'deployments_not_recently_checked' => DeploymentResource::collection($staleDeployments),
        ]);
    }
}
