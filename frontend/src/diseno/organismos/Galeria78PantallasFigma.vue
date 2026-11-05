<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

export interface PantallaOficialSgci {
  file: string;
  title: string;
  note: string;
}

const pantallas = ref<PantallaOficialSgci[]>([]);
const filtroFormato = ref<'Todos' | 'Menu' | 'Escritorio' | 'Movil'>('Todos');
const busqueda = ref<string>('');

const PANTALLAS_SGCI_CANONICAS: PantallaOficialSgci[] = [
  { file: '01-Escritorio-1440/01-Landing.png', title: '01 Landing', note: 'Landing corporativa SGCI Inventory Intelligence' },
  { file: '01-Escritorio-1440/02-Demostracion.png', title: '02 Demostracion', note: 'Demostración interactiva del sistema' },
  { file: '01-Escritorio-1440/03-Inicio-de-sesion.png', title: '03 Inicio de sesion', note: 'Acceso seguro Multi-Tenant (IND-ALFA · laura@industriasalfa.com)' },
  { file: '01-Escritorio-1440/04-Recuperacion.png', title: '04 Recuperacion', note: 'Recuperación de acceso corporativo' },
  { file: '01-Escritorio-1440/05-Confirmacion-de-recuperacion.png', title: '05 Confirmacion de recuperacion', note: 'Confirmación de envío de instrucciones' },
  { file: '01-Escritorio-1440/06-Creacion-de-cuenta.png', title: '06 Creacion de cuenta', note: 'Alta de nueva organización Multi-Tenant' },
  { file: '01-Escritorio-1440/07-Centro-de-mando.png', title: '07 Centro de mando', note: 'ERI 99.4%, Valor patrimonial $1,482,900.00, Prioridades FEFO y WebSockets' },
  { file: '01-Escritorio-1440/08-Productos-y-ROP.png', title: '08 Productos y ROP', note: 'Catálogo maestro AC-100-FLEX, RB-220-INOX y FL-084-NBR con puntos de reorden' },
  { file: '01-Escritorio-1440/09-Almacenes.png', title: '09 Almacenes', note: 'Topología de almacenes (3 activos, 82% ocupación, 2 transferencias en tránsito)' },
  { file: '01-Escritorio-1440/10-Libro-Kardex.png', title: '10 Libro Kardex', note: 'Contabilidad inmutable PEPS/UEPS/Promedio con verificación HASH 8F2A...C91D' },
  { file: '01-Escritorio-1440/11-Lotes-y-FEFO.png', title: '11 Lotes y FEFO', note: 'Trazabilidad sanitaria (128 lotes vigentes, 12 próximos a vencer, 1 en cuarentena)' },
  { file: '01-Escritorio-1440/12-Conteos-y-auditoria.png', title: '12 Conteos y auditoria', note: 'Conciliación física ciega (4 ciclos activos, 2 diferencias abiertas, doble firma)' },
  { file: '01-Escritorio-1440/13-Abastecimiento.png', title: '13 Abastecimiento', note: 'Órdenes de compra y recepción en muelle (6 abiertas, $84,250 comprometidos)' },
  { file: '01-Escritorio-1440/14-Analitica.png', title: '14 Analitica', note: 'Rotación anual 4.8x, 42 días de cobertura y 1.2% obsolescencia' },
  { file: '01-Escritorio-1440/15-Gobernanza-RBAC.png', title: '15 Gobernanza RBAC', note: '28 usuarios activos, 10 roles canónicos y 3 almacenes autorizados' },
  { file: '02-Movil-390/01-Landing.png', title: '01 Landing (Móvil 390px)', note: 'Vista móvil de portada SGCI' },
  { file: '02-Movil-390/02-Demostracion.png', title: '02 Demostracion (Móvil 390px)', note: 'Demostración móvil' },
  { file: '02-Movil-390/03-Inicio-de-sesion.png', title: '03 Inicio de sesion (Móvil 390px)', note: 'Login móvil Multi-Tenant' },
  { file: '02-Movil-390/04-Recuperacion.png', title: '04 Recuperacion (Móvil 390px)', note: 'Recuperación móvil' },
  { file: '02-Movil-390/05-Confirmacion-de-recuperacion.png', title: '05 Confirmacion (Móvil 390px)', note: 'Confirmación móvil' },
  { file: '02-Movil-390/06-Creacion-de-cuenta.png', title: '06 Creacion de cuenta (Móvil 390px)', note: 'Registro móvil' },
  { file: '02-Movil-390/07-Inicio.png', title: '07 Inicio Bodega (Móvil 390px)', note: 'Operación de bodega PWA · ERI HOY 99.4% y acciones rápidas' },
  { file: '02-Movil-390/08-Escanear.png', title: '08 Escanear EAN-13 / QR (Móvil 390px)', note: 'Escáner óptico con detección FEFO LOTE-2026-089' },
  { file: '02-Movil-390/09-Conteos.png', title: '09 Conteos Ciegos (Móvil 390px)', note: 'Teclado numérico de conteo ciego en Ubicación B-02-05' },
  { file: '02-Movil-390/10-Cola-offline.png', title: '10 Cola Offline IndexedDB (Móvil 390px)', note: 'Cola de sincronización con 4 movimientos pendientes' },
];

