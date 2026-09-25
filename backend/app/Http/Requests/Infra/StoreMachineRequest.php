<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\MachineAccessType;
use App\Enums\Infra\MachineEnvironment;
use App\Models\Infra\Machine;
use App\Rules\Infra\IpAddressWithOptionalPort;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMachineRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('create', Machine::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'unique:machines,name'],
            'ip_address' => ['nullable', 'string', 'max:64', new IpAddressWithOptionalPort],
            'operating_system' => ['nullable', 'string', 'max:255'],
            'access_type' => ['nullable', Rule::enum(MachineAccessType::class)],
            'access_user' => ['nullable', 'string', 'max:255'],
            'environment' => ['required', Rule::enum(MachineEnvironment::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
