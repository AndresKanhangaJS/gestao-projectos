<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkspaceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'owner' => UserSummaryResource::make($this->whenLoaded('owner')),
            'my_role' => $request->user()
                ? $this->memberRole($request->user())?->value
                : null,
            'members_count' => $this->whenCounted('members'),
            'projects_count' => $this->whenCounted('projects'),
            'members' => UserSummaryResource::collection($this->whenLoaded('members')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
