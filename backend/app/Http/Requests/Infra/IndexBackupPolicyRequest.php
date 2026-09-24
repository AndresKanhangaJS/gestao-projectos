<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\InfraResourceType;
use App\Models\Infra\BackupPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filtros de `GET /infra/backup-policies`:
 * `backupable_type=machine|deployment` + `backupable_id=N` (sempre em conjunto).
 */
class IndexBackupPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', BackupPolicy::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'backupable_type' => ['required_with:backupable_id', Rule::enum(InfraResourceType::class)],
            'backupable_id' => ['required_with:backupable_type', 'integer', 'min:1'],
        ];
    }

    public function backupableType(): ?InfraResourceType
    {
        return $this->filled('backupable_type')
            ? InfraResourceType::from($this->string('backupable_type')->value())
            : null;
    }
}
