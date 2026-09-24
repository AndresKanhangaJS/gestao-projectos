<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\MachineAccessType;
use App\Enums\Infra\MachineEnvironment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMachineRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('machine'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $machine = $this->route('machine');

        return [
            'name' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('machines', 'name')->ignore($machine),
            ],
            'ip_address' => ['nullable', 'ip'],
            'operating_system' => ['nullable', 'string', 'max:255'],
            'access_type' => ['nullable', Rule::enum(MachineAccessType::class)],
            'access_user' => ['nullable', 'string', 'max:255'],
            'environment' => ['sometimes', 'required', Rule::enum(MachineEnvironment::class)],
            'notes' => ['nullable', 'string'],
        ];
    }
}
