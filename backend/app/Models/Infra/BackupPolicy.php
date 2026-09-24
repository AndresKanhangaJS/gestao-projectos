<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Enums\Infra\BackupFrequency;
use Database\Factories\Infra\BackupPolicyFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['backupable_type', 'backupable_id', 'frequency', 'retention_count', 'last_run_at', 'next_run_at'])]
class BackupPolicy extends Model
{
    /** @use HasFactory<BackupPolicyFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'frequency' => BackupFrequency::class,
            'last_run_at' => 'datetime',
            'next_run_at' => 'datetime',
        ];
    }

    public function backupable(): MorphTo
    {
        return $this->morphTo();
    }
}
