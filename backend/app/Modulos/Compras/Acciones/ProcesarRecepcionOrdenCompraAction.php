<?php

declare(strict_types=1);

namespace App\Modulos\Compras\Acciones;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Compras\DTOs\RecepcionMercaderiaMuelleDTO;
use App\Modulos\Kardex\DTOs\RegistrarMovimientoDTO;
use App\Modulos\Kardex\Estrategias\EstrategiaValoracionInterface;
use Illuminate\Support\Str;
use InvalidArgumentException;
use RuntimeException;

/**
 * Caso de uso para el Cotejo y Recepción Física de Orden de Compra en Muelle (`feat/abastecimiento-recepcion`).
 */
final class ProcesarRecepcionOrdenCompraAction
{
    public function __construct(
        private readonly EstrategiaValoracionInterface $estrategiaValoracion,
    ) {
    }

    /**
     * @param array<string, mixed> $estadoOrdenCompra
     * @param array<string, array{cantidad_actual: float, costo_unitario_actual: float}> $saldosAlmacenPorProducto
     * @return array<string, mixed>
     */
    public function ejecutar(
        RecepcionMercaderiaMuelleDTO $dto,
        array $estadoOrdenCompra,
        array $saldosAlmacenPorProducto
    ): array {
        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();

        if ($tenantActual === null || $tenantActual !== $dto->tenantId || ($estadoOrdenCompra['tenant_id'] ?? '') !== $tenantActual) {
            throw new RuntimeException(
                'Violación de aislamiento Multi-Tenant al procesar recepción de Orden de Compra en muelle.'
            );
        }

        $estadosPermitidos = ['APROBADA', 'ENVIADA', 'RECIBIDA_PARCIAL'];
        $estadoActual = (string) ($estadoOrdenCompra['estado'] ?? '');
        if (!in_array($estadoActual, $estadosPermitidos, true)) {
            throw new InvalidArgumentException(
                sprintf(
                    'La Orden de Compra [%s] en estado [%s] no admite recepciones en muelle.',
                    $dto->numeroOrden,
                    $estadoActual
                )
            );
        }

        $renglonesOrden = $estadoOrdenCompra['renglones'];
        $saldosActualizados = $saldosAlmacenPorProducto;
        $actaDiscrepancias = [];
        $asientosKardex = [];

        foreach ($dto->renglonesRecibidos as $renglonMuelle) {
            $productoId = (string) $renglonMuelle['product_id'];
            $sku = (string) $renglonMuelle['sku'];

            if (!isset($renglonesOrden[$productoId])) {
                throw new InvalidArgumentException(
                    sprintf('El producto SKU [%s] no forma parte de la Orden de Compra [%s].', $sku, $dto->numeroOrden)
                );
            }

            $lineaOrden = $renglonesOrden[$productoId];
            $solicitada = round((float) $lineaOrden['cantidad_solicitada'], 4);
            $recibidaPrevia = round((float) $lineaOrden['cantidad_recibida_previa'], 4);
            $pendienteAntes = round($solicitada - $recibidaPrevia, 4);

            $conforme = round((float) $renglonMuelle['cantidad_recibida_conforme'], 4);
            $averiada = round((float) ($renglonMuelle['cantidad_averiada_rechazada'] ?? 0.0), 4);

            if ($conforme > $pendienteAntes) {
                throw new InvalidArgumentException(
                    sprintf(
                        'Sobreentrega no autorizada para el SKU [%s]: pendiente por recibir %.4f, intentando ingresar %.4f.',
                        $sku,
                        $pendienteAntes,
                        $conforme
                    )
                );
            }

            $precioPactado = round((float) $lineaOrden['precio_unitario_pactado'], 4);
            $precioFactura = isset($renglonMuelle['precio_unitario_factura'])
                ? round((float) $renglonMuelle['precio_unitario_factura'], 4)
                : $precioPactado;

            if ($averiada > 0.0) {
                $actaDiscrepancias[] = [
                    'tipo' => 'AVERIA_MUELLE',
                    'product_id' => $productoId,
                    'sku' => $sku,
                    'cantidad_afectada' => $averiada,
                    'detalle' => sprintf('Se rechazaron %.4f unidades en muelle por daño físico o incumplimiento de calidad.', $averiada),
                ];
            }

            if (abs($precioFactura - $precioPactado) > 0.0001) {
                $actaDiscrepancias[] = [
                    'tipo' => 'DIFERENCIA_PRECIO',
                    'product_id' => $productoId,
                    'sku' => $sku,
                    'precio_orden' => $precioPactado,
                    'precio_factura' => $precioFactura,
                    'detalle' => sprintf('Diferencia de costo unitario detectada: OC $%.4f vs Factura $%.4f.', $precioPactado, $precioFactura),
                ];
            }

            $nuevaRecibidaAcumulada = round($recibidaPrevia + $conforme, 4);
            $pendienteRestante = round($solicitada - $nuevaRecibidaAcumulada, 4);

            if ($pendienteRestante > 0.0) {
                $actaDiscrepancias[] = [
                    'tipo' => 'ENTREGA_PARCIAL_FALTANTE',
                    'product_id' => $productoId,
                    'sku' => $sku,
                    'cantidad_pendiente' => $pendienteRestante,
                    'detalle' => sprintf('Quedan %.4f unidades pendientes por entregar del SKU [%s].', $pendienteRestante, $sku),
                ];
            }

            $renglonesOrden[$productoId]['cantidad_recibida_previa'] = $nuevaRecibidaAcumulada;
            $renglonesOrden[$productoId]['cantidad_pendiente'] = $pendienteRestante;

            if ($conforme > 0.0) {
                $saldoPrevio = $saldosActualizados[$productoId] ?? [
                    'cantidad_actual' => 0.0,
                    'costo_unitario_actual' => 0.0,
                ];

                $movimientoDto = new RegistrarMovimientoDTO(
                    id: (string) Str::uuid(),
                    tenant_id: $tenantActual,
                    almacen_id: $dto->warehouseId,
                    producto_id: $productoId,
                    lote_id: $renglonMuelle['numero_lote'] ?? null,
                    tipo_movimiento: 'ENTRADA_COMPRA',
                    cantidad: $conforme,
                    costo_unitario: $precioFactura,
                    referencia_documento: sprintf('%s / %s', $dto->numeroOrden, $dto->referenciaRemisionProveedor),
                    observacion: 'Recepción verificada de Orden de Compra en muelle',
                    created_by: $dto->usuarioReceptorId,
                );

                $calculoValoracion = $this->estrategiaValoracion->calcularEntrada(
                    cantidadActual: (float) $saldoPrevio['cantidad_actual'],
                    costoUnitarioActual: (float) $saldoPrevio['costo_unitario_actual'],
                    cantidadEntrada: $movimientoDto->cantidad,
                    costoUnitarioEntrada: $movimientoDto->costo_unitario
                );

                $saldosActualizados[$productoId] = [
                    'cantidad_actual' => $calculoValoracion['saldo_cantidad'],
                    'costo_unitario_actual' => $calculoValoracion['saldo_costo_unitario'],
                    'valor_total' => $calculoValoracion['saldo_valor_total'],
                ];

                $asientosKardex[] = [
                    'tenant_id' => $tenantActual,
                    'warehouse_id' => $dto->warehouseId,
                    'product_id' => $productoId,
                    'sku' => $sku,
                    'lot_id' => $movimientoDto->lote_id,
                    'tipo_movimiento' => 'ENTRADA_COMPRA',
                    'referencia_documento' => $movimientoDto->referencia_documento,
                    'cantidad' => $conforme,
                    'costo_unitario' => $precioFactura,
                    'costo_total' => round($conforme * $precioFactura, 4),
                    'saldo_cantidad' => $calculoValoracion['saldo_cantidad'],
                    'saldo_costo_unitario' => $calculoValoracion['saldo_costo_unitario'],
                    'saldo_valor_total' => $calculoValoracion['saldo_valor_total'],
                    'metodo_valoracion' => $this->estrategiaValoracion->obtenerNombre(),
                    'created_by' => $dto->usuarioReceptorId,
                ];
            }
        }

        $todosCompletos = true;
        $algunoRecibido = false;

        foreach ($renglonesOrden as $linea) {
            $recibida = round((float) $linea['cantidad_recibida_previa'], 4);
            $solicitada = round((float) $linea['cantidad_solicitada'], 4);

            if ($recibida > 0.0) {
                $algunoRecibido = true;
            }
            if ($recibida < $solicitada) {
                $todosCompletos = false;
            }
        }

        $nuevoEstado = $todosCompletos
            ? 'RECIBIDA_COMPLETA'
            : ($algunoRecibido ? 'RECIBIDA_PARCIAL' : $estadoActual);

        return [
            'purchase_order_id' => $dto->purchaseOrderId,
            'numero_orden' => $dto->numeroOrden,
            'nuevo_estado_orden' => $nuevoEstado,
            'tiene_discrepancias' => $actaDiscrepancias !== [],
            'acta_discrepancias' => $actaDiscrepancias,
            'asientos_kardex_generados' => $asientosKardex,
            'saldos_almacen_actualizados' => $saldosActualizados,
            'renglones_orden_actualizados' => $renglonesOrden,
        ];
    }
}
