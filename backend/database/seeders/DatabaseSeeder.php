<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Papéis/permissões correm SEMPRE (são dados de referência, idempotentes).
     * Utilizadores demo (password "password") e dados de demonstração só em
     * local/testing ou com a flag explícita SEED_DEMO_DATA=true — assim um
     * `migrate --seed` em produção nunca cria contas com password conhecida.
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        if (! self::shouldSeedDemoData()) {
            $this->command?->warn('Dados de demonstração ignorados (ambiente não local/testing e SEED_DEMO_DATA desligado).');

            return;
        }

        $this->call([
            DemoUsersSeeder::class,
            DemoInfraSeeder::class,
            ProjectsDemoSeeder::class,
        ]);
    }

    public static function shouldSeedDemoData(): bool
    {
        return app()->environment(['local', 'testing']) || (bool) config('app.seed_demo_data');
    }
}
