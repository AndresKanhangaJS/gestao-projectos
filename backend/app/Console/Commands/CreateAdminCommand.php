<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\GlobalRole;
use App\Services\UserAccountService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Cria um administrador (tipicamente o primeiro, logo após o deploy em produção,
 * onde o seeder não cria utilizadores). Interactivo por omissão; em modo não
 * interactivo exige --name, --email e --password.
 */
class CreateAdminCommand extends Command
{
    protected $signature = 'app:create-admin
        {--name= : Nome do administrador}
        {--email= : Email usado no login}
        {--password= : Palavra-passe (atenção: fica no histórico da shell; sem esta opção é pedida de forma escondida)}
        {--force-change : Obrigar a mudar a palavra-passe no primeiro login}';

    protected $description = 'Cria um utilizador com o papel admin';

    public function handle(UserAccountService $accounts): int
    {
        $name = $this->stringOption('name') ?? $this->askIfInteractive('Nome');
        $email = $this->stringOption('email') ?? $this->askIfInteractive('Email');

        // A palavra-passe não é normalizada (espaços contam).
        $rawPassword = $this->option('password');
        $password = is_string($rawPassword) && $rawPassword !== '' ? $rawPassword : null;
        if ($password === null && $this->input->isInteractive()) {
            $password = (string) $this->secret('Palavra-passe (mínimo 8 caracteres)');
            $confirmation = (string) $this->secret('Confirmar palavra-passe');

            if (! hash_equals($password, $confirmation)) {
                $this->error('As palavras-passe não coincidem.');

                return self::FAILURE;
            }
        }

        $data = ['name' => $name, 'email' => $email, 'password' => $password];

        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
        ], [], [
            'name' => 'nome',
            'email' => 'email',
            'password' => 'palavra-passe',
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $this->error($message);
            }

            return self::FAILURE;
        }

        /** @var array{name: string, email: string, password: string} $valid */
        $valid = $validator->validated();

        $user = $accounts->create(
            [...$valid, 'roles' => [GlobalRole::Admin->value]],
            mustChangePassword: (bool) $this->option('force-change'),
        );

        $this->info("Administrador criado: {$user->email} (id {$user->getKey()}).");
        if ($user->must_change_password) {
            $this->line('A palavra-passe terá de ser alterada no primeiro login.');
        }

        return self::SUCCESS;
    }

    private function stringOption(string $key): ?string
    {
        $value = $this->option($key);

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function askIfInteractive(string $question): ?string
    {
        if (! $this->input->isInteractive()) {
            return null;
        }

        $answer = $this->ask($question);

        return is_string($answer) ? trim($answer) : null;
    }
}
