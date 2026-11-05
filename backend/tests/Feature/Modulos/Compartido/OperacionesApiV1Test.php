<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Compartido;

use App\Modulos\AuditoriaConteos\Acciones\AplicarAjusteInventarioKardexAction;
use App\Modulos\AuditoriaConteos\Servicios\ReconciliadorSincronizacionOfflineService;
use App\Modulos\Catalogo\Servicios\CalculadoraPreciosImpuestosService;
use App\Modulos\Compartido\Controladores\OperacionesApiV1Controller;
use App\Modulos\FacturacionCaja\Servicios\GestorFacturacionArqueoCajaService;
use App\Modulos\Lotes\Servicios\PlanificadorDespachoFefoService;
use App\Modulos\Tenants\Servicios\GobernanzaSaasReportesService;
use PHPUnit\Framework\TestCase;

/**
 * Suite TDD Sprint 10: Controlador Delgado API REST v1 y Contratos Multi-Tenant.
 */
final class OperacionesApiV1Test extends TestCase
{
    private OperacionesApiV1Controller $controlador;
    private string $tenantId = '01950000-0000-7000-8000-000000000001';

    protected function setUp(): void
    {
        parent::setUp();
        $this->controlador = new OperacionesApiV1Controller(
            gobernanzaService: new GobernanzaSaasReportesService(),
            reconciliadorOfflineService: new ReconciliadorSincronizacionOfflineService(),
            facturacionCajaService: new GestorFacturacionArqueoCajaService(),
            preciosImpuestosService: new CalculadoraPreciosImpuestosService(),
            ajusteKardexAction: new AplicarAjusteInventarioKardexAction(),
            planificadorFefoService: new PlanificadorDespachoFefoService(),
        );
    }

    public function test_endpoint_estado_salud_reporta_78_pantallas_y_155_pngs(): void
    {
        $respuesta = $this->controlador->estadoSalud($this->tenantId);

        self::assertSame('OPERATIVO', $respuesta['estado']);
        self::assertSame('v1.10.0', $respuesta['version_api']);
        self::assertSame($this->tenantId, $respuesta['tenant_id']);
        self::assertSame(78, $respuesta['pantallas_figma_integradas']);
        self::assertSame(155, $respuesta['pngs_verificados']);
    }

    public function test_endpoint_api_actualiza_plan_suscripcion_y_sincroniza_lote_offline(): void
    {
        $suscripcion = $this->controlador->actualizarPlanSuscripcion([
            'tenant_id' => $this->tenantId,
            'nombre_plan' => 'Pro',
            'estado_membresia' => 'Activa',
            'usuarios_actuales' => 8,
            'bodegas_actuales' => 4,
            'productos_actuales' => 12000,
            'actor_usuario_id' => 'usr-superadmin-01',
        ]);

        self::assertSame('Pro', $suscripcion['plan_activo']);
        self::assertSame(179900, $suscripcion['precio_mensual_cop']);
        self::assertTrue($suscripcion['permite_carga_masiva_csv']);

        $sincronizacion = $this->controlador->sincronizarColaOffline([
            'tenant_id' => $this->tenantId,
            'cola_operaciones' => [
                [
                    'idempotency_key' => 'op-api-001',
                    'tenant_id' => $this->tenantId,
                    'tipo_operacion' => 'CONTEO_FISICO',
                    'sku' => 'SKU-API-01',
                    'delta_cantidad' => -3,
                    'updated_at_cliente' => '2026-06-15T12:00:00-05:00',
                ],
            ],
            'estado_servidor_por_sku' => [
                'SKU-API-01' => [
                    'stock_actual' => 40,
                    'updated_at_servidor' => '2026-06-15T11:30:00-05:00',
                    'tenant_id' => $this->tenantId,
                ],
            ],
        ]);

        self::assertSame(1, $sincronizacion['aplicadas']);
        self::assertSame(0, $sincronizacion['conflictos']);
        self::assertSame(37, $sincronizacion['estado_servidor_actualizado']['SKU-API-01']['stock_actual']);
    }
}
