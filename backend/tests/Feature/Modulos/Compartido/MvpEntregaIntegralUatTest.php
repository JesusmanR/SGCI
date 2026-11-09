<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Compartido;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\AuditoriaConteos\Acciones\AplicarAjusteInventarioKardexAction;
use App\Modulos\AuditoriaConteos\DTOs\RegistrarAjusteInventarioDTO;
use App\Modulos\Autenticacion\Servicios\RestablecerContrasenaTokenService;
use App\Modulos\Catalogo\Acciones\RegistrarProductoCatalogoAction;
use App\Modulos\Catalogo\DTOs\RegistrarProductoDTO;
use App\Modulos\Catalogo\Servicios\ValidadorCodigoBarrasService;
use App\Modulos\Compras\Acciones\ProcesarRecepcionOrdenCompraAction;
use App\Modulos\Compras\DTOs\RecepcionMercaderiaMuelleDTO;
use App\Modulos\Compras\DTOs\RegistrarOrdenCompraDTO;
use App\Modulos\Kardex\Estrategias\ValoracionPromedioPonderado;
use App\Modulos\Kardex\Servicios\AnaliticaValoracionAbcService;
use App\Modulos\Lotes\Modelos\LoteProducto;
use App\Modulos\Lotes\Servicios\PlanificadorDespachoFefoService;
use DateTimeImmutable;
use DomainException;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Suite TDD de Integración End-to-End para Aceptación de Usuario del MVP v1.12.0 (UAT).
 *
 * Ejecuta y valida el ciclo de vida operativo completo Multi-Tenant de extremo a extremo:
 * 1. Catálogo Maestro: Alta de producto perecedero con trazabilidad de lotes y semáforo de existencias.
 * 2. Abastecimiento y Muelle: Registro de Orden de Compra y cotejo físico con acta de recepción en muelle.
 * 3. Kardex Inmutable: Asientos contables de entrada con recálculo dinámico de Costo Promedio Ponderado.
 * 4. Despacho Inteligente FEFO: Asignación prioritaria por fecha de caducidad y omisión de lotes vencidos.
 * 5. Auditoría de Conteo Ciego: Conciliación física y exigencia de Doble Firma ante desviaciones de alto impacto.
 * 6. Analítica Patrimonial Pareto ABC: Clasificación patrimonial A-B-C y comparativa de valoraciones contables.
 * 7. Seguridad y Recuperación: Emisión de token SHA-256 de un solo uso y rotación segura de contraseñas.
 * 8. Blindaje Multi-Tenant Transversal: Garantía Fail-Closed e intercepción de cualquier intrusión Cross-Tenant.
 */
