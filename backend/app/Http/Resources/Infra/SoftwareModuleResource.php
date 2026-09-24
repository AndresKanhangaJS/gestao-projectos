<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\SoftwareModule;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SoftwareModule
 */
class SoftwareModuleResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'software_product_id' => $this->software_product_id,
            'name' => $this->name,
            'description' => $this->description,
            'active' => $this->when(isset($this->pivot), fn () => (bool) $this->pivot->active),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
