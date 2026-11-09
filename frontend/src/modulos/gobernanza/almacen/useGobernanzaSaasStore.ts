import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EntidadBaseTenant } from '../../../compartido/tipos/entidadBase';
import { redondearMoneda } from '../../precios/almacen/usePreciosImpuestosStore';

export type PlanSaasFigma = 'Emprende' | 'Crece' | 'Pro';
export type TipoPlanSaas = PlanSaasFigma;
export type EstadoMembresiaFigma = 'Activa' | 'Suspendida' | 'Cancelada' | 'Prueba';
export type RolVistaFigma = 'admin' | 'seller' | 'superadmin';
export type RolUsuarioSaas = RolVistaFigma;

export interface MiembroEquipoFigma extends EntidadBaseTenant {
  nombre: string;
  correo: string;
  rol: string;
  estado: 'Activo' | 'Pendiente' | 'Suspendido';
}

export interface EmpresaInquilinaSuperAdmin {
  id: string;
  organizacion: string;
  propietario: string;
  correoPropietario: string;
  plan: PlanSaasFigma;
  valorMensualCop: string;
  renovacion: string;
  estado: EstadoMembresiaFigma;
}

export interface PerfilEmpresaFigma {
  tenantId: string;
  razonSocial: string;
  nit: string;
  telefono: string;
  correoFacturacion: string;
  ciudad: string;
  pais: string;
  direccion: string;
  cambiosGuardados: boolean;
}

export interface CatalogoPlanDetalle {
  nombre: PlanSaasFigma;
  precioCopMes: string;
  maxUsuarios: number;
  maxBodegas: number;
  maxProductos: number | null;
  permiteCargaMasivaCsv: boolean;
}

export const PLANES_SAAS_FIGMA: Record<PlanSaasFigma, CatalogoPlanDetalle> = {
  Emprende: {
    nombre: 'Emprende',
    precioCopMes: '$39.900',
    maxUsuarios: 2,
    maxBodegas: 1,
    maxProductos: 1000,
    permiteCargaMasivaCsv: false,
  },
  Crece: {
    nombre: 'Crece',
    precioCopMes: '$89.900',
    maxUsuarios: 5,
    maxBodegas: 3,
    maxProductos: 5000,
    permiteCargaMasivaCsv: true,
  },
  Pro: {
    nombre: 'Pro',
    precioCopMes: '$179.900',
    maxUsuarios: 15,
    maxBodegas: 10,
    maxProductos: null,
    permiteCargaMasivaCsv: true,
  },
};

/**
 * Store Pinia del Sprint 8: Administración, Suscripciones SaaS, SuperAdmin con Privacidad por Diseño,
 * Reportes Ejecutivos y Modo Vendedor (Pantallas Figma 60 a 67 y 70 a 74).
 */
