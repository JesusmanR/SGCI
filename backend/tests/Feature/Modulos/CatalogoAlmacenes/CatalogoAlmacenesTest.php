<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\CatalogoAlmacenes;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Almacenes\Acciones\GestionarTransferenciaAlmacenAction;
use App\Modulos\Almacenes\DTOs\TransferenciaAlmacenDTO;
use App\Modulos\Almacenes\Modelos\UbicacionAlmacen;
use App\Modulos\Catalogo\Acciones\RegistrarProductoCatalogoAction;
use App\Modulos\Catalogo\DTOs\RegistrarProductoDTO;
use App\Modulos\Catalogo\Servicios\ValidadorCodigoBarrasService;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * Suite TDD — Sprint 2 (`feat/catalogo-almacenes`):
 * - Validación de invariantes de Catálogo (`stock_minimo <= punto_reorden <= stock_maximo`, perecedero -> lotes).
 * - Algoritmo GS1 Módulo 10 para códigos de barras `EAN-13` y generación/lectura de `QR_SGCI`.
 * - Aislamiento Multi-Tenant (`tenant_id`) en registro de productos y semáforo de existencias.
 * - Topología de ubicaciones físicas (`Zona-Pasillo-Estante-Nivel`) y Transferencias Inter-Almacén en 2 pasos (`EN_TRANSITO` -> `RECIBIDA`).
 */
