<script setup lang="ts">
import { ref } from 'vue';
import {
  PLANES_SAAS_FIGMA,
  useGobernanzaSaasStore,
  type PlanSaasFigma,
  type RolVistaFigma,
} from '../../modulos/gobernanza/almacen/useGobernanzaSaasStore';

const store = useGobernanzaSaasStore();

const subVista = ref<'suscripcion' | 'usuarios' | 'superadmin' | 'reportes' | 'perfil'>(
  'suscripcion',
);
const nuevoNombre = ref('');
const nuevoCorreo = ref('');
const nuevoRol = ref('Vendedor');
const errorAccion = ref<string | null>(null);

const REPORTES_EJECUTIVOS = [
  {
    titulo: 'Ventas por período',
    descripcion: 'Ingresos, transacciones y ticket promedio.',
    valor: '$42,840 USD',
  },
  {
    titulo: 'Valor del inventario',
    descripcion: 'Costo, utilidad potencial y rotación.',
    valor: '$18,920 USD',
  },
  {
    titulo: 'Productos más vendidos',
    descripcion: 'Ranking por unidades e ingresos.',
    valor: 'Teclado Mecánico Pro',
  },
  {
    titulo: 'Impuestos recaudados',
    descripcion: 'Detalle de IVA para contabilidad.',
    valor: '$6,840 USD',
  },
  {
    titulo: 'Rendimiento de vendedores',
    descripcion: 'Metas y resultados por usuario.',
    valor: '94% cumplimiento',
  },
  {
    titulo: 'Compras a proveedores',
    descripcion: 'Órdenes, costos y tiempos de entrega.',
    valor: '12 órdenes activas',
  },
];

function invitarUsuario(): void {
  errorAccion.value = null;
  try {
    store.invitarMiembroEquipo({
      tenantId: store.tenantActivoId,
      nombre: nuevoNombre.value,
      correo: nuevoCorreo.value,
      rol: nuevoRol.value,
      actorId: 'usr-admin-01',
    });
    nuevoNombre.value = '';
    nuevoCorreo.value = '';
  } catch (err) {
    errorAccion.value = err instanceof Error ? err.message : 'Error al invitar usuario';
  }
}

function cambiarRolDemostracion(rol: RolVistaFigma): void {
  store.rolActivo = rol;
  if (rol === 'superadmin') {
    subVista.value = 'superadmin';
  }
}
</script>

