<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para el registro y validación de un Producto en el Catálogo Maestro.
 *
 * Garantiza los invariantes de negocio:
 * - `0 <= stockMinimo <= puntoReorden <= stockMaximo`
 * - Si `perecedero === true`, obligatoriamente `manejaLotes === true`.
 * - Normalización de `sku` en mayúsculas sin espacios laterales.
 */
final readonly class RegistrarProductoDTO
{
    public string $sku;
    public ?string $barcode;
    public string $metodoValoracion;

    public function __construct(
        public string $tenantId,
        public string $categoryId,
        public string $unitOfMeasureId,
        string $sku,
        public string $name,
        ?string $barcode = null,
        public ?string $description = null,
        string $metodoValoracion = 'PROMEDIO_PONDERADO',
        public float $stockMinimo = 0.0,
        public float $puntoReorden = 0.0,
        public float $stockMaximo = 0.0,
        public bool $manejaLotes = false,
        public bool $perecedero = false,
        public string $usuarioCreadorId = '',
    ) {
        if (trim($this->tenantId) === '') {
            throw new InvalidArgumentException('El identificador de organización (tenant_id) es obligatorio.');
        }

        if (trim($this->categoryId) === '' || trim($this->unitOfMeasureId) === '') {
            throw new InvalidArgumentException('La categoría y la unidad de medida son obligatorias para registrar un producto.');
        }

        $skuNormalizado = strtoupper(trim($sku));
        if ($skuNormalizado === '' || !preg_match('/^[A-Z0-9\-_.]{3,64}$/', $skuNormalizado)) {
            throw new InvalidArgumentException(
                'El código SKU debe tener entre 3 y 64 caracteres alfanuméricos, guiones o puntos.'
            );
        }

        if (trim($this->name) === '') {
            throw new InvalidArgumentException('El nombre descriptivo del producto es obligatorio.');
        }

        $metodosPermitidos = ['PEPS', 'UEPS', 'PROMEDIO_PONDERADO'];
        $metodoNorm = strtoupper(trim($metodoValoracion));
        if (!in_array($metodoNorm, $metodosPermitidos, true)) {
            throw new InvalidArgumentException(
                sprintf('Método de valoración inválido [%s]. Valores permitidos: PEPS, UEPS, PROMEDIO_PONDERADO.', $metodoValoracion)
            );
        }

        if ($this->stockMinimo < 0 || $this->puntoReorden < 0 || $this->stockMaximo < 0) {
            throw new InvalidArgumentException('Los umbrales de stock (mínimo, punto de reorden y máximo) no pueden ser negativos.');
        }

        if ($this->puntoReorden < $this->stockMinimo) {
            throw new InvalidArgumentException(
                'Invariante de inventario violado: El Punto de Reorden (ROP) debe ser mayor o igual al Stock Mínimo.'
            );
        }

        if ($this->stockMaximo > 0 && $this->stockMaximo < $this->puntoReorden) {
            throw new InvalidArgumentException(
                'Invariante de inventario violado: El Stock Máximo debe ser mayor o igual al Punto de Reorden (ROP).'
            );
        }

        if ($this->perecedero && !$this->manejaLotes) {
            throw new InvalidArgumentException(
                'Todo producto marcado como perecedero (caducidad FEFO) debe tener activado el control por lotes (maneja_lotes = true).'
            );
        }

        $this->sku = $skuNormalizado;
        $this->barcode = $barcode !== null && trim($barcode) !== '' ? trim($barcode) : null;
        $this->metodoValoracion = $metodoNorm;
    }
}