final class MvpEntregaIntegralUatTest extends TestCase
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
    public function test_flujo_integral_e2e_mvp_uat_ciclo_operativo_completo(): void
    {
        // =========================================================================
        // FASE 1: Catálogo Maestro Multi-Tenant (Producto Perecedero con Lotes)
        // =========================================================================
        $validadorCodigo = new ValidadorCodigoBarrasService();
        $actionCatalogo = new RegistrarProductoCatalogoAction($validadorCodigo);

        $dtoProducto = new RegistrarProductoDTO(
            tenantId: self::TENANT_ALFA,
            categoryId: 'cat-reactivos-lab',
            unitOfMeasureId: 'uom-frasco-500ml',
            sku: 'REACT-UAT-500',
            name: 'Reactivo Bioquímico Grado Analítico 500ml',
            barcode: null,
            description: 'Reactivo sensible para análisis clínicos de control de calidad',
            metodoValoracion: 'PROMEDIO_PONDERADO',
            stockMinimo: 20.0,
            puntoReorden: 40.0,
            stockMaximo: 200.0,
            manejaLotes: true,
            perecedero: true,
            usuarioCreadorId: 'usr-jefe-catalogo-01',
        );

        $producto = $actionCatalogo->ejecutar($dtoProducto, [], 77);

        self::assertSame(self::TENANT_ALFA, $producto->tenant_id);
        self::assertSame('REACT-UAT-500', $producto->sku);
        self::assertNotNull($producto->barcode);
        self::assertTrue($validadorCodigo->esEan13Valido($producto->barcode));
        self::assertSame('CRITICO', $producto->evaluarNivelStock(15.0));
        self::assertSame('REORDEN', $producto->evaluarNivelStock(35.0));
        self::assertSame('OPTIMO', $producto->evaluarNivelStock(100.0));
        self::assertSame('SOBREINVENTARIO', $producto->evaluarNivelStock(220.0));

        // =========================================================================
        // FASE 2: Orden de Compra y Recepción en Muelle (Abastecimiento)
        // =========================================================================
        $dtoOrdenCompra = new RegistrarOrdenCompraDTO(
            tenantId: self::TENANT_ALFA,
            supplierId: 'prov-quimicos-global',
            warehouseId: 'alm-central-mty',
            numeroOrden: 'OC-2026-UAT-001',
            renglones: [
                [
                    'product_id' => $producto->id,
                    'sku' => 'REACT-UAT-500',
                    'cantidad_solicitada' => 50.0,
                    'precio_unitario' => 120.0, // Subtotal: 6,000.00
                ],
            ],
            tasaImpuestoPorcentaje: 16.0,
            usuarioCreadorId: 'usr-comprador-abastecimiento',
        );

        self::assertSame(6000.0, $dtoOrdenCompra->subtotal);
        self::assertSame(960.0, $dtoOrdenCompra->impuestos);
        self::assertSame(6960.0, $dtoOrdenCompra->total);

        $estadoOrdenCompra = [
            'id' => 'oc-id-uat-001',
            'tenant_id' => self::TENANT_ALFA,
            'numero_orden' => 'OC-2026-UAT-001',
            'warehouse_id' => 'alm-central-mty',
            'estado' => 'ENVIADA',
            'renglones' => [
                $producto->id => [
                    'product_id' => $producto->id,
                    'sku' => 'REACT-UAT-500',
                    'cantidad_solicitada' => 50.0,
                    'cantidad_recibida_previa' => 0.0,
                    'precio_unitario_pactado' => 120.0,
                ],
            ],
        ];

        // El almacén posee saldo previo: 10 unidades valorizadas a $100.00 c/u ($1,000.00)
        $saldosPreviosAlmacen = [
            $producto->id => [
                'cantidad_actual' => 10.0,
                'costo_unitario_actual' => 100.0,
            ],
        ];

        $actionRecepcion = new ProcesarRecepcionOrdenCompraAction(new ValoracionPromedioPonderado());

        $dtoRecepcionMuelle = new RecepcionMercaderiaMuelleDTO(
            tenantId: self::TENANT_ALFA,
            purchaseOrderId: 'oc-id-uat-001',
            numeroOrden: 'OC-2026-UAT-001',
            warehouseId: 'alm-central-mty',
            referenciaRemisionProveedor: 'REM-PROV-UAT-881',
            renglonesRecibidos: [
                [
                    'product_id' => $producto->id,
                    'sku' => 'REACT-UAT-500',
                    'cantidad_recibida_conforme' => 50.0,
                    'cantidad_averiada_rechazada' => 0.0,
                    'precio_unitario_factura' => 120.0,
                    'numero_lote' => 'LOTE-UAT-2026-A',
                ],
            ],
            usuarioReceptorId: 'usr-almacenista-muelle',
        );

        $resultadoRecepcion = $actionRecepcion->ejecutar($dtoRecepcionMuelle, $estadoOrdenCompra, $saldosPreviosAlmacen);

        self::assertSame('RECIBIDA_COMPLETA', $resultadoRecepcion['nuevo_estado_orden']);
        self::assertFalse($resultadoRecepcion['tiene_discrepancias']);
        self::assertCount(1, $resultadoRecepcion['asientos_kardex_generados']);

        // =========================================================================
        // FASE 3: Kardex Inmutable y Recálculo de Costo Promedio Ponderado (CPP)
        // =========================================================================
        // Saldo anterior: 10 uds a $100 = $1,000.00
        // Entrada compra: 50 uds a $120 = $6,000.00
        // Nuevo saldo: 60 uds, valor acumulado: $7,000.00 => CPP = $116.6667
        $asientoKardex = $resultadoRecepcion['asientos_kardex_generados'][0];
        self::assertSame('ENTRADA_COMPRA', $asientoKardex['tipo_movimiento']);
        self::assertSame(50.0, $asientoKardex['cantidad']);
        self::assertSame(60.0, $asientoKardex['saldo_cantidad']);
        self::assertEqualsWithDelta(116.6667, $asientoKardex['saldo_costo_unitario'], 0.001);
        self::assertSame(7000.0, $asientoKardex['saldo_valor_total']);

        // =========================================================================
        // FASE 4: Motor de Despacho Inteligente FEFO (Caducidades Multilote)
        // =========================================================================
        $fechaOperacion = new DateTimeImmutable('2026-11-01');

        $loteCaducado = new LoteProducto([
            'product_id' => $producto->id,
            'numero_lote' => 'LOTE-CAD-000',
            'fecha_fabricacion' => '2026-01-01',
            'fecha_vencimiento' => '2026-10-20', // Vencido hace 12 días
            'costo_unitario_entrada' => 100.0,
            'stock_inicial' => 10.0,
            'stock_actual' => 10.0,
            'is_active' => true,
            'en_cuarentena' => false,
        ]);
        $loteCaducado->id = 'lote-id-caducado';
        $loteCaducado->tenant_id = self::TENANT_ALFA;

        $loteProximoVencer = new LoteProducto([
            'product_id' => $producto->id,
            'numero_lote' => 'LOTE-UAT-2026-A',
            'fecha_fabricacion' => '2026-06-01',
            'fecha_vencimiento' => '2026-11-20', // Próximo a vencer en 19 días
            'costo_unitario_entrada' => 120.0,
            'stock_inicial' => 20.0,
            'stock_actual' => 20.0,
            'is_active' => true,
            'en_cuarentena' => false,
        ]);
        $loteProximoVencer->id = 'lote-id-fefo-1';
        $loteProximoVencer->tenant_id = self::TENANT_ALFA;

        $loteLargaVida = new LoteProducto([
            'product_id' => $producto->id,
            'numero_lote' => 'LOTE-UAT-2026-B',
            'fecha_fabricacion' => '2026-09-01',
            'fecha_vencimiento' => '2027-04-15', // Vigente (+165 días)
            'costo_unitario_entrada' => 120.0,
            'stock_inicial' => 40.0,
            'stock_actual' => 40.0,
            'is_active' => true,
            'en_cuarentena' => false,
        ]);
        $loteLargaVida->id = 'lote-id-fefo-2';
        $loteLargaVida->tenant_id = self::TENANT_ALFA;

        $planificadorFefo = new PlanificadorDespachoFefoService();

        // Se solicitan 35 unidades para despacho: debe omitir el vencido, agotar Lote A (20 uds) y tomar 15 de Lote B
        $despachoFefo = $planificadorFefo->asignarLotesParaSalida(
            $producto->id,
            35.0,
            [$loteLargaVida, $loteCaducado, $loteProximoVencer],
            $fechaOperacion
        );

        self::assertSame(35.0, $despachoFefo['cantidad_total_asignada']);
        self::assertCount(2, $despachoFefo['asignaciones']);
        self::assertSame('LOTE-UAT-2026-A', $despachoFefo['asignaciones'][0]['numero_lote']);
        self::assertSame(20.0, $despachoFefo['asignaciones'][0]['cantidad_tomada']);
        self::assertSame(0.0, $despachoFefo['asignaciones'][0]['saldo_lote_restante']);
        self::assertSame('LOTE-UAT-2026-B', $despachoFefo['asignaciones'][1]['numero_lote']);
        self::assertSame(15.0, $despachoFefo['asignaciones'][1]['cantidad_tomada']);
        self::assertSame(25.0, $despachoFefo['asignaciones'][1]['saldo_lote_restante']);
        self::assertCount(1, $despachoFefo['lotes_omitidos']);
        self::assertSame('LOTE-CAD-000', $despachoFefo['lotes_omitidos'][0]['numero_lote']);

        // =========================================================================
        // FASE 5: Conteo Ciego con Doble Firma de Autorización (Segregación Funcional)
        // =========================================================================
        // Saldo teórico remanente: 25 unidades. Conteo físico halla 15 unidades (-10 unidades).
        // Impacto monetario: -10 * $116.6667 = -$1,166.67. Al superar el umbral de $1,000.00 exige doble firma.
        $actionAjuste = new AplicarAjusteInventarioKardexAction(umbralDobleFirmaMonetario: 1000.0);

        $dtoAjusteConDobleFirma = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_ALFA,
            warehouseId: 'alm-central-mty',
            productId: $producto->id,
            sku: 'REACT-UAT-500',
            nombreProducto: 'Reactivo Bioquímico Grado Analítico 500ml',
            stockActualSistema: 25.0,
            cantidadRealContada: 15.0,
            costoUnitarioActual: 116.6667,
            motivoAjuste: 'Pérdida',
            observaciones: 'Merma no localizada en auditoría física trimestral autorizada por jefatura',
            usuarioResponsableId: 'usr-auditor-conteo-01',
            usuarioAutorizadorId: 'usr-gerente-operaciones-02',
        );

        $resultadoAjuste = $actionAjuste->ejecutar($dtoAjusteConDobleFirma);

        self::assertSame(-10.0, $resultadoAjuste['variacion']);
        self::assertSame(15.0, $resultadoAjuste['nuevo_stock']);
        self::assertTrue($resultadoAjuste['requirio_doble_firma']);
        self::assertSame('usr-gerente-operaciones-02', $resultadoAjuste['asiento_kardex']['authorized_by']);
        self::assertSame('MERMA_DANO', $resultadoAjuste['asiento_kardex']['tipo_movimiento']);

        // =========================================================================
        // FASE 6: Analítica Patrimonial Pareto ABC y Comparativa de Valoraciones
        // =========================================================================
        $servicioAbc = new AnaliticaValoracionAbcService();

        $analisisAbc = $servicioAbc->generarAnalisisPatrimonialAbc(self::TENANT_ALFA, [
            [
                'tenant_id' => self::TENANT_ALFA,
                'codigo' => 'ALM-CENTRAL-MTY',
                'nombre' => 'Bodega Central Monterrey',
                'cantidad_disponible' => 1500.0,
                'costo_peps' => 1800.0,
                'costo_ueps' => 1750.0,
                'costo_cpp' => 1775.0,
            ],
            [
                'tenant_id' => self::TENANT_ALFA,
                'codigo' => 'ALM-CDMX-NORTE',
                'nombre' => 'Centro Logístico Vallejo',
                'cantidad_disponible' => 800.0,
                'costo_peps' => 850.0,
                'costo_ueps' => 840.0,
                'costo_cpp' => 845.0,
            ],
            [
                'tenant_id' => self::TENANT_ALFA,
                'codigo' => 'ALM-GUAD-SUR',
                'nombre' => 'Hub Occidente Guadalajara',
                'cantidad_disponible' => 400.0,
                'costo_peps' => 350.0,
                'costo_ueps' => 340.0,
                'costo_cpp' => 345.0,
            ],
        ]);

        self::assertSame(self::TENANT_ALFA, $analisisAbc['tenant_id']);
        self::assertSame(3520000.0, $analisisAbc['valor_total_peps']);
        self::assertSame(3433000.0, $analisisAbc['valor_total_ueps']);
        self::assertSame(87000.0, $analisisAbc['diferencia_peps_vs_ueps']);
        self::assertSame('A', $analisisAbc['partidas_clasificadas'][0]['clase_abc']);
        self::assertSame('A', $analisisAbc['partidas_clasificadas'][1]['clase_abc']);
        self::assertSame('C', $analisisAbc['partidas_clasificadas'][2]['clase_abc']);

        // =========================================================================
        // FASE 7: Recuperación de Contraseña por Token SHA-256 (Cierre de Brecha)
        // =========================================================================
        $servicioRestablecer = new RestablecerContrasenaTokenService();

        $emisionToken = $servicioRestablecer->emitirTokenRecuperacion(
            tenantId: self::TENANT_ALFA,
            correo: 'administrador@industriasalfa.com',
            ahoraIso: '2026-11-09T09:00:00-06:00',
        );

        self::assertSame(self::TENANT_ALFA, $emisionToken['tenant_id']);
        self::assertFalse($emisionToken['usado']);
        self::assertSame(64, strlen($emisionToken['token_hash']));

        $resultadoPassword = $servicioRestablecer->confirmarNuevaContrasenaPorToken(
            tenantIdContexto: self::TENANT_ALFA,
            tokenPlanoRecibido: $emisionToken['token_plano'],
            nuevaContrasena: 'Alfa#2026!UatFinal',
            confirmacionContrasena: 'Alfa#2026!UatFinal',
            registroToken: $emisionToken,
            ahoraIso: '2026-11-09T09:07:00-06:00',
        );

        self::assertSame('CONTRASENA_ACTUALIZADA', $resultadoPassword['estado']);
        self::assertTrue($resultadoPassword['token_invalidado']);
        self::assertTrue($resultadoPassword['refresh_tokens_revocados']);
    }

    /**
     * @test
     */
    public function test_blindaje_multi_tenant_integral_e2e_en_todas_las_etapas_del_flujo(): void
    {
        // -------------------------------------------------------------------------
        // Blindaje Fase A: Catálogo Maestro no permite registrar producto ajeno
        // -------------------------------------------------------------------------
        $validadorCodigo = new ValidadorCodigoBarrasService();
        $actionCatalogo = new RegistrarProductoCatalogoAction($validadorCodigo);

        $dtoCrossTenantCatalogo = new RegistrarProductoDTO(
            tenantId: self::TENANT_BETA,
            categoryId: 'cat-01',
            unitOfMeasureId: 'uom-pza',
            sku: 'INTRUSO-CAT-01',
            name: 'Producto Intruso Cross Tenant',
        );

        try {
            $actionCatalogo->ejecutar($dtoCrossTenantCatalogo);
            self::fail('Debió interceptar violación cross-tenant en Catálogo.');
        } catch (RuntimeException $e) {
            self::assertStringContainsString('Violación de aislamiento Multi-Tenant al registrar producto', $e->getMessage());
        }

        // -------------------------------------------------------------------------
        // Blindaje Fase B: Muelle de Abastecimiento no permite recepción cruzada
        // -------------------------------------------------------------------------
        $actionRecepcion = new ProcesarRecepcionOrdenCompraAction(new ValoracionPromedioPonderado());

        $dtoCrossTenantRecepcion = new RecepcionMercaderiaMuelleDTO(
            tenantId: self::TENANT_BETA,
            purchaseOrderId: 'oc-cross-01',
            numeroOrden: 'OC-CROSS-01',
            warehouseId: 'alm-central-mty',
            referenciaRemisionProveedor: 'REM-CROSS',
            renglonesRecibidos: [
                [
                    'product_id' => 'prod-cross-01',
                    'sku' => 'SKU-CROSS',
                    'cantidad_recibida_conforme' => 10.0,
                ],
            ],
            usuarioReceptorId: 'usr-intruso',
        );

        try {
            $actionRecepcion->ejecutar($dtoCrossTenantRecepcion, [
                'id' => 'oc-cross-01',
                'tenant_id' => self::TENANT_ALFA,
                'estado' => 'ENVIADA',
                'renglones' => [],
            ], []);
            self::fail('Debió interceptar violación cross-tenant en Recepción Muelle.');
        } catch (RuntimeException $e) {
            self::assertStringContainsString('Violación de aislamiento Multi-Tenant al procesar recepción', $e->getMessage());
        }

        // -------------------------------------------------------------------------
        // Blindaje Fase C: Motor FEFO descarta cualquier lote de otro inquilino
        // -------------------------------------------------------------------------
        $planificadorFefo = new PlanificadorDespachoFefoService();

        $loteIntruso = new LoteProducto([
            'product_id' => 'prod-uat-01',
            'numero_lote' => 'LOTE-INTRUSO-BETA',
            'fecha_fabricacion' => '2026-01-01',
            'fecha_vencimiento' => '2027-01-01',
            'costo_unitario_entrada' => 100.0,
            'stock_inicial' => 50.0,
            'stock_actual' => 50.0,
            'is_active' => true,
            'en_cuarentena' => false,
        ]);
        $loteIntruso->id = 'lote-id-intruso';
        $loteIntruso->tenant_id = self::TENANT_BETA;

        try {
            $planificadorFefo->asignarLotesParaSalida('prod-uat-01', 10.0, [$loteIntruso]);
            self::fail('Debió interceptar violación cross-tenant en Motor FEFO.');
        } catch (RuntimeException $e) {
            self::assertStringContainsString('Violación Cross-Tenant en motor FEFO', $e->getMessage());
        }

        // -------------------------------------------------------------------------
        // Blindaje Fase D: Ajuste de Conteo Ciego bloquea DTO de otro tenant
        // -------------------------------------------------------------------------
        $actionAjuste = new AplicarAjusteInventarioKardexAction();

        $dtoCrossTenantAjuste = new RegistrarAjusteInventarioDTO(
            tenantId: self::TENANT_BETA,
            warehouseId: 'alm-central-mty',
            productId: 'prod-01',
            sku: 'SKU-01',
            nombreProducto: 'Producto Prueba',
            stockActualSistema: 20.0,
            cantidadRealContada: 18.0,
            costoUnitarioActual: 50.0,
            motivoAjuste: 'Conteo físico',
        );

        try {
            $actionAjuste->ejecutar($dtoCrossTenantAjuste);
            self::fail('Debió interceptar violación cross-tenant en Ajuste Inventario.');
        } catch (RuntimeException $e) {
            self::assertStringContainsString('Violación de aislamiento Multi-Tenant al aplicar ajuste', $e->getMessage());
        }

        // -------------------------------------------------------------------------
        // Blindaje Fase E: Analítica Pareto ABC bloquea partidas de otro tenant
        // -------------------------------------------------------------------------
        $servicioAbc = new AnaliticaValoracionAbcService();

        try {
            $servicioAbc->generarAnalisisPatrimonialAbc(self::TENANT_ALFA, [
                [
                    'tenant_id' => self::TENANT_BETA,
                    'codigo' => 'ALM-BETA-01',
                    'nombre' => 'Almacén Inquilino Beta',
                    'cantidad_disponible' => 100.0,
                    'costo_peps' => 500.0,
                    'costo_ueps' => 490.0,
                    'costo_cpp' => 495.0,
                ],
            ]);
            self::fail('Debió interceptar violación cross-tenant en Analítica Pareto ABC.');
        } catch (InvalidArgumentException $e) {
            self::assertStringContainsString('Violación de aislamiento Multi-Tenant', $e->getMessage());
        }

        // -------------------------------------------------------------------------
        // Blindaje Fase F: Recuperación de Token previene uso cruzado entre tenants
        // -------------------------------------------------------------------------
        $servicioRestablecer = new RestablecerContrasenaTokenService();

        $emisionAlfa = $servicioRestablecer->emitirTokenRecuperacion(
            tenantId: self::TENANT_ALFA,
            correo: 'seguridad@industriasalfa.com',
            ahoraIso: '2026-11-09T09:00:00-06:00',
        );

        try {
            $servicioRestablecer->confirmarNuevaContrasenaPorToken(
                tenantIdContexto: self::TENANT_BETA,
                tokenPlanoRecibido: $emisionAlfa['token_plano'],
                nuevaContrasena: 'Clave#2026!Intruso',
                confirmacionContrasena: 'Clave#2026!Intruso',
                registroToken: $emisionAlfa,
                ahoraIso: '2026-11-09T09:05:00-06:00',
            );
            self::fail('Debió interceptar intento cross-tenant en Recuperación de Token.');
        } catch (DomainException $e) {
            self::assertStringContainsString('Violación Multi-Tenant', $e->getMessage());
        }
    }
}