class CatalogoAlmacenesTest extends TestCase
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
    public function valida_algoritmo_gs1_ean13_y_generacion_de_etiquetas_qr_almacen(): void
    {
        $validador = new ValidadorCodigoBarrasService();

        // Generar EAN-13 interno para el consecutivo 42 con prefijo GS1 205
        $eanGenerado = $validador->generarEan13Interno(42, '205');
        $this->assertSame(13, strlen($eanGenerado));
        $this->assertTrue($validador->esEan13Valido($eanGenerado));

        // Alterar el último dígito verificador debe invalidar el EAN-13
        $ultimoDigito = (int) $eanGenerado[12];
        $eanCorrupto = substr($eanGenerado, 0, 12) . (string) (($ultimoDigito + 1) % 10);
        $this->assertFalse($validador->esEan13Valido($eanCorrupto));

        // Generación e interpretación de QR estructurado de almacén
        $qrPayload = $validador->generarPayloadQrAlmacen(self::TENANT_ALFA, 'ac-100-flex', 'lote-2026-089');
        $this->assertSame('SGCI|T:11111111|SKU:AC-100-FLEX|LOTE:LOTE-2026-089', $qrPayload);

        $interpretado = $validador->interpretarLecturaEscaner($qrPayload);
        $this->assertSame('QR_SGCI', $interpretado['tipo']);
        $this->assertSame('AC-100-FLEX', $interpretado['sku']);
        $this->assertSame('LOTE-2026-089', $interpretado['lote']);
        $this->assertSame('11111111', $interpretado['tenant_prefijo']);
    }

    /**
     * @test
     */
    public function bloquea_registro_de_producto_cuando_punto_de_reorden_es_menor_al_stock_minimo(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('El Punto de Reorden (ROP) debe ser mayor o igual al Stock Mínimo.');

        new RegistrarProductoDTO(
            tenantId: self::TENANT_ALFA,
            categoryId: 'cat-01',
            unitOfMeasureId: 'uom-pza',
            sku: 'AC-100-FLEX',
            name: 'Válvula de Presión Industrial 2"',
            barcode: null,
            description: 'Válvula de acero inoxidable',
            metodoValoracion: 'PEPS',
            stockMinimo: 25.0,
            puntoReorden: 15.0, // Inválido: menor que stockMinimo (25.0)
            stockMaximo: 100.0,
            manejaLotes: true,
            perecedero: false,
        );
    }

    /**
     * @test
     */
    public function exige_control_por_lotes_cuando_el_producto_es_perecedero(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Todo producto marcado como perecedero (caducidad FEFO) debe tener activado el control por lotes');

        new RegistrarProductoDTO(
            tenantId: self::TENANT_ALFA,
            categoryId: 'cat-quimi',
            unitOfMeasureId: 'uom-lts',
            sku: 'REACT-900',
            name: 'Reactivo Químico Térmico',
            barcode: null,
            description: null,
            metodoValoracion: 'PEPS',
            stockMinimo: 10.0,
            puntoReorden: 20.0,
            stockMaximo: 80.0,
            manejaLotes: false, // Inválido porque perecedero = true
            perecedero: true,
        );
    }

    /**
     * @test
     */
    public function registra_producto_con_aislamiento_tenant_y_evalua_semaforo_de_stock(): void
    {
        $action = new RegistrarProductoCatalogoAction(new ValidadorCodigoBarrasService());

        $dto = new RegistrarProductoDTO(
            tenantId: self::TENANT_ALFA,
            categoryId: 'cat-hidraulica',
            unitOfMeasureId: 'uom-pza',
            sku: '  ac-100-flex ',
            name: 'Válvula de Presión Industrial 2"',
            barcode: null,
            description: 'Alta presión 300 PSI',
            metodoValoracion: 'PEPS',
            stockMinimo: 10.0,
            puntoReorden: 25.0,
            stockMaximo: 120.0,
            manejaLotes: true,
            perecedero: false,
            usuarioCreadorId: 'usr-jefe-01',
        );

        $producto = $action->ejecutar($dto, [], 105);

        $this->assertSame(self::TENANT_ALFA, $producto->tenant_id);
        $this->assertSame('AC-100-FLEX', $producto->sku);
        $this->assertNotNull($producto->barcode);
        $this->assertSame('CRITICO', $producto->evaluarNivelStock(8.0));
        $this->assertSame('REORDEN', $producto->evaluarNivelStock(20.0));
        $this->assertSame('OPTIMO', $producto->evaluarNivelStock(60.0));
        $this->assertSame('SOBREINVENTARIO', $producto->evaluarNivelStock(140.0));
        $this->assertTrue($producto->requiereReabastecimiento(25.0));
        $this->assertSame(95.0, $producto->calcularCantidadSugeridaCompra(25.0));
    }

    /**
     * @test
     */
    public function bloquea_registro_de_producto_cross_tenant(): void
    {
        $action = new RegistrarProductoCatalogoAction(new ValidadorCodigoBarrasService());

        $dtoTenantAjeno = new RegistrarProductoDTO(
            tenantId: self::TENANT_BETA,
            categoryId: 'cat-01',
            unitOfMeasureId: 'uom-pza',
            sku: 'SKU-INTRUSO-01',
            name: 'Intento Cross Tenant',
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Violación de aislamiento Multi-Tenant al registrar producto');

        $action->ejecutar($dtoTenantAjeno);
    }

    /**
     * @test
     */
    public function construye_codigo_canonico_de_ubicacion_bin_y_ejecuta_transferencia_en_dos_pasos(): void
    {
        $codigoBin = UbicacionAlmacen::construirCodigoUbicacion('zona-a', 'p04', 'r02', 'n01');
        $this->assertSame('ZONA-A-P04-R02-N01', $codigoBin);

        $actionTransferencia = new GestionarTransferenciaAlmacenAction();

        $dtoTransferencia = new TransferenciaAlmacenDTO(
            tenantId: self::TENANT_ALFA,
            numeroTransferencia: 'TRF-2026-0081',
            almacenOrigenId: 'alm-central-mty',
            almacenDestinoId: 'alm-norte-cdmx',
            renglones: [
                [
                    'product_id' => 'prod-ac-100',
                    'sku' => 'AC-100-FLEX',
                    'lot_id' => 'lote-2026-089',
                    'cantidad_solicitada' => 30.0,
                    'costo_unitario' => 145.50,
                ],
            ],
            usuarioOperadorId: 'usr-jefe-01',
            motivo: 'Reabastecimiento regional programado',
        );

        // Paso 1: Despacho en almacén de origen (tenía 80 unidades -> quedan 50 y 30 pasan a EN_TRANSITO)
        $enTransito = $actionTransferencia->despacharEnOrigen($dtoTransferencia, [
            'prod-ac-100' => 80.0,
        ]);

        $this->assertSame('EN_TRANSITO', $enTransito['estado']);
        $this->assertSame(50.0, $enTransito['saldos_origen_resultantes']['prod-ac-100']);
        $this->assertSame(30.0, $enTransito['stock_en_transito']['prod-ac-100']);
        $this->assertSame('SALIDA_TRANSFERENCIA', $enTransito['movimientos_kardex_origen'][0]['tipo_movimiento']);

        // Paso 2: Confirmación de recepción en almacén de destino (tenía 10 unidades -> sube a 40 y libera tránsito)
        $recibida = $actionTransferencia->confirmarRecepcionEnDestino(
            $enTransito,
            ['prod-ac-100' => 10.0],
            'usr-receptor-02'
        );

        $this->assertSame('RECIBIDA', $recibida['estado']);
        $this->assertFalse($recibida['con_discrepancia']);
        $this->assertSame(40.0, $recibida['saldos_destino_resultantes']['prod-ac-100']);
        $this->assertSame(0.0, $recibida['stock_en_transito_remanente']['prod-ac-100']);
        $this->assertSame('ENTRADA_TRANSFERENCIA', $recibida['movimientos_kardex_destino'][0]['tipo_movimiento']);
    }
}
