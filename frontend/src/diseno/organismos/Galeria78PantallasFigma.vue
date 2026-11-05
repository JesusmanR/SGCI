<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

export interface PantallaFigmaItem {
  code: string;
  slug: string;
  group: string;
  title: string;
  description: string;
  desktop: string;
  mobile: string | null;
}

interface Props {
  pantallas?: PantallaFigmaItem[];
  cargarManifestAutomatico?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pantallas: () => [
    {
      code: '01',
      slug: '01-landing',
      group: 'Acceso y bienvenida',
      title: 'Página pública de presentación',
      description: 'Inicio comercial con propuesta de valor y acceso.',
      desktop: '/artifacts/sgip-pantallas/escritorio/01-landing.png',
      mobile: '/artifacts/sgip-pantallas/movil/01-landing.png',
    },
    {
      code: '12',
      slug: '12-dashboard-principal',
      group: 'Panel principal',
      title: 'Panel principal con métricas',
      description: 'Resumen diario de ventas, inventario y alertas.',
      desktop: '/artifacts/sgip-pantallas/escritorio/12-dashboard-principal.png',
      mobile: '/artifacts/sgip-pantallas/movil/12-dashboard-principal.png',
    },
    {
      code: '14',
      slug: '14-catalogo-productos',
      group: 'Catálogo e inventario',
      title: 'Catálogo de productos',
      description: 'Tabla de productos con SKU, categoría, stock y estado.',
      desktop: '/artifacts/sgip-pantallas/escritorio/14-catalogo-productos.png',
      mobile: '/artifacts/sgip-pantallas/movil/14-catalogo-productos.png',
    },
    {
      code: '36',
      slug: '36-ordenes-compra',
      group: 'Compras y ajustes',
      title: 'Órdenes de compra',
      description: 'Listado de órdenes con progreso de recepción.',
      desktop: '/artifacts/sgip-pantallas/escritorio/36-ordenes-compra.png',
      mobile: '/artifacts/sgip-pantallas/movil/36-ordenes-compra.png',
    },
    {
      code: '42',
      slug: '42-historial-inventario',
      group: 'Compras y ajustes',
      title: 'Ajustes de inventario',
      description: 'Métricas e historial de movimientos de existencias.',
      desktop: '/artifacts/sgip-pantallas/escritorio/42-historial-inventario.png',
      mobile: '/artifacts/sgip-pantallas/movil/42-historial-inventario.png',
    },
    {
      code: '46',
      slug: '46-impuestos-ganancia',
      group: 'Precios e impuestos',
      title: 'Impuestos y ganancia',
      description: 'Configuración de IVA y cálculo en vivo.',
      desktop: '/artifacts/sgip-pantallas/escritorio/46-impuestos-ganancia.png',
      mobile: '/artifacts/sgip-pantallas/movil/46-impuestos-ganancia.png',
    },
    {
      code: '77',
      slug: '77-confirmar-bajo-costo',
      group: 'Precios e impuestos',
      title: 'Confirmación de precio bajo el costo',
      description: 'Bloqueo preventivo cuando un precio es menor al costo.',
      desktop: '/artifacts/sgip-pantallas/escritorio/77-confirmar-bajo-costo.png',
      mobile: '/artifacts/sgip-pantallas/movil/77-confirmar-bajo-costo.png',
    },
    {
      code: '78',
      slug: '78-inventario-sin-movimientos',
      group: 'Compras y ajustes',
      title: 'Ajustes sin movimientos',
      description: 'Estado vacío del historial de ajustes.',
      desktop: '/artifacts/sgip-pantallas/escritorio/78-inventario-sin-movimientos.png',
      mobile: '/artifacts/sgip-pantallas/movil/78-inventario-sin-movimientos.png',
    },
  ],
  cargarManifestAutomatico: true,
});

const listaPantallas = ref<PantallaFigmaItem[]>([...props.pantallas]);
const modoVista = ref<'desktop' | 'mobile'>('desktop');
const busqueda = ref<string>('');
const grupoSeleccionado = ref<string>('Todos');

