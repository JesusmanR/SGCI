<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo Eloquent para Categorías Jerárquicas de Productos (`categories`).
 *
 * Soporta árboles de clasificación multinivel (`parent_id`) aislados por `tenant_id`.
 */
class Categoria extends ModeloBaseTenant
{
    protected $table = 'categories';

    protected $fillable = [
        'parent_id',
        'code',
        'name',
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
     * Categoría padre dentro de la jerarquía del mismo Tenant.
     */
    public function categoriaPadre(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Subcategorías hijas directas.
     */
    public function subcategorias(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /**
     * Productos asociados a esta categoría.
     */
    public function productos(): HasMany
    {
        return $this->hasMany(Producto::class, 'category_id');
    }

    /**
     * Construye la ruta legible de la categoría (ej. "Industrial > Hidráulica > Válvulas").
     */
    public function construirRutaJerarquica(?string $nombrePadre = null): string
    {
        if ($nombrePadre !== null && trim($nombrePadre) !== '') {
            return sprintf('%s > %s', trim($nombrePadre), $this->name);
        }

        return (string) $this->name;
    }
}
