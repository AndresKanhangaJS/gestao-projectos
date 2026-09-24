<?php

namespace App\Providers;

use App\Models\Infra\BackupPolicy;
use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Credential;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Policies\Infra\BackupPolicyPolicy;
use App\Policies\Infra\ClientPolicy;
use App\Policies\Infra\ClientSoftwarePolicy;
use App\Policies\Infra\CredentialPolicy;
use App\Policies\Infra\DeploymentPolicy;
use App\Policies\Infra\MachinePolicy;
use App\Policies\Infra\SoftwareModulePolicy;
use App\Policies\Infra\SoftwareProductPolicy;
use App\Policies\Projects\ProjectPolicy;
use App\Policies\Projects\TaskPolicy;
use App\Policies\Projects\WorkspacePolicy;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // API pura, sem rota de login web: nunca tentar redireccionar um
        // convidado não autenticado para uma rota "login" inexistente —
        // responder sempre com 401 JSON (AuthenticationException).
        Authenticate::redirectUsing(fn () => null);

        // Modelos do módulo "Controlo de Software" vivem em App\Models\Infra,
        // fora da convenção de auto-discovery de policies do Laravel — registo manual.
        Gate::policy(Client::class, ClientPolicy::class);
        Gate::policy(SoftwareProduct::class, SoftwareProductPolicy::class);
        Gate::policy(SoftwareModule::class, SoftwareModulePolicy::class);
        Gate::policy(ClientSoftware::class, ClientSoftwarePolicy::class);
        Gate::policy(Machine::class, MachinePolicy::class);
        Gate::policy(Deployment::class, DeploymentPolicy::class);
        Gate::policy(Credential::class, CredentialPolicy::class);
        Gate::policy(BackupPolicy::class, BackupPolicyPolicy::class);

        // Modelos do módulo "Gestão de Projectos" vivem em App\Models\Projects,
        // também fora da convenção de auto-discovery — registo manual.
        Gate::policy(Workspace::class, WorkspacePolicy::class);
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
    }
}
