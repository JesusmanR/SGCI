import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { RolUsuarioSaas, TipoPlanSaas } from '../modulos/gobernanza/almacen/useGobernanzaSaasStore';

export interface EmpresaTenant {
  id: string;
  nombre: string;
  nit: string;
  subdominio: string;
  plan: TipoPlanSaas;
  estadoMembresia: 'Activa' | 'Suspendida' | 'Cancelada' | 'Prueba';
  bodegaPrincipalNombre: string;
  bodegaPrincipalId: string;
}

/**
 * Store transversal de Sesión Multi-Tenant, Conmutador de Rol (Admin, Vendedor, SuperAdmin)
 * y Estado de Conectividad PWA (Sección 6.1 de AGENTS.md).
 */
export const useSesionMultiTenantStore = defineStore('sesionMultiTenant', () => {
  const empresasRegistradas = ref<EmpresaTenant[]>([
    {
      id: '11111111-1111-4111-8111-111111111111',
      nombre: 'Comercializadora Aurora S.A.S.',
      nit: '901.452.881-3',
      subdominio: 'aurora.sgci.co',
      plan: 'Crece',
      estadoMembresia: 'Activa',
      bodegaPrincipalNombre: 'Bodega Central Bogotá',
      bodegaPrincipalId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      nombre: 'Distribuciones Andinas Pro Ltda.',
      nit: '800.912.334-1',
      subdominio: 'andinas.sgci.co',
      plan: 'Pro',
      estadoMembresia: 'Activa',
      bodegaPrincipalNombre: 'Centro Logístico Medellín',
      bodegaPrincipalId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      nombre: 'Ferretería El Constructor Express',
      nit: '900.118.402-9',
      subdominio: 'constructor.sgci.co',
      plan: 'Emprende',
      estadoMembresia: 'Activa',
      bodegaPrincipalNombre: 'Bodega Principal Cali',
      bodegaPrincipalId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    },
  ]);

  const tenantIdSeleccionado = ref<string>('11111111-1111-4111-8111-111111111111');
  const rolActivo = ref<RolUsuarioSaas>('admin');
  const usuarioNombre = ref<string>('Alex Morgan');
  const usuarioCargo = ref<string>('Administrador General');
  const conectadoRed = ref<boolean>(true);

  const empresaActiva = computed<EmpresaTenant>(() => {
    return (
      empresasRegistradas.value.find((e) => e.id === tenantIdSeleccionado.value) ??
      empresasRegistradas.value[0]
    );
  });

  const esModoVendedor = computed<boolean>(() => rolActivo.value === 'seller');
  const esSuperAdmin = computed<boolean>(() => rolActivo.value === 'superadmin');

  function cambiarEmpresaActiva(tenantId: string): void {
    const existe = empresasRegistradas.value.some((e) => e.id === tenantId);
    if (!existe) {
      throw new Error(`La empresa con ID ${tenantId} no existe en el directorio Multi-Tenant.`);
    }
    tenantIdSeleccionado.value = tenantId;
  }

  function cambiarRolActivo(nuevoRol: RolUsuarioSaas): void {
    rolActivo.value = nuevoRol;
    if (nuevoRol === 'seller') {
      usuarioCargo.value = 'Vendedor de Mostrador (Costos Ocultos)';
    } else if (nuevoRol === 'superadmin') {
      usuarioCargo.value = 'SuperAdmin SaaS (Privacidad por Diseño)';
    } else {
      usuarioCargo.value = 'Administrador de Empresa';
    }
  }

  function alternarEstadoConexion(enLinea?: boolean): void {
    conectadoRed.value = typeof enLinea === 'boolean' ? enLinea : !conectadoRed.value;
  }

  return {
    empresasRegistradas,
    tenantIdSeleccionado,
    rolActivo,
    usuarioNombre,
    usuarioCargo,
    conectadoRed,
    empresaActiva,
    esModoVendedor,
    esSuperAdmin,
    cambiarEmpresaActiva,
    cambiarRolActivo,
    alternarEstadoConexion,
  };
});
