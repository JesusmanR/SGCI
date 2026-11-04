<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Kardex;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Kardex\DTOs\RegistrarMovimientoDTO;
use App\Modulos\Kardex\Estrategias\StockInsuficienteException;
use App\Modulos\Kardex\Estrategias\ValoracionPeps;
use App\Modulos\Kardex\Estrategias\ValoracionPromedioPonderado;
use App\Modulos\Kardex\Observadores\MovimientoKardexObserver;
use App\Modulos\Kardex\Observadores\StockCriticoDetectadoEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Modelo auxiliar para pruebas de aislamiento de ModeloBaseTenant.
 */
class ProductoPruebaTenant extends ModeloBaseTenant
{
    protected $table = 'productos';
    protected $guarded = [];
}

/**
 * Modelo auxiliar para simular el modelo de MovimientoKardex.
 */
class MovimientoKardexPrueba extends ModeloBaseTenant
{
    protected $table = 'movimientos_kardex';
    protected $guarded = [];
}

/**
 * Suite TDD para el módulo de Kardex, valoración de inventario,
 * aislamiento multi-tenant y reactividad por WebSockets.
 */
class MovimientoKardexTest extends TestCase
{
    use RefreshDatabase;

    private string $tenantA;
    private string $tenantB;
    private string $almacenId;
    private string $productoId;
    private string $usuarioId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = (string) Str::uuid();
        $this->tenantB = (string) Str::uuid();
        $this->almacenId = (string) Str::uuid();
        $this->productoId = (string) Str::uuid();
        $this->usuarioId = (string) Str::uuid();

