<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 *
 * `roles`/`permissions` são arrays de strings (nomes spatie), para o frontend
 * decidir que menus mostrar. A autorização real é sempre feita na API.
 */
class UserResource extends JsonResource
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
            'is_active' => (bool) ($this->is_active ?? true),
            'must_change_password' => (bool) ($this->must_change_password ?? false),
            'roles' => $this->getRoleNames()->values()->all(),
            'permissions' => $this->getAllPermissions()->pluck('name')->values()->all(),
            'created_at' => $this->created_at,
        ];
    }
}
