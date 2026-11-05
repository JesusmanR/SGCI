import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  useFacturacionCajaStore,
  type ProductoFacturable,
} from '../almacen/useFacturacionCajaStore';

describe('Sprint 7 — Facturación POS, Cobros en Caja, Descuento en Kardex y Arqueo (Pantallas Figma 21-35, 75 y 76)', () => {
  const TENANT_A = '11111111-1111-4111-8111-111111111111';
  const USUARIO_ID = '99999999-9999-4999-8999-999999999999';

  const productosSemilla: ProductoFacturable[] = [
    {
      id: 'p-1',
      tenant_id: TENANT_A,
      sku: 'PRD-001',
      nombre: 'Teclado Mecánico Pro',
      precioSinIva: 100,
      tasaIva: 19,
      stockActual: 10,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: USUARIO_ID,
      updated_by: USUARIO_ID,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('envía una factura a caja, confirma el cobro en Efectivo calculando el cambio y descuenta el stock (Pantallas Figma 21-29)', () => {
    const store = useFacturacionCajaStore();
    store.establecerTenantActivo(TENANT_A);
    store.cargarProductosFacturables(productosSemilla);

    store.agregarLineaFactura('PRD-001', 2);
    expect(store.subtotalBorrador).toBe(200);
    expect(store.impuestosValorBorrador).toBe(38);
    expect(store.totalBorrador).toBe(238);

    store.enviarFacturaACaja('FAC-1042');
    expect(store.facturaPendienteEnCaja?.total).toBe(238);

    const { comprobante, cambioDevolver } = store.confirmarCobroFactura({
      metodoPago: 'Efectivo',
      efectivoRecibido: 250,
    });

    expect(comprobante.comprobanteId).toBe('CB-1049');
    expect(cambioDevolver).toBe(12);
    expect(store.productosDelTenant[0].stockActual).toBe(8);
    expect(store.efectivoEsperadoEnCaja).toBe(338); // 100 base + 238 efectivo
  });

  it('exige observaciones obligatorias al cerrar la caja con diferencia y permite reapertura (Pantallas Figma 31-35)', () => {
    const store = useFacturacionCajaStore();
    store.establecerTenantActivo(TENANT_A);
    store.cargarProductosFacturables(productosSemilla);

    // Base inicial = 100. Si se cuentan 90 (-10 de diferencia) sin observaciones debe fallar
    expect(() => store.cerrarSesionCaja(90, '   ')).toThrow(
      /Indica el motivo de la diferencia para cerrar la caja/i,
    );

    const reporte = store.cerrarSesionCaja(90, 'Faltante en monedas de cambio');
    expect(reporte.diferencia).toBe(-10);
    expect(store.cajaAbierta).toBe(false);

    store.abrirNuevaSesionCaja(150);
    expect(store.cajaAbierta).toBe(true);
    expect(store.baseInicialEfectivo).toBe(150);
  });
});
