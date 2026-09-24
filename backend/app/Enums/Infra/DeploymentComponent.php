<?php

declare(strict_types=1);

namespace App\Enums\Infra;

enum DeploymentComponent: string
{
    case Frontend = 'frontend';
    case Backend = 'backend';
    case Full = 'full';
    case Worker = 'worker';
}
