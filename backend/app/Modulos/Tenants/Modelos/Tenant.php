<?php

declare(strict_types=1);

namespace App\Modulos\Tenants\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;

/**
 * Modelo Eloquent para la entidad Tenant (Organización / Empresa Inquilina SaaS).
 *
 * Cumple el estándar de 7 campos Multi-Tenant:
 * id (UUID), tenant_id (UUID autorreferenciado), created_at, updated_at,
 * deleted_at, created_by, updated_by.
 */
final class Tenant extends ModeloBaseTenant
{
    protected $table = 'tenants';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'id',
        'tenant_id',
        'code',
        'name',
        'tax_id',
        'email',
        'phone',
        'address',
        'default_valuation',
        'allow_negative_stock',
        'max_warehouses',
        'max_users',
        'is_active',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allow_negative_stock' => 'boolean',
            'max_warehouses' => 'integer',
            'max_users' => 'integer',
            'is_active' => 'boolean',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
            'deleted_at' => 'immutable_datetime',
        ];
    }

    /**
     * Verifica si el inquilino se encuentra activo y habilitado para operar.
     */
    public function estaActivo(): bool
    {
        return (bool) $this->is_active && $this->deleted_at === null;
    }

    /**
     * Determina si la política del tenant permite inventario negativo auditado.
     */
    public function permiteStockNegativo(): bool
    {
        return (bool) $this->allow_negative_stock;
    }
}
