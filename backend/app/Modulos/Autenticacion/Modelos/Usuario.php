<?php

declare(strict_types=1);

namespace App\Modulos\Autenticacion\Modelos;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Autenticacion\Enums\RolSistemaEnum;
use Illuminate\Support\Facades\DB;

/**
 * Modelo Eloquent para Usuarios del Sistema con aislamiento Multi-Tenant (`tenant_id`)
 * y soporte para los 10 roles RBAC.
 */
final class Usuario extends ModeloBaseTenant
{
    protected $table = 'users';

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'id',
        'tenant_id',
        'email',
        'password_hash',
        'full_name',
        'is_active',
        'last_login_at',
        'created_by',
        'updated_by',
    ];

    /**
     * @var array<int, string>
     */
    protected $hidden = [
        'password_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_login_at' => 'immutable_datetime',
            'created_at' => 'immutable_datetime',
            'updated_at' => 'immutable_datetime',
            'deleted_at' => 'immutable_datetime',
        ];
    }

    /**
     * Obtiene los códigos de rol asignados al usuario dentro de su Tenant.
     *
     * @return array<int, string>
     */
    public function obtenerRoles(): array
    {
        return DB::table('user_roles')
            ->where('tenant_id', '=', $this->tenant_id)
            ->where('user_id', '=', $this->id)
            ->whereNull('deleted_at')
            ->pluck('role')
            ->map(static fn (mixed $rol): string => (string) $rol)
            ->values()
            ->all();
    }

    /**
     * Obtiene los IDs de almacenes específicamente asignados al usuario en `user_roles`.
     *
     * @return array<int, string>
     */
    public function obtenerAlmacenesAsignados(): array
    {
        return DB::table('user_roles')
            ->where('tenant_id', '=', $this->tenant_id)
            ->where('user_id', '=', $this->id)
            ->whereNotNull('warehouse_id')
            ->whereNull('deleted_at')
            ->pluck('warehouse_id')
            ->map(static fn (mixed $id): string => (string) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * Determina si el usuario posee un rol específico.
     */
    public function tieneRol(RolSistemaEnum|string $rol): bool
    {
        $codigo = $rol instanceof RolSistemaEnum ? $rol->value : $rol;

        return in_array($codigo, $this->obtenerRoles(), true);
    }
}
