<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\CredentialType;
use App\Models\Infra\Credential;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('create', Credential::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'credentialable_type' => ['required', Rule::in(['machine', 'deployment'])],
            'credentialable_id' => ['required', 'integer'],
            'type' => ['required', Rule::enum(CredentialType::class)],
            'username' => ['nullable', 'string', 'max:255'],
            'secret' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Resolve the short alias (`machine`/`deployment`) to the fully qualified model class.
     */
    public function credentialableClass(): string
    {
        return $this->string('credentialable_type')->value() === 'deployment'
            ? Deployment::class
            : Machine::class;
    }
}
