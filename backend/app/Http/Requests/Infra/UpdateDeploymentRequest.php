<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\DeploymentComponent;
use App\Enums\Infra\DeploymentStatus;
use App\Enums\Infra\MachineEnvironment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeploymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('deployment'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'client_software_id' => ['sometimes', 'required', 'integer', 'exists:client_software,id'],
            'software_module_id' => ['nullable', 'integer', 'exists:software_modules,id'],
            'machine_id' => ['sometimes', 'required', 'integer', 'exists:machines,id'],
            'component' => ['sometimes', Rule::enum(DeploymentComponent::class)],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'stack' => ['nullable', 'string', 'max:255'],
            'database_engine' => ['nullable', 'string', 'max:255'],
            'database_name' => ['nullable', 'string', 'max:255'],
            'database_host' => ['nullable', 'string', 'max:255'],
            'environment_type' => ['sometimes', 'required', Rule::enum(MachineEnvironment::class)],
            'start_command' => ['nullable', 'string'],
            'status' => ['sometimes', Rule::enum(DeploymentStatus::class)],
            'last_checked_at' => ['nullable', 'date'],
        ];
    }
}
