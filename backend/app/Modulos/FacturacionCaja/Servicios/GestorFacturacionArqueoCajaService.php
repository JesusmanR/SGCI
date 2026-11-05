<?php

declare(strict_types=1);

namespace App\Modulos\FacturacionCaja\Servicios;

use App\Modulos\FacturacionCaja\DTOs\RegistrarCobroCajaDTO;
use DomainException;
use InvalidArgumentException;

/**
 * Servicio de dominio para Facturación, Punto de Cobro, Descuento en Kardex y Arqueo/Cierre de Caja.
 * Replica con exactitud las reglas de negocio de las Pantallas Figma 21 a 35, 75 y 76.
 */
final class GestorFacturacionArqueoCajaService
{
    /**
     * Procesa el cobro de una factura pendiente, verifica caja abierta y stock suficiente,
     * descuenta las unidades del inventario y registra el comprobante de pago.
     *
     * @param array<string, array{sku: string, nombre: string, stock_actual: int, tenant_id: string}> $inventarioPorSku
     * @return array{
     *   comprobante_id: string,
     *   metodo_pago: string,
     *   total_cobrado: float,
     *   cambio_devolver: float,
     *   referencia: string,
     *   inventario_actualizado: array<string, array{sku: string, nombre: string, stock_actual: int, tenant_id: string}>,
     *   movimientos_kardex: list<array{sku: string, variacion: int, motivo: string, referencia: string}>,
     *   mensaje: string
     * }
     */
    public function confirmarCobroYDescontarStock(
        RegistrarCobroCajaDTO $dto,
        bool $cajaAbierta,
        array $inventarioPorSku,
        int $consecutivoCobro = 1049,
    ): array {
        if (! $cajaAbierta) {
            throw new DomainException('Abre la caja antes de cobrar.');
        }

        $movimientosKardex = [];

        foreach ($dto->lineasFactura as $linea) {
            $sku = $linea['sku'];
            $cantidad = $linea['cantidad'];

            if ($cantidad <= 0 || ! isset($inventarioPorSku[$sku])) {
                throw new DomainException('Stock insuficiente. Revisa las cantidades en la factura.');
            }

            $producto = $inventarioPorSku[$sku];
            if ($producto['tenant_id'] !== $dto->tenantId) {
                throw new DomainException(
                    "Violación Multi-Tenant: el producto {$sku} pertenece a otra empresa."
                );
            }

            if ($cantidad > $producto['stock_actual']) {
                throw new DomainException('Stock insuficiente. Revisa las cantidades en la factura.');
            }
        }

        foreach ($dto->lineasFactura as $linea) {
            $sku = $linea['sku'];
            $cantidad = $linea['cantidad'];
            $inventarioPorSku[$sku]['stock_actual'] -= $cantidad;

            $movimientosKardex[] = [
                'sku' => $sku,
                'variacion' => -$cantidad,
                'motivo' => 'Venta',
                'referencia' => $dto->referenciaFactura,
            ];
        }

        $referenciaFinal = $dto->metodoPago === RegistrarCobroCajaDTO::METODO_EFECTIVO
            ? $dto->referenciaFactura
            : trim($dto->referenciaPago);

        return [
            'comprobante_id' => 'CB-' . $consecutivoCobro,
            'metodo_pago' => $dto->metodoPago,
            'total_cobrado' => round($dto->totalFactura, 2),
            'cambio_devolver' => $dto->calcularCambioDevolver(),
            'referencia' => $referenciaFinal,
            'inventario_actualizado' => $inventarioPorSku,
            'movimientos_kardex' => $movimientosKardex,
            'mensaje' => 'Cobro confirmado. Se actualizó el stock y el resumen de caja.',
        ];
    }

    /**
     * Ejecuta el arqueo y cierre de sesión de caja (Pantallas Figma 31 a 34).
     * Compara exclusivamente la base inicial + cobros en Efectivo contra el efectivo físico contado.
     * Si existe diferencia distinta de cero, exige observaciones obligatorias.
     *
     * @param list<array{metodo_pago: string, total_cobrado: float}> $cobrosSesion
     * @return array{
     *   efectivo_esperado: float,
     *   efectivo_contado: float,
     *   diferencia_caja: float,
     *   ventas_totales_sesion: float,
     *   ventas_efectivo: float,
     *   ventas_tarjeta_transferencia: float,
     *   observaciones: string,
     *   caja_abierta: bool,
     *   mensaje: string
     * }
     */
    public function ejecutarCierreArqueoCaja(
        float $baseInicialEfectivo,
        array $cobrosSesion,
        float $efectivoFisicoContado,
        string $observaciones,
    ): array {
        if ($baseInicialEfectivo < 0 || $efectivoFisicoContado < 0) {
            throw new InvalidArgumentException('Los montos de efectivo no pueden ser negativos.');
        }

        $ventasTotales = 0.0;
        $ventasEfectivo = 0.0;

        foreach ($cobrosSesion as $cobro) {
            $importe = (float) $cobro['total_cobrado'];
            $ventasTotales += $importe;
            if ($cobro['metodo_pago'] === RegistrarCobroCajaDTO::METODO_EFECTIVO) {
                $ventasEfectivo += $importe;
            }
        }

        $ventasTotales = round($ventasTotales, 2);
        $ventasEfectivo = round($ventasEfectivo, 2);
        $efectivoEsperado = round($baseInicialEfectivo + $ventasEfectivo, 2);
        $efectivoContado = round($efectivoFisicoContado, 2);
        $diferencia = round($efectivoContado - $efectivoEsperado, 2);

        $notaLimpia = trim($observaciones);
        if ($diferencia !== 0.0 && $notaLimpia === '') {
            throw new DomainException(
                'Indica el motivo de la diferencia para cerrar la caja.'
            );
        }

        return [
            'efectivo_esperado' => $efectivoEsperado,
            'efectivo_contado' => $efectivoContado,
            'diferencia_caja' => $diferencia,
            'ventas_totales_sesion' => $ventasTotales,
            'ventas_efectivo' => $ventasEfectivo,
            'ventas_tarjeta_transferencia' => round($ventasTotales - $ventasEfectivo, 2),
            'observaciones' => $notaLimpia !== '' ? $notaLimpia : 'Sin diferencias',
            'caja_abierta' => false,
            'mensaje' => 'Caja cerrada. El arqueo y la diferencia quedaron registrados en esta sesión.',
        ];
    }
}
