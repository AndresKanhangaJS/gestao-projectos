<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Project;
use Illuminate\Foundation\Http\FormRequest;

/** `GET /projects/link-options` — só para quem pode criar/editar projectos (ProjectPolicy::linkOptions). */
class ProjectLinkOptionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('linkOptions', Project::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }
}
