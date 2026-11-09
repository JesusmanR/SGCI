<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Autenticacion\Enums\RolSistemaEnum;
use DateTimeImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Seeder Oficial de Demostración para Entrega MVP v1.12.0 (UAT).
 *
 * Inicializa de forma 100% idempotente el conjunto de datos canónico del sistema:
 * 1. Tenant: Industrias Alfa S.A.S. (IND-ALFA · tenant_id: 8f2a...c91d).
 * 2. 3 Bodegas / Almacenes: ALM-CENTRAL-01 (Monterrey), ALM-NORTE-02 (Saltillo), ALM-SUR-03 (Querétaro).
 * 3. 4 Ubicaciones topológicas bin: A-04-R02-NB, B-02-R08-NA, B-06-R03-NC, ZONA-CUARENTENA-01.
 * 4. Catálogos base: Categorías y Unidades de Medida oficiales (PZA, UND).
 * 5. 3 SKUs Maestros: AC-100-FLEX, RB-220-INOX, FL-084-NBR con umbrales ROP y métodos de valoración.
 * 6. 4 Lotes FEFO: LOTE-2026-089, LOTE-2026-101, LOTE-2027-014 y LOTE-2026-019 (Cuarentena).
 * 7. Saldos y Existencias físicas consolidadas en warehouse_stocks.
 * 8. Proveedores Homologados: Metalnova Industrial S.A. y Nortek Suministros S.A.S.
 * 9. 2 Órdenes de Compra: OC-2026-0118 (Recibida/Conciliada) y OC-2026-0119 (Aprobada/Muelle 01).
 * 10. 10 Usuarios canónicos RBAC con roles oficiales (Laura Mendoza, Carlos Morales, Diego Ríos, etc.).
 */
final class SgciMvpDemoSeeder extends Seeder
{
    // =========================================================================
    // IDENTIFICADORES DETERMINÍSTICOS (UUIDv4) PARA IDEMPOTENCIA ABSOLUTA
    // =========================================================================

    public const TENANT_ID = '8f2a4c10-5b3e-4d7a-9a1c-8e2b3c40c91d';

    // Almacenes
    public const ALM_CENTRAL_ID = 'a1111111-1111-4000-8000-000000000001';
    public const ALM_NORTE_ID   = 'a1111111-1111-4000-8000-000000000002';
    public const ALM_SUR_ID     = 'a1111111-1111-4000-8000-000000000003';

    // Ubicaciones Bin
    public const UBIC_A04_ID  = 'f1111111-1111-4000-8000-000000000001';
    public const UBIC_B02_ID  = 'f1111111-1111-4000-8000-000000000002';
    public const UBIC_B06_ID  = 'f1111111-1111-4000-8000-000000000003';
    public const UBIC_CUAR_ID = 'f1111111-1111-4000-8000-000000000004';

    // Categorías y Unidades
    public const CAT_VALVULAS_ID    = 'a2222222-2222-4000-8000-000000000001';
    public const CAT_RODAMIENTOS_ID = 'a2222222-2222-4000-8000-000000000002';
    public const CAT_SELLOS_ID      = 'a2222222-2222-4000-8000-000000000003';
    public const UOM_PZA_ID         = 'a3333333-3333-4000-8000-000000000001';
    public const UOM_UND_ID         = 'a3333333-3333-4000-8000-000000000002';

    // SKUs Maestros
    public const PROD_VALVULA_ID    = 'b1111111-1111-4000-8000-000000000001'; // AC-100-FLEX
    public const PROD_RODAMIENTO_ID = 'b1111111-1111-4000-8000-000000000002'; // RB-220-INOX
    public const PROD_SELLO_ID      = 'b1111111-1111-4000-8000-000000000003'; // FL-084-NBR

    // Lotes FEFO
    public const LOTE_089_ID = 'c1111111-1111-4000-8000-000000000001'; // LOTE-2026-089
    public const LOTE_101_ID = 'c1111111-1111-4000-8000-000000000002'; // LOTE-2026-101
    public const LOTE_014_ID = 'c1111111-1111-4000-8000-000000000003'; // LOTE-2027-014
    public const LOTE_019_ID = 'c1111111-1111-4000-8000-000000000004'; // LOTE-2026-019 (Cuarentena)

