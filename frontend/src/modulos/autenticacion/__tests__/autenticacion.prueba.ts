import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { useAutenticacionStore } from '../almacen/useAutenticacionStore';
import { useInventarioStore } from '../../inventario/almacen/useInventarioStore';
import { evaluarGuardiaRbacRouter } from '../guards/guardiaRbacRouter';
import CampoTextoAurora from '../../../diseno/atomos/CampoTextoAurora.vue';
import PaginaInicioSesion from '../paginas/PaginaInicioSesion.vue';
import { ROLES_SGCI, type UsuarioAutenticado } from '../../../compartido/tipos/entidadBase';

const TENANT_ALFA = '11111111-2222-4333-8444-555555555555';

const operadorBodegaMock: UsuarioAutenticado = {
  id: 'usr-operador-01',
  tenant_id: TENANT_ALFA,
  email: 'operador@alfa.com',
  nombre_completo: 'Lucía Ramírez',
  rol: ROLES_SGCI.ALMACENISTA_OPERADOR,
  almacenes_asignados_ids: ['alm-norte-01'],
  activo: true,
  created_at: '2026-10-28T10:00:00Z',
  updated_at: '2026-10-28T10:00:00Z',
  deleted_at: null,
  created_by: 'usr-admin-01',
  updated_by: null,
};

describe('Sprint 1 (feat/tenants-auth) — Autenticación Multi-Tenant, RBAC 10 Roles y UI Aurora Mist', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('establece la sesión Multi-Tenant y sincroniza automáticamente el tenant_id con useInventarioStore', () => {
    const authStore = useAutenticacionStore();
    const inventarioStore = useInventarioStore();

    authStore.establecerSesion({
      accessToken: 'jwt.access.token.inicial',
      refreshToken: 'refresh-token-opaco-001',
      expiresIn: 900,
      usuario: operadorBodegaMock,
      tenantNombre: 'Industrias Alfa S.A.S.',
    });

    expect(authStore.estaAutenticado).toBe(true);
    expect(authStore.tenantId).toBe(TENANT_ALFA);
    expect(inventarioStore.tenantId).toBe(TENANT_ALFA);
    expect(inventarioStore.almacenSeleccionadoId).toBe('alm-norte-01');
  });

  it('rota el Refresh Token y revoca la sesión inmediatamente si detecta reúso de un Refresh Token anterior', () => {
    const authStore = useAutenticacionStore();

    authStore.establecerSesion({
      accessToken: 'jwt.v1',
      refreshToken: 'rt-inicial-001',
      expiresIn: 900,
      usuario: operadorBodegaMock,
    });

    authStore.rotarParTokens('jwt.v2', 'rt-rotado-002', 900);
    expect(authStore.accessToken).toBe('jwt.v2');
    expect(authStore.refreshToken).toBe('rt-rotado-002');

    // Simular intento de reúso forzando el refresh token ya revocado
    authStore.refreshToken = 'rt-inicial-001';
    expect(() => authStore.rotarParTokens('jwt.v3', 'rt-003')).toThrowError(
      /Alerta de seguridad: Reúso de Refresh Token detectado/
    );
    expect(authStore.estaAutenticado).toBe(false);
  });

  it('evalúa correctamente el guardia RBAC para los 10 roles y el alcance por almacén', () => {
    const authStore = useAutenticacionStore();

    // 1. Sin sesión -> redirige a /login
    const sinSesion = evaluarGuardiaRbacRouter({
      rutaDestino: '/kardex',
      requiereAutenticacion: true,
    });
    expect(sinSesion.permitido).toBe(false);
    expect(sinSesion.motivoRechazo).toBe('NO_AUTENTICADO');

    // 2. Con sesión de ALMACENISTA_OPERADOR
    authStore.establecerSesion({
      accessToken: 'jwt.operador',
      refreshToken: 'rt.operador',
      expiresIn: 900,
      usuario: operadorBodegaMock,
    });

    // Intenta acceder a cierre contable reservado para CONTADOR_COSTOS -> denegado
    const intentoContabilidad = evaluarGuardiaRbacRouter({
      rutaDestino: '/contabilidad/cierre',
      rolesPermitidos: [ROLES_SGCI.CONTADOR_COSTOS, ROLES_SGCI.ADMIN_TENANT],
    });
    expect(intentoContabilidad.permitido).toBe(false);
    expect(intentoContabilidad.motivoRechazo).toBe('ROL_NO_AUTORIZADO');

    // Intenta operar sobre un almacén no asignado -> denegado
    const intentoAlmacenAjeno = evaluarGuardiaRbacRouter({
      rutaDestino: '/almacenes/alm-sur-99/recepcion',
      rolesPermitidos: [ROLES_SGCI.ALMACENISTA_OPERADOR],
      almacenIdRuta: 'alm-sur-99',
    });
    expect(intentoAlmacenAjeno.permitido).toBe(false);
    expect(intentoAlmacenAjeno.motivoRechazo).toBe('ALMACEN_NO_ASIGNADO');

    // Opera sobre su almacén asignado -> permitido
    const accesoLegitimo = evaluarGuardiaRbacRouter({
      rutaDestino: '/almacenes/alm-norte-01/recepcion',
      rolesPermitidos: [ROLES_SGCI.ALMACENISTA_OPERADOR],
      permisoRequerido: 'compras.recepcionar_pwa',
      almacenIdRuta: 'alm-norte-01',
    });
    expect(accesoLegitimo.permitido).toBe(true);
  });

  it('purga el estado de autenticación y de inventario al cerrar sesión', () => {
    const authStore = useAutenticacionStore();
    const inventarioStore = useInventarioStore();

    authStore.establecerSesion({
      accessToken: 'jwt.activo',
      refreshToken: 'rt.activo',
      expiresIn: 900,
      usuario: operadorBodegaMock,
    });

    authStore.cerrarSesion();

    expect(authStore.estaAutenticado).toBe(false);
    expect(authStore.tenantId).toBeNull();
    expect(inventarioStore.tenantId).toBeNull();
  });

  it('renderiza CampoTextoAurora y PaginaInicioSesion con accesibilidad WCAG y validación de formulario', async () => {
    const wrapperInput = mount(CampoTextoAurora, {
      props: {
        id: 'campo-prueba',
        modelValue: '',
        etiqueta: 'Código SKU',
        mensajeError: 'El código SKU es obligatorio',
      },
    });

    const inputEl = wrapperInput.find('input');
    expect(inputEl.attributes('aria-invalid')).toBe('true');
    expect(inputEl.classes()).toContain('min-h-[44px]');
    expect(wrapperInput.find('[role="alert"]').text()).toContain('El código SKU es obligatorio');

    const wrapperLogin = mount(PaginaInicioSesion);
    await wrapperLogin.find('form').trigger('submit.prevent');
    expect(wrapperLogin.find('[data-testid="alerta-error-login"]').text()).toContain(
      'Debes ingresar el código de la empresa (Tenant).'
    );
  });
});
