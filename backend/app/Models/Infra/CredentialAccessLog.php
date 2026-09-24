<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['credential_id', 'user_id', 'accessed_at', 'ip_address'])]
class CredentialAccessLog extends Model
{
    protected function casts(): array
    {
        return [
            'accessed_at' => 'datetime',
        ];
    }

    public function credential(): BelongsTo
    {
        return $this->belongsTo(Credential::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
