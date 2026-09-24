<?php

declare(strict_types=1);

namespace App\Models\Projects;

use App\Enums\Projects\ProjectStatus;
use App\Models\User;
use Database\Factories\Projects\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['workspace_id', 'key', 'name', 'description', 'status'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

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

    public function labels(): HasMany
    {
        return $this->hasMany(Label::class);
    }

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
