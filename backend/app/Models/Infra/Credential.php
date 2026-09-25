<?php

declare(strict_types=1);

namespace App\Models\Infra;

use App\Enums\Infra\CredentialType;
use Database\Factories\Infra\CredentialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

/**
 * Credencial de acesso (SSH/RDP/Web/BD) associada a uma Machine ou Deployment.
 *
 * SEGURANÇA: `secret` usa cast `encrypted` (encriptado em repouso) e está
 * marcado como `Hidden` (defesa em profundidade) — nunca deve aparecer em
 * `toArray()`/JSON por omissão. A única via de leitura em texto simples é o
 * endpoint `POST /infra/credentials/{credential}/reveal`, protegido por
 * `CredentialPolicy::reveal` e que grava um `CredentialAccessLog`.
 *
 * Apagar é um SOFT delete: a linha fica (com `deleted_at`) para que o registo
 * de acessos (`credential_access_logs`, FK cascade) seja preservado como
 * auditoria. Credenciais apagadas não aparecem em listagens nem são
 * resolvidas pelo route model binding (404 em reveal/update/access-logs).
 */
#[Fillable(['credentialable_type', 'credentialable_id', 'type', 'username', 'secret', 'notes'])]
#[Hidden(['secret'])]
class Credential extends Model
{
    /** @use HasFactory<CredentialFactory> */
    use HasFactory, SoftDeletes;

    protected function casts(): array
    {
        return [
            'type' => CredentialType::class,
            'secret' => 'encrypted',
        ];
    }

    /**
     * Apaga (soft delete) a credencial destruindo antes o segredo: a linha
     * fica só como âncora da auditoria (`credential_access_logs`), sem o
     * segredo encriptado. `secret` é nullable desde a migração original.
     */
    public function revokeAndDelete(): void
    {
        DB::transaction(function (): void {
            $this->forceFill(['secret' => null])->save();
            $this->delete();
        });
    }

    public function credentialable(): MorphTo
    {
        return $this->morphTo();
    }

    public function accessLogs(): HasMany
    {
        return $this->hasMany(CredentialAccessLog::class);
    }
}
