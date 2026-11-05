<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Compras;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Compras\Acciones\ProcesarRecepcionOrdenCompraAction;
use App\Modulos\Compras\DTOs\RecepcionMercaderiaMuelleDTO;
use App\Modulos\Compras\DTOs\RegistrarOrdenCompraDTO;
use App\Modulos\Kardex\Estrategias\ValoracionPromedioPonderado;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Suite TDD — Sprint 4 (`feat/abastecimiento-recepcion`):
 * - Cálculo determinista de subtotal, impuestos y total en `RegistrarOrdenCompraDTO`.
 * - Recepción completa en muelle (`RECIBIDA_COMPLETA`) con generación automática de asiento `ENTRADA_COMPRA`
 *   y recálculo del Costo Promedio Ponderado / PEPS en el Kardex.
 * - Recepción parcial (`RECIBIDA_PARCIAL`) con unidades dañadas (`AVERIA_MUELLE`) y levantamiento automático
 *   de Acta de Discrepancia sin contaminar el stock con mercadería rechazada.
 * - Bloqueo de sobreentrega (`cantidad_recibida > cantidad_solicitada`) y aislamiento Cross-Tenant.
 */
class AbastecimientoRecepcionKardexTest extends TestCase
{
    private const TENANT_ALFA = '11111111-2222-4333-8444-555555555555';
    private const TENANT_BETA = '99999999-8888-4777-8666-555555555555';

    protected function setUp(): void
    {
        parent::setUp();
        ModeloBaseTenant::fijarTenantContexto(self::TENANT_ALFA);
    }

    protected function tearDown(): void
    {
        ModeloBaseTenant::fijarTenantContexto(null);
        parent::tearDown();
    }

    /**
     * @test
     */
    public function calcula_subtotal_impuestos_y_total_en_dto_de_orden_de_compra(): void
    {
        $dto = new RegistrarOrdenCompraDTO(
            tenantId: self::TENANT_ALFA,
            supplierId: 'prov-aceros-01',
            warehouseId: 'alm-central-01',
            numeroOrden: 'OC-2026-0118',
            renglones: [
                [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'cantidad_solicitada' => 20.0,
                    'precio_unitario' => 150.0, // 3,000.00
                ],
                [
                    'product_id' => 'prod-empaque-02',
                    'sku' => 'EMP-200-NBR',
                    'cantidad_solicitada' => 50.0,
                    'precio_unitario' => 20.0, // 1,000.00
                ],
            ],
            tasaImpuestoPorcentaje: 16.0,
            usuarioCreadorId: 'usr-comprador-01',
        );

        $this->assertSame(4000.0, $dto->subtotal);
        $this->assertSame(640.0, $dto->impuestos);
        $this->assertSame(4640.0, $dto->total);
    }

    /**
     * @test
     */
    public function procesa_recepcion_completa_en_muelle_y_genera_entrada_compra_en_kardex_con_promedio_ponderado(): void
    {
        $action = new ProcesarRecepcionOrdenCompraAction(new ValoracionPromedioPonderado());

        $estadoOrden = $this->crearEstadoOrdenBase(20.0, 150.0);

        // El almacén tenía previamente 10 unidades a $120.00 ($1,200.00)
        // Al ingresar 20 unidades a $150.00 ($3,000.00) -> nuevo saldo = 30 uds, valor = $4,200.00 -> CPP = $140.00
        $saldosPrevios = [
            'prod-ac-100' => [
                'cantidad_actual' => 10.0,
                'costo_unitario_actual' => 120.0,
            ],
        ];

        $dtoRecepcion = new RecepcionMercaderiaMuelleDTO(
            tenantId: self::TENANT_ALFA,
            purchaseOrderId: 'oc-uuid-0118',
            numeroOrden: 'OC-2026-0118',
            warehouseId: 'alm-central-01',
            referenciaRemisionProveedor: 'FAC-PROV-9981',
            renglonesRecibidos: [
                [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'cantidad_recibida_conforme' => 20.0,
                    'cantidad_averiada_rechazada' => 0.0,
                    'precio_unitario_factura' => 150.0,
                    'numero_lote' => 'LOTE-2026-089',
                ],
            ],
            usuarioReceptorId: 'usr-almacenista-01',
        );

        $resultado = $action->ejecutar($dtoRecepcion, $estadoOrden, $saldosPrevios);

        $this->assertSame('RECIBIDA_COMPLETA', $resultado['nuevo_estado_orden']);
        $this->assertFalse($resultado['tiene_discrepancias']);
        $this->assertCount(1, $resultado['asientos_kardex_generados']);

        $asiento = $resultado['asientos_kardex_generados'][0];
        $this->assertSame('ENTRADA_COMPRA', $asiento['tipo_movimiento']);
        $this->assertSame(20.0, $asiento['cantidad']);
        $this->assertSame(30.0, $asiento['saldo_cantidad']);
        $this->assertSame(140.0, $asiento['saldo_costo_unitario']);
        $this->assertSame(4200.0, $asiento['saldo_valor_total']);
    }

