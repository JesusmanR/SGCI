<script setup lang="ts">
import type { RolSGCI } from '../../compartido/tipos/entidadBase';

export interface OpcionAlmacenTenant {
  id: string;
  codigo: string;
  nombre: string;
  esPrincipal?: boolean;
}

interface Props {
  tenantId: string;
  tenantNombre: string;
  rolActivo: RolSGCI;
  almacenes: OpcionAlmacenTenant[];
  almacenSeleccionadoId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'cambiarAlmacen', almacenId: string): void;
}>();

function seleccionarAlmacen(evento: Event): void {
  const select = evento.target as HTMLSelectElement;
  emit('cambiarAlmacen', select.value);
}
</script>

<template>
  <section
    aria-label="Contexto de Organización y Almacén Activo"
    class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#203959] text-[#ABB7B3] px-4 py-3 border border-[#416772]"
  >
    <div class="flex flex-col">
      <div class="flex items-center gap-2">
        <span class="inline-block h-2.5 w-2.5 rounded-full bg-[#96ADA5]" aria-hidden="true" />
        <span class="text-sm font-bold text-white tracking-wide">{{ tenantNombre }}</span>
        <span
          class="rounded-md bg-[#416772] px-2 py-0.5 text-xs font-semibold text-[#ABB7B3]"
          data-testid="badge-rol-activo"
        >
          {{ rolActivo }}
        </span>
      </div>
      <span class="text-xs text-[#839492] font-mono mt-0.5">
        Tenant UUID: {{ tenantId }}
      </span>
    </div>

    <div class="flex items-center gap-2">
      <label for="selector-almacen-activo" class="text-xs font-medium text-[#ABB7B3] whitespace-nowrap">
        Bodega activa:
      </label>
      <select
        id="selector-almacen-activo"
        :value="almacenSeleccionadoId ?? ''"
        class="min-h-[44px] rounded-lg bg-[#416772] text-white text-sm font-medium px-3 py-2 border border-[#96ADA5]/40 focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
        @change="seleccionarAlmacen"
      >
        <option
          v-for="alm in almacenes"
          :key="alm.id"
          :value="alm.id"
        >
          {{ alm.codigo }} — {{ alm.nombre }}
        </option>
      </select>
    </div>
  </section>
</template>
