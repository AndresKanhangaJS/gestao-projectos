<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\BackupFrequency;
use App\Models\Infra\BackupPolicy;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBackupPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('create', BackupPolicy::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'backupable_type' => ['required', Rule::in(['machine', 'deployment'])],
            'backupable_id' => ['required', 'integer'],
            'frequency' => ['required', Rule::enum(BackupFrequency::class)],
            'retention_count' => ['required', 'integer', 'min:1'],
            'last_run_at' => ['nullable', 'date'],
            'next_run_at' => ['nullable', 'date'],
        ];
    }

    public function backupableClass(): string
    {
        return $this->string('backupable_type')->value() === 'deployment'
            ? Deployment::class
            : Machine::class;
    }
}
