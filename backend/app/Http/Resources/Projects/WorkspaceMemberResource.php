<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Membro de um workspace: utilizador + papel (da pivot `workspace_user`). */
class WorkspaceMemberResource extends JsonResource
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
            'role' => $this->pivot?->getAttribute('role'),
        ];
    }
}
