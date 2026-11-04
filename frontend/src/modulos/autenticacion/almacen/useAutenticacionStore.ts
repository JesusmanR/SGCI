import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import {
  ROLES_SGCI,
  type RolSGCI,
  type UsuarioAutenticado,
} from '../../../compartido/tipos/entidadBase';
import { useInventarioStore } from '../../inventario/almacen/useInventarioStore';

export interface PayloadSesionJwt {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  usuario: UsuarioAutenticado;
  tenantNombre?: string;
}

const MATRIZ_PERMISOS_RBAC: Record<RolSGCI, string[]> = {
  [ROLES_SGCI.SUPER_ADMIN_SAAS]: ['*'],
  [ROLES_SGCI.SUPER_ADMIN]: ['*'],
  [ROLES_SGCI.ADMIN_TENANT]: [
    'tenants.configurar',
    'usuarios.gestionar',
    'catalogo.gestionar',
    'almacenes.gestionar',
    'lotes.gestionar',
    'kardex.registrar',
    'kardex.consultar',
    'compras.gestionar',
    'auditoria.aprobar_ajuste',
    'alertas.configurar',
  ],
  [ROLES_SGCI.GERENTE_OPERACIONES]: [
    'catalogo.gestionar',
    'almacenes.gestionar',
    'lotes.gestionar',
    'kardex.consultar',
    'compras.aprobar',
    'auditoria.aprobar_ajuste',
    'alertas.consultar',
  ],
  [ROLES_SGCI.JEFE_ALMACEN]: [
    'catalogo.consultar',
    'almacenes.operar',
    'lotes.gestionar',
    'kardex.registrar',
    'kardex.consultar',
    'compras.recepcionar',
    'auditoria.iniciar_conteo',
    'alertas.consultar',
  ],
  [ROLES_SGCI.SUPERVISOR_INVENTARIO]: [
    'catalogo.consultar',
    'almacenes.consultar',
    'lotes.gestionar',
    'kardex.consultar',
    'auditoria.gestionar_ciclicos',
    'alertas.consultar',
  ],
  [ROLES_SGCI.ALMACENISTA_OPERADOR]: [
    'catalogo.escanear',
    'almacenes.consultar',
    'lotes.consultar',
    'kardex.registrar_operacion',
    'compras.recepcionar_pwa',
    'auditoria.ejecutar_conteo_ciego',
  ],
  [ROLES_SGCI.COMPRADOR_ABASTECIMIENTO]: [
    'catalogo.gestionar',
    'proveedores.gestionar',
    'compras.gestionar',
    'kardex.consultar',
    'alertas.consultar',
  ],
  [ROLES_SGCI.AUDITOR_INVENTARIO]: [
    'catalogo.consultar',
    'almacenes.consultar',
    'lotes.consultar',
    'kardex.auditar',
    'auditoria.ejecutar_conteo_ciego',
    'auditoria.conciliar',
  ],
  [ROLES_SGCI.CONTADOR_COSTOS]: [
    'catalogo.consultar',
    'kardex.auditar',
    'kardex.valorizar',
    'kardex.cerrar_periodo',
    'auditoria.aprobar_ajuste',
  ],
  [ROLES_SGCI.VISOR_CONSULTA]: [
    'catalogo.consultar',
    'almacenes.consultar',
    'kardex.consultar',
  ],
};

