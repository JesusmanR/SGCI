<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\AuditoriaConteos;

use App\Modulos\AuditoriaConteos\Servicios\ReconciliadorSincronizacionOfflineService;
use DomainException;
use PHPUnit\Framework\TestCase;

/**
 * Suite TDD del Sprint 9 (feat/pwa-offline-indexeddb-sync).
 * Verifica la cola Offline-First, idempotencia por UUID, resolución de conflictos por updated_at
 * y aislamiento Multi-Tenant (Pantallas Figma 55-estado-error y 59-conexion-restablecida).
 */
final class SincronizacionOfflinePwaTest extends TestCase
{
    private const TENANT_A = '11111111-1111-4111-8111-111111111111';
    private const TENANT_B = '22222222-2222-4222-8222-222222222222';

    public function test_drena_cola_offline_garantizando_idempotencia_y_detectando_conflictos_por_updated_at(): void
    {
        $servicio = new ReconciliadorSincronizacionOfflineService();

        $estadoServidor = [
            'PRD-001' => [
                'stock_actual' => 20,
                'updated_at_servidor' => '2026-11-05T08:00:00Z',
                'tenant_id' => self::TENANT_A,
            ],
            'PRD-002' => [
                'stock_actual' => 10,
                'updated_at_servidor' => '2026-11-05T09:00:00Z',
                'tenant_id' => self::TENANT_A,
            ],
        ];

        $cola = [
            // 1. Operación válida posterior al timestamp del servidor
            [
                'idempotency_key' => 'op-uuid-001',
                'tenant_id' => self::TENANT_A,
                'tipo_operacion' => 'CONTEO_FISICO_CIEGO',
                'sku' => 'PRD-001',
                'delta_cantidad' => -3,
                'updated_at_cliente' => '2026-11-05T08:15:00Z',
            ],
            // 2. Reintento duplicado con la misma idempotency_key (debe omitirse sin descontar dos veces)
            [
                'idempotency_key' => 'op-uuid-001',
                'tenant_id' => self::TENANT_A,
                'tipo_operacion' => 'CONTEO_FISICO_CIEGO',
                'sku' => 'PRD-001',
                'delta_cantidad' => -3,
                'updated_at_cliente' => '2026-11-05T08:15:00Z',
            ],
            // 3. Conflicto de marca temporal: updated_at_cliente (08:30) es anterior a updated_at_servidor (09:00)
            [
                'idempotency_key' => 'op-uuid-002',
                'tenant_id' => self::TENANT_A,
                'tipo_operacion' => 'COBRO_POS_OFFLINE',
                'sku' => 'PRD-002',
                'delta_cantidad' => -2,
                'updated_at_cliente' => '2026-11-05T08:30:00Z',
            ],
        ];

        $resultado = $servicio->sincronizarLoteOffline(self::TENANT_A, $cola, $estadoServidor);

        self::assertSame(1, $resultado['aplicadas']);
        self::assertSame(1, $resultado['omitidas_idempotencia']);
        self::assertSame(1, $resultado['conflictos']);
        self::assertSame(17, $resultado['estado_servidor_actualizado']['PRD-001']['stock_actual']);
        self::assertSame(10, $resultado['estado_servidor_actualizado']['PRD-002']['stock_actual']);
    }

    public function test_bloquea_sincronizacion_offline_con_operaciones_cross_tenant(): void
    {
        $servicio = new ReconciliadorSincronizacionOfflineService();

        $cola = [
            [
                'idempotency_key' => 'op-uuid-999',
                'tenant_id' => self::TENANT_B,
                'tipo_operacion' => 'CONTEO_FISICO_CIEGO',
                'sku' => 'PRD-001',
                'delta_cantidad' => -1,
                'updated_at_cliente' => '2026-11-05T08:15:00Z',
            ],
        ];

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Violación Multi-Tenant');

        $servicio->sincronizarLoteOffline(self::TENANT_A, $cola, []);
    }
}
