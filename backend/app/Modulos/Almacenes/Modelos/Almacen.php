<?php

declare(strict_types=1);

namespace App\Modulos\Almacenes\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Eloquent para Almacenes / Bodegas Físicas (`warehouses`).
 *
 * Cada organización (`tenant_id`) puede operar múltiples almacenes con su propio
 * responsable (`manager_id`), topología de ubicaciones y saldos independientes en el Kardex.
 */
class Almacen extends ModeloBaseTenant
{
    protected $table = 'warehouses';

    protected $fillable = [
        'code',
        'name',
        'address',
        'manager_id',
        'is_active',
        'is_default',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Ubicaciones físicas (Zona / Pasillo / Estante / Nivel) dentro de este almacén.
     */
    public function ubicaciones(): HasMany
    {
        return $this->hasMany(UbicacionAlmacen::class, 'warehouse_id');
    }
}
