<?php

declare(strict_types=1);

namespace App\Modulos\Kardex\Servicios;

use InvalidArgumentException;

/**
 * Servicio de Dominio para Analítica Patrimonial Multi-Almacén, Comparativa
 * de Estrategias de Valoración (PEPS, UEPS, CPP) y Clasificación Pareto ABC
 * (Pantalla 14-Analitica.png y 08-Analitica-MENU-EXPANDIDO.png).
 */
final class AnaliticaValoracionAbcService
{
    /**
     * Clasifica un conjunto de SKUs o almacenes según el principio de Pareto ABC:
     * - Clase A: hasta el 80% del valor patrimonial acumulado
     * - Clase B: del 80% al 95% del valor patrimonial acumulado
     * - Clase C: el 5% restante del valor patrimonial acumulado
     *
     * @param array<int, array{
     *     tenant_id: string,
     *     codigo: string,
     *     nombre: string,
     *     cantidad_disponible: float,
     *     costo_peps: float,
     *     costo_ueps: float,
     *     costo_cpp: float
     * }> $partidas
     * @return array{
     *     tenant_id: string,
     *     valor_total_peps: float,
     *     valor_total_ueps: float,
     *     valor_total_cpp: float,
     *     diferencia_peps_vs_ueps: float,
     *     partidas_clasificadas: array<int, array{
     *         codigo: string,
     *         nombre: string,
     *         valor_peps: float,
     *         porcentaje_participacion: float,
     *         porcentaje_acumulado: float,
     *         clase_abc: string
     *     }>
     * }
     */
    public function generarAnalisisPatrimonialAbc(string $tenantActivoId, array $partidas): array
    {
        if (trim($tenantActivoId) === '') {
            throw new InvalidArgumentException('El identificador tenant_id es obligatorio para la analítica patrimonial.');
        }

        if ($partidas === []) {
            throw new InvalidArgumentException('Se requiere al menos una partida de inventario para calcular Pareto ABC.');
        }

        $totalPeps = 0.0;
        $totalUeps = 0.0;
        $totalCpp = 0.0;
        $calculadas = [];

        foreach ($partidas as $item) {
            if (($item['tenant_id'] ?? '') !== $tenantActivoId) {
                throw new InvalidArgumentException('Violación de aislamiento Multi-Tenant detectada en Analítica ABC.');
            }

            $cantidad = max(0.0, (float) $item['cantidad_disponible']);
            $valPeps = round($cantidad * (float) $item['costo_peps'], 4);
            $valUeps = round($cantidad * (float) $item['costo_ueps'], 4);
            $valCpp = round($cantidad * (float) $item['costo_cpp'], 4);

            $totalPeps = round($totalPeps + $valPeps, 4);
            $totalUeps = round($totalUeps + $valUeps, 4);
            $totalCpp = round($totalCpp + $valCpp, 4);

            $calculadas[] = [
                'codigo' => $item['codigo'],
                'nombre' => $item['nombre'],
                'valor_peps' => $valPeps,
            ];
        }

        usort($calculadas, static fn (array $a, array $b): int => $b['valor_peps'] <=> $a['valor_peps']);

        $acumulado = 0.0;
        $clasificadas = [];

        foreach ($calculadas as $fila) {
            $participacion = $totalPeps > 0
                ? round(($fila['valor_peps'] / $totalPeps) * 100, 2)
                : 0.0;
            $acumuladoAntes = $acumulado;
            $acumulado = round(min(100.0, $acumulado + $participacion), 2);

            $claseAbc = 'C';
            if ($acumuladoAntes < 80.0) {
                $claseAbc = 'A';
            } elseif ($acumuladoAntes < 95.0) {
                $claseAbc = 'B';
            }

            $clasificadas[] = [
                'codigo' => $fila['codigo'],
                'nombre' => $fila['nombre'],
                'valor_peps' => $fila['valor_peps'],
                'porcentaje_participacion' => $participacion,
                'porcentaje_acumulado' => $acumulado,
                'clase_abc' => $claseAbc,
            ];
        }

        return [
            'tenant_id' => $tenantActivoId,
            'valor_total_peps' => $totalPeps,
            'valor_total_ueps' => $totalUeps,
            'valor_total_cpp' => $totalCpp,
            'diferencia_peps_vs_ueps' => round($totalPeps - $totalUeps, 4),
            'partidas_clasificadas' => $clasificadas,
        ];
    }
}
