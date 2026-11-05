<script setup lang="ts">
import { ref, computed } from 'vue';

type PestanaActiva = 'productos' | 'categorias' | 'proveedores' | 'clientes' | 'ordenes-compra';

const pestanaSeleccionada = ref<PestanaActiva>('productos');
const terminoBusqueda = ref<string>('');
const categoriaFiltro = ref<string>('TODAS');

// Datos de demostración fieles a Figma Pantallas 10–20 y 36–41
const categorias = ref([
  { id: 'cat-1', nombre: 'Válvulas y Tuberías', skusCount: 124, icono: '🔧' },
  { id: 'cat-2', nombre: 'Mangueras Hidráulicas', skusCount: 88, icono: '🚰' },
  { id: 'cat-3', nombre: 'Instrumentación y Control', skusCount: 65, icono: '🌡️' },
  { id: 'cat-4', nombre: 'Filtros y Empaquetaduras', skusCount: 161, icono: '⚙️' },
]);

const productos = ref([
  {
    id: 'prod-101',
    sku: 'VALV-IND-200',
    codigoBarras: '7501002345012',
    nombre: 'Válvula de Presión Industrial 2" ANSI 150',
    categoria: 'Válvulas y Tuberías',
    unidad: 'PZA',
    stockTotal: 18,
    stockMinimo: 10,
    puntoReorden: 25,
    precioVenta: 1850.0,
    costoUnitario: 1200.0,
    estado: 'ACTIVO',
  },
  {
    id: 'prod-102',
    sku: 'MAN-500-HD',
    codigoBarras: '7501002345029',
    nombre: 'Manguera Hidráulica 5m Doble Malla Acero',
    categoria: 'Mangueras Hidráulicas',
    unidad: 'TRAMO',
    stockTotal: 8,
    stockMinimo: 15,
    puntoReorden: 20,
    precioVenta: 920.0,
    costoUnitario: 580.0,
    estado: 'ACTIVO',
  },
  {
    id: 'prod-103',
    sku: 'TERM-DIG-01',
    codigoBarras: '7501002345036',
    nombre: 'Termómetro Infrarrojo Digital Calibrado',
    categoria: 'Instrumentación y Control',
    unidad: 'PZA',
    stockTotal: 34,
    stockMinimo: 8,
    puntoReorden: 15,
    precioVenta: 2450.0,
    costoUnitario: 1600.0,
    estado: 'ACTIVO',
  },
  {
    id: 'prod-104',
    sku: 'EMPAQ-GRAF-04',
    codigoBarras: '7501002345043',
    nombre: 'Empaque Grafito Espiralado 4" 300#',
    categoria: 'Filtros y Empaquetaduras',
    unidad: 'JUEGO',
    stockTotal: 142,
    stockMinimo: 40,
    puntoReorden: 60,
    precioVenta: 310.0,
    costoUnitario: 185.0,
    estado: 'ACTIVO',
  },
]);

const proveedores = ref([
  {
    id: 'prov-1',
    razonSocial: 'Válvulas y Conexiones del Norte S.A.',
    rfc: 'VCN850412AA1',
    contacto: 'Ing. Roberto Garza',
    telefono: '+52 (81) 8345-9011',
    correo: 'ventas@valvulasdelnorte.mx',
    calificacion: 'A+',
    articulosSuministrados: 42,
  },
  {
    id: 'prov-2',
    razonSocial: 'Sistemas Hidráulicos de México S.A. de C.V.',
    rfc: 'SHM920918BC2',
    contacto: 'Lic. Mariana Villarreal',
    telefono: '+52 (844) 415-8820',
    correo: 'pedidos@sistemashidraulicos.com',
    calificacion: 'A',
    articulosSuministrados: 28,
  },
]);

const clientes = ref([
  {
    id: 'cli-1',
    nombreComercial: 'Aceros y Perfiles Industriales Monterrey',
    rfc: 'API040210ZZ3',
    contacto: 'C.P. Fernando Cantú',
    telefono: '+52 (81) 8122-3344',
    limiteCredito: 250000.0,
    saldoActual: 42500.0,
    diasCredito: 30,
  },
  {
    id: 'cli-2',
    nombreComercial: 'Constructora e Inmobiliaria San Jerónimo',
    rfc: 'CSJ120730KL8',
    contacto: 'Arq. Lucía Peña',
    telefono: '+52 (81) 8356-7890',
    limiteCredito: 180000.0,
    saldoActual: 0.0,
    diasCredito: 15,
  },
]);

