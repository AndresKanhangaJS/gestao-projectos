<?php

declare(strict_types=1);

namespace App\Models\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\User;
use Database\Factories\Projects\WorkspaceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'slug', 'description', 'owner_id'])]
class Workspace extends Model
{
    /** @use HasFactory<WorkspaceFactory> */
    use HasFactory;

    /**
     * Dono do workspace.
     *
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** Membros do workspace (com o papel na tabela pivot). */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * Projectos pertencentes a este workspace.
     *
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Papel do utilizador neste workspace (ou null se não for membro).
     *
     * Se a relação `members` já estiver carregada usa-a (sem query extra) —
     * as Resources calculam várias permissões por workspace/projecto e isto
     * evita N queries repetidas; caso contrário consulta a pivot.
     */
    public function memberRole(User $user): ?WorkspaceRole
    {
        $member = $this->relationLoaded('members')
            ? $this->members->firstWhere('id', $user->id)
            : $this->members()->where('users.id', $user->id)->first();

        $role = $member?->getAttribute('pivot')?->getAttribute('role');

        return $role !== null ? WorkspaceRole::from((string) $role) : null;
    }

    public function hasMember(User $user): bool
    {
        return $this->memberRole($user) !== null;
    }
}
