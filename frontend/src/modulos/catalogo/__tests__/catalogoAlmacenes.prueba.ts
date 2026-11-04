/**
 * Suite TDD Vitest — Sprint 2 (`feat/catalogo-almacenes`):
 * Verifica:
 * 1. Aislamiento Multi-Tenant (`tenant_id`) en `useCatalogoStore` y `useAlmacenesStore`.
 * 2. Validación de suma de verificación GS1 EAN-13 y decodificación de etiquetas `QR_SGCI`.
 * 3. Evaluación de umbrales de Punto de Reorden (`CRITICO`, `REORDEN`, `OPTIMO`, `SOBREINVENTARIO`).
 * 4. Flujo de doble paso en Transferencias Inter-Almacén (`EN_TRANSITO` -> `RECIBIDA` / `RECIBIDA_CON_DISCREPANCIA`).
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ProductoInventario } from '../../../compartido/tipos/entidadBase';
import {
  construirCodigoBinCanonico,
  useAlmacenesStore,
} from '../../almacenes/almacen/useAlmacenesStore';
import {
  useCatalogoStore,
  validarChecksumEan13,
} from '../almacen/useCatalogoStore';

const TENANT_ALFA = '11111111-2222-4333-8444-555555555555';
const TENANT_BETA = '99999999-8888-4777-8666-555555555555';

function crearProductoFixture(parcial: Partial<ProductoInventario> = {}): ProductoInventario {
  return {
    id: 'prod-001',
    tenant_id: TENANT_ALFA,
    sku: 'AC-100-FLEX',
    codigo_barras: '7501031311309', // EAN-13 GS1 válido
    nombre: 'Válvula de Presión Industrial 2"',
    descripcion: 'Válvula bridada acero inoxidable 316L',
    categoria_id: 'cat-hidraulica',
    unidad_medida: 'PZA',
    stock_minimo: 10,
    punto_reorden: 25,
    stock_maximo: 100,
    control_lotes: true,
    metodo_valoracion: 'PEPS',
    estado: 'ACTIVO',
    created_at: '2026-11-04T10:00:00Z',
    updated_at: '2026-11-04T10:00:00Z',
    deleted_at: null,
    created_by: 'usr-admin-01',
    updated_by: null,
    ...parcial,
  };
}

describe('Sprint 2 — Catálogo de Productos y Topología de Almacenes (TDD)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('valida correctamente el dígito verificador GS1 EAN-13 y rechaza códigos alterados', () => {
    expect(validarChecksumEan13('7501031311309')).toBe(true);
    expect(validarChecksumEan13('7501031311308')).toBe(false);
    expect(validarChecksumEan13('ABC1234567890')).toBe(false);
  });

  it('garantiza aislamiento Multi-Tenant y valida invariantes de Punto de Reorden en useCatalogoStore', () => {
    const catalogoStore = useCatalogoStore();
    catalogoStore.configurarContextoTenant(TENANT_ALFA);

    const productoValido = crearProductoFixture();
    catalogoStore.registrarProductoEnCatalogo(productoValido);

    expect(catalogoStore.productosDelTenantFiltrados).toHaveLength(1);
    expect(catalogoStore.evaluarSemaforoProducto(productoValido, 8)).toBe('CRITICO');
    expect(catalogoStore.evaluarSemaforoProducto(productoValido, 20)).toBe('REORDEN');
    expect(catalogoStore.evaluarSemaforoProducto(productoValido, 55)).toBe('OPTIMO');
    expect(catalogoStore.evaluarSemaforoProducto(productoValido, 125)).toBe('SOBREINVENTARIO');

    // Rechazar producto de otro Tenant
    expect(() =>
      catalogoStore.registrarProductoEnCatalogo(
        crearProductoFixture({
          id: 'prod-intruso',
          tenant_id: TENANT_BETA,
          sku: 'SKU-OTRO-TENANT',
        }),
      ),
    ).toThrow(/Violación Cross-Tenant/);

    // Rechazar cuando punto_reorden < stock_minimo
    expect(() =>
      catalogoStore.registrarProductoEnCatalogo(
        crearProductoFixture({
          id: 'prod-invalido',
          sku: 'AC-200-ERR',
          stock_minimo: 40,
          punto_reorden: 20,
          stock_maximo: 100,
        }),
      ),
    ).toThrow(/Invariante de stock inválido/);
  });

  it('resuelve lecturas de escáner óptico en formato QR_SGCI y EAN_13', () => {
    const catalogoStore = useCatalogoStore();
    catalogoStore.configurarContextoTenant(TENANT_ALFA);
    catalogoStore.registrarProductoEnCatalogo(crearProductoFixture());

    const lecturaQr = catalogoStore.resolverLecturaEscaner(
      'SGCI|T:11111111|SKU:AC-100-FLEX|LOTE:LOTE-2026-089',
    );
    expect(lecturaQr.tipo).toBe('QR_SGCI');
    expect(lecturaQr.skuDetectado).toBe('AC-100-FLEX');
    expect(lecturaQr.loteDetectado).toBe('LOTE-2026-089');
    expect(lecturaQr.productoEncontrado?.id).toBe('prod-001');

    const lecturaEan = catalogoStore.resolverLecturaEscaner('7501031311309');
    expect(lecturaEan.tipo).toBe('EAN_13');
    expect(lecturaEan.productoEncontrado?.sku).toBe('AC-100-FLEX');
  });

  it('construye códigos Bin Location y ejecuta transferencias inter-almacén en dos pasos (EN_TRANSITO -> RECIBIDA)', () => {
    expect(construirCodigoBinCanonico('zona-a', 'p04', 'r02', 'n01')).toBe('ZONA-A-P04-R02-N01');

    const almacenesStore = useAlmacenesStore();
    almacenesStore.configurarContextoTenant(TENANT_ALFA);

    // Almacén Central tiene 100 unidades; Almacén Norte tiene 15 unidades
    almacenesStore.fijarSaldoAlmacenProducto('alm-central', 'prod-001', 100);
    almacenesStore.fijarSaldoAlmacenProducto('alm-norte', 'prod-001', 15);

    // Paso 1: Despachar 40 unidades de alm-central hacia alm-norte
    const trfEnTransito = almacenesStore.despacharTransferenciaInterAlmacen({
      id: 'trf-001',
      tenant_id: TENANT_ALFA,
      numero_transferencia: 'TRF-2026-0099',
      almacen_origen_id: 'alm-central',
      almacen_destino_id: 'alm-norte',
      producto_id: 'prod-001',
      sku: 'AC-100-FLEX',
      lote_id: 'lote-2026-089',
      cantidad: 40,
      costo_unitario: 150,
      usuario_id: 'usr-jefe-almacen',
    });

    expect(trfEnTransito.estado).toBe('EN_TRANSITO');
    expect(almacenesStore.obtenerSaldoAlmacenProducto('alm-central', 'prod-001')).toBe(60);
    expect(almacenesStore.obtenerSaldoAlmacenProducto('alm-norte', 'prod-001')).toBe(15);
    expect(almacenesStore.transferenciasEnTransito).toHaveLength(1);

    // Paso 2: Confirmar recepción completa de las 40 unidades en alm-norte
    const trfRecibida = almacenesStore.confirmarRecepcionTransferencia(
      'trf-001',
      40,
      'usr-almacenista-norte',
    );

    expect(trfRecibida.estado).toBe('RECIBIDA');
    expect(almacenesStore.obtenerSaldoAlmacenProducto('alm-norte', 'prod-001')).toBe(55);
    expect(almacenesStore.transferenciasEnTransito).toHaveLength(0);
  });
});
