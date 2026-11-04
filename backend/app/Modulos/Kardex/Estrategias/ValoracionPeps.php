<?php

declare(strict_types=1);

namespace App\Modulos\Kardex\Estrategias;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Implementación del Patrón Strategy para el método de valoración
 * Primero en Entrar, Primero en Salir (PEPS / FIFO).
 *
 * Cada movimiento de salida consume las capas de compras/entradas más antiguas
 * que aún posean saldo remanente disponible.
 */
final class ValoracionPeps implements EstrategiaValoracionInterface
{
    public const NOMBRE = 'PEPS';

    public function obtenerNombre(): string
    {
        return self::NOMBRE;
    }

    /**
     * Calcula el costo de la salida consumiendo cronológicamente las capas de inventario (FIFO).
     *
     * @throws StockInsuficienteException
     */
    public function calcularCostoSalida(
        string $tenantId,
        string $almacenId,
        string $productoId,
        float $cantidadSalida,
        ?string $loteId = null
    ): ResultadoValoracionSalida {
        if ($cantidadSalida <= 0.0) {
            throw new InvalidArgumentException('La cantidad de salida debe ser mayor a 0.');
        }

        $query = DB::table('capas_inventario')
            ->where('tenant_id', '=', $tenantId)
            ->where('almacen_id', '=', $almacenId)
            ->where('producto_id', '=', $productoId)
            ->where('saldo_remanente', '>', 0)
            ->whereNull('deleted_at')
            ->orderBy('fecha_ingreso', 'asc')
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc');

        if ($loteId !== null) {
            $query->where('lote_id', '=', $loteId);
        }

        $capas = $query->get();

        $stockTotalDisponible = 0.0;
        foreach ($capas as $capa) {
            $stockTotalDisponible += (float) $capa->saldo_remanente;
        }

        if ($stockTotalDisponible < $cantidadSalida) {
            throw new StockInsuficienteException(
                disponible: $stockTotalDisponible,
                solicitada: $cantidadSalida,
                mensaje: sprintf(
                    'Existencias insuficientes en capas PEPS para el producto [%s] en el almacén [%s].',
                    $productoId,
                    $almacenId
                )
            );
        }

        $pendientePorCubrir = $cantidadSalida;
        $costoTotalConsolidado = 0.0;
        $capasConsumidas = [];

        foreach ($capas as $capa) {
            if ($pendientePorCubrir <= 0.00001) {
                break;
            }

            $saldoCapa = (float) $capa->saldo_remanente;
            $costoCapa = (float) $capa->costo_unitario;
            $cantidadTomada = min($saldoCapa, $pendientePorCubrir);
            $subtotalCapa = round($cantidadTomada * $costoCapa, 4);

            $costoTotalConsolidado += $subtotalCapa;
            $pendientePorCubrir -= $cantidadTomada;

            $capasConsumidas[] = [
                'capa_id' => (string) $capa->id,
                'lote_id' => $capa->lote_id !== null ? (string) $capa->lote_id : null,
                'cantidad' => $cantidadTomada,
                'costo_unitario' => $costoCapa,
                'subtotal' => $subtotalCapa,
            ];
        }

        $costoTotalConsolidado = round($costoTotalConsolidado, 4);
        $costoUnitarioPonderado = $cantidadSalida > 0.0
            ? round($costoTotalConsolidado / $cantidadSalida, 4)
            : 0.0;

        return new ResultadoValoracionSalida(
            costoTotal: $costoTotalConsolidado,
            costoUnitario: $costoUnitarioPonderado,
            capasConsumidas: $capasConsumidas
        );
    }

    /**
     * Calcula la valorización sumando el saldo remanente valorizado de todas las capas vigentes.
     */
    public function calcularValoracionExistencias(
        string $tenantId,
        string $almacenId,
        string $productoId
    ): float {
        $capas = DB::table('capas_inventario')
            ->where('tenant_id', '=', $tenantId)
            ->where('almacen_id', '=', $almacenId)
            ->where('producto_id', '=', $productoId)
            ->where('saldo_remanente', '>', 0)
            ->whereNull('deleted_at')
            ->select(['saldo_remanente', 'costo_unitario'])
            ->get();

        $valoracionTotal = 0.0;
        foreach ($capas as $capa) {
            $valoracionTotal += ((float) $capa->saldo_remanente * (float) $capa->costo_unitario);
        }

        return round($valoracionTotal, 4);
    }
}
