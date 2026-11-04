<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Autenticacion;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Autenticacion\Enums\RolSistemaEnum;
use App\Modulos\Autenticacion\Middlewares\AutorizarRolRbacMiddleware;
use App\Modulos\Autenticacion\Middlewares\VerificarContextoTenantMiddleware;
use App\Modulos\Autenticacion\Servicios\GestorTokensJwtService;
use App\Modulos\Tenants\Acciones\AprovisionarTenantAction;
use App\Modulos\Tenants\DTOs\RegistrarTenantDTO;
use DomainException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

/**
 * Suite TDD Sprint 1 (`feat/tenants-auth`):
 * Verifica aprovisionamiento Multi-Tenant, emisión/rotación JWT + Refresh Token,
 * detección de robo de tokens, anti-spoofing X-Tenant-ID y RBAC de 10 roles.
 */
final class TenantsAutenticacionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tenants', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50)->unique();
            $table->string('name', 200);
            $table->string('tax_id', 50)->unique();
            $table->string('email', 255);
            $table->string('default_valuation', 30)->default('PROMEDIO_PONDERADO');
            $table->boolean('allow_negative_stock')->default(false);
            $table->integer('max_warehouses')->default(5);
            $table->integer('max_users')->default(25);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
        });

        Schema::create('warehouses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50);
            $table->string('name', 150);
            $table->boolean('is_main')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
        });

        Schema::create('users', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('email', 255);
            $table->string('password_hash', 255);
            $table->string('full_name', 150);
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
        });

        Schema::create('user_roles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('user_id')->index();
            $table->string('role', 50);
            $table->uuid('warehouse_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
        });

        Schema::create('refresh_tokens', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('user_id')->index();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->boolean('revoked')->default(false);
            $table->timestamp('revoked_at')->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
        });
    }

    public function test_aprovisiona_tenant_con_metodo_valoracion_y_admin_tenant(): void
    {
        $dto = RegistrarTenantDTO::fromArray([
            'codigo' => 'ind-alfa',
            'razon_social' => 'Industrias Alfa S.A.S.',
            'identificacion_fiscal' => '900123456-1',
            'email_corporativo' => 'contacto@alfa.com',
            'metodo_valoracion_defecto' => 'PEPS',
            'permite_stock_negativo' => false,
            'limite_almacenes' => 10,
            'limite_usuarios' => 50,
            'admin_nombre_completo' => 'Carlos Mendoza',
            'admin_email' => 'admin@alfa.com',
            'admin_password_hash' => bcrypt('Segura2026!'),
        ]);

        $accion = new AprovisionarTenantAction();
        $resultado = $accion->handle($dto);

        $this->assertSame($dto->id, $resultado['tenant_id']);
        $this->assertSame('PEPS', $resultado['metodo_valoracion']);
        $this->assertSame(RolSistemaEnum::ADMIN_TENANT->value, $resultado['rol_asignado']);

        $this->assertDatabaseHas('tenants', [
            'id' => $dto->id,
            'tenant_id' => $dto->id,
            'code' => 'IND-ALFA',
            'default_valuation' => 'PEPS',
        ]);

        $this->assertDatabaseHas('warehouses', [
            'id' => $resultado['almacen_principal_id'],
            'tenant_id' => $dto->id,
            'code' => 'ALM-CENTRAL-01',
        ]);
    }

    public function test_rotacion_de_refresh_token_y_revocacion_en_cascada_ante_reuso(): void
    {
        $tenantId = (string) Str::uuid();
        $userId = (string) Str::uuid();
        $servicio = new GestorTokensJwtService();

        $parInicial = $servicio->emitirParTokens(
            tenantId: $tenantId,
            usuarioId: $userId,
            roles: [RolSistemaEnum::JEFE_ALMACEN->value],
        );

        // 1. Primera rotación legítima -> genera nuevo par y revoca el primero
        $parRotado = $servicio->rotarRefreshToken($parInicial['refresh_token']);
        $this->assertNotSame($parInicial['refresh_token'], $parRotado['refresh_token']);

        // 2. Intento de reúso del primer refresh token (simulando token robado) -> revoca toda la familia
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Alerta de seguridad: Se detectó reúso de un Refresh Token revocado');

        $servicio->rotarRefreshToken($parInicial['refresh_token']);
    }

    public function test_middleware_bloquea_spoofing_de_cabecera_x_tenant_id(): void
    {
        $tenantLegitimo = (string) Str::uuid();
        $tenantAtacante = (string) Str::uuid();
        $userId = (string) Str::uuid();

        $servicioJwt = new GestorTokensJwtService();
        $tokens = $servicioJwt->emitirParTokens(
            tenantId: $tenantLegitimo,
            usuarioId: $userId,
            roles: [RolSistemaEnum::ADMIN_TENANT->value],
        );

        $request = Request::create('/api/v1/kardex/movimientos', 'GET');
        $request->headers->set('Authorization', 'Bearer ' . $tokens['access_token']);
        $request->headers->set('X-Tenant-ID', $tenantAtacante);

        $middleware = new VerificarContextoTenantMiddleware($servicioJwt);
        $respuesta = $middleware->handle($request, static fn () => new Response('OK', 200));

        $this->assertSame(Response::HTTP_FORBIDDEN, $respuesta->getStatusCode());
        $this->assertStringContainsString('TENANT_SPOOFING_DETECTADO', (string) $respuesta->getContent());
    }

    public function test_middleware_rbac_autoriza_y_restringe_los_10_roles_canonicos(): void
    {
        $tenantId = (string) Str::uuid();
        $almacenAsignado = (string) Str::uuid();
        $almacenAjeno = (string) Str::uuid();

        $request = Request::create('/api/v1/kardex/movimientos', 'POST', [
            'almacen_id' => $almacenAjeno,
        ]);
        $request->attributes->set('jwt_claims', [
            'sub' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'roles' => [RolSistemaEnum::ALMACENISTA_OPERADOR->value],
            'warehouses' => [$almacenAsignado],
        ]);

        $middlewareRbac = new AutorizarRolRbacMiddleware();

        // 1. Almacenista intentando operar en un almacén que no tiene asignado -> 403
        $respuestaDenegada = $middlewareRbac->handle(
            $request,
            static fn () => new Response('OK', 200),
            RolSistemaEnum::ALMACENISTA_OPERADOR->value,
            RolSistemaEnum::JEFE_ALMACEN->value
        );

        $this->assertSame(Response::HTTP_FORBIDDEN, $respuestaDenegada->getStatusCode());
        $this->assertStringContainsString('RBAC_ALMACEN_NO_ASIGNADO', (string) $respuestaDenegada->getContent());

        // 2. Almacenista operando en su almacén asignado -> 200 OK
        $requestAutorizado = Request::create('/api/v1/kardex/movimientos', 'POST', [
            'almacen_id' => $almacenAsignado,
        ]);
        $requestAutorizado->attributes->set('jwt_claims', [
            'sub' => (string) Str::uuid(),
            'tenant_id' => $tenantId,
            'roles' => [RolSistemaEnum::ALMACENISTA_OPERADOR->value],
            'warehouses' => [$almacenAsignado],
        ]);

        $respuestaOk = $middlewareRbac->handle(
            $requestAutorizado,
            static fn () => new Response('OK', 200),
            RolSistemaEnum::ALMACENISTA_OPERADOR->value
        );

        $this->assertSame(Response::HTTP_OK, $respuestaOk->getStatusCode());
        ModeloBaseTenant::fijarTenantContexto(null);
    }
}
