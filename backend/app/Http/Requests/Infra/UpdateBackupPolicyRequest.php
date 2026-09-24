<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\BackupFrequency;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBackupPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('backup_policy'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'frequency' => ['sometimes', 'required', Rule::enum(BackupFrequency::class)],
            'retention_count' => ['sometimes', 'required', 'integer', 'min:1'],
            'last_run_at' => ['nullable', 'date'],
            'next_run_at' => ['nullable', 'date'],
        ];
    }
}