<template>
  <section class="space-y-6" data-testid="vista-gobernanza-reportes-figma">
    <!-- Cabecera y selector de rol (Admin / Vendedor / SuperAdmin) -->
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Sprint 8 · Gobernanza SaaS, Reportes y Modo Vendedor (Pantallas Figma 60-67 y 70-74)
        </span>
        <h1 class="mt-1 text-2xl font-bold text-[#203959]">
          Administración, Suscripciones y Analítica Ejecutiva
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-slate-500">Vista de rol:</span>
        <button
          v-for="r in (['admin', 'seller', 'superadmin'] as RolVistaFigma[])"
          :key="r"
          type="button"
          class="min-h-[40px] rounded-lg px-3 py-1.5 text-xs font-semibold"
          :class="
            store.rolActivo === r
              ? 'bg-[#203959] text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          "
          @click="cambiarRolDemostracion(r)"
        >
          {{ r === 'admin' ? 'Administrador' : r === 'seller' ? 'Vendedor (Solo lectura)' : 'SuperAdmin' }}
        </button>
      </div>
    </header>

    <!-- Navegación interna del módulo -->
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
        :class="
          subVista === 'suscripcion'
            ? 'bg-[#416772] text-white'
            : 'bg-white text-slate-700 border border-slate-300'
        "
        @click="subVista = 'suscripcion'"
      >
        64-65 · Mi suscripción ({{ store.planActual }})
      </button>
      <button
        type="button"
        class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
        :class="
          subVista === 'usuarios'
            ? 'bg-[#416772] text-white'
            : 'bg-white text-slate-700 border border-slate-300'
        "
        @click="subVista = 'usuarios'"
      >
        60-61 · Usuarios y roles
      </button>
      <button
        type="button"
        class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
        :class="
          subVista === 'reportes'
            ? 'bg-[#416772] text-white'
            : 'bg-white text-slate-700 border border-slate-300'
        "
        @click="subVista = 'reportes'"
      >
        63 · Reportes ejecutivos
      </button>
      <button
        type="button"
        class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
        :class="
          subVista === 'perfil'
            ? 'bg-[#416772] text-white'
            : 'bg-white text-slate-700 border border-slate-300'
        "
        @click="subVista = 'perfil'"
      >
        62 · Perfil de empresa
      </button>
      <button
        type="button"
        class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
        :class="
          subVista === 'superadmin'
            ? 'bg-[#416772] text-white'
            : 'bg-white text-slate-700 border border-slate-300'
        "
        @click="subVista = 'superadmin'"
      >
        66-67 · Panel SuperAdmin
      </button>
    </div>

    <div
      v-if="store.avisoGobernanza"
      class="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950"
    >
      {{ store.avisoGobernanza }}
    </div>
    <div
      v-if="errorAccion"
      class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900"
    >
      {{ errorAccion }}
    </div>

    <!-- SUB-VISTA 1: SUSCRIPCIÓN Y PLANES (Pantallas Figma 64 y 65) -->
    <div v-if="subVista === 'suscripcion'" class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <article
        v-for="plan in (['Emprende', 'Crece', 'Pro'] as PlanSaasFigma[])"
        :key="plan"
        class="flex flex-col justify-between rounded-xl border bg-white p-6 shadow-2xs"
        :class="
          store.planActual === plan
            ? 'border-2 border-[#203959] ring-2 ring-[#203959]/10'
            : 'border-slate-200'
        "
      >
        <div>
          <span
            v-if="store.planActual === plan"
            class="inline-block rounded-full bg-[#203959] px-3 py-0.5 text-[11px] font-bold text-white uppercase"
          >
            Plan actual
          </span>
          <h2 class="mt-2 text-lg font-bold text-[#203959]">Plan {{ plan }}</h2>
          <strong class="mt-1 block text-2xl font-bold text-slate-900">
            {{ PLANES_SAAS_FIGMA[plan].precioCopMes }}
            <small class="text-xs font-normal text-slate-500">COP/mes</small>
          </strong>
          <ul class="mt-4 space-y-2 text-xs text-slate-600">
            <li>✔ Hasta {{ PLANES_SAAS_FIGMA[plan].maxUsuarios }} usuarios</li>
            <li>✔ Hasta {{ PLANES_SAAS_FIGMA[plan].maxBodegas }} bodegas</li>
            <li>
              ✔
              {{
                PLANES_SAAS_FIGMA[plan].maxProductos
                  ? `Hasta ${PLANES_SAAS_FIGMA[plan].maxProductos} productos`
                  : 'Productos ilimitados'
              }}
            </li>
            <li>
              {{
                PLANES_SAAS_FIGMA[plan].permiteCargaMasivaCsv
                  ? '✔ Carga masiva CSV habilitada'
                  : '✘ Sin carga masiva CSV'
              }}
            </li>
          </ul>
        </div>
        <button
          type="button"
          :disabled="store.planActual === plan || store.rolActivo === 'seller'"
          class="mt-6 min-h-[44px] w-full rounded-lg bg-[#203959] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          @click="store.cambiarPlanSuscripcion(plan)"
        >
          {{ store.planActual === plan ? 'Tu plan actual' : `Cambiar a ${plan}` }}
        </button>
      </article>
    </div>

    <!-- SUB-VISTA 2: USUARIOS Y ROLES (Pantallas Figma 60 y 61) -->
    <div v-else-if="subVista === 'usuarios'" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <form
        class="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5"
        @submit.prevent="invitarUsuario"
      >
        <h2 class="text-base font-bold text-[#203959]">Invitar usuario al equipo</h2>
        <label class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Nombre completo</span>
          <input
            v-model="nuevoNombre"
            required
            type="text"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Correo electrónico</span>
          <input
            v-model="nuevoCorreo"
            required
            type="email"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label class="block text-sm">
          <span class="mb-1 block font-medium text-slate-700">Rol asignado</span>
          <select
            v-model="nuevoRol"
            class="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            <option>Administrador</option>
            <option>Vendedor</option>
            <option>Bodega</option>
            <option>Auditor</option>
          </select>
        </label>
        <button
          type="submit"
          class="min-h-[44px] w-full rounded-lg bg-[#203959] px-4 py-2 text-xs font-semibold text-white"
        >
          Enviar invitación
        </button>
      </form>

      <div class="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
        <h2 class="mb-4 text-base font-bold text-[#203959]">
          Miembros registrados ({{ store.miembrosDelTenant.length }} /
          {{ store.detallePlanActual.maxUsuarios }})
        </h2>
        <ul class="divide-y divide-slate-200 text-sm">
          <li
            v-for="m in store.miembrosDelTenant"
            :key="m.id"
            class="flex items-center justify-between py-3"
          >
            <div>
              <strong class="block font-semibold text-slate-900">{{ m.nombre }}</strong>
              <small class="text-xs text-slate-500">{{ m.correo }}</small>
            </div>
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#203959]">
              {{ m.rol }} · {{ m.estado }}
            </span>
          </li>
        </ul>
      </div>
    </div>

    <!-- SUB-VISTA 3: PANEL SUPERADMIN CON PRIVACIDAD POR DISEÑO (Pantallas Figma 66 y 67) -->
    <div v-else-if="subVista === 'superadmin'" class="space-y-4">
      <div
        data-testid="banner-privacidad-por-diseno"
        class="rounded-xl border border-[#416772]/40 bg-[#203959] p-4 text-xs text-white"
      >
        <strong>Privacidad por diseño:</strong> El SuperAdmin solo administra empresas, accesos y
        membresías. Los productos, ventas, clientes e inventarios de cada empresa permanecen
        aislados.
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-6">
        <h2 class="mb-4 text-base font-bold text-[#203959]">Directorio de empresas clientes</h2>
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs text-slate-500 uppercase">
              <th class="py-2">Organización</th>
              <th class="py-2">Propietario</th>
              <th class="py-2">Plan</th>
              <th class="py-2">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="emp in store.directorioEmpresasSuperAdmin" :key="emp.id">
              <td class="py-3 font-semibold text-slate-900">{{ emp.organizacion }}</td>
              <td class="py-3 text-slate-600">{{ emp.propietario }}</td>
              <td class="py-3">{{ emp.plan }}</td>
              <td class="py-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  :class="
                    emp.estado === 'Activa'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  "
                >
                  {{ emp.estado }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SUB-VISTA 4: REPORTES EJECUTIVOS (Pantalla Figma 63) -->
    <div v-else-if="subVista === 'reportes'" class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article
        v-for="rep in REPORTES_EJECUTIVOS"
        :key="rep.titulo"
        class="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs"
      >
        <h3 class="text-sm font-bold text-[#203959]">{{ rep.titulo }}</h3>
        <p class="mt-1 text-xs text-slate-600">{{ rep.descripcion }}</p>
        <strong class="mt-3 block text-lg font-bold text-[#416772]">{{ rep.valor }}</strong>
      </article>
    </div>

    <!-- SUB-VISTA 5: PERFIL DE EMPRESA (Pantalla Figma 62) -->
    <div v-else class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-base font-bold text-[#203959]">
        {{ store.perfilEmpresa.razonSocial }} · NIT {{ store.perfilEmpresa.nit }}
      </h2>
      <p class="mt-1 text-xs text-slate-600">
        {{ store.perfilEmpresa.direccion }} · {{ store.perfilEmpresa.ciudad }},
        {{ store.perfilEmpresa.pais }}
      </p>
    </div>
  </section>
</template>
