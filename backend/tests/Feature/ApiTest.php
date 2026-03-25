<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use App\Services\RagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private function admin(): User
    {
        return User::factory()->create(['role' => Role::ADMIN, 'is_active' => true]);
    }

    private function tecnico(): User
    {
        return User::factory()->create(['role' => Role::TECNICO, 'is_active' => true]);
    }

    // ─── Auth ──────────────────────────────────────────────────────────────────

    /** @test */
    public function test_login_correcto_devuelve_token(): void
    {
        User::factory()->create([
            'email'     => 'tecnico@test.com',
            'password'  => bcrypt('secret123'),
            'role'      => Role::TECNICO,
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email'    => 'tecnico@test.com',
            'password' => 'secret123',
        ])
            ->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'role']);
    }

    /** @test */
    public function test_login_incorrecto_devuelve_error(): void
    {
        User::factory()->create([
            'email'     => 'tecnico@test.com',
            'password'  => bcrypt('secret123'),
            'is_active' => true,
        ]);

        $this->postJson('/api/login', [
            'email'    => 'tecnico@test.com',
            'password' => 'contraseña_incorrecta',
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /** @test */
    public function test_acceso_sin_token_devuelve_401(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }

    // ─── Documentos ────────────────────────────────────────────────────────────

    /** @test */
    public function test_admin_puede_subir_documento(): void
    {
        Queue::fake();
        Storage::fake();

        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/documents', [
                'title' => 'Manual de prueba',
                'file'  => UploadedFile::fake()->create('manual.pdf', 512, 'application/pdf'),
            ])
            ->assertStatus(201)
            ->assertJsonPath('title', 'Manual de prueba');
    }

    /** @test */
    public function test_tecnico_no_puede_subir_documento_devuelve_403(): void
    {
        $this->actingAs($this->tecnico(), 'sanctum')
            ->postJson('/api/documents', [
                'title' => 'Manual de prueba',
                'file'  => UploadedFile::fake()->create('manual.pdf', 512, 'application/pdf'),
            ])
            ->assertStatus(403);
    }

    // ─── Chat ──────────────────────────────────────────────────────────────────

    /** @test */
    public function test_tecnico_puede_acceder_al_chat(): void
    {
        $this->mock(RagService::class, function ($mock) {
            $mock->shouldReceive('query')
                ->once()
                ->andReturn([
                    'answer'  => 'Revisa el condensador de la fuente.',
                    'sources' => [],
                ]);
        });

        $this->actingAs($this->tecnico(), 'sanctum')
            ->postJson('/api/chat', ['question' => '¿Cómo reparo la fuente de alimentación?'])
            ->assertStatus(200)
            ->assertJsonStructure(['response', 'sources', 'interaction_id']);
    }

    /** @test */
    public function test_admin_no_puede_acceder_al_chat_devuelve_403(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->postJson('/api/chat', ['question' => '¿Cómo reparo la fuente de alimentación?'])
            ->assertStatus(403);
    }

    // ─── Stats ─────────────────────────────────────────────────────────────────

    /** @test */
    public function test_admin_puede_ver_stats(): void
    {
        $this->actingAs($this->admin(), 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertStatus(200)
            ->assertJsonStructure(['totals', 'tokens']);
    }

    /** @test */
    public function test_tecnico_no_puede_ver_stats_devuelve_403(): void
    {
        $this->actingAs($this->tecnico(), 'sanctum')
            ->getJson('/api/admin/stats')
            ->assertStatus(403);
    }
}