export const useGobernanzaSaasStore = defineStore('gobernanzaSaas', () => {
  const tenantActivoId = ref<string>('11111111-1111-4111-8111-111111111111');
  const rolActivo = ref<RolVistaFigma>('admin');
  const planActual = ref<PlanSaasFigma>('Crece');
  const avisoGobernanza = ref<string | null>(null);

  const perfilEmpresa = ref<PerfilEmpresaFigma>({
    tenantId: '11111111-1111-4111-8111-111111111111',
    razonSocial: 'Comercial Andina S.A.S.',
    nit: '901.482.310-2',
    telefono: '+57 300 555 0142',
    correoFacturacion: 'facturacion@comercialandina.co',
    ciudad: 'Bogotá D.C.',
    pais: 'Colombia',
    direccion: 'Carrera 15 # 92-18, Oficina 304',
    cambiosGuardados: false,
  });

  const miembrosEquipo = ref<MiembroEquipoFigma[]>([]);
  const directorioEmpresasSuperAdmin = ref<EmpresaInquilinaSuperAdmin[]>([
    {
      id: 'emp-1',
      organizacion: 'Comercial Andina',
      propietario: 'Alex Morgan',
      correoPropietario: 'alex@comercialandina.co',
      plan: 'Crece',
      valorMensualCop: '$89.900 COP/mes',
      renovacion: '28 May, 2025',
      estado: 'Activa',
    },
    {
      id: 'emp-2',
      organizacion: 'Estudio Norte',
      propietario: 'Sofía Mendoza',
      correoPropietario: 'sofia@estudionorte.co',
      plan: 'Pro',
      valorMensualCop: '$179.900 COP/mes',
      renovacion: '02 Jun, 2025',
      estado: 'Activa',
    },
    {
      id: 'emp-3',
      organizacion: 'Atlas Retail',
      propietario: 'Camila Torres',
      correoPropietario: 'camila@atlas.co',
      plan: 'Emprende',
      valorMensualCop: '$39.900 COP/mes',
      renovacion: '24 May, 2025',
      estado: 'Suspendida',
    },
  ]);

  const detallePlanActual = computed<CatalogoPlanDetalle>(
    () => PLANES_SAAS_FIGMA[planActual.value],
  );

  const permiteCargaMasivaCsv = computed<boolean>(
    () =>
      rolActivo.value !== 'seller' &&
      PLANES_SAAS_FIGMA[planActual.value].permiteCargaMasivaCsv,
  );

  const miembrosDelTenant = computed<MiembroEquipoFigma[]>(() =>
    miembrosEquipo.value.filter(
      (m) => m.tenant_id === tenantActivoId.value && m.deleted_at === null,
    ),
  );

  function establecerContexto(tenantId: string, rol: RolVistaFigma = 'admin'): void {
    tenantActivoId.value = tenantId;
    rolActivo.value = rol;
    avisoGobernanza.value = null;
  }

  function cargarMiembrosIniciales(lista: MiembroEquipoFigma[]): void {
    miembrosEquipo.value = lista.map((m) => ({ ...m }));
  }

  /**
   * Invita a un nuevo usuario verificando el límite del plan activo (Pantallas Figma 60 y 61).
   */
  function invitarMiembroEquipo(datos: {
    tenantId: string;
    nombre: string;
    correo: string;
    rol: string;
    actorId: string;
  }): MiembroEquipoFigma {
    if (datos.tenantId !== tenantActivoId.value) {
      throw new Error('Violación Multi-Tenant al invitar miembro de equipo.');
    }

    const limiteUsuarios = detallePlanActual.value.maxUsuarios;
    if (miembrosDelTenant.value.length >= limiteUsuarios) {
      throw new Error(
        `El plan ${planActual.value} permite hasta ${limiteUsuarios} usuarios. Mejora tu plan para agregar más miembros.`,
      );
    }

    const ahora = new Date().toISOString();
    const nuevo: MiembroEquipoFigma = {
      id: crypto.randomUUID(),
      tenant_id: datos.tenantId,
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim().toLowerCase(),
      rol: datos.rol,
      estado: 'Pendiente',
      created_at: ahora,
      updated_at: ahora,
      deleted_at: null,
      created_by: datos.actorId,
      updated_by: datos.actorId,
    };

    miembrosEquipo.value = [...miembrosEquipo.value, nuevo];
    avisoGobernanza.value = `Invitación enviada a ${nuevo.correo} con rol ${nuevo.rol}.`;
    return nuevo;
  }

  /**
   * Cambia el plan de suscripción de la empresa (Pantallas Figma 64 y 65).
   */
  function cambiarPlanSuscripcion(nuevoPlan: PlanSaasFigma): void {
    if (rolActivo.value === 'seller') {
      throw new Error('El rol Vendedor no tiene permisos para modificar la suscripción.');
    }
    planActual.value = nuevoPlan;
    avisoGobernanza.value = `Suscripción actualizada al Plan ${nuevoPlan}.`;
  }

  /**
   * Actualiza el estado de una empresa desde el Panel SuperAdmin (Pantallas Figma 66 y 67).
   */
  function cambiarEstadoEmpresaSuperAdmin(
    empresaId: string,
    nuevoEstado: EstadoMembresiaFigma,
  ): void {
    if (rolActivo.value !== 'superadmin') {
      throw new Error('Solo el SuperAdmin puede cambiar el estado de empresas clientes.');
    }
    const emp = directorioEmpresasSuperAdmin.value.find((e) => e.id === empresaId);
    if (!emp) {
      throw new Error('Empresa cliente no encontrada.');
    }
    emp.estado = nuevoEstado;
    avisoGobernanza.value = `Estado de ${emp.organizacion} actualizado a ${nuevoEstado}.`;
  }

  /**
   * Proyecta productos respetando Privacidad por Diseño (SuperAdmin bloqueado)
   * y Modo Vendedor (sin costos ni márgenes) (Pantallas Figma 66 y 70-74).
   */
  function proyectarListaPreciosSegunRol(
    productos: Array<{
      sku: string;
      nombre: string;
      costo: number;
      precio: number;
      impuesto: number;
      stock: number;
      tenant_id: string;
    }>,
  ): Array<Record<string, unknown>> {
    if (rolActivo.value === 'superadmin') {
      throw new Error(
        'Privacidad por diseño: El SuperAdmin solo administra empresas, accesos y membresías. Los productos, ventas, clientes e inventarios de cada empresa permanecen aislados.',
      );
    }

    return productos
      .filter((p) => p.tenant_id === tenantActivoId.value)
      .map((p) => {
        if (rolActivo.value === 'seller') {
          return {
            sku: p.sku,
            nombre: p.nombre,
            precio: redondearMoneda(p.precio),
            stock: p.stock,
            soloLectura: true,
          };
        }
        return {
          sku: p.sku,
          nombre: p.nombre,
          costo: redondearMoneda(p.costo),
          margenPorcentaje: redondearMoneda(((p.precio - p.costo) / p.precio) * 100),
          precio: redondearMoneda(p.precio),
          impuesto: p.impuesto,
          stock: p.stock,
          soloLectura: false,
        };
      });
  }

  return {
    tenantActivoId,
    rolActivo,
    planActual,
    avisoGobernanza,
    perfilEmpresa,
    miembrosEquipo,
    directorioEmpresasSuperAdmin,
    detallePlanActual,
    permiteCargaMasivaCsv,
    miembrosDelTenant,
    establecerContexto,
    cargarMiembrosIniciales,
    invitarMiembroEquipo,
    cambiarPlanSuscripcion,
    cambiarEstadoEmpresaSuperAdmin,
    proyectarListaPreciosSegunRol,
  };
});
