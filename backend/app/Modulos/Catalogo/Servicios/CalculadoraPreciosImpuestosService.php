<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\Servicios;

use App\Modulos\Catalogo\DTOs\ReglaGananciaImpuestoDTO;
use DomainException;
use InvalidArgumentException;

/**
 * Servicio de dominio para el cálculo de precios sugeridos, vista previa de impuestos
 * e importación masiva de listas de precios vía CSV (Pantallas Figma 46 a 52 y 77).
 */
final class CalculadoraPreciosImpuestosService
{
    /**
     * Calcula el precio sugerido antes de impuestos según la regla activa:
     * - markup (Recargo sobre el costo): Costo * (1 + porcentaje / 100)
     * - margin (Margen sobre la venta): Costo / (1 - porcentaje / 100)
     */
    public function calcularPrecioSugeridoSinIva(float $costoCompra, ReglaGananciaImpuestoDTO $regla): float
    {
        if ($costoCompra < 0) {
            throw new InvalidArgumentException('El costo de compra no puede ser negativo.');
        }

        $proporcion = $regla->porcentajeGanancia / 100.0;

        $precioSinIva = $regla->metodoGanancia === ReglaGananciaImpuestoDTO::METODO_MARGEN_VENTA
            ? $costoCompra / (1.0 - $proporcion)
            : $costoCompra * (1.0 + $proporcion);

        return round($precioSinIva, 2);
    }

    /**
     * Genera el desglose exacto del panel lateral "ASÍ SE CALCULA" (Pantallas Figma 46 y 47).
     *
     * @return array{
     *   costo_compra: float,
     *   ganancia_valor: float,
     *   precio_antes_impuestos: float,
     *   iva_valor: float,
     *   precio_final_cliente: float
     * }
     */
    public function simularDesglosePrecio(float $costoEjemplo, ReglaGananciaImpuestoDTO $regla): array
    {
        $precioSinIva = $this->calcularPrecioSugeridoSinIva($costoEjemplo, $regla);
        $gananciaValor = round($precioSinIva - $costoEjemplo, 2);
        $ivaValor = round(($precioSinIva * $regla->tasaIvaPorcentaje) / 100.0, 2);
        $precioFinal = round($precioSinIva + $ivaValor, 2);

        return [
            'costo_compra' => round($costoEjemplo, 2),
            'ganancia_valor' => $gananciaValor,
            'precio_antes_impuestos' => $precioSinIva,
            'iva_valor' => $ivaValor,
            'precio_final_cliente' => $precioFinal,
        ];
    }

