<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Infra\AlertController;
use App\Http\Controllers\Api\Infra\BackupPolicyController;
use App\Http\Controllers\Api\Infra\ClientController;
use App\Http\Controllers\Api\Infra\ClientSoftwareController;
use App\Http\Controllers\Api\Infra\CredentialController;
use App\Http\Controllers\Api\Infra\DeploymentController;
use App\Http\Controllers\Api\Infra\MachineController;
use App\Http\Controllers\Api\Infra\SoftwareModuleController;
use App\Http\Controllers\Api\Infra\SoftwareProductController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Projects\ActivityLogController;
use App\Http\Controllers\Api\Projects\BoardColumnController;
use App\Http\Controllers\Api\Projects\BoardController;
use App\Http\Controllers\Api\Projects\DashboardController;
use App\Http\Controllers\Api\Projects\LabelController;
use App\Http\Controllers\Api\Projects\ProjectController;
use App\Http\Controllers\Api\Projects\SearchController;
use App\Http\Controllers\Api\Projects\SprintController;
use App\Http\Controllers\Api\Projects\TaskAssigneeController;
use App\Http\Controllers\Api\Projects\TaskAttachmentController;
use App\Http\Controllers\Api\Projects\TaskCommentController;
use App\Http\Controllers\Api\Projects\TaskController;
use App\Http\Controllers\Api\Projects\TaskRelationController;
use App\Http\Controllers\Api\Projects\TaskWatcherController;
use App\Http\Controllers\Api\Projects\WorkspaceController;
use Illuminate\Support\Facades\Route;

// NOTA: o módulo "Gestão de Projectos" (App\Http\Controllers\Api\Projects\*)
// regista o seu próprio grupo de rotas (prefix('projects')) separadamente
// dentro deste mesmo grupo `auth:sanctum` — não misturar os dois módulos
// no mesmo bloco.

Route::middleware('throttle:10,1')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markAsRead']);
});

Route::middleware('auth:sanctum')->prefix('infra')->group(function () {
    Route::apiResource('clients', ClientController::class);
    Route::get('clients/{client}/overview', [ClientController::class, 'overview']);

    Route::apiResource('software-products', SoftwareProductController::class);
    Route::get('software-products/{softwareProduct}/overview', [SoftwareProductController::class, 'overview']);
    Route::get('software-products/{softwareProduct}/modules', [SoftwareModuleController::class, 'index']);
    Route::post('software-products/{softwareProduct}/modules', [SoftwareModuleController::class, 'store']);
    Route::apiResource('software-modules', SoftwareModuleController::class)->except(['index', 'store']);

    Route::apiResource('client-software', ClientSoftwareController::class);
    Route::put('client-software/{clientSoftware}/modules', [ClientSoftwareController::class, 'syncModules']);

    Route::apiResource('machines', MachineController::class);
    Route::get('machines/{machine}/overview', [MachineController::class, 'overview']);

    Route::apiResource('deployments', DeploymentController::class);

    Route::apiResource('backup-policies', BackupPolicyController::class);

    Route::apiResource('credentials', CredentialController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::post('credentials/{credential}/reveal', [CredentialController::class, 'reveal'])
        ->middleware('throttle:10,1');
    Route::get('credentials/{credential}/access-logs', [CredentialController::class, 'accessLogs']);

    Route::get('alerts', [AlertController::class, 'index']);
});

Route::middleware('auth:sanctum')->prefix('projects')->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index']);
    Route::get('search', [SearchController::class, 'index']);

    Route::apiResource('workspaces', WorkspaceController::class);
    Route::put('workspaces/{workspace}/members', [WorkspaceController::class, 'syncMembers']);

    Route::get('workspaces/{workspace}/projects', [ProjectController::class, 'index']);
    Route::post('workspaces/{workspace}/projects', [ProjectController::class, 'store']);
    Route::get('{project}', [ProjectController::class, 'show']);
    Route::put('{project}', [ProjectController::class, 'update']);
    Route::patch('{project}', [ProjectController::class, 'update']);
    Route::delete('{project}', [ProjectController::class, 'destroy']);
    Route::get('{project}/activity', [ActivityLogController::class, 'forProject']);

    Route::get('{project}/boards', [BoardController::class, 'index']);
    Route::post('{project}/boards', [BoardController::class, 'store']);
    Route::get('boards/{board}', [BoardController::class, 'show']);
    Route::put('boards/{board}', [BoardController::class, 'update']);
    Route::patch('boards/{board}', [BoardController::class, 'update']);
    Route::delete('boards/{board}', [BoardController::class, 'destroy']);

    Route::get('boards/{board}/columns', [BoardColumnController::class, 'index']);
    Route::post('boards/{board}/columns', [BoardColumnController::class, 'store']);
    Route::get('columns/{column}', [BoardColumnController::class, 'show']);
    Route::put('columns/{column}', [BoardColumnController::class, 'update']);
    Route::patch('columns/{column}', [BoardColumnController::class, 'update']);
    Route::delete('columns/{column}', [BoardColumnController::class, 'destroy']);

    Route::get('{project}/sprints', [SprintController::class, 'index']);
    Route::post('{project}/sprints', [SprintController::class, 'store']);
    Route::get('sprints/{sprint}', [SprintController::class, 'show']);
    Route::put('sprints/{sprint}', [SprintController::class, 'update']);
    Route::patch('sprints/{sprint}', [SprintController::class, 'update']);
    Route::delete('sprints/{sprint}', [SprintController::class, 'destroy']);

    Route::get('{project}/labels', [LabelController::class, 'index']);
    Route::post('{project}/labels', [LabelController::class, 'store']);
    Route::get('labels/{label}', [LabelController::class, 'show']);
    Route::put('labels/{label}', [LabelController::class, 'update']);
    Route::patch('labels/{label}', [LabelController::class, 'update']);
    Route::delete('labels/{label}', [LabelController::class, 'destroy']);

    Route::get('{project}/tasks', [TaskController::class, 'index']);
    Route::post('{project}/tasks', [TaskController::class, 'store']);
    Route::get('tasks/{task}', [TaskController::class, 'show']);
    Route::put('tasks/{task}', [TaskController::class, 'update']);
    Route::patch('tasks/{task}', [TaskController::class, 'update']);
    Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
    Route::post('tasks/{task}/move', [TaskController::class, 'move']);
    Route::post('tasks/{task}/subtasks', [TaskController::class, 'storeSubtask']);

    Route::get('tasks/{task}/comments', [TaskCommentController::class, 'index']);
    Route::post('tasks/{task}/comments', [TaskCommentController::class, 'store']);

    Route::put('tasks/{task}/assignees', [TaskAssigneeController::class, 'sync']);
    Route::post('tasks/{task}/watch', [TaskWatcherController::class, 'toggle']);

    Route::get('tasks/{task}/relations', [TaskRelationController::class, 'index']);
    Route::post('tasks/{task}/relations', [TaskRelationController::class, 'store']);
    Route::delete('tasks/{task}/relations/{relation}', [TaskRelationController::class, 'destroy']);

    Route::get('tasks/{task}/attachments', [TaskAttachmentController::class, 'index']);
    Route::post('tasks/{task}/attachments', [TaskAttachmentController::class, 'store']);
    Route::get('tasks/{task}/attachments/{attachment}/download', [TaskAttachmentController::class, 'download'])
        ->name('projects.tasks.attachments.download');
    Route::delete('tasks/{task}/attachments/{attachment}', [TaskAttachmentController::class, 'destroy']);

    Route::get('tasks/{task}/activity', [ActivityLogController::class, 'forTask']);
});
