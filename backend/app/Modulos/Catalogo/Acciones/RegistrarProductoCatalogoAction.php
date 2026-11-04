<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\Acciones;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Catalogo\DTOs\RegistrarProductoDTO;
use App\Modulos\Catalogo\Modelos\Producto;
use App\Modulos\Catalogo\Servicios\ValidadorCodigoBarrasService;
use InvalidArgumentException;
use RuntimeException;

/**
 * Caso de uso para el alta de un Producto en el Catálogo Maestro del Tenant.
 *
 * Verifica:
 * 1. Aislamiento estricto del `tenant_id` activo.
 * 2. Validez del código de barras EAN-13 si es numérico de 13 dígitos, o autogeneración EAN-13 interno.
 * 3. Unicidad de SKU dentro del catálogo del Tenant.
 */
final class RegistrarProductoCatalogoAction
{
    public function __construct(
        private readonly ValidadorCodigoBarrasService $validadorCodigoBarras,
    ) {
    }

    /**
     * Construye e instancia un `Producto` validado y aislado por Tenant.
     *
     * @param array<string, bool> $skusExistentesEnTenant Mapa opcional de SKUs ya registrados para validación en memoria/BD
     */
    public function ejecutar(
        RegistrarProductoDTO $dto,
        array $skusExistentesEnTenant = [],
        ?int $consecutivoAutogeneradoEan = null
    ): Producto {
        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();

        if ($tenantActual === null || $tenantActual !== $dto->tenantId) {
            throw new RuntimeException(
                sprintf(
                    'Violación de aislamiento Multi-Tenant al registrar producto. Contexto activo [%s] no coincide con DTO [%s].',
                    (string) $tenantActual,
                    $dto->tenantId
                )
            );
        }

        if (isset($skusExistentesEnTenant[$dto->sku])) {
            throw new InvalidArgumentException(
                sprintf('El código SKU [%s] ya se encuentra registrado en el catálogo de esta organización.', $dto->sku)
            );
        }

        $codigoBarrasFinal = $dto->barcode;

        if ($codigoBarrasFinal !== null) {
            // Si es un código numérico de 13 dígitos, validar dígito verificador GS1
            if (preg_match('/^\d{13}$/', $codigoBarrasFinal) && !$this->validadorCodigoBarras->esEan13Valido($codigoBarrasFinal)) {
                throw new InvalidArgumentException(
                    sprintf('El código de barras EAN-13 [%s] no cumple con la suma de verificación GS1.', $codigoBarrasFinal)
                );
            }
        } elseif ($consecutivoAutogeneradoEan !== null) {
            $codigoBarrasFinal = $this->validadorCodigoBarras->generarEan13Interno($consecutivoAutogeneradoEan);
        }

        $producto = new Producto([
            'category_id' => $dto->categoryId,
            'unit_of_measure_id' => $dto->unitOfMeasureId,
            'sku' => $dto->sku,
            'barcode' => $codigoBarrasFinal,
            'name' => $dto->name,
            'description' => $dto->description,
            'metodo_valoracion' => $dto->metodoValoracion,
            'stock_minimo' => $dto->stockMinimo,
            'punto_reorden' => $dto->puntoReorden,
            'stock_maximo' => $dto->stockMaximo,
            'maneja_lotes' => $dto->manejaLotes,
            'perecedero' => $dto->perecedero,
            'is_active' => true,
            'created_by' => $dto->usuarioCreadorId !== '' ? $dto->usuarioCreadorId : null,
            'updated_by' => $dto->usuarioCreadorId !== '' ? $dto->usuarioCreadorId : null,
        ]);

        $producto->id = (string) \Illuminate\Support\Str::uuid();
        $producto->tenant_id = $tenantActual;

        return $producto;
    }
}
