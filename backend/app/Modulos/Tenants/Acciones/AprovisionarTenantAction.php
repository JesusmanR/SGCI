<?php

declare(strict_types=1);

namespace App\Modulos\Tenants\Acciones;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Autenticacion\Enums\RolSistemaEnum;
use App\Modulos\Tenants\DTOs\RegistrarTenantDTO;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Acción de dominio para aprovisionar atómicamente una organización (Tenant),
 * su almacén principal inicial y su usuario Administrador (`ADMIN_TENANT`).
 */
final class AprovisionarTenantAction
{
    /**
     * Ejecuta el aprovisionamiento transaccional del Tenant.
     *
     * @return array{
     *     tenant_id: string,
     *     admin_user_id: string,
     *     almacen_principal_id: string,
     *     metodo_valoracion: string,
     *     rol_asignado: string
     * }
     */
    public function handle(RegistrarTenantDTO $dto): array
    {
        return DB::transaction(function () use ($dto): array {
            $ahora = now();
            $adminUserId = (string) Str::uuid();
            $almacenPrincipalId = (string) Str::uuid();
            $creadorId = $dto->created_by ?? $adminUserId;

            ModeloBaseTenant::fijarTenantContexto($dto->tenant_id);

            // 1. Insertar registro maestro del Tenant
            DB::table('tenants')->insert([
                'id' => $dto->id,
                'tenant_id' => $dto->tenant_id,
                'code' => $dto->codigo,
                'name' => $dto->razon_social,
                'tax_id' => $dto->identificacion_fiscal,
                'email' => $dto->email_corporativo,
                'default_valuation' => $dto->metodo_valoracion_defecto,
                'allow_negative_stock' => $dto->permite_stock_negativo,
                'max_warehouses' => $dto->limite_almacenes,
                'max_users' => $dto->limite_usuarios,
                'is_active' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
                'deleted_at' => null,
                'created_by' => $creadorId,
                'updated_by' => $creadorId,
            ]);

            // 2. Crear Almacén Central por defecto para el Tenant
            DB::table('warehouses')->insert([
                'id' => $almacenPrincipalId,
                'tenant_id' => $dto->tenant_id,
                'code' => 'ALM-CENTRAL-01',
                'name' => 'Almacén Central Principal',
                'is_main' => true,
                'is_active' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
                'deleted_at' => null,
                'created_by' => $creadorId,
                'updated_by' => $creadorId,
            ]);

            // 3. Crear usuario Administrador del Tenant (ADMIN_TENANT)
            DB::table('users')->insert([
                'id' => $adminUserId,
                'tenant_id' => $dto->tenant_id,
                'email' => $dto->admin_email,
                'password_hash' => $dto->admin_password_hash,
                'full_name' => $dto->admin_nombre_completo,
                'is_active' => true,
                'created_at' => $ahora,
                'updated_at' => $ahora,
                'deleted_at' => null,
                'created_by' => $creadorId,
                'updated_by' => $creadorId,
            ]);

            // 4. Asignar el rol canónico ADMIN_TENANT en user_roles
            DB::table('user_roles')->insert([
                'id' => (string) Str::uuid(),
                'tenant_id' => $dto->tenant_id,
                'user_id' => $adminUserId,
                'role' => RolSistemaEnum::ADMIN_TENANT->value,
                'warehouse_id' => null, // Alcance global dentro de su propio Tenant
                'created_at' => $ahora,
                'updated_at' => $ahora,
                'deleted_at' => null,
                'created_by' => $creadorId,
                'updated_by' => $creadorId,
            ]);

            return [
                'tenant_id' => $dto->tenant_id,
                'admin_user_id' => $adminUserId,
                'almacen_principal_id' => $almacenPrincipalId,
                'metodo_valoracion' => $dto->metodo_valoracion_defecto,
                'rol_asignado' => RolSistemaEnum::ADMIN_TENANT->value,
            ];
        });
    }
}
