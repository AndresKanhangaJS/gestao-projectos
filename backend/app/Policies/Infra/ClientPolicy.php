<?php

declare(strict_types=1);

namespace App\Policies\Infra;

use App\Models\Infra\Client;
use App\Models\User;
use App\Policies\Infra\Concerns\ChecksInfraRoles;

/** Leitura: admin/infra/project_manager. Escrita: admin/infra. */
class ClientPolicy
{
    use ChecksInfraRoles;

    public function viewAny(User $user): bool
    {
        return $this->canReadInfra($user);
    }

    public function view(User $user, Client $client): bool
    {
        return $this->canReadInfra($user);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInfra($user);
    }

    public function update(User $user, Client $client): bool
    {
        return $this->canWriteInfra($user);
    }

    public function delete(User $user, Client $client): bool
    {
        return $this->canWriteInfra($user);
    }
}
