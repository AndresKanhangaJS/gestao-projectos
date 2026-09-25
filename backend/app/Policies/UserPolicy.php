<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\GlobalRole;
use App\Models\User;

/** Gestão de utilizadores e papéis globais: exclusiva do papel `admin`. */
class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function update(User $user, User $target): bool
    {
        return $this->isAdmin($user);
    }

    public function resetPassword(User $user, User $target): bool
    {
        return $this->isAdmin($user);
    }

    public function deactivate(User $user, User $target): bool
    {
        return $this->isAdmin($user);
    }

    public function activate(User $user, User $target): bool
    {
        return $this->isAdmin($user);
    }

    private function isAdmin(User $user): bool
    {
        return $user->hasRole(GlobalRole::Admin->value);
    }
}