    // Proveedores
    public const PROV_METALNOVA_ID = 'd1111111-1111-4000-8000-000000000001';
    public const PROV_NORTEK_ID    = 'd1111111-1111-4000-8000-000000000002';

    // Órdenes de Compra
    public const OC_0118_ID = 'e1111111-1111-4000-8000-000000000001'; // OC-2026-0118
    public const OC_0119_ID = 'e1111111-1111-4000-8000-000000000002'; // OC-2026-0119

    // Usuarios Canónicos
    public const USER_LAURA_ID      = 'u1111111-1111-4000-8000-000000000001';
    public const USER_CARLOS_ID     = 'u1111111-1111-4000-8000-000000000002';
    public const USER_ROBERTO_ID    = 'u1111111-1111-4000-8000-000000000003';
    public const USER_MARIANA_ID    = 'u1111111-1111-4000-8000-000000000004';
    public const USER_DIEGO_ID      = 'u1111111-1111-4000-8000-000000000005';
    public const USER_PATRICIA_ID   = 'u1111111-1111-4000-8000-000000000006';
    public const USER_ANA_ID        = 'u1111111-1111-4000-8000-000000000007';
    public const USER_FERNANDO_ID   = 'u1111111-1111-4000-8000-000000000008';
    public const USER_LUCIA_ID      = 'u1111111-1111-4000-8000-000000000009';
    public const USER_SUPERADMIN_ID = 'u1111111-1111-4000-8000-000000000010';

