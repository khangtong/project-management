<?php

use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceInvitation;
use App\Models\WorkspaceMember;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

beforeEach(function () {
    if (! in_array('sqlite', PDO::getAvailableDrivers(), true)) {
        $this->markTestSkipped('The pdo_sqlite extension is required for database-backed feature tests.');
    }

    $this->artisan('migrate:fresh');
});

it('registers, logs in, and logs out a user', function () {
    $register = $this->postJson('/api/auth/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $register->assertCreated()
        ->assertJsonStructure(['user' => ['id', 'email'], 'token']);

    $login = $this->postJson('/api/auth/login', [
        'email' => 'ada@example.com',
        'password' => 'password123',
    ]);

    $login->assertOk()->assertJsonStructure(['token']);

    $user = User::where('email', 'ada@example.com')->firstOrFail();
    $token = $user->createToken('test-token')->plainTextToken;

    $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/auth/logout')
        ->assertOk();

    expect($user->tokens()->count())->toBe(0);
});

it('enforces workspace admin and owner permissions', function () {
    [$workspace, $owner, $admin, $member] = workspaceFixture();

    Sanctum::actingAs($member);
    $this->patchJson("/api/workspaces/{$workspace->id}", ['name' => 'Nope'])
        ->assertForbidden();

    Sanctum::actingAs($admin);
    $this->patchJson("/api/workspaces/{$workspace->id}", ['name' => 'Admin update'])
        ->assertOk()
        ->assertJsonPath('name', 'Admin update');

    $this->deleteJson("/api/workspaces/{$workspace->id}")
        ->assertForbidden();

    Sanctum::actingAs($owner);
    $this->deleteJson("/api/workspaces/{$workspace->id}")
        ->assertOk();
});

it('previews and accepts workspace invitations', function () {
    [$workspace, $owner] = workspaceFixture();
    $invitee = User::factory()->create([
        'email' => 'invitee@example.com',
    ]);

    $invitation = WorkspaceInvitation::create([
        'workspace_id' => $workspace->id,
        'email' => $invitee->email,
        'token' => Str::random(64),
        'role' => WorkspaceMember::ROLE_MEMBER,
        'invited_by' => $owner->id,
        'expires_at' => now()->addDay(),
    ]);

    $this->getJson("/api/invitations/{$invitation->token}/accept")
        ->assertOk()
        ->assertJsonPath('email', $invitee->email)
        ->assertJsonPath('workspace.id', $workspace->id);

    Sanctum::actingAs($invitee);
    $this->postJson("/api/invitations/{$invitation->token}/accept")
        ->assertOk()
        ->assertJsonPath('workspace_id', $workspace->id);

    $this->assertDatabaseHas('workspace_members', [
        'workspace_id' => $workspace->id,
        'user_id' => $invitee->id,
        'role' => WorkspaceMember::ROLE_MEMBER,
    ]);
});

it('creates a project with default board columns for workspace admins', function () {
    [$workspace, , $admin, $member] = workspaceFixture();

    Sanctum::actingAs($member);
    $this->postJson("/api/workspaces/{$workspace->id}/projects", ['name' => 'Member Project'])
        ->assertForbidden();

    Sanctum::actingAs($admin);
    $response = $this->postJson("/api/workspaces/{$workspace->id}/projects", [
        'name' => 'Launch',
        'color' => '#4CACBC',
    ]);

    $response->assertCreated()
        ->assertJsonPath('name', 'Launch')
        ->assertJsonCount(4, 'board.columns');

    expect($response->json('board.columns.*.name'))->toBe([
        'To Do',
        'In Progress',
        'In Review',
        'Done',
    ]);
});

it('moves tasks within the same board and normalizes positions', function () {
    [$workspace, $owner] = workspaceFixture();
    [, , $board, $todo, $done] = projectFixture($workspace);

    $first = Task::create([
        'column_id' => $todo->id,
        'title' => 'First',
        'position' => 10,
        'created_by' => $owner->id,
    ]);
    $second = Task::create([
        'column_id' => $done->id,
        'title' => 'Second',
        'position' => 20,
        'created_by' => $owner->id,
    ]);
    $third = Task::create([
        'column_id' => $done->id,
        'title' => 'Third',
        'position' => 30,
        'created_by' => $owner->id,
    ]);

    Sanctum::actingAs($owner);
    $this->patchJson("/api/tasks/{$first->id}/move", [
        'column_id' => $done->id,
        'position' => 1,
    ])->assertOk()
        ->assertJsonPath('column_id', $done->id);

    expect(Task::where('column_id', $done->id)->orderBy('position')->pluck('id')->all())
        ->toBe([$second->id, $first->id, $third->id]);
    expect(Task::where('column_id', $done->id)->orderBy('position')->pluck('position')->all())
        ->toBe([0, 1, 2]);
});

it('rejects moving a task to a different board', function () {
    [$workspace, $owner] = workspaceFixture();
    [, , , $sourceColumn] = projectFixture($workspace);
    [, , , $otherColumn] = projectFixture($workspace, 'Other Project');

    $task = Task::create([
        'column_id' => $sourceColumn->id,
        'title' => 'Scoped task',
        'position' => 0,
        'created_by' => $owner->id,
    ]);

    Sanctum::actingAs($owner);
    $this->patchJson("/api/tasks/{$task->id}/move", [
        'column_id' => $otherColumn->id,
        'position' => 0,
    ])->assertUnprocessable();

    expect($task->fresh()->column_id)->toBe($sourceColumn->id);
});

it('reorders columns only within one board and normalizes positions', function () {
    [$workspace, $owner] = workspaceFixture();
    [, , , $first, $second] = projectFixture($workspace);
    [, , , $otherBoardColumn] = projectFixture($workspace, 'Other Project');

    Sanctum::actingAs($owner);
    $this->patchJson('/api/columns/reorder', [
        'columns' => [
            ['id' => $second->id, 'position' => 0],
            ['id' => $first->id, 'position' => 1],
        ],
    ])->assertOk();

    expect(BoardColumn::whereIn('id', [$first->id, $second->id])->orderBy('position')->pluck('id')->all())
        ->toBe([$second->id, $first->id]);
    expect(BoardColumn::whereIn('id', [$first->id, $second->id])->orderBy('position')->pluck('position')->all())
        ->toBe([0, 1]);

    $this->patchJson('/api/columns/reorder', [
        'columns' => [
            ['id' => $first->id, 'position' => 0],
            ['id' => $otherBoardColumn->id, 'position' => 1],
        ],
    ])->assertUnprocessable();
});

it('allows only owners to remove workspace admins', function () {
    [$workspace, $owner, $admin] = workspaceFixture();
    $otherAdmin = User::factory()->create();
    $otherAdminMember = WorkspaceMember::create([
        'workspace_id' => $workspace->id,
        'user_id' => $otherAdmin->id,
        'role' => WorkspaceMember::ROLE_ADMIN,
        'joined_at' => now(),
    ]);

    Sanctum::actingAs($admin);
    $this->deleteJson("/api/workspaces/{$workspace->id}/members/{$otherAdminMember->id}")
        ->assertForbidden();

    Sanctum::actingAs($owner);
    $this->deleteJson("/api/workspaces/{$workspace->id}/members/{$otherAdminMember->id}")
        ->assertOk();
});

function workspaceFixture(): array
{
    $owner = User::factory()->create([
        'password' => Hash::make('password123'),
    ]);
    $admin = User::factory()->create();
    $member = User::factory()->create();

    $workspace = Workspace::create([
        'name' => 'Workspace',
        'owner_id' => $owner->id,
    ]);

    foreach ([[$owner, WorkspaceMember::ROLE_OWNER], [$admin, WorkspaceMember::ROLE_ADMIN], [$member, WorkspaceMember::ROLE_MEMBER]] as [$user, $role]) {
        WorkspaceMember::create([
            'workspace_id' => $workspace->id,
            'user_id' => $user->id,
            'role' => $role,
            'joined_at' => now(),
        ]);
    }

    return [$workspace, $owner, $admin, $member];
}

function projectFixture(Workspace $workspace, string $name = 'Project'): array
{
    $project = Project::create([
        'workspace_id' => $workspace->id,
        'name' => $name,
        'color' => '#4CACBC',
    ]);
    $board = Board::create([
        'project_id' => $project->id,
        'name' => 'Main Board',
    ]);
    $first = BoardColumn::create([
        'board_id' => $board->id,
        'name' => 'To Do',
        'position' => 0,
    ]);
    $second = BoardColumn::create([
        'board_id' => $board->id,
        'name' => 'Done',
        'position' => 1,
    ]);

    return [$project, $workspace, $board, $first, $second];
}
