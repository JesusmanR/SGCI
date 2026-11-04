<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Eloquent para Unidades de Medida (`units_of_measure`).
 *
 * Ejemplos: PZA (Pieza), KG (Kilogramo), LTS (Litro), MTR (Metro), CAJ (Caja), TAR (Tarima).
 */
class UnidadMedida extends ModeloBaseTenant
{
    protected $table = 'units_of_measure';

    protected $fillable = [
        'code',
        'name',
        'symbol',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Productos que utilizan esta unidad de medida como base de Kardex.
     */
    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class, 'unit_of_measure_id');
    }
}
