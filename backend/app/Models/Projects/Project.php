<?php

declare(strict_types=1);

namespace App\Models\Projects;

use App\Enums\Projects\ProjectStatus;
use App\Enums\Projects\SprintStatus;
use App\Models\Infra\Client;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use App\Models\User;
use Database\Factories\Projects\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Projecto do módulo Gestão de Projectos. Pode (opcionalmente) estar ligado
 * ao módulo Controlo de Software: um produto de software, um cliente que tem
 * esse software instalado e os módulos do software abrangidos. A ligação
 * entre módulos é só ao nível de model/relações (ver specs/DATA_MODEL.md).
 */
#[Fillable(['workspace_id', 'software_product_id', 'client_id', 'key', 'name', 'description', 'status'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    /** @return BelongsTo<SoftwareProduct, $this> */
    public function softwareProduct(): BelongsTo
    {
        return $this->belongsTo(SoftwareProduct::class);
    }

    /** @return BelongsTo<Client, $this> */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Módulos do software abrangidos por este projecto.
     *
     * @return BelongsToMany<SoftwareModule, $this>
     */
    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(SoftwareModule::class, 'project_software_module')->withTimestamps();
    }

    protected function casts(): array
    {
        return [
            'status' => ProjectStatus::class,
        ];
    }

    /**
     * Projectos que o utilizador pode ver: todos para admin/project_manager
     * globais, senão só os dos workspaces de que é membro (espelha ProjectPolicy::view).
     *
     * @param  Builder<Project>  $query
     */
    #[Scope]
    protected function visibleTo(Builder $query, User $user): void
    {
        if ($user->hasAnyRole(['admin', 'project_manager'])) {
            return;
        }

        $query->whereIn('workspace_id', $user->workspaces()->select('workspaces.id'));
    }

    /** @return BelongsTo<Workspace, $this> */
    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function boards(): HasMany
    {
        return $this->hasMany(Board::class);
    }

    public function sprints(): HasMany
    {
        return $this->hasMany(Sprint::class);
    }

    /**
     * O sprint activo do projecto (no máximo um — garantido pela validação
     * de Store/UpdateSprintRequest).
     *
     * @return HasOne<Sprint, $this>
     */
    public function activeSprint(): HasOne
    {
        return $this->hasOne(Sprint::class)->where('status', SprintStatus::Active->value);
    }

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

    /** @return HasMany<Task, $this> */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /** @return HasMany<ActivityLog, $this> */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }
}
