import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSesionMultiTenantStore } from '../useSesionMultiTenantStore';
import { filtrarRutasPorRol, RUTAS_APLICACION_SGCI } from '../../router/index';
import { ClienteHttpSgci } from '../../servicios/clienteHttpApi';

describe('Sprint 10 — Arquitectura Frontend Completa: Router RBAC, Sesión Multi-Tenant y Cliente HTTP Offline-First', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('filtra las rutas del menú lateral según el rol RBAC (Admin, Vendedor y SuperAdmin)', () => {
    const rutasAdmin = filtrarRutasPorRol('admin');
    const rutasVendedor = filtrarRutasPorRol('seller');
    const rutasSuperAdmin = filtrarRutasPorRol('superadmin');

    expect(RUTAS_APLICACION_SGCI.length).toBe(9);
    expect(rutasAdmin.length).toBe(9);
    // El vendedor no ve Kardex ni Ajustes de conteos físicos, pero sí Dashboard, Catálogo, Caja, Precios, Alertas, Gobernanza y Galería
    expect(rutasVendedor.some((r) => r.id === 'ajustes-conteos')).toBe(false);
    expect(rutasVendedor.some((r) => r.id === 'facturacion-caja')).toBe(true);
    // El SuperAdmin solo ve Gobernanza SaaS y Galería Figma (Privacidad por diseño)
    expect(rutasSuperAdmin.map((r) => r.id)).toEqual(['gobernanza-reportes', 'galeria-figma']);
  });

  it('conmuta empresa Multi-Tenant, rol RBAC y conectividad en useSesionMultiTenantStore', () => {
    const sesion = useSesionMultiTenantStore();

    expect(sesion.empresaActiva.plan).toBe('Crece');
    expect(sesion.esModoVendedor).toBe(false);

    sesion.cambiarEmpresaActiva('22222222-2222-4222-8222-222222222222');
    expect(sesion.empresaActiva.nombre).toBe('Distribuciones Andinas Pro Ltda.');
    expect(sesion.empresaActiva.plan).toBe('Pro');

    sesion.cambiarRolActivo('seller');
    expect(sesion.esModoVendedor).toBe(true);

    sesion.alternarEstadoConexion(false);
    expect(sesion.conectadoRed).toBe(false);
  });

  it('inyecta cabeceras X-Tenant-Id y Authorization o encola en modo Offline en ClienteHttpSgci', async () => {
    const cliente = new ClienteHttpSgci('http://127.0.0.1:4173/api/v1');

    expect(() => cliente.construirCabecerasSeguras()).toThrow(
      'Bloqueo de seguridad: no se puede emitir petición HTTP sin X-Tenant-Id.',
    );

    cliente.configurarContextoSeguridad(
      '11111111-1111-4111-8111-111111111111',
      'jwt-token-seguro-001',
      'admin',
    );

    const cabeceras = cliente.construirCabecerasSeguras();
    expect(cabeceras['X-Tenant-Id']).toBe('11111111-1111-4111-8111-111111111111');
    expect(cabeceras.Authorization).toBe('Bearer jwt-token-seguro-001');

    cliente.establecerModoOffline(true);
    const respuestaOffline = await cliente.solicitar({
      metodo: 'POST',
      ruta: '/inventario/ajustes',
      cuerpo: { sku: 'PRD-001', cantidad: -2 },
      operacionOffline: {
        tipoOperacion: 'AJUSTE_STOCK',
        sku: 'PRD-001',
        deltaCantidad: -2,
      },
    });

    expect(respuestaOffline.encoladoOffline).toBe(true);
    expect(respuestaOffline.codigoEstado).toBe(202);
  });
});
