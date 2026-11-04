<script setup lang="ts">
/**
 * Molécula: BuscadorEscanerSku.vue
 * Barra de búsqueda rápida de catálogo con disparador de escáner óptico EAN-13 / QR.
 * Cumple Mobile-First PWA (touch target >= 44px) y paleta oficial Aurora Mist.
 */
import { ref } from 'vue';

interface CategoriaOpcion {
  id: string;
  nombre: string;
}

interface Props {
  terminoBusqueda: string;
  categoriaSeleccionada?: string;
  categorias?: CategoriaOpcion[];
  escaneandoActivo?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  categoriaSeleccionada: 'TODAS',
  categorias: () => [],
  escaneandoActivo: false,
});

const emit = defineEmits<{
  (e: 'update:terminoBusqueda', valor: string): void;
  (e: 'update:categoriaSeleccionada', valor: string): void;
  (e: 'activar-escaner'): void;
  (e: 'lectura-codigo', codigo: string): void;
}>();

const codigoManualEscaner = ref('');

function alEscribirBusqueda(evento: Event): void {
  const objetivo = evento.target as HTMLInputElement;
  emit('update:terminoBusqueda', objetivo.value);
}

function alCambiarCategoria(evento: Event): void {
  const objetivo = evento.target as HTMLSelectElement;
  emit('update:categoriaSeleccionada', objetivo.value);
}

function simularDisparoLectorLaser(): void {
  if (codigoManualEscaner.value.trim() !== '') {
    emit('lectura-codigo', codigoManualEscaner.value.trim());
    codigoManualEscaner.value = '';
    return;
  }
  emit('activar-escaner');
}
</script>

<template>
  <section
    class="rounded-xl border border-[#839492]/40 bg-white p-3.5 shadow-sm"
    aria-label="Buscador de catálogo y lector óptico SKU / EAN-13"
  >
    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <!-- Campo de búsqueda por SKU, EAN-13, QR o nombre -->
      <div class="relative flex-1">
        <label for="buscador-sku-input" class="sr-only">
          Buscar por SKU, EAN-13, QR o nombre de artículo
        </label>
        <input
          id="buscador-sku-input"
          type="search"
          :value="props.terminoBusqueda"
          placeholder="Buscar por SKU (AC-100-FLEX), EAN-13, QR o descripción..."
          class="min-h-[44px] w-full rounded-lg border border-[#839492] bg-[#F4F7F6]/60 px-3.5 py-2.5 text-base text-[#203959] placeholder-[#839492] focus:border-[#416772] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#416772]/30"
          data-testid="input-buscador-sku"
          @input="alEscribirBusqueda"
          @keyup.enter="emit('lectura-codigo', props.terminoBusqueda)"
        />
      </div>

      <!-- Selector de Categoría -->
      <div class="w-full md:w-56">
        <label for="selector-categoria-catalogo" class="sr-only">Filtrar por categoría</label>
        <select
          id="selector-categoria-catalogo"
          :value="props.categoriaSeleccionada"
          class="min-h-[44px] w-full rounded-lg border border-[#839492] bg-white px-3 py-2.5 text-sm font-medium text-[#203959] focus:border-[#416772] focus:outline-none focus:ring-2 focus:ring-[#416772]/30"
          data-testid="select-categoria-catalogo"
          @change="alCambiarCategoria"
        >
          <option value="TODAS">Todas las Categorías</option>
          <option
            v-for="cat in props.categorias"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.nombre }}
          </option>
        </select>
      </div>

      <!-- Botón táctil PWA 44px para activar cámara / lector láser EAN-13 / QR -->
      <button
        type="button"
        class="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#416772]"
        :class="
          props.escaneandoActivo
            ? 'bg-[#203959] text-[#ABB7B3]'
            : 'bg-[#416772] text-white hover:bg-[#203959]'
        "
        data-testid="btn-escanear-codigo"
        @click="simularDisparoLectorLaser"
      >
        <span class="font-mono text-xs uppercase tracking-wider">
          {{ props.escaneandoActivo ? '● Lector Óptico Activo' : 'Escanear EAN-13 / QR' }}
        </span>
      </button>
    </div>
  </section>
</template>