export const useAutenticacionStore = defineStore('autenticacion', () => {
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const expiraEnTimestamp = ref<number | null>(null);
  const usuario = ref<UsuarioAutenticado | null>(null);
  const tenantId = ref<string | null>(null);
  const tenantNombre = ref<string>('Organización SGCI');
  const tokensRevocados = ref<Set<string>>(new Set());

  const estaAutenticado = computed<boolean>(() => {
    return Boolean(
      accessToken.value &&
        usuario.value &&
        tenantId.value &&
        usuario.value.tenant_id === tenantId.value
    );
  });

  const rolActivo = computed<RolSGCI | null>(() => {
    return usuario.value?.rol ?? null;
  });

  function establecerSesion(payload: PayloadSesionJwt): void {
    if (!payload.usuario.tenant_id || payload.usuario.tenant_id.trim() === '') {
      throw new Error('Violación Multi-Tenant: El usuario autenticado debe poseer un tenant_id válido.');
    }

    accessToken.value = payload.accessToken;
    refreshToken.value = payload.refreshToken;
    expiraEnTimestamp.value = Date.now() + payload.expiresIn * 1000;
    usuario.value = payload.usuario;
    tenantId.value = payload.usuario.tenant_id;
    tenantNombre.value = payload.tenantNombre ?? 'Organización SGCI';

    // Sincronizar contexto Multi-Tenant en el store de inventario
    const inventarioStore = useInventarioStore();
    inventarioStore.fijarTenant(payload.usuario.tenant_id);

    if (payload.usuario.almacenes_asignados_ids.length > 0) {
      inventarioStore.seleccionarAlmacen(payload.usuario.almacenes_asignados_ids[0]);
    }
  }

  function rotarParTokens(nuevoAccessToken: string, nuevoRefreshToken: string, expiresIn = 900): void {
    if (!estaAutenticado.value || !refreshToken.value) {
      throw new Error('No hay sesión activa para rotar tokens.');
    }

    if (tokensRevocados.value.has(refreshToken.value)) {
      cerrarSesion();
      throw new Error('Alerta de seguridad: Reúso de Refresh Token detectado. Sesión revocada.');
    }

    // Marcar el refresh token anterior como revocado
    tokensRevocados.value.add(refreshToken.value);

    accessToken.value = nuevoAccessToken;
    refreshToken.value = nuevoRefreshToken;
    expiraEnTimestamp.value = Date.now() + expiresIn * 1000;
  }

  function tieneRol(rolesPermitidos: RolSGCI[]): boolean {
    if (!estaAutenticado.value || !rolActivo.value) {
      return false;
    }

    if (
      rolActivo.value === ROLES_SGCI.SUPER_ADMIN_SAAS ||
      rolActivo.value === ROLES_SGCI.SUPER_ADMIN
    ) {
      return true;
    }

    return rolesPermitidos.includes(rolActivo.value);
  }

  function tienePermiso(permiso: string): boolean {
    if (!estaAutenticado.value || !rolActivo.value) {
      return false;
    }

    const lista = MATRIZ_PERMISOS_RBAC[rolActivo.value] ?? [];
    return lista.includes('*') || lista.includes(permiso);
  }

  function puedeOperarAlmacen(almacenId: string): boolean {
    if (!estaAutenticado.value || !usuario.value) {
      return false;
    }

    const rol = usuario.value.rol;
    if (
      rol === ROLES_SGCI.SUPER_ADMIN_SAAS ||
      rol === ROLES_SGCI.SUPER_ADMIN ||
      rol === ROLES_SGCI.ADMIN_TENANT ||
      rol === ROLES_SGCI.GERENTE_OPERACIONES
    ) {
      return true;
    }

    return usuario.value.almacenes_asignados_ids.includes(almacenId);
  }

  function cerrarSesion(): void {
    if (refreshToken.value) {
      tokensRevocados.value.add(refreshToken.value);
    }

    accessToken.value = null;
    refreshToken.value = null;
    expiraEnTimestamp.value = null;
    usuario.value = null;
    tenantId.value = null;
    tenantNombre.value = 'Organización SGCI';

    // Purga defensiva del store de inventario
    const inventarioStore = useInventarioStore();
    inventarioStore.limpiarEstadoTenant();
  }

  return {
    accessToken,
    refreshToken,
    expiraEnTimestamp,
    usuario,
    tenantId,
    tenantNombre,
    estaAutenticado,
    rolActivo,
    establecerSesion,
    rotarParTokens,
    tieneRol,
    tienePermiso,
    puedeOperarAlmacen,
    cerrarSesion,
  };
});