    /**
     * Analiza un archivo CSV con columnas SKU, Costo y Precio (soporta coma o punto y coma).
     * Replica las validaciones exactas de la Pantalla Figma 51-revision-csv.
     *
     * @param array<string, array{sku: string, nombre: string, costo: float, precio: float, tenant_id: string}> $catalogoActualPorSku
     * @return list<array{
     *   sku: string,
     *   nombre: string,
     *   costo_anterior: float,
     *   nuevo_costo: float,
     *   precio_actual: float,
     *   nuevo_precio: float,
     *   variacion_precio: float,
     *   margen_porcentaje: float,
     *   bajo_costo: bool
     * }>
     */
    public function procesarImportacionCsv(
        string $contenidoCsv,
        string $tenantId,
        array $catalogoActualPorSku,
    ): array {
        $limpio = preg_replace('/^\xEF\xBB\xBF/', '', trim($contenidoCsv)) ?? '';
        if ($limpio === '') {
            throw new InvalidArgumentException('El archivo CSV está vacío.');
        }

        $lineas = preg_split('/\r\n|\r|\n/', $limpio) ?: [];
        if (count($lineas) < 2) {
            throw new InvalidArgumentException('El archivo no contiene productos.');
        }

        $primeraLinea = $lineas[0];
        $separador = str_contains($primeraLinea, ';') ? ';' : ',';

        $cabeceras = array_map(
            static fn (string $col): string => mb_strtolower(trim($col)),
            str_getcsv($primeraLinea, $separador)
        );

        $idxSku = array_search('sku', $cabeceras, true);
        $idxCosto = array_search('costo', $cabeceras, true);
        $idxPrecio = array_search('precio', $cabeceras, true);

        if ($idxSku === false || $idxCosto === false || $idxPrecio === false) {
            throw new InvalidArgumentException(
                'El archivo debe incluir las columnas SKU, Costo y Precio.'
            );
        }

        $skusVistos = [];
        $cambiosPropuestos = [];

        for ($i = 1, $total = count($lineas); $i < $total; $i++) {
            $linea = trim($lineas[$i]);
            if ($linea === '') {
                continue;
            }

            $columnas = str_getcsv($linea, $separador);
            $numeroFila = $i + 1;
            $sku = trim((string) ($columnas[$idxSku] ?? ''));

            if ($sku === '' || ! isset($catalogoActualPorSku[$sku])) {
                throw new DomainException("Fila {$numeroFila}: SKU desconocido (" . ($sku !== '' ? $sku : 'vacío') . ').');
            }

            $producto = $catalogoActualPorSku[$sku];
            if ($producto['tenant_id'] !== $tenantId) {
                throw new DomainException(" Violación Multi-Tenant en fila {$numeroFila}: el SKU {$sku} pertenece a otro inquilino.");
            }

            if (isset($skusVistos[$sku])) {
                throw new DomainException("Fila {$numeroFila}: el SKU {$sku} está duplicado.");
            }
            $skusVistos[$sku] = true;

            $costoRaw = str_replace(',', '.', trim((string) ($columnas[$idxCosto] ?? '')));
            $precioRaw = str_replace(',', '.', trim((string) ($columnas[$idxPrecio] ?? '')));

            if ($costoRaw === '' || $precioRaw === '' || ! is_numeric($costoRaw) || ! is_numeric($precioRaw)) {
                throw new InvalidArgumentException(
                    "Fila {$numeroFila}: costo o precio inválido. Usa valores numéricos positivos."
                );
            }

            $nuevoCosto = round((float) $costoRaw, 2);
            $nuevoPrecio = round((float) $precioRaw, 2);

            if ($nuevoCosto < 0 || $nuevoPrecio <= 0) {
                throw new InvalidArgumentException(
                    "Fila {$numeroFila}: costo o precio inválido. Usa valores numéricos positivos."
                );
            }

            $precioActual = round((float) $producto['precio'], 2);
            $variacionPrecio = round($nuevoPrecio - $precioActual, 2);
            $margenPorcentaje = round((($nuevoPrecio - $nuevoCosto) / $nuevoPrecio) * 100.0, 2);

            $cambiosPropuestos[] = [
                'sku' => $sku,
                'nombre' => $producto['nombre'],
                'costo_anterior' => round((float) $producto['costo'], 2),
                'nuevo_costo' => $nuevoCosto,
                'precio_actual' => $precioActual,
                'nuevo_precio' => $nuevoPrecio,
                'variacion_precio' => $variacionPrecio,
                'margen_porcentaje' => $margenPorcentaje,
                'bajo_costo' => $nuevoPrecio < $nuevoCosto,
            ];
        }

        if ($cambiosPropuestos === []) {
            throw new InvalidArgumentException('El archivo no contiene productos.');
        }

        return $cambiosPropuestos;
    }

    /**
     * Aplica los cambios de precios validando la confirmación explícita cuando existen
     * precios por debajo del costo (Pantalla Figma 77-confirmar-bajo-costo).
     *
     * @param list<array{sku: string, nuevo_costo: float, nuevo_precio: float, bajo_costo: bool}> $cambiosPropuestos
     * @return array{actualizados: int, mensaje: string}
     */
    public function confirmarPublicacionPrecios(
        array $cambiosPropuestos,
        bool $autorizaBajoCosto,
    ): array {
        $tieneBajoCosto = false;
        foreach ($cambiosPropuestos as $cambio) {
            if ($cambio['bajo_costo'] || $cambio['nuevo_precio'] < $cambio['nuevo_costo']) {
                $tieneBajoCosto = true;
                break;
            }
        }

        if ($tieneBajoCosto && ! $autorizaBajoCosto) {
            throw new DomainException(
                'Confirma que autorizas precios por debajo del costo antes de aplicar.'
            );
        }

        $cantidad = count($cambiosPropuestos);

        return [
            'actualizados' => $cantidad,
            'mensaje' => "Lista de precios actualizada ({$cantidad} productos).",
        ];
    }
}