    /**
     * @test
     */
    public function registra_recepcion_parcial_con_averia_en_muelle_y_levanta_acta_de_discrepancia(): void
    {
        $action = new ProcesarRecepcionOrdenCompraAction(new ValoracionPromedioPonderado());
        $estadoOrden = $this->crearEstadoOrdenBase(20.0, 150.0);

        // Llegan 18 conformes y 2 averiadas/rechazadas en muelle
        $dtoRecepcion = new RecepcionMercaderiaMuelleDTO(
            tenantId: self::TENANT_ALFA,
            purchaseOrderId: 'oc-uuid-0118',
            numeroOrden: 'OC-2026-0118',
            warehouseId: 'alm-central-01',
            referenciaRemisionProveedor: 'REM-PROV-4410',
            renglonesRecibidos: [
                [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'cantidad_recibida_conforme' => 18.0,
                    'cantidad_averiada_rechazada' => 2.0,
                    'precio_unitario_factura' => 150.0,
                    'numero_lote' => 'LOTE-2026-090',
                ],
            ],
            usuarioReceptorId: 'usr-almacenista-01',
        );

        $resultado = $action->ejecutar($dtoRecepcion, $estadoOrden, []);

        $this->assertSame('RECIBIDA_PARCIAL', $resultado['nuevo_estado_orden']);
        $this->assertTrue($resultado['tiene_discrepancias']);
        // Solo las 18 unidades conformes deben entrar al Kardex
        $this->assertSame(18.0, $resultado['asientos_kardex_generados'][0]['cantidad']);
        $this->assertSame(2.0, $resultado['renglones_orden_actualizados']['prod-ac-100']['cantidad_pendiente']);

        $tiposDiscrepancia = array_column($resultado['acta_discrepancias'], 'tipo');
        $this->assertContains('AVERIA_MUELLE', $tiposDiscrepancia);
        $this->assertContains('ENTREGA_PARCIAL_FALTANTE', $tiposDiscrepancia);
    }

    /**
     * @test
     */
    public function bloquea_sobreentrega_por_encima_de_la_cantidad_solicitada_y_aisla_cross_tenant(): void
    {
        $action = new ProcesarRecepcionOrdenCompraAction(new ValoracionPromedioPonderado());
        $estadoOrden = $this->crearEstadoOrdenBase(20.0, 150.0);

        $dtoSobreentrega = new RecepcionMercaderiaMuelleDTO(
            tenantId: self::TENANT_ALFA,
            purchaseOrderId: 'oc-uuid-0118',
            numeroOrden: 'OC-2026-0118',
            warehouseId: 'alm-central-01',
            referenciaRemisionProveedor: 'REM-SOBRE-01',
            renglonesRecibidos: [
                [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'cantidad_recibida_conforme' => 25.0, // Excede las 20 solicitadas
                ],
            ],
            usuarioReceptorId: 'usr-almacenista-01',
        );

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Sobreentrega no autorizada para el SKU [AC-100-FLEX]');

        $action->ejecutar($dtoSobreentrega, $estadoOrden, []);
    }

    /**
     * @test
     */
    public function bloquea_recepcion_cross_tenant(): void
    {
        $action = new ProcesarRecepcionOrdenCompraAction(new ValoracionPromedioPonderado());
        $estadoOrden = $this->crearEstadoOrdenBase(20.0, 150.0);

        $dtoCrossTenant = new RecepcionMercaderiaMuelleDTO(
            tenantId: self::TENANT_BETA,
            purchaseOrderId: 'oc-uuid-0118',
            numeroOrden: 'OC-2026-0118',
            warehouseId: 'alm-central-01',
            referenciaRemisionProveedor: 'REM-INTRUSO',
            renglonesRecibidos: [
                [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'cantidad_recibida_conforme' => 10.0,
                ],
            ],
            usuarioReceptorId: 'usr-intruso',
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Violación de aislamiento Multi-Tenant al procesar recepción de Orden de Compra');

        $action->ejecutar($dtoCrossTenant, $estadoOrden, []);
    }

    /**
     * @return array<string, mixed>
     */
    private function crearEstadoOrdenBase(float $cantidadSolicitada, float $precioPactado): array
    {
        return [
            'id' => 'oc-uuid-0118',
            'tenant_id' => self::TENANT_ALFA,
            'numero_orden' => 'OC-2026-0118',
            'warehouse_id' => 'alm-central-01',
            'estado' => 'ENVIADA',
            'renglones' => [
                'prod-ac-100' => [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'cantidad_solicitada' => $cantidadSolicitada,
                    'cantidad_recibida_previa' => 0.0,
                    'precio_unitario_pactado' => $precioPactado,
                ],
            ],
        ];
    }
}