onMounted(async () => {
  try {
    const res = await fetch('/artifacts/sgci-pantallas/manifest.json');
    if (res.ok) {
      const data = (await res.json()) as { screens?: PantallaOficialSgci[] };
      pantallas.value =
        Array.isArray(data.screens) && data.screens.length > 0
          ? data.screens
          : PANTALLAS_SGCI_CANONICAS;
    } else {
      pantallas.value = PANTALLAS_SGCI_CANONICAS;
    }
  } catch {
    pantallas.value = PANTALLAS_SGCI_CANONICAS;
  }
});

const pantallasFiltradas = computed<PantallaOficialSgci[]>(() => {
  const q = busqueda.value.trim().toLowerCase();
  return pantallas.value.filter((s) => {
    const matchFormato =
      filtroFormato.value === 'Todos' ||
      (filtroFormato.value === 'Menu' && s.file.startsWith('00-MENU-EXPANDIDO-Y-CONTRAIDO')) ||
      (filtroFormato.value === 'Escritorio' && s.file.startsWith('01-Escritorio-1440')) ||
      (filtroFormato.value === 'Movil' && s.file.startsWith('02-Movil-390'));
    const matchTexto =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.file.toLowerCase().includes(q) ||
      (s.note || '').toLowerCase().includes(q);
    return matchFormato && matchTexto;
  });
});
</script>

<template>
  <section class="space-y-6">
    <header class="rounded-2xl bg-[#0A1120] p-6 text-white shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
            SGCI · CONTROL DE INVENTARIOS · 47 CAPTURAS OFICIALES CON MENÚ DESPLEGABLE
          </span>
          <h2 class="mt-1 text-2xl font-extrabold">
            Biblioteca Visual Oficial SGCI (22 Menú Expandido/Contraído + 15 Escritorio + 10 Móvil)
          </h2>
          <p class="mt-1 text-xs text-slate-300">
            Cargadas desde <code>C:\Users\sxepc\Downloads\SGCI\SGCI-pantallas</code> (`Industrias
            Alfa S.A.S.` · `ALM-CENTRAL-01 — Bodega Central Monterrey`).
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="modo in ['Todos', 'Menu', 'Escritorio', 'Movil'] as const"
            :key="modo"
            type="button"
            class="rounded-xl px-4 py-2 text-xs font-bold transition"
            :class="
              filtroFormato === modo
                ? 'bg-[#2563EB] text-white'
                : 'border border-slate-700 bg-slate-900 text-slate-300'
            "
            @click="filtroFormato = modo"
          >
            {{ modo }}
          </button>
        </div>
      </div>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input
        v-model="busqueda"
        type="search"
        placeholder="Buscar pantalla oficial SGCI (Centro de mando, Kardex, FEFO, Escanear, Cola offline)..."
        class="w-full rounded-lg border border-slate-300 px-4 py-2 text-xs focus:border-blue-600 focus:outline-none"
      />
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="item in pantallasFiltradas"
        :key="item.file"
        class="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="flex items-center justify-between bg-[#0A1120] px-4 py-2.5 text-xs text-white">
          <strong class="font-bold">{{ item.title }}</strong>
          <span class="rounded bg-blue-600/30 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
            {{ item.file.startsWith('02-Movil-390') ? 'Móvil 390px' : 'Escritorio 1440px' }}
          </span>
        </div>
        <a
          :href="'/artifacts/sgci-pantallas/' + item.file"
          target="_blank"
          class="block border-b border-slate-200 bg-slate-100 p-3"
        >
          <img
            :src="'/artifacts/sgci-pantallas/' + item.file"
            :alt="item.title"
            loading="lazy"
            class="mx-auto max-h-64 rounded object-contain object-top"
          />
        </a>
        <div class="flex flex-1 flex-col justify-between p-4">
          <p class="text-xs text-slate-600">
            {{ item.note || 'Pantalla oficial SGCI implementada.' }}
          </p>
          <span class="mt-3 block font-mono text-[10px] text-slate-400">{{ item.file }}</span>
        </div>
      </article>
    </div>
  </section>
</template>