onMounted(async () => {
  if (!props.cargarManifestAutomatico || typeof fetch === 'undefined') return;
  try {
    const resp = await fetch('/artifacts/sgip-pantallas/manifest.json');
    if (!resp.ok) return;
    const data = (await resp.json()) as { screens?: any[] };
    if (Array.isArray(data.screens) && data.screens.length > 0) {
      listaPantallas.value = data.screens.map((s: any) => {
        const idStr = String(s.id || s.slug || '');
        const codeStr = String(s.code || (idStr.includes('-') ? idStr.split('-')[0] : idStr));
        const desktopFile = s.images?.escritorio?.file || s.desktop || '';
        const mobileFile = s.images?.movil?.file || s.mobile || null;

        return {
          code: codeStr,
          slug: idStr,
          group: s.group || 'General',
          title: s.title || idStr,
          description: s.description || s.title || '',
          desktop: desktopFile.startsWith('/') ? desktopFile : `/artifacts/sgip-pantallas/${desktopFile}`,
          mobile: mobileFile ? (mobileFile.startsWith('/') ? mobileFile : `/artifacts/sgip-pantallas/${mobileFile}`) : null,
        };
      });
    }
  } catch {
    // Mantiene la lista inicial si se ejecuta en entorno de pruebas sin servidor estático
  }
});

const gruposDisponibles = computed<string[]>(() => {
  const unicos = new Set<string>(listaPantallas.value.map((p) => p.group));
  return ['Todos', ...Array.from(unicos)];
});

const pantallasFiltradas = computed<PantallaFigmaItem[]>(() =>
  listaPantallas.value.filter((item) => {
    const coincideGrupo =
      grupoSeleccionado.value === 'Todos' || item.group === grupoSeleccionado.value;
    const termino = busqueda.value.trim().toLowerCase();
    const coincideTexto =
      termino === '' ||
      `${item.code} ${item.slug} ${item.title} ${item.description}`
        .toLowerCase()
        .includes(termino);
    return coincideGrupo && coincideTexto;
  }),
);
</script>

<template>
  <section class="space-y-6" data-testid="galeria-78-pantallas-figma">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Biblioteca Oficial Figma · {{ listaPantallas.length }} Pantallas Integradas (155 PNGs)
        </span>
        <h1 class="mt-1 text-2xl font-bold text-[#203959]">
          Catálogo Visual SGCI / SGIP
        </h1>
        <p class="mt-1 text-sm text-slate-600">
          Inspección en vivo de las capturas de Escritorio (1440px) y Móvil (390px) integradas en
          <code>/artifacts/sgip-pantallas/</code>.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          data-testid="btn-modo-desktop-figma"
          class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
          :class="
            modoVista === 'desktop'
              ? 'bg-[#203959] text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          "
          @click="modoVista = 'desktop'"
        >
          Escritorio (1440px)
        </button>
        <button
          type="button"
          data-testid="btn-modo-mobile-figma"
          class="min-h-[44px] rounded-lg px-4 py-2 text-xs font-semibold"
          :class="
            modoVista === 'mobile'
              ? 'bg-[#203959] text-white'
              : 'border border-slate-300 bg-white text-slate-700'
          "
          @click="modoVista = 'mobile'"
        >
          Móvil (390px)
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-center gap-3">
      <input
        v-model="busqueda"
        type="search"
        placeholder="Buscar por código (01-78), título o módulo..."
        data-testid="input-buscar-pantalla-figma"
        class="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
      />
      <select
        v-model="grupoSeleccionado"
        data-testid="select-grupo-pantalla-figma"
        class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        <option v-for="grupo in gruposDisponibles" :key="grupo" :value="grupo">
          {{ grupo }}
        </option>
      </select>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="item in pantallasFiltradas"
        :key="item.slug"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
      >
        <div class="border-b border-slate-200 bg-slate-100 p-3">
          <img
            :src="modoVista === 'mobile' && item.mobile ? item.mobile : item.desktop"
            :alt="`${item.code} - ${item.title}`"
            loading="lazy"
            class="mx-auto max-h-64 rounded-lg object-contain"
          />
        </div>
        <div class="p-4">
          <div class="flex items-center justify-between text-xs text-slate-500">
            <span class="font-mono font-bold text-[#416772]">#{{ item.code }}</span>
            <span>{{ item.group }}</span>
          </div>
          <h2 class="mt-1 text-sm font-bold text-[#203959]">{{ item.title }}</h2>
          <p class="mt-1 text-xs text-slate-600">{{ item.description }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