const ordenesCompra = ref([
  {
    id: 'oc-101',
    numero: 'OC-2026-0048',
    proveedor: 'Válvulas y Conexiones del Norte S.A.',
    fechaEmision: '2026-11-01',
    fechaEstimadaEntrega: '2026-11-08',
    totalImporte: 48500.0,
    estado: 'EN_TRANSITO',
    porcentajeRecepcion: 0,
  },
  {
    id: 'oc-102',
    numero: 'OC-2026-0047',
    proveedor: 'Sistemas Hidráulicos de México S.A. de C.V.',
    fechaEmision: '2026-10-28',
    fechaEstimadaEntrega: '2026-11-03',
    totalImporte: 23200.0,
    estado: 'PARCIALMENTE_RECIBIDA',
    porcentajeRecepcion: 65,
  },
]);

// Filtrado dinámico de productos
const productosFiltrados = computed(() => {
  const query = terminoBusqueda.value.trim().toLowerCase();
  return productos.value.filter((p) => {
    const coincideCategoria =
      categoriaFiltro.value === 'TODAS' || p.categoria === categoriaFiltro.value;
    const coincideTexto =
      !query ||
      p.sku.toLowerCase().includes(query) ||
      p.nombre.toLowerCase().includes(query) ||
      p.codigoBarras.includes(query);
    return coincideCategoria && coincideTexto;
  });
});

function formatearMoneda(val: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(val);
}
</script>

