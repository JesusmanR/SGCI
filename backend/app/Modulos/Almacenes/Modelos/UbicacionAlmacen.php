<?php

declare(strict_types=1);

namespace App\Modulos\Almacenes\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use InvalidArgumentException;

/**
 * Modelo Eloquent para Ubicaciones Físicas de Almacén (`warehouse_locations` / Bin Locations).
 *
 * Representa la coordenada exacta de estantería: Zona -> Pasillo -> Estante (Rack) -> Nivel.
 */
class UbicacionAlmacen extends ModeloBaseTenant
{
    protected $table = 'warehouse_locations';

    protected $fillable = [
        'warehouse_id',
        'code',
        'zona',
        'pasillo',
        'estante',
        'nivel',
        'description',
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
     * Almacén físico al que pertenece la ubicación.
     */
    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'warehouse_id');
    }

    /**
     * Construye el código canónico de ubicación Bin (ej. `ZONA-A-P04-E02-N01`).
     */
    public static function construirCodigoUbicacion(
        string $zona,
        string $pasillo,
        string $estante,
        string $nivel
    ): string {
        $z = strtoupper(trim($zona));
        $p = strtoupper(trim($pasillo));
        $e = strtoupper(trim($estante));
        $n = strtoupper(trim($nivel));

        if ($z === '' || $p === '' || $e === '' || $n === '') {
            throw new InvalidArgumentException(
                'Todos los segmentos topológicos (zona, pasillo, estante y nivel) son obligatorios para generar el código Bin.'
            );
        }

        return sprintf('%s-%s-%s-%s', $z, $p, $e, $n);
    }
}
