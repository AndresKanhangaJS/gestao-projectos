<?php

declare(strict_types=1);

namespace App\Http\Resources\Infra;

use App\Models\Infra\BackupPolicy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BackupPolicy
 */
class BackupPolicyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'backupable_type' => $this->backupable_type,
            'backupable_id' => $this->backupable_id,
            'frequency' => $this->frequency,
            'retention_count' => $this->retention_count,
            'last_run_at' => $this->last_run_at,
            'next_run_at' => $this->next_run_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
