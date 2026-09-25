<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Workspace;
use Illuminate\Foundation\Http\FormRequest;

/** Filtros de `GET /projects/workspaces/{workspace}/projects`: client_id, software_product_id. */
class IndexProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');

        return (bool) $this->user()?->can('view', $workspace);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'client_id' => ['nullable', 'integer', 'min:1'],
            'software_product_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
