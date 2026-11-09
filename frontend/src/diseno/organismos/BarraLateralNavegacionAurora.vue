<script setup lang="ts">
import { computed, ref } from 'vue';
import { filtrarRutasPorRol, type DefinicionRutaSgci } from '../../router/index';
import { useSesionMultiTenantStore } from '../../stores/useSesionMultiTenantStore';
import type { RolUsuarioSaas } from '../../modulos/gobernanza/almacen/useGobernanzaSaasStore';

const props = defineProps<{
  rutaActivaId: string;
  notificacionesPendientes: number;
  operacionesOfflinePendientes: number;
}>();

const emit = defineEmits<{
  (e: 'seleccionar-ruta', rutaId: string): void;
  (e: 'cambiar-rol', rol: RolUsuarioSaas): void;
  (e: 'cambiar-tenant', tenantId: string): void;
  (e: 'alternar-conexion'): void;
}>();

const sesionStore = useSesionMultiTenantStore();
const menuContraido = ref<boolean>(false);

const rutasVisibles = computed<DefinicionRutaSgci[]>(() =>
  filtrarRutasPorRol(sesionStore.rolActivo),
);

function alternarMenuLateral(): void {
  menuContraido.value = !menuContraido.value;
}

function manejarCambioTenant(event: Event): void {
  const select = event.target as HTMLSelectElement;
  sesionStore.cambiarEmpresaActiva(select.value);
  emit('cambiar-tenant', select.value);
}

function manejarCambioRol(rol: RolUsuarioSaas): void {
  sesionStore.cambiarRolActivo(rol);
  emit('cambiar-rol', rol);
}
</script>