        $this->crearEsquemasDePrueba();
    }

    /**
     * Crea las tablas en memoria necesarias para la suite TDD.
     */
    private function crearEsquemasDePrueba(): void
    {
        Schema::dropIfExists('existencias_almacen');
        Schema::dropIfExists('capas_inventario');
        Schema::dropIfExists('movimientos_kardex');
        Schema::dropIfExists('productos');
        Schema::dropIfExists('almacenes');

        Schema::create('almacenes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('nombre');
            $table->string('created_by')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('productos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('sku')->index();
            $table->string('nombre');
            $table->decimal('stock_minimo', 14, 4)->default(10.0);
            $table->decimal('punto_reorden', 14, 4)->default(20.0);
            $table->string('created_by')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('existencias_almacen', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('almacen_id')->index();
            $table->uuid('producto_id')->index();
            $table->uuid('lote_id')->nullable()->index();
            $table->decimal('cantidad_disponible', 14, 4)->default(0.0);
            $table->decimal('cantidad_reservada', 14, 4)->default(0.0);
            $table->decimal('costo_promedio', 14, 4)->default(0.0);
            $table->decimal('valor_total', 14, 4)->default(0.0);
            $table->string('created_by')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('capas_inventario', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('almacen_id')->index();
            $table->uuid('producto_id')->index();
            $table->uuid('lote_id')->nullable()->index();
            $table->dateTime('fecha_ingreso');
            $table->decimal('saldo_remanente', 14, 4)->default(0.0);
            $table->decimal('costo_unitario', 14, 4)->default(0.0);
            $table->string('created_by')->nullable();
            $table->string('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('movimientos_kardex', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('almacen_id')->index();
            $table->uuid('producto_id')->index();
            $table->uuid('lote_id')->nullable()->index();
            $table->string('tipo_movimiento');
            $table->decimal('cantidad', 14, 4);
            $table->decimal('costo_unitario', 14, 4);
            $table->decimal('costo_total', 14, 4);
            $table->string('referencia_documento')->nullable();
            $table->text('observacion')->nullable();
            $table->string('created_by');
            $table->string('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * 1. Verifica el aislamiento estricto por tenant_id mediante Global Scope de ModeloBaseTenant.
     */
    public function test_aislamiento_estricto_por_tenant_id(): void
    {
        // Insertar producto para Tenant A
        ModeloBaseTenant::fijarTenantContexto($this->tenantA);
        $prodA = ProductoPruebaTenant::create([
            'sku' => 'SKU-A-001',
            'nombre' => 'Producto Tenant A',
            'created_by' => $this->usuarioId,
        ]);

        // Insertar producto para Tenant B
        ModeloBaseTenant::fijarTenantContexto($this->tenantB);
        $prodB = ProductoPruebaTenant::create([
            'sku' => 'SKU-B-001',
            'nombre' => 'Producto Tenant B',
            'created_by' => $this->usuarioId,
        ]);

        // Consulta bajo contexto Tenant A
        ModeloBaseTenant::fijarTenantContexto($this->tenantA);
        $productosEnA = ProductoPruebaTenant::all();

        $this->assertCount(1, $productosEnA);
        $this->assertEquals($prodA->id, $productosEnA->first()->id);
        $this->assertEquals($this->tenantA, $productosEnA->first()->tenant_id);

        // Intentar buscar el producto de Tenant B mientras el contexto es Tenant A
        $intentoBuscarB = ProductoPruebaTenant::find($prodB->id);
        $this->assertNull($intentoBuscarB, 'Tenant A no debe tener visibilidad del registro del Tenant B.');

        // Consulta bajo contexto Tenant B
        ModeloBaseTenant::fijarTenantContexto($this->tenantB);
        $productosEnB = ProductoPruebaTenant::all();

        $this->assertCount(1, $productosEnB);
        $this->assertEquals($prodB->id, $productosEnB->first()->id);
    }

    /**
     * 2. Verifica el cálculo exacto de valoración bajo Costo Promedio Ponderado (CPP).
     */
    public function test_calculo_valoracion_costo_promedio_ponderado(): void
    {
        // Escenario:
        // Entrada 1: 100 unidades a $10.00 = $1,000.00
        // Entrada 2: 50 unidades a $16.00 = $800.00
        // Saldo Acumulado: 150 unidades por $1,800.00 => CPP = $12.00 / unidad.
        DB::table('existencias_almacen')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'cantidad_disponible' => 150.0,
            'costo_promedio' => 12.00,
            'valor_total' => 1800.00,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $estrategia = new ValoracionPromedioPonderado();
        $this->assertEquals('PROMEDIO_PONDERADO', $estrategia->obtenerNombre());

        // Solicitamos una salida de 60 unidades
        $resultado = $estrategia->calcularCostoSalida(
            tenantId: $this->tenantA,
            almacenId: $this->almacenId,
            productoId: $this->productoId,
            cantidadSalida: 60.0
        );

        // 60 unidades * $12.00 = $720.00
        $this->assertEquals(12.00, $resultado->costoUnitario);
        $this->assertEquals(720.00, $resultado->costoTotal);
        $this->assertCount(1, $resultado->capasConsumidas);

        $valoracionRestante = $estrategia->calcularValoracionExistencias(
            $this->tenantA,
            $this->almacenId,
            $this->productoId
        );
        $this->assertEquals(1800.00, $valoracionRestante);
    }

    /**
     * 3. Verifica el cálculo exacto de valoración bajo el método PEPS (FIFO).
     */
    public function test_calculo_valoracion_peps(): void
    {
        // Capa 1 (Antigua): 100 unidades a $10.00 = $1,000.00
        $capa1Id = (string) Str::uuid();
        DB::table('capas_inventario')->insert([
            'id' => $capa1Id,
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'fecha_ingreso' => now()->subDays(5),
            'saldo_remanente' => 100.0,
            'costo_unitario' => 10.00,
            'created_at' => now()->subDays(5),
            'updated_at' => now()->subDays(5),
        ]);

        // Capa 2 (Reciente): 50 unidades a $15.00 = $750.00
        $capa2Id = (string) Str::uuid();
        DB::table('capas_inventario')->insert([
            'id' => $capa2Id,
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'fecha_ingreso' => now()->subDays(1),
            'saldo_remanente' => 50.0,
            'costo_unitario' => 15.00,
            'created_at' => now()->subDays(1),
            'updated_at' => now()->subDays(1),
        ]);

        $estrategiaPeps = new ValoracionPeps();
        $this->assertEquals('PEPS', $estrategiaPeps->obtenerNombre());

        // Salida de 120 unidades: Debe consumir 100 unidades a $10 (Capa 1) + 20 unidades a $15 (Capa 2)
        // Costo Total = 1000 + 300 = $1,300.00
        // Costo Unitario Ponderado = 1300 / 120 = 10.8333
        $resultado = $estrategiaPeps->calcularCostoSalida(
            tenantId: $this->tenantA,
            almacenId: $this->almacenId,
            productoId: $this->productoId,
            cantidadSalida: 120.0
        );

        $this->assertEquals(1300.00, $resultado->costoTotal);
        $this->assertEquals(round(1300.00 / 120.0, 4), $resultado->costoUnitario);
        $this->assertCount(2, $resultado->capasConsumidas);

        $this->assertEquals($capa1Id, $resultado->capasConsumidas[0]['capa_id']);
        $this->assertEquals(100.0, $resultado->capasConsumidas[0]['cantidad']);
        $this->assertEquals(10.00, $resultado->capasConsumidas[0]['costo_unitario']);

        $this->assertEquals($capa2Id, $resultado->capasConsumidas[1]['capa_id']);
        $this->assertEquals(20.0, $resultado->capasConsumidas[1]['cantidad']);
        $this->assertEquals(15.00, $resultado->capasConsumidas[1]['costo_unitario']);
    }

    /**
     * 4. Verifica el disparo reactivo del evento StockCriticoDetectadoEvent vía WebSockets.
     */
    public function test_disparo_de_alerta_stock_critico_en_tiempo_real(): void
    {
        Event::fake([StockCriticoDetectadoEvent::class]);

        // Registrar Producto con Stock Mínimo = 20.0 y Punto Reorden = 30.0
        DB::table('productos')->insert([
            'id' => $this->productoId,
            'tenant_id' => $this->tenantA,
            'sku' => 'SKU-TERM-01',
            'nombre' => 'Termostato Digital Industrial',
            'stock_minimo' => 20.0,
            'punto_reorden' => 30.0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('almacenes')->insert([
            'id' => $this->almacenId,
            'tenant_id' => $this->tenantA,
            'nombre' => 'Almacén Central Madrid',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Stock inicial = 25.0 unidades (por debajo del punto de reorden pero sobre el mínimo)
        DB::table('existencias_almacen')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'lote_id' => null,
            'cantidad_disponible' => 25.0,
            'costo_promedio' => 50.0,
            'valor_total' => 1250.0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Se registra una salida de 10 unidades => Nuevo stock = 15.0 (Cae por debajo de stock_minimo = 20.0)
        $movimiento = new MovimientoKardexPrueba([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'lote_id' => null,
            'tipo_movimiento' => 'SALIDA_VENTA',
            'cantidad' => 10.0,
            'costo_unitario' => 50.0,
            'costo_total' => 500.0,
            'created_by' => $this->usuarioId,
        ]);

        $observer = new MovimientoKardexObserver();
        $observer->created($movimiento);

        // Verificar que la existencia se redujo a 15.0
        $existenciaActual = DB::table('existencias_almacen')
            ->where('tenant_id', '=', $this->tenantA)
            ->where('producto_id', '=', $this->productoId)
            ->first();

        $this->assertEquals(15.0, (float) $existenciaActual->cantidad_disponible);

        // Verificar que el evento WebSocket fue emitido con los canales y severidad correctos
        Event::assertDispatched(StockCriticoDetectadoEvent::class, function (StockCriticoDetectadoEvent $event): bool {
            $canales = array_map(fn($c) => $c->name, $event->broadcastOn());

            $canalAlmacenEsperado = sprintf('private-tenant.%s.almacen.%s', $this->tenantA, $this->almacenId);
            $canalAlertasEsperado = sprintf('private-tenant.%s.alertas', $this->tenantA);

            $this->assertContains($canalAlmacenEsperado, $canales);
            $this->assertContains($canalAlertasEsperado, $canales);
            $this->assertEquals(15.0, $event->stockActual);
            $this->assertEquals(20.0, $event->stockMinimo);
            $this->assertEquals('CRITICO', $event->nivelSeveridad);
            $this->assertEquals('stock.critico.detectado', $event->broadcastAs());

            return true;
        });
    }

    /**
     * 5. Verifica el bloqueo y excepción al solicitar salidas con stock insuficiente.
     */
    public function test_bloqueo_de_salidas_sin_stock_suficiente(): void
    {
        // Stock disponible = 10.0 unidades
        DB::table('existencias_almacen')->insert([
            'id' => (string) Str::uuid(),
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'cantidad_disponible' => 10.0,
            'costo_promedio' => 25.0,
            'valor_total' => 250.0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $estrategia = new ValoracionPromedioPonderado();

        $this->expectException(StockInsuficienteException::class);
        $this->expectExceptionMessage('No hay existencias suficientes');

        // Intento de egreso de 15.0 unidades (solo hay 10.0)
        $estrategia->calcularCostoSalida(
            tenantId: $this->tenantA,
            almacenId: $this->almacenId,
            productoId: $this->productoId,
            cantidadSalida: 15.0
        );
    }

    /**
     * 6. Valida la integridad y restricciones del DTO RegistrarMovimientoDTO.
     */
    public function test_validacion_de_integridad_en_registrar_movimiento_dto(): void
    {
        $dtoValido = RegistrarMovimientoDTO::fromArray([
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'tipo_movimiento' => 'ENTRADA_COMPRA',
            'cantidad' => 100.0,
            'costo_unitario' => 15.5,
            'created_by' => $this->usuarioId,
        ]);

        $this->assertTrue($dtoValido->esEntrada());
        $this->assertFalse($dtoValido->esSalida());
        $this->assertEquals(1550.0, $dtoValido->toArray()['costo_total']);

        // Cantidad negativa o cero debe fallar
        $this->expectException(\InvalidArgumentException::class);
        RegistrarMovimientoDTO::fromArray([
            'tenant_id' => $this->tenantA,
            'almacen_id' => $this->almacenId,
            'producto_id' => $this->productoId,
            'tipo_movimiento' => 'SALIDA_VENTA',
            'cantidad' => 0.0,
            'costo_unitario' => 10.0,
            'created_by' => $this->usuarioId,
        ]);
    }
}
