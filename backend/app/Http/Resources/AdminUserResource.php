<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Utilizador na área de administração. Nunca inclui password/remember_token.
 *
 * @mixin User
 */
class AdminUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roles' => $this->getRoleNames()->values()->all(),
            'is_active' => (bool) $this->is_active,
            'must_change_password' => (bool) $this->must_change_password,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at,
            'workspaces_count' => (int) ($this->workspaces_count ?? $this->workspaces()->count()),
        ];
    }
}