<template>
  <aside
    class="flex w-full flex-col justify-between border-r border-slate-800 bg-[#0A1120] text-white transition-all duration-200 lg:min-h-screen"
    :class="menuContraido ? 'lg:w-20' : 'lg:w-72'"
  >
    <div class="p-4 space-y-5">
      <!-- Marca Institucional SGCI + Botón Menú Expandido/Contraído (00-MENU-EXPANDIDO-Y-CONTRAIDO) -->
      <div
        class="flex items-center border-b border-slate-800 pb-4"
        :class="menuContraido ? 'justify-center' : 'justify-between'"
      >
        <div v-if="!menuContraido" class="flex items-center gap-3 min-w-0">
          <div class="flex h-9 w-9 shrink-0 items-end justify-center gap-1 rounded-xl bg-[#0F1D3A] border border-cyan-500/30 p-2">
            <span class="w-1 h-2.5 rounded-full bg-cyan-400"></span>
            <span class="w-1 h-4 rounded-full bg-cyan-400"></span>
            <span class="w-1 h-5 rounded-full bg-cyan-300"></span>
          </div>
          <div class="truncate">
            <h1 class="text-base font-extrabold text-white leading-none">
              SGCI
            </h1>
            <span class="block font-mono text-[9px] font-bold tracking-widest text-slate-400 uppercase mt-1">
              CONTROL DE INVENTARIOS
            </span>
          </div>
        </div>
        <button
          type="button"
          :title="menuContraido ? 'Expandir menú lateral' : 'Contraer menú lateral'"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 font-mono text-xs text-slate-300 hover:border-cyan-400 hover:text-white transition"
          @click="alternarMenuLateral"
        >
          {{ menuContraido ? '|▷' : '|◁' }}
        </button>
      </div>

      <!-- Selector de Empresa Multi-Tenant (Oculto limpiamente cuando menuContraido === true) -->
      <div v-if="!menuContraido" class="rounded-xl bg-[#416772]/35 p-3 border border-[#96ADA5]/25 space-y-2">
        <div class="flex items-center justify-between text-[11px] text-[#ABB7B3]">
          <span>Organización Activa (Tenant)</span>
          <span class="rounded bg-[#96ADA5]/20 px-1.5 py-0.5 font-mono text-[#96ADA5] font-semibold">
            Plan {{ sesionStore.empresaActiva.plan }}
          </span>
        </div>
        <select
          :value="sesionStore.tenantIdSeleccionado"
          aria-label="Seleccionar organización Multi-Tenant"
          class="w-full rounded-lg bg-[#203959] border border-[#96ADA5]/40 px-2.5 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
          @change="manejarCambioTenant"
        >
          <option
            v-for="emp in sesionStore.empresasRegistradas"
            :key="emp.id"
            :value="emp.id"
          >
            {{ emp.nombre }} ({{ emp.plan }})
          </option>
        </select>
        <div class="flex items-center justify-between text-[11px] text-[#ABB7B3]">
          <span class="truncate">📍 {{ sesionStore.empresaActiva.bodegaPrincipalNombre }}</span>
          <span class="font-mono shrink-0">{{ sesionStore.empresaActiva.nit }}</span>
        </div>
      </div>

      <!-- Conmutador de Rol RBAC (Oculto cuando menuContraido === true) -->
      <div v-if="!menuContraido" class="space-y-1.5">
        <span class="block text-[11px] font-semibold uppercase tracking-wider text-[#96ADA5]">
          Perfil RBAC en Sesión
        </span>
        <div class="grid grid-cols-3 gap-1 rounded-lg bg-[#162840] p-1">
          <button
            type="button"
            class="rounded-md py-1.5 text-[11px] font-semibold transition"
            :class="
              sesionStore.rolActivo === 'admin'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'text-[#ABB7B3] hover:text-white'
            "
            @click="manejarCambioRol('admin')"
          >
            Admin
          </button>
          <button
            type="button"
            class="rounded-md py-1.5 text-[11px] font-semibold transition"
            :class="
              sesionStore.rolActivo === 'seller'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'text-[#ABB7B3] hover:text-white'
            "
            @click="manejarCambioRol('seller')"
          >
            Vendedor
          </button>
          <button
            type="button"
            class="rounded-md py-1.5 text-[11px] font-semibold transition"
            :class="
              sesionStore.rolActivo === 'superadmin'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'text-[#ABB7B3] hover:text-white'
            "
            @click="manejarCambioRol('superadmin')"
          >
            SuperAdmin
          </button>
        </div>
      </div>

      <!-- Menú de Navegación Screaming Architecture (Sin superposición en modo contraído) -->
      <nav aria-label="Navegación principal SGCI" class="space-y-1">
        <button
          v-for="item in rutasVisibles"
          :key="item.id"
          type="button"
          :title="item.titulo"
          class="flex w-full items-center rounded-xl transition relative"
          :class="[
            menuContraido ? 'justify-center h-11 w-11 mx-auto' : 'items-start gap-3 px-3 py-2.5 text-left',
            props.rutaActivaId === item.id
              ? 'bg-[#2563EB] text-white font-bold shadow-sm border-l-4 border-l-cyan-300'
              : 'text-slate-200 hover:bg-slate-800/70'
          ]"
          @click="emit('seleccionar-ruta', item.id)"
        >
          <span class="text-base leading-none shrink-0">{{ item.icono }}</span>
          <div v-if="!menuContraido" class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-1">
              <span class="truncate text-xs font-semibold">{{ item.titulo }}</span>
              <span
                v-if="item.id === 'estados-alertas' && props.notificacionesPendientes > 0"
                class="rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] font-bold text-slate-900"
              >
                {{ props.notificacionesPendientes }}
              </span>
            </div>
            <span
              class="block truncate text-[10px]"
              :class="props.rutaActivaId === item.id ? 'text-cyan-100' : 'text-[#ABB7B3]'"
            >
              {{ item.pantallasFigma }}
            </span>
          </div>
        </button>
      </nav>
    </div>

    <!-- Pie de Barra Lateral -->
    <div class="border-t border-slate-800 p-4 space-y-3 bg-[#080E1A]">
      <div v-if="!menuContraido" class="flex items-center justify-between text-xs">
        <span class="text-[#ABB7B3]">Cola Offline IndexedDB:</span>
        <span class="font-mono font-bold text-cyan-400">
          {{ props.operacionesOfflinePendientes }} pend.
        </span>
      </div>
      <button
        type="button"
        :title="sesionStore.conectadoRed ? 'Simular Corte de Red' : 'Reconectar Red'"
        class="w-full min-h-[40px] rounded-lg border border-cyan-500/30 bg-[#0D182C] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB] transition"
        @click="
          sesionStore.alternarEstadoConexion();
          emit('alternar-conexion');
        "
      >
        {{
          menuContraido
            ? (sesionStore.conectadoRed ? '📡' : '⚡')
            : (sesionStore.conectadoRed
                ? 'Simular Corte de Red (Modo Offline)'
                : 'Reconectar Red y Sincronizar Cola')
        }}
      </button>
    </div>
  </aside>
</template>