    /**
     * Ejecuta el sembrado atómico e idempotente de datos del MVP.
     */
    public function run(): void
    {
        DB::transaction(function (): void {
            $ahora = new DateTimeImmutable('now');
            $fechaAhora = $ahora->format('Y-m-d H:i:s');
            $passwordHashComun = password_hash('Alfa2026*Uat!', PASSWORD_BCRYPT);

            // Fijar contexto del Tenant para consistencia con Global Scope
            ModeloBaseTenant::fijarTenantContexto(self::TENANT_ID);

            // -----------------------------------------------------------------
            // 1. TENANT MAESTRO: Industrias Alfa S.A.S. (IND-ALFA)
            // -----------------------------------------------------------------
            $this->safeUpsert(
                table: 'tenants',
                match: ['id' => self::TENANT_ID],
                attributes: [
                    'id' => self::TENANT_ID,
                    'tenant_id' => self::TENANT_ID,
                    'code' => 'IND-ALFA',
                    'name' => 'Industrias Alfa S.A.S.',
                    'tax_id' => '900123456-1',
                    'email' => 'contacto@industriasalfa.com',
                    'phone' => '+52 (81) 8190-2026',
                    'address' => 'Av. Parque Industrial Monterrey #400, Apodaca, N.L., México',
                    'default_valuation' => 'PROMEDIO_PONDERADO',
                    'allow_negative_stock' => false,
                    'max_warehouses' => 10,
                    'max_users' => 50,
                    'is_active' => true,
                    'created_at' => $fechaAhora,
                    'updated_at' => $fechaAhora,
                    'deleted_at' => null,
                    'created_by' => self::USER_CARLOS_ID,
                    'updated_by' => self::USER_CARLOS_ID,
                ]
            );

            // -----------------------------------------------------------------
            // 2. LAS 3 BODEGAS / ALMACENES
            // -----------------------------------------------------------------
            $bodegas = [
                [
                    'id' => self::ALM_CENTRAL_ID,
                    'code' => 'ALM-CENTRAL-01',
                    'name' => 'Bodega Central Monterrey',
                    'address' => 'Av. Parque Industrial Monterrey #400, Módulo A, Apodaca, N.L.',
                    'manager_id' => self::USER_LAURA_ID,
                    'is_default' => true,
                    'is_main' => true,
                    'is_active' => true,
                ],
                [
                    'id' => self::ALM_NORTE_ID,
                    'code' => 'ALM-NORTE-02',
                    'name' => 'Centro Logístico Saltillo',
                    'address' => 'Carretera Saltillo-Mty Km 12.5, Ramos Arizpe, Coah.',
                    'manager_id' => null,
                    'is_default' => false,
                    'is_main' => false,
                    'is_active' => true,
                ],
                [
                    'id' => self::ALM_SUR_ID,
                    'code' => 'ALM-SUR-03',
                    'name' => 'Centro de Distribución Querétaro',
                    'address' => 'Parque Industrial El Marqués, Querétaro, Qro.',
                    'manager_id' => null,
                    'is_default' => false,
                    'is_main' => false,
                    'is_active' => true,
                ],
            ];

            foreach ($bodegas as $bodega) {
                $this->safeUpsert(
                    table: 'warehouses',
                    match: ['tenant_id' => self::TENANT_ID, 'code' => $bodega['code']],
                    attributes: array_merge($bodega, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_CARLOS_ID,
                        'updated_by' => self::USER_CARLOS_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 3. TOPOLOGÍA DE UBICACIONES BIN (ALM-CENTRAL-01)
            // -----------------------------------------------------------------
            $ubicaciones = [
                [
                    'id' => self::UBIC_A04_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'code' => 'A-04-R02-NB',
                    'zona' => 'A',
                    'pasillo' => '04',
                    'estante' => 'R02',
                    'nivel' => 'NB',
                    'description' => 'Pasillo A · Rack 02 · Nivel B (Válvulas y Regulación)',
                    'is_active' => true,
                ],
                [
                    'id' => self::UBIC_B02_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'code' => 'B-02-R08-NA',
                    'zona' => 'B',
                    'pasillo' => '02',
                    'estante' => 'R08',
                    'nivel' => 'NA',
                    'description' => 'Pasillo B · Rack 08 · Nivel A (Rodamientos Inoxidables)',
                    'is_active' => true,
                ],
                [
                    'id' => self::UBIC_B06_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'code' => 'B-06-R03-NC',
                    'zona' => 'B',
                    'pasillo' => '06',
                    'estante' => 'R03',
                    'nivel' => 'NC',
                    'description' => 'Pasillo B · Rack 06 · Nivel C (Sellos y Empaques)',
                    'is_active' => true,
                ],
                [
                    'id' => self::UBIC_CUAR_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'code' => 'ZONA-CUARENTENA-01',
                    'zona' => 'CUARENTENA',
                    'pasillo' => 'C01',
                    'estante' => 'R01',
                    'nivel' => 'N1',
                    'description' => 'Área Restringida de Cuarentena e Inspección Técnica',
                    'is_active' => true,
                ],
            ];

            foreach ($ubicaciones as $ubicacion) {
                $this->safeUpsert(
                    table: 'warehouse_locations',
                    match: [
                        'tenant_id' => self::TENANT_ID,
                        'warehouse_id' => $ubicacion['warehouse_id'],
                        'code' => $ubicacion['code'],
                    ],
                    attributes: array_merge($ubicacion, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_LAURA_ID,
                        'updated_by' => self::USER_LAURA_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 4. CATEGORÍAS Y UNIDADES DE MEDIDA BASE
            // -----------------------------------------------------------------
            $categorias = [
                [
                    'id' => self::CAT_VALVULAS_ID,
                    'code' => 'CAT-VALVULAS',
                    'name' => 'Válvulas y Conexiones Industriales',
                    'description' => 'Componentes de control de flujo, presión y diafragmas.',
                    'parent_id' => null,
                    'is_active' => true,
                ],
                [
                    'id' => self::CAT_RODAMIENTOS_ID,
                    'code' => 'CAT-RODAMIENTOS',
                    'name' => 'Rodamientos y Transmisión de Potencia',
                    'description' => 'Rodamientos rígidos de bolas, sellados e inoxidables.',
                    'parent_id' => null,
                    'is_active' => true,
                ],
                [
                    'id' => self::CAT_SELLOS_ID,
                    'code' => 'CAT-SELLOS',
                    'name' => 'Sellos Mecánicos y Juntas',
                    'description' => 'Sellos elastómeros NBR, vitón y empaquetaduras mecánicas.',
                    'parent_id' => null,
                    'is_active' => true,
                ],
            ];

            foreach ($categorias as $cat) {
                $this->safeUpsert(
                    table: 'categories',
                    match: ['tenant_id' => self::TENANT_ID, 'code' => $cat['code']],
                    attributes: array_merge($cat, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_CARLOS_ID,
                        'updated_by' => self::USER_CARLOS_ID,
                    ])
                );
            }

            $unidades = [
                [
                    'id' => self::UOM_PZA_ID,
                    'code' => 'PZA',
                    'name' => 'Pieza',
                    'symbol' => 'PZA',
                    'is_active' => true,
                ],
                [
                    'id' => self::UOM_UND_ID,
                    'code' => 'UND',
                    'name' => 'Unidad',
                    'symbol' => 'UND',
                    'is_active' => true,
                ],
            ];

            foreach ($unidades as $uom) {
                $this->safeUpsert(
                    table: 'units_of_measure',
                    match: ['tenant_id' => self::TENANT_ID, 'code' => $uom['code']],
                    attributes: array_merge($uom, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_CARLOS_ID,
                        'updated_by' => self::USER_CARLOS_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 5. LOS 3 SKUS MAESTROS
            // -----------------------------------------------------------------
            $productos = [
                [
                    'id' => self::PROD_VALVULA_ID,
                    'category_id' => self::CAT_VALVULAS_ID,
                    'unit_of_measure_id' => self::UOM_PZA_ID,
                    'sku' => 'AC-100-FLEX',
                    'barcode' => '7501000010015',
                    'name' => 'Válvula de Presión Industrial 2"',
                    'description' => 'Válvula flexible de diafragma para alta presión y fluidos corrosivos.',
                    'metodo_valoracion' => 'PEPS',
                    'stock_minimo' => 12.0000,
                    'punto_reorden' => 18.0000,
                    'stock_maximo' => 48.0000,
                    'maneja_lotes' => true,
                    'perecedero' => true,
                    'is_active' => true,
                ],
                [
                    'id' => self::PROD_RODAMIENTO_ID,
                    'category_id' => self::CAT_RODAMIENTOS_ID,
                    'unit_of_measure_id' => self::UOM_PZA_ID,
                    'sku' => 'RB-220-INOX',
                    'barcode' => '7501000022018',
                    'name' => 'Rodamiento sellado acero inoxidable',
                    'description' => 'Rodamiento rígido de bolas sellado inoxidable grado alimenticio/químico.',
                    'metodo_valoracion' => 'PROMEDIO_PONDERADO',
                    'stock_minimo' => 10.0000,
                    'punto_reorden' => 20.0000,
                    'stock_maximo' => 60.0000,
                    'maneja_lotes' => true,
                    'perecedero' => true,
                    'is_active' => true,
                ],
                [
                    'id' => self::PROD_SELLO_ID,
                    'category_id' => self::CAT_SELLOS_ID,
                    'unit_of_measure_id' => self::UOM_PZA_ID,
                    'sku' => 'FL-084-NBR',
                    'barcode' => '7501000084012',
                    'name' => 'Sello mecánico NBR 84 mm',
                    'description' => 'Sello mecánico elastómero NBR resistente a hidrocarburos y aceites.',
                    'metodo_valoracion' => 'PEPS',
                    'stock_minimo' => 20.0000,
                    'punto_reorden' => 32.0000,
                    'stock_maximo' => 100.0000,
                    'maneja_lotes' => true,
                    'perecedero' => true,
                    'is_active' => true,
                ],
            ];

            foreach ($productos as $producto) {
                $this->safeUpsert(
                    table: 'products',
                    match: ['tenant_id' => self::TENANT_ID, 'sku' => $producto['sku']],
                    attributes: array_merge($producto, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_LAURA_ID,
                        'updated_by' => self::USER_LAURA_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 6. LOS 4 LOTES FEFO
            // -----------------------------------------------------------------
            $lotes = [
                [
                    'id' => self::LOTE_089_ID,
                    'product_id' => self::PROD_VALVULA_ID,
                    'numero_lote' => 'LOTE-2026-089',
                    'fecha_fabricacion' => '2025-11-17',
                    'fecha_vencimiento' => '2026-11-17', // ~12 días restantes: PROXIMO_A_VENCER
                    'costo_unitario_entrada' => 142.5000,
                    'stock_inicial' => 24.0000,
                    'stock_actual' => 5.0000,
                    'is_active' => true,
                    'en_cuarentena' => false,
                    'motivo_cuarentena' => null,
                ],
                [
                    'id' => self::LOTE_101_ID,
                    'product_id' => self::PROD_RODAMIENTO_ID,
                    'numero_lote' => 'LOTE-2026-101',
                    'fecha_fabricacion' => '2025-12-28',
                    'fecha_vencimiento' => '2026-12-28', // ~53 días restantes: ADVERTENCIA
                    'costo_unitario_entrada' => 148.2000,
                    'stock_inicial' => 20.0000,
                    'stock_actual' => 14.0000,
                    'is_active' => true,
                    'en_cuarentena' => false,
                    'motivo_cuarentena' => null,
                ],
                [
                    'id' => self::LOTE_014_ID,
                    'product_id' => self::PROD_SELLO_ID,
                    'numero_lote' => 'LOTE-2027-014',
                    'fecha_fabricacion' => '2026-01-15',
                    'fecha_vencimiento' => '2027-06-15', // ~222 días restantes: VIGENTE
                    'costo_unitario_entrada' => 64.0000,
                    'stock_inicial' => 100.0000,
                    'stock_actual' => 84.0000,
                    'is_active' => true,
                    'en_cuarentena' => false,
                    'motivo_cuarentena' => null,
                ],
                [
                    'id' => self::LOTE_019_ID,
                    'product_id' => self::PROD_VALVULA_ID,
                    'numero_lote' => 'LOTE-2026-019',
                    'fecha_fabricacion' => '2025-04-01',
                    'fecha_vencimiento' => '2026-10-01', // Vencido: CUARENTENA
                    'costo_unitario_entrada' => 142.5000,
                    'stock_inicial' => 10.0000,
                    'stock_actual' => 3.0000,
                    'is_active' => false,
                    'en_cuarentena' => true,
                    'motivo_cuarentena' => 'Lote caducado retenido en zona de cuarentena técnica para disposición y merma.',
                ],
            ];

            foreach ($lotes as $lote) {
                $this->safeUpsert(
                    table: 'product_lots',
                    match: [
                        'tenant_id' => self::TENANT_ID,
                        'product_id' => $lote['product_id'],
                        'numero_lote' => $lote['numero_lote'],
                    ],
                    attributes: array_merge($lote, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_LAURA_ID,
                        'updated_by' => self::USER_LAURA_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 7. EXISTENCIAS CONSOLIDADAS DE ALMACÉN (warehouse_stocks)
            // -----------------------------------------------------------------
            $existencias = [
                [
                    'id' => 's1111111-1111-4000-8000-000000000001',
                    'product_id' => self::PROD_VALVULA_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'location_id' => self::UBIC_A04_ID,
                    'lot_id' => self::LOTE_089_ID,
                    'stock_actual' => 5.0000,
                    'stock_reservado' => 0.0000,
                    'stock_disponible' => 5.0000,
                    'costo_promedio' => 142.5000,
                    'valor_total' => 712.5000, // 5 * 142.50 (Nivel CRÍTICO)
                ],
                [
                    'id' => 's1111111-1111-4000-8000-000000000002',
                    'product_id' => self::PROD_RODAMIENTO_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'location_id' => self::UBIC_B02_ID,
                    'lot_id' => self::LOTE_101_ID,
                    'stock_actual' => 14.0000,
                    'stock_reservado' => 0.0000,
                    'stock_disponible' => 14.0000,
                    'costo_promedio' => 148.2000,
                    'valor_total' => 2074.8000, // 14 * 148.20 (Nivel REORDEN)
                ],
                [
                    'id' => 's1111111-1111-4000-8000-000000000003',
                    'product_id' => self::PROD_SELLO_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'location_id' => self::UBIC_B06_ID,
                    'lot_id' => self::LOTE_014_ID,
                    'stock_actual' => 84.0000,
                    'stock_reservado' => 0.0000,
                    'stock_disponible' => 84.0000,
                    'costo_promedio' => 64.0000,
                    'valor_total' => 5376.0000, // 84 * 64.00 (Nivel ÓPTIMO)
                ],
                [
                    'id' => 's1111111-1111-4000-8000-000000000004',
                    'product_id' => self::PROD_VALVULA_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'location_id' => self::UBIC_CUAR_ID,
                    'lot_id' => self::LOTE_019_ID,
                    'stock_actual' => 3.0000,
                    'stock_reservado' => 3.0000,
                    'stock_disponible' => 0.0000, // Bloqueado en cuarentena
                    'costo_promedio' => 142.5000,
                    'valor_total' => 427.5000,
                ],
            ];

            foreach ($existencias as $stock) {
                $this->safeUpsert(
                    table: 'warehouse_stocks',
                    match: [
                        'tenant_id' => self::TENANT_ID,
                        'product_id' => $stock['product_id'],
                        'warehouse_id' => $stock['warehouse_id'],
                        'lot_id' => $stock['lot_id'],
                    ],
                    attributes: array_merge($stock, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_LAURA_ID,
                        'updated_by' => self::USER_LAURA_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 8. PROVEEDORES HOMOLOGADOS
            // -----------------------------------------------------------------
            $proveedores = [
                [
                    'id' => self::PROV_METALNOVA_ID,
                    'code' => 'PROV-METALNOVA',
                    'tax_id' => '900555111-2',
                    'name' => 'Metalnova Industrial S.A.',
                    'commercial_name' => 'Metalnova Válvulas y Equipos',
                    'email' => 'ventas@metalnova.com',
                    'phone' => '+52 (81) 8350-1000',
                    'address' => 'Av. Churubusco 1200, Monterrey, N.L.',
                    'contact_name' => 'Ing. Fernando Morales',
                    'is_active' => true,
                ],
                [
                    'id' => self::PROV_NORTEK_ID,
                    'code' => 'PROV-NORTEK',
                    'tax_id' => '900777222-3',
                    'name' => 'Nortek Suministros S.A.S.',
                    'commercial_name' => 'Nortek Rodamientos y Transmisión',
                    'email' => 'pedidos@nortek.com',
                    'phone' => '+52 (844) 415-8800',
                    'address' => 'Blvd. Venustiano Carranza 3450, Saltillo, Coah.',
                    'contact_name' => 'Lic. Claudia Méndez',
                    'is_active' => true,
                ],
            ];

            foreach ($proveedores as $prov) {
                $this->safeUpsert(
                    table: 'suppliers',
                    match: ['tenant_id' => self::TENANT_ID, 'code' => $prov['code']],
                    attributes: array_merge($prov, [
                        'tenant_id' => self::TENANT_ID,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_PATRICIA_ID,
                        'updated_by' => self::USER_PATRICIA_ID,
                    ])
                );
            }

            // -----------------------------------------------------------------
            // 9. LAS 2 ÓRDENES DE COMPRA (OC-2026-0118 y OC-2026-0119)
            // -----------------------------------------------------------------
            // OC-2026-0118: Recibida y Conciliada (20 PZA de AC-100-FLEX en Muelle 02)
            $this->safeUpsert(
                table: 'purchase_orders',
                match: ['tenant_id' => self::TENANT_ID, 'numero_orden' => 'OC-2026-0118'],
                attributes: [
                    'id' => self::OC_0118_ID,
                    'tenant_id' => self::TENANT_ID,
                    'supplier_id' => self::PROV_METALNOVA_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'numero_orden' => 'OC-2026-0118',
                    'estado' => 'RECIBIDA_COMPLETA',
                    'fecha_emision' => '2026-03-01',
                    'fecha_entrega_esperada' => '2026-03-08',
                    'subtotal' => 2850.0000,
                    'impuestos' => 0.0000,
                    'total' => 2850.0000,
                    'notas' => 'Conciliada en Muelle 02. Ingreso total de 20 PZA de AC-100-FLEX asentado en Kardex.',
                    'created_at' => $fechaAhora,
                    'updated_at' => $fechaAhora,
                    'deleted_at' => null,
                    'created_by' => self::USER_PATRICIA_ID,
                    'updated_by' => self::USER_PATRICIA_ID,
                ]
            );

            $this->safeUpsert(
                table: 'purchase_order_items',
                match: [
                    'tenant_id' => self::TENANT_ID,
                    'purchase_order_id' => self::OC_0118_ID,
                    'product_id' => self::PROD_VALVULA_ID,
                ],
                attributes: [
                    'id' => 'i1111111-1111-4000-8000-000000000001',
                    'tenant_id' => self::TENANT_ID,
                    'purchase_order_id' => self::OC_0118_ID,
                    'product_id' => self::PROD_VALVULA_ID,
                    'cantidad_solicitada' => 20.0000,
                    'cantidad_recibida' => 20.0000,
                    'precio_unitario' => 142.5000,
                    'subtotal' => 2850.0000,
                    'notas' => '20 bultos cotejados sin discrepancias físicas en muelle.',
                    'created_at' => $fechaAhora,
                    'updated_at' => $fechaAhora,
                    'deleted_at' => null,
                    'created_by' => self::USER_PATRICIA_ID,
                    'updated_by' => self::USER_PATRICIA_ID,
                ]
            );

            // OC-2026-0119: Aprobada / Pendiente Recepción (40 PZA de RB-220-INOX en Muelle 01)
            $this->safeUpsert(
                table: 'purchase_orders',
                match: ['tenant_id' => self::TENANT_ID, 'numero_orden' => 'OC-2026-0119'],
                attributes: [
                    'id' => self::OC_0119_ID,
                    'tenant_id' => self::TENANT_ID,
                    'supplier_id' => self::PROV_NORTEK_ID,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                    'numero_orden' => 'OC-2026-0119',
                    'estado' => 'APROBADA',
                    'fecha_emision' => '2026-03-05',
                    'fecha_entrega_esperada' => '2026-03-12',
                    'subtotal' => 5928.0000,
                    'impuestos' => 0.0000,
                    'total' => 5928.0000,
                    'notas' => 'Abierta - Pendiente de recepción física en Muelle 01 para Escenario 7 UAT.',
                    'created_at' => $fechaAhora,
                    'updated_at' => $fechaAhora,
                    'deleted_at' => null,
                    'created_by' => self::USER_PATRICIA_ID,
                    'updated_by' => self::USER_PATRICIA_ID,
                ]
            );

            $this->safeUpsert(
                table: 'purchase_order_items',
                match: [
                    'tenant_id' => self::TENANT_ID,
                    'purchase_order_id' => self::OC_0119_ID,
                    'product_id' => self::PROD_RODAMIENTO_ID,
                ],
                attributes: [
                    'id' => 'i1111111-1111-4000-8000-000000000002',
                    'tenant_id' => self::TENANT_ID,
                    'purchase_order_id' => self::OC_0119_ID,
                    'product_id' => self::PROD_RODAMIENTO_ID,
                    'cantidad_solicitada' => 40.0000,
                    'cantidad_recibida' => 0.0000,
                    'precio_unitario' => 148.2000,
                    'subtotal' => 5928.0000,
                    'notas' => 'Renglón listo para recepción física mediante Ventana 13b en muelle.',
                    'created_at' => $fechaAhora,
                    'updated_at' => $fechaAhora,
                    'deleted_at' => null,
                    'created_by' => self::USER_PATRICIA_ID,
                    'updated_by' => self::USER_PATRICIA_ID,
                ]
            );

            // -----------------------------------------------------------------
            // 10. USUARIOS Y ROLES CANÓNICOS RBAC (10 ROLES)
            // -----------------------------------------------------------------
            $usuarios = [
                [
                    'id' => self::USER_LAURA_ID,
                    'email' => 'laura@industriasalfa.com',
                    'nombre' => 'Laura Mendoza',
                    'rol' => RolSistemaEnum::JEFE_ALMACEN,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                ],
                [
                    'id' => self::USER_CARLOS_ID,
                    'email' => 'carlos@industriasalfa.com',
                    'nombre' => 'Carlos Morales',
                    'rol' => RolSistemaEnum::ADMIN_TENANT,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_ROBERTO_ID,
                    'email' => 'roberto@industriasalfa.com',
                    'nombre' => 'Roberto Gómez',
                    'rol' => RolSistemaEnum::GERENTE_OPERACIONES,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_MARIANA_ID,
                    'email' => 'mariana@industriasalfa.com',
                    'nombre' => 'Mariana Solís',
                    'rol' => RolSistemaEnum::SUPERVISOR_INVENTARIO,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_DIEGO_ID,
                    'email' => 'diego@industriasalfa.com',
                    'nombre' => 'Diego Ríos',
                    'rol' => RolSistemaEnum::ALMACENISTA_OPERADOR,
                    'warehouse_id' => self::ALM_CENTRAL_ID,
                ],
                [
                    'id' => self::USER_PATRICIA_ID,
                    'email' => 'patricia@industriasalfa.com',
                    'nombre' => 'Patricia Castro',
                    'rol' => RolSistemaEnum::COMPRADOR_ABASTECIMIENTO,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_ANA_ID,
                    'email' => 'ana@industriasalfa.com',
                    'nombre' => 'Ana Vélez',
                    'rol' => RolSistemaEnum::AUDITOR_INVENTARIO,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_FERNANDO_ID,
                    'email' => 'fernando@industriasalfa.com',
                    'nombre' => 'Fernando Silva',
                    'rol' => RolSistemaEnum::CONTADOR_COSTOS,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_LUCIA_ID,
                    'email' => 'lucia@industriasalfa.com',
                    'nombre' => 'Lucía Torres',
                    'rol' => RolSistemaEnum::VISOR_CONSULTA,
                    'warehouse_id' => null,
                ],
                [
                    'id' => self::USER_SUPERADMIN_ID,
                    'email' => 'superadmin@sgci.io',
                    'nombre' => 'Super Administrador SaaS',
                    'rol' => RolSistemaEnum::SUPER_ADMIN_SAAS,
                    'warehouse_id' => null,
                ],
            ];

            foreach ($usuarios as $usr) {
                // Insertar/Actualizar Usuario (compatible con `full_name` y `name`)
                $this->safeUpsert(
                    table: 'users',
                    match: ['tenant_id' => self::TENANT_ID, 'email' => $usr['email']],
                    attributes: [
                        'id' => $usr['id'],
                        'tenant_id' => self::TENANT_ID,
                        'email' => $usr['email'],
                        'password_hash' => $passwordHashComun,
                        'full_name' => $usr['nombre'],
                        'name' => $usr['nombre'],
                        'is_active' => true,
                        'last_login_at' => $fechaAhora,
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_CARLOS_ID,
                        'updated_by' => self::USER_CARLOS_ID,
                    ]
                );

                // Asignar Rol en `user_roles` (compatible con `role` y `rol`)
                $this->safeUpsert(
                    table: 'user_roles',
                    match: [
                        'tenant_id' => self::TENANT_ID,
                        'user_id' => $usr['id'],
                    ],
                    attributes: [
                        'id' => (string) \Illuminate\Support\Str::uuid(),
                        'tenant_id' => self::TENANT_ID,
                        'user_id' => $usr['id'],
                        'role' => $usr['rol']->value,
                        'rol' => $usr['rol']->value,
                        'warehouse_id' => $usr['warehouse_id'],
                        'created_at' => $fechaAhora,
                        'updated_at' => $fechaAhora,
                        'deleted_at' => null,
                        'created_by' => self::USER_CARLOS_ID,
                        'updated_by' => self::USER_CARLOS_ID,
                    ]
                );
            }
        });
    }

    /**
     * Realiza un Upsert (updateOrInsert) seguro e idempotente,
     * adaptándose automáticamente a las columnas reales existentes en el motor de base de datos.
     *
     * @param array<string, mixed> $match
     * @param array<string, mixed> $attributes
     */
    private function safeUpsert(string $table, array $match, array $attributes): void
    {
        // En entornos de testing o producción con introspección de esquema disponible
        if (class_exists(Schema::class)) {
            try {
                $filteredAttributes = [];
                foreach ($attributes as $col => $val) {
                    if (Schema::hasColumn($table, $col)) {
                        $filteredAttributes[$col] = $val;
                    }
                }

                $filteredMatch = [];
                foreach ($match as $col => $val) {
                    if (Schema::hasColumn($table, $col)) {
                        $filteredMatch[$col] = $val;
                    }
                }

                if (!empty($filteredMatch) && !empty($filteredAttributes)) {
                    DB::table($table)->updateOrInsert($filteredMatch, $filteredAttributes);
                    return;
                }
            } catch (\Throwable) {
                // Si la conexión o la introspección no están disponibles, continuar con fallback
            }
        }

        // Fallback directo a query builder updateOrInsert
        DB::table($table)->updateOrInsert($match, $attributes);
    }
}
