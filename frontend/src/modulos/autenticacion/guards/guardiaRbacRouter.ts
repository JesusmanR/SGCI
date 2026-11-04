import type { RolSGCI } from '../../../compartido/tipos/entidadBase';
import { useAutenticacionStore } from '../almacen/useAutenticacionStore';

export interface ContextoRutaProtegida {
  rutaDestino: string;
  requiereAutenticacion?: boolean;
  rolesPermitidos?: RolSGCI[];
  permisoRequerido?: string;
  almacenIdRuta?: string;
}

export interface ResultadoGuardiaRbac {
  permitido: boolean;
  redireccionarA: string | null;
  motivoRechazo:
    | 'NO_AUTENTICADO'
    | 'ROL_NO_AUTORIZADO'
    | 'PERMISO_INSUFICIENTE'
    | 'ALMACEN_NO_ASIGNADO'
    | null;
}

/**
 * Guard de navegación RBAC y aislamiento Multi-Tenant para Vue Router.
 */
export function evaluarGuardiaRbacRouter(contexto: ContextoRutaProtegida): ResultadoGuardiaRbac {
  const authStore = useAutenticacionStore();

  if (contexto.requiereAutenticacion !== false && !authStore.estaAutenticado) {
    return {
      permitido: false,
      redireccionarA: '/login',
      motivoRechazo: 'NO_AUTENTICADO',
    };
  }

  if (contexto.rolesPermitidos && contexto.rolesPermitidos.length > 0) {
    if (!authStore.tieneRol(contexto.rolesPermitidos)) {
      return {
        permitido: false,
        redireccionarA: '/acceso-denegado',
        motivoRechazo: 'ROL_NO_AUTORIZADO',
      };
    }
  }

  if (contexto.permisoRequerido) {
    if (!authStore.tienePermiso(contexto.permisoRequerido)) {
      return {
        permitido: false,
        redireccionarA: '/acceso-denegado',
        motivoRechazo: 'PERMISO_INSUFICIENTE',
      };
    }
  }

  if (contexto.almacenIdRuta) {
    if (!authStore.puedeOperarAlmacen(contexto.almacenIdRuta)) {
      return {
        permitido: false,
        redireccionarA: '/almacen-no-autorizado',
        motivoRechazo: 'ALMACEN_NO_ASIGNADO',
      };
    }
  }

  return {
    permitido: true,
    redireccionarA: null,
    motivoRechazo: null,
  };
}
