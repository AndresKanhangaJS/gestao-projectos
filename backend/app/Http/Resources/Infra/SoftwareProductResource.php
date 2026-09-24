<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\SoftwareProduct;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SoftwareProduct
 */
class SoftwareProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            'description' => $this->description,
            'modules' => SoftwareModuleResource::collection($this->whenLoaded('modules')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
