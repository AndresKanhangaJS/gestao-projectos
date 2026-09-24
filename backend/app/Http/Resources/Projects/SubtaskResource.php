<?php

declare(strict_types=1);

namespace App\Http\Resources\Projects;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representação leve de uma subtarefa dentro do detalhe da tarefa-mãe.
 * O "estado" é a coluna do quadro; `completed` = a coluna é de conclusão.
 */
class SubtaskResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $column = $this->relationLoaded('boardColumn') ? $this->boardColumn : null;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'type' => $this->type->value,
            'priority' => $this->priority->value,
            'board_column_id' => $this->board_column_id,
            'column' => $column ? [
                'id' => $column->id,
                'name' => $column->name,
                'is_done_column' => $column->is_done_column,
            ] : null,
            'completed' => (bool) $column?->is_done_column,
            'position' => $this->position,
        ];
    }
}