<template>
  <div class="space-y-6" data-testid="vista-catalogo-proveedores-clientes-figma">
    <!-- Encabezado Oficial Aurora Mist -->
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded bg-[#203959] px-2 py-0.5 font-mono text-xs font-semibold text-white uppercase">
            Pantallas Figma 10–20 y 36–41
          </span>
          <span class="text-xs font-semibold text-[#839492]">
            Maestros &bull; Catálogo, Proveedores, Clientes y Compras
          </span>
        </div>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-[#203959]">
          Directorio Maestro y Ficha Técnica de Artículos
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#839492]">
          Gestión integral de SKUs, familias de productos, padrón de proveedores y seguimiento de órdenes de compra.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="flex min-h-[44px] items-center gap-2 rounded-lg bg-[#416772] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#33525b] focus:outline-none focus:ring-2 focus:ring-[#96ADA5]"
        >
          <span aria-hidden="true">+</span>
          <span>Nuevo Registro</span>
        </button>
      </div>
    </header>

    <!-- Barra de Pestañas / Tabs (Atomic Design Aurora Mist) -->
    <nav class="flex gap-2 overflow-x-auto border-b border-[#ABB7B3]/40 pb-2" aria-label="Secciones de Maestros">
      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition shrink-0"
        :class="
          pestanaSeleccionada === 'productos'
            ? 'bg-[#203959] text-white shadow-sm'
            : 'bg-white text-[#203959] hover:bg-[#ABB7B3]/20 border border-[#ABB7B3]/40'
        "
        @click="pestanaSeleccionada = 'productos'"
      >
        <span>📦</span>
        <span>Productos (SKUs)</span>
        <span class="rounded-full bg-[#416772] px-1.5 py-0.2 text-[10px] text-white">
          {{ productos.length }}
        </span>
      </button>

      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition shrink-0"
        :class="
          pestanaSeleccionada === 'categorias'
            ? 'bg-[#203959] text-white shadow-sm'
            : 'bg-white text-[#203959] hover:bg-[#ABB7B3]/20 border border-[#ABB7B3]/40'
        "
        @click="pestanaSeleccionada = 'categorias'"
      >
        <span>🏷️</span>
        <span>Categorías</span>
        <span class="rounded-full bg-[#96ADA5] px-1.5 py-0.2 text-[10px] text-[#203959]">
          {{ categorias.length }}
        </span>
      </button>

      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition shrink-0"
        :class="
          pestanaSeleccionada === 'proveedores'
            ? 'bg-[#203959] text-white shadow-sm'
            : 'bg-white text-[#203959] hover:bg-[#ABB7B3]/20 border border-[#ABB7B3]/40'
        "
        @click="pestanaSeleccionada = 'proveedores'"
      >
        <span>🏭</span>
        <span>Proveedores</span>
        <span class="rounded-full bg-[#416772] px-1.5 py-0.2 text-[10px] text-white">
          {{ proveedores.length }}
        </span>
      </button>

      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition shrink-0"
        :class="
          pestanaSeleccionada === 'clientes'
            ? 'bg-[#203959] text-white shadow-sm'
            : 'bg-white text-[#203959] hover:bg-[#ABB7B3]/20 border border-[#ABB7B3]/40'
        "
        @click="pestanaSeleccionada = 'clientes'"
      >
        <span>🤝</span>
        <span>Clientes</span>
        <span class="rounded-full bg-[#96ADA5] px-1.5 py-0.2 text-[10px] text-[#203959]">
          {{ clientes.length }}
        </span>
      </button>

      <button
        type="button"
        class="flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition shrink-0"
        :class="
          pestanaSeleccionada === 'ordenes-compra'
            ? 'bg-[#203959] text-white shadow-sm'
            : 'bg-white text-[#203959] hover:bg-[#ABB7B3]/20 border border-[#ABB7B3]/40'
        "
        @click="pestanaSeleccionada = 'ordenes-compra'"
      >
        <span>📑</span>
        <span>Órdenes de Compra</span>
        <span class="rounded-full bg-[#416772] px-1.5 py-0.2 text-[10px] text-white">
          {{ ordenesCompra.length }}
        </span>
      </button>
    </nav>

    <!-- 1. PESTAÑA: CATÁLOGO DE PRODUCTOS (Figma Pantallas 14–20) -->
    <section v-if="pestanaSeleccionada === 'productos'" class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-[#ABB7B3]/40">
        <div class="flex-1 sm:max-w-xs">
          <input
            v-model="terminoBusqueda"
            type="text"
            placeholder="Buscar por SKU, nombre o código..."
            class="w-full min-h-[44px] rounded-lg border border-[#839492] px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#416772]"
          />
        </div>

        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span class="text-xs font-semibold text-[#203959] shrink-0">Categoría:</span>
          <select
            v-model="categoriaFiltro"
            class="min-h-[44px] rounded-lg border border-[#839492] px-3 py-2 text-xs text-[#203959] bg-white focus:outline-none focus:ring-2 focus:ring-[#416772]"
          >
            <option value="TODAS">Todas las categorías</option>
            <option v-for="cat in categorias" :key="cat.id" :value="cat.nombre">
              {{ cat.nombre }}
            </option>
          </select>
        </div>
      </div>

      <!-- Tabla Tabular de Productos en Escritorio / Tarjetas en Móvil -->
      <div class="overflow-x-auto rounded-xl border border-[#ABB7B3]/40 bg-white shadow-sm">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#203959] text-white uppercase text-[10px] tracking-wider border-b border-[#416772]">
            <tr>
              <th class="px-4 py-3">SKU &bull; Código</th>
              <th class="px-4 py-3">Nombre del Artículo</th>
              <th class="px-4 py-3">Categoría</th>
              <th class="px-4 py-3 text-right">Existencia</th>
              <th class="px-4 py-3 text-right">Punto Reorden</th>
              <th class="px-4 py-3 text-right">Costo Unit.</th>
              <th class="px-4 py-3 text-right">Precio Venta</th>
              <th class="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#ABB7B3]/30">
            <tr
              v-for="p in productosFiltrados"
              :key="p.id"
              class="hover:bg-[#ABB7B3]/10 transition cursor-pointer"
            >
              <td class="px-4 py-3 font-mono font-bold text-[#203959]">
                <div>{{ p.sku }}</div>
                <div class="text-[10px] text-[#839492]">{{ p.codigoBarras }}</div>
              </td>
              <td class="px-4 py-3 font-medium text-[#203959]">
                {{ p.nombre }}
              </td>
              <td class="px-4 py-3 text-[#416772]">
                {{ p.categoria }}
              </td>
              <td class="px-4 py-3 text-right font-mono font-bold" :class="p.stockTotal <= p.puntoReorden ? 'text-rose-700' : 'text-[#203959]'">
                {{ p.stockTotal }} {{ p.unidad }}
              </td>
              <td class="px-4 py-3 text-right font-mono text-[#839492]">
                {{ p.puntoReorden }}
              </td>
              <td class="px-4 py-3 text-right font-mono text-[#839492]">
                {{ formatearMoneda(p.costoUnitario) }}
              </td>
              <td class="px-4 py-3 text-right font-mono font-semibold text-[#416772]">
                {{ formatearMoneda(p.precioVenta) }}
              </td>
              <td class="px-4 py-3 text-center">
                <span class="rounded-full bg-[#96ADA5]/30 px-2 py-0.5 text-[10px] font-semibold text-[#203959]">
                  {{ p.estado }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 2. PESTAÑA: CATEGORÍAS (Figma Pantallas 10–11) -->
    <section v-else-if="pestanaSeleccionada === 'categorias'" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="cat in categorias"
        :key="cat.id"
        class="rounded-xl border border-[#ABB7B3]/40 bg-white p-4 shadow-sm hover:border-[#416772] transition"
      >
        <div class="flex items-center justify-between">
          <span class="text-2xl" aria-hidden="true">{{ cat.icono }}</span>
          <span class="rounded bg-[#416772] px-2 py-0.5 text-xs font-semibold text-white">
            {{ cat.skusCount }} SKUs
          </span>
        </div>
        <h3 class="mt-3 text-sm font-bold text-[#203959]">{{ cat.nombre }}</h3>
        <p class="text-xs text-[#839492] mt-1">Familia de productos activa</p>
      </div>
    </section>

    <!-- 3. PESTAÑA: PROVEEDORES (Figma Pantallas 37–38) -->
    <section v-else-if="pestanaSeleccionada === 'proveedores'" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          v-for="prov in proveedores"
          :key="prov.id"
          class="rounded-xl border border-[#ABB7B3]/40 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="font-mono text-xs font-bold text-[#416772]">{{ prov.rfc }}</span>
              <h3 class="text-base font-bold text-[#203959] mt-0.5">{{ prov.razonSocial }}</h3>
            </div>
            <span class="rounded bg-[#96ADA5] px-2 py-0.5 text-xs font-bold text-[#203959]">
              Calif: {{ prov.calificacion }}
            </span>
          </div>

          <div class="mt-3 space-y-1 text-xs text-[#839492]">
            <p><strong class="text-[#203959]">Contacto:</strong> {{ prov.contacto }}</p>
            <p><strong class="text-[#203959]">Teléfono:</strong> {{ prov.telefono }}</p>
            <p><strong class="text-[#203959]">Correo:</strong> {{ prov.correo }}</p>
          </div>

          <footer class="mt-4 flex items-center justify-between border-t border-[#ABB7B3]/30 pt-3">
            <span class="text-xs font-semibold text-[#416772]">{{ prov.articulosSuministrados }} artículos provistos</span>
            <button
              type="button"
              class="min-h-[44px] rounded-lg border border-[#416772] px-3 py-1.5 text-xs font-semibold text-[#416772] hover:bg-[#416772] hover:text-white"
            >
              Generar Orden de Compra
            </button>
          </footer>
        </div>
      </div>
    </section>

    <!-- 4. PESTAÑA: CLIENTES (Figma Pantallas 39–41) -->
    <section v-else-if="pestanaSeleccionada === 'clientes'" class="space-y-4">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          v-for="cli in clientes"
          :key="cli.id"
          class="rounded-xl border border-[#ABB7B3]/40 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between">
            <div>
              <span class="font-mono text-xs font-bold text-[#416772]">{{ cli.rfc }}</span>
              <h3 class="text-base font-bold text-[#203959] mt-0.5">{{ cli.nombreComercial }}</h3>
            </div>
            <span class="rounded bg-[#203959] px-2 py-0.5 text-xs font-bold text-white">
              {{ cli.diasCredito }} días crédito
            </span>
          </div>

          <div class="mt-3 space-y-1 text-xs text-[#839492]">
            <p><strong class="text-[#203959]">Contacto:</strong> {{ cli.contacto }} &bull; {{ cli.telefono }}</p>
            <p><strong class="text-[#203959]">Límite Autorizado:</strong> {{ formatearMoneda(cli.limiteCredito) }}</p>
            <p><strong class="text-[#203959]">Saldo Utilizado:</strong> <span class="font-bold text-rose-700">{{ formatearMoneda(cli.saldoActual) }}</span></p>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. PESTAÑA: ÓRDENES DE COMPRA (Figma Pantalla 36) -->
    <section v-else-if="pestanaSeleccionada === 'ordenes-compra'" class="space-y-4">
      <div class="overflow-x-auto rounded-xl border border-[#ABB7B3]/40 bg-white shadow-sm">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#203959] text-white uppercase text-[10px] tracking-wider border-b border-[#416772]">
            <tr>
              <th class="px-4 py-3">Nº Orden</th>
              <th class="px-4 py-3">Proveedor</th>
              <th class="px-4 py-3">Emisión &bull; Entrega</th>
              <th class="px-4 py-3 text-right">Importe Total</th>
              <th class="px-4 py-3 text-center">Progreso Recepción</th>
              <th class="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#ABB7B3]/30">
            <tr v-for="oc in ordenesCompra" :key="oc.id" class="hover:bg-[#ABB7B3]/10 transition">
              <td class="px-4 py-3 font-mono font-bold text-[#203959]">
                {{ oc.numero }}
              </td>
              <td class="px-4 py-3 font-medium text-[#203959]">
                {{ oc.proveedor }}
              </td>
              <td class="px-4 py-3 text-[#839492]">
                {{ oc.fechaEmision }} &bull; Est: {{ oc.fechaEstimadaEntrega }}
              </td>
              <td class="px-4 py-3 text-right font-mono font-bold text-[#416772]">
                {{ formatearMoneda(oc.totalImporte) }}
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <div class="h-2 w-20 rounded-full bg-[#ABB7B3]/30 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-[#416772]"
                      :style="{ width: `${oc.porcentajeRecepcion}%` }"
                    />
                  </div>
                  <span class="font-mono text-[11px] font-semibold text-[#203959]">
                    {{ oc.porcentajeRecepcion }}%
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <button
                  type="button"
                  class="min-h-[44px] rounded-lg bg-[#416772] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#33525b]"
                >
                  Recepcionar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
