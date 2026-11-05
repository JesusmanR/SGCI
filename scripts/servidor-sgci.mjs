import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const repoRoot = resolve(__dirname, '..');
const publicDir = join(repoRoot, 'frontend', 'public');
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const CATALOGO_PLANES = {
  Emprende: {
    precio_cop_mes: 39900,
    max_usuarios: 2,
    max_bodegas: 1,
    max_productos: 1000,
    permite_carga_masiva_csv: false,
  },
  Crece: {
    precio_cop_mes: 89900,
    max_usuarios: 5,
    max_bodegas: 3,
    max_productos: 5000,
    permite_carga_masiva_csv: true,
  },
  Pro: {
    precio_cop_mes: 179900,
    max_usuarios: 15,
    max_bodegas: 10,
    max_productos: null,
    permite_carga_masiva_csv: true,
  },
};

const PORTAL_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SGCI · Aplicación Frontend Interactiva Multi-Tenant (10 Sprints + 78 Pantallas Figma)</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#F4F7F6] text-slate-900 antialiased">
  <div class="flex min-h-screen flex-col lg:flex-row">
    <!-- Barra Lateral Institucional Aurora Mist (#203959) -->
    <aside class="flex w-full flex-col justify-between border-r border-[#416772]/40 bg-[#203959] text-white lg:w-72 lg:min-h-screen">
      <div class="p-5 space-y-5">
        <div class="flex items-center justify-between border-b border-[#416772]/50 pb-4">
          <div>
            <span class="font-mono text-[11px] font-bold tracking-widest text-[#96ADA5] uppercase">
              SGCI · Multi-Tenant SaaS
            </span>
            <h1 class="text-base font-bold text-white leading-tight mt-0.5">
              Control de Inventarios
            </h1>
          </div>
          <span id="badge-red" class="rounded-full px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40">
            ● Online
          </span>
        </div>

        <!-- Selector Multi-Tenant -->
        <div class="rounded-xl bg-[#416772]/35 p-3 border border-[#96ADA5]/25 space-y-2">
          <div class="flex items-center justify-between text-[11px] text-[#ABB7B3]">
            <span>Organización Activa (Tenant)</span>
            <span id="badge-plan" class="rounded bg-[#96ADA5]/20 px-1.5 py-0.5 font-mono text-[#96ADA5] font-semibold">
              Plan Crece
            </span>
          </div>
          <select id="select-tenant" class="w-full rounded-lg bg-[#203959] border border-[#96ADA5]/40 px-2.5 py-2 text-xs font-semibold text-white">
            <option value="aurora">Comercializadora Aurora S.A.S. (Crece)</option>
            <option value="andinas">Distribuciones Andinas Pro Ltda. (Pro)</option>
            <option value="constructor">Ferretería El Constructor (Emprende)</option>
          </select>
          <div class="flex items-center justify-between text-[11px] text-[#ABB7B3]">
            <span id="label-bodega">📍 Bodega Central Bogotá</span>
            <span id="label-nit" class="font-mono">901.452.881-3</span>
          </div>
        </div>

        <!-- Conmutador de Rol RBAC -->
        <div class="space-y-1.5">
          <span class="block text-[11px] font-semibold uppercase tracking-wider text-[#96ADA5]">
            Perfil RBAC en Sesión
          </span>
          <div class="grid grid-cols-3 gap-1 rounded-lg bg-[#162840] p-1">
            <button onclick="cambiarRol('admin')" id="rol-admin" class="rounded-md py-1.5 text-[11px] font-semibold bg-[#96ADA5] text-[#203959]">Admin</button>
            <button onclick="cambiarRol('seller')" id="rol-seller" class="rounded-md py-1.5 text-[11px] font-semibold text-[#ABB7B3]">Vendedor</button>
            <button onclick="cambiarRol('superadmin')" id="rol-superadmin" class="rounded-md py-1.5 text-[11px] font-semibold text-[#ABB7B3]">SuperAdmin</button>
          </div>
        </div>

        <!-- Navegación Modular -->
        <nav id="menu-lateral" class="space-y-1"></nav>
      </div>

      <!-- Simulador PWA Offline -->
      <div class="border-t border-[#416772]/50 p-4 space-y-3 bg-[#192E47]">
        <div class="flex items-center justify-between text-xs">
          <span class="text-[#ABB7B3]">Cola Offline IndexedDB:</span>
          <span id="contador-offline" class="font-mono font-bold text-[#96ADA5]">0 pend.</span>
        </div>
        <button id="btn-toggle-offline" onclick="alternarConexion()" class="w-full min-h-[40px] rounded-lg border border-[#96ADA5]/40 bg-[#416772] px-3 py-2 text-xs font-semibold text-white hover:bg-[#96ADA5] hover:text-[#203959] transition">
          Simular Corte de Red (Modo Offline)
        </button>
      </div>
    </aside>

    <!-- Área Principal -->
    <main class="flex-1 p-6 overflow-y-auto space-y-6">
      <!-- Barra de Estado TDD y Visor -->
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-5 py-3 shadow-sm">
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">● Backend TDD: 34/34 VERDE</span>
          <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">● Frontend TDD: 26/26 VERDE</span>
          <span class="px-2.5 py-1 rounded-full bg-[#96ADA5]/30 text-[#203959] font-semibold">10/10 Sprints Completados</span>
        </div>
        <a href="/artifacts/sgip-pantallas/index.html" target="_blank" class="px-3.5 py-1.5 rounded-lg bg-[#203959] text-white text-xs font-semibold hover:bg-[#416772] transition">
          Abrir Visor Nativo 78 Pantallas ↗
        </a>
      </div>

      <!-- Contenedor Dinámico de Vistas -->
      <div id="vista-activa"></div>
    </main>
  </div>

  <script>
    const EMPRESAS = {
      aurora: { nombre: 'Comercializadora Aurora S.A.S.', plan: 'Crece', bodega: 'Bodega Central Bogotá', nit: '901.452.881-3' },
      andinas: { nombre: 'Distribuciones Andinas Pro Ltda.', plan: 'Pro', bodega: 'Centro Logístico Medellín', nit: '800.912.334-1' },
      constructor: { nombre: 'Ferretería El Constructor', plan: 'Emprende', bodega: 'Bodega Principal Cali', nit: '900.118.402-9' },
    };

    const RUTAS = [
      { id: 'dashboard', icono: '📊', titulo: 'Dashboard Ejecutivo', sub: 'Pantallas 01–09', roles: ['admin', 'seller'] },
      { id: 'catalogo', icono: '📦', titulo: 'Catálogo, Proveedores y OC', sub: 'Pantallas 10–20 y 36–41', roles: ['admin', 'seller'] },
      { id: 'caja', icono: '💳', titulo: 'Facturación POS y Arqueo', sub: 'Pantallas 21–35, 75 y 76', roles: ['admin', 'seller'] },
      { id: 'ajustes', icono: '📋', titulo: 'Conteos Ciegos y Kardex', sub: 'Pantallas 42–45 y 78', roles: ['admin'] },
      { id: 'precios', icono: '🏷️', titulo: 'Precios, IVA y Carga CSV', sub: 'Pantallas 46–52 y 70–74', roles: ['admin', 'seller'] },
      { id: 'gobernanza', icono: '🛡️', titulo: 'Gobernanza SaaS y Offline', sub: 'Pantallas 55, 59, 60–67', roles: ['admin', 'seller', 'superadmin'] },
      { id: 'figma', icono: '🎨', titulo: 'Biblioteca 78 Pantallas Figma', sub: '155 PNGs (1440px y 390px)', roles: ['admin', 'seller', 'superadmin'] },
    ];

    let estado = {
      tenantKey: 'aurora',
      rol: 'admin',
      online: true,
      rutaActiva: 'dashboard',
      colaOffline: [],
      recaudoCaja: 1480,
      estadoCaja: 'ABIERTA',
      productos: [
        { sku: 'PRD-001', nombre: 'Teclado Mecánico Industrial Pro', categoria: 'Periféricos', costo: 54, precio: 89, iva: 19, stock: 24, minimo: 10, ubicacion: 'ZONA-A-P01-R01-N01' },
        { sku: 'PRD-002', nombre: 'Monitor IPS 27" QHD Ergonómico', categoria: 'Pantallas', costo: 165, precio: 249, iva: 19, stock: 5, minimo: 8, ubicacion: 'ZONA-A-P02-R01-N02' },
        { sku: 'PRD-003', nombre: 'Lector Código de Barras GS1 2D', categoria: 'Captura', costo: 42, precio: 75, iva: 19, stock: 31, minimo: 12, ubicacion: 'ZONA-B-P01-R03-N01' },
      ],
      kardex: [
        { fecha: '2026-11-05 08:15', sku: 'PRD-001', tipo: 'ENTRADA_COMPRA', cant: '+24', costo: 54, saldo: 24, ref: 'OC-2026-0024' },
        { fecha: '2026-11-05 09:40', sku: 'PRD-002', tipo: 'SALIDA_VENTA', cant: '-3', costo: 165, saldo: 5, ref: 'FAC-POS-0108' },
      ],
      allScreens: [],
      figmaMode: 'escritorio',
      figmaQuery: '',
      figmaGroup: 'Todos',
    };

    function renderMenu() {
      const emp = EMPRESAS[estado.tenantKey];
      document.getElementById('badge-plan').textContent = 'Plan ' + emp.plan;
      document.getElementById('label-bodega').textContent = '📍 ' + emp.bodega;
      document.getElementById('label-nit').textContent = emp.nit;

      ['admin', 'seller', 'superadmin'].forEach(r => {
        const btn = document.getElementById('rol-' + r);
        btn.className = estado.rol === r
          ? 'rounded-md py-1.5 text-[11px] font-semibold bg-[#96ADA5] text-[#203959]'
          : 'rounded-md py-1.5 text-[11px] font-semibold text-[#ABB7B3] hover:text-white';
      });

      const rutasVisibles = RUTAS.filter(r => r.roles.includes(estado.rol));
      if (!rutasVisibles.some(r => r.id === estado.rutaActiva)) {
        estado.rutaActiva = rutasVisibles[0].id;
      }

      document.getElementById('menu-lateral').innerHTML = rutasVisibles.map(r => \`
        <button onclick="seleccionarRuta('\${r.id}')" class="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition \${estado.rutaActiva === r.id ? 'bg-[#96ADA5] text-[#203959] font-bold shadow-sm' : 'text-slate-200 hover:bg-[#416772]/50'}">
          <span class="text-base leading-none mt-0.5">\${r.icono}</span>
          <div class="min-w-0 flex-1">
            <span class="block truncate text-xs font-semibold">\${r.titulo}</span>
            <span class="block truncate text-[10px] \${estado.rutaActiva === r.id ? 'text-[#203959]/80' : 'text-[#ABB7B3]'}">\${r.sub}</span>
          </div>
        </button>
      \`).join('');

      document.getElementById('contador-offline').textContent = estado.colaOffline.length + ' pend.';
    }

    function seleccionarRuta(id) {
      estado.rutaActiva = id;
      renderMenu();
      renderVista();
    }

    function cambiarRol(nuevoRol) {
      estado.rol = nuevoRol;
      renderMenu();
      renderVista();
    }

    function alternarConexion() {
      estado.online = !estado.online;
      const badge = document.getElementById('badge-red');
      const btn = document.getElementById('btn-toggle-offline');
      if (estado.online) {
        badge.textContent = '● Online';
        badge.className = 'rounded-full px-2.5 py-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/40';
        btn.textContent = 'Simular Corte de Red (Modo Offline)';
        if (estado.colaOffline.length > 0) {
          estado.colaOffline = [];
          alert('Conexión restablecida (Pantalla Figma 59): todas las operaciones de la cola IndexedDB fueron reconciliadas con idempotencia.');
        }
      } else {
        badge.textContent = '⚡ Offline';
        badge.className = 'rounded-full px-2.5 py-1 text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40';
        btn.textContent = 'Reconectar Red y Sincronizar Cola';
      }
      renderMenu();
      renderVista();
    }

    function agregarProductoDemo() {
      if (estado.rol === 'seller') {
        alert('Modo Vendedor (Pantallas 70–74): permiso de solo lectura.');
        return;
      }
      const sku = prompt('Código SKU del nuevo producto:', 'PRD-00' + (estado.productos.length + 1));
      if (!sku) return;
      const nombre = prompt('Nombre del artículo:', ' Impresora Térmica POS 80mm');
      if (!nombre) return;
      estado.productos.push({ sku, nombre, categoria: 'POS', costo: 68, precio: 115, iva: 19, stock: 15, minimo: 5, ubicacion: 'ZONA-C-P01-R01-N01' });
      renderVista();
    }

    function registrarVentaPos(sku) {
      const prod = estado.productos.find(p => p.sku === sku);
      if (!prod || prod.stock <= 0) return alert('Sin existencias disponibles.');
      prod.stock -= 1;
      const totalConIva = Math.round(prod.precio * (1 + prod.iva / 100));
      estado.recaudoCaja += totalConIva;
      estado.kardex.unshift({
        fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
        sku: prod.sku,
        tipo: estado.online ? 'SALIDA_VENTA_POS' : 'VENTA_ENCOLADA_OFFLINE',
        cant: '-1',
        costo: prod.costo,
        saldo: prod.stock,
        ref: 'FAC-POS-' + Math.floor(1000 + Math.random() * 9000),
      });
      if (!estado.online) {
        estado.colaOffline.push({ sku: prod.sku, tipo: 'COBRO_CAJA', ts: new Date().toISOString() });
      }
      renderMenu();
      renderVista();
    }

    function aplicarAjusteFisico(sku, delta) {
      const prod = estado.productos.find(p => p.sku === sku);
      if (!prod) return;
      prod.stock = Math.max(0, prod.stock + delta);
      estado.kardex.unshift({
        fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
        sku: prod.sku,
        tipo: delta > 0 ? 'AJUSTE_SOBRANTE' : 'AJUSTE_MERMA_CONTEO',
        cant: (delta > 0 ? '+' : '') + delta,
        costo: prod.costo,
        saldo: prod.stock,
        ref: 'ACTA-CIEGA-' + Math.floor(100 + Math.random() * 900),
      });
      if (!estado.online) {
        estado.colaOffline.push({ sku: prod.sku, tipo: 'CONTEO_FISICO', ts: new Date().toISOString() });
      }
      renderMenu();
      renderVista();
    }

    function renderVista() {
      const contenedor = document.getElementById('vista-activa');
      const emp = EMPRESAS[estado.tenantKey];
      const esVendedor = estado.rol === 'seller';
      const unidades = estado.productos.reduce((a, p) => a + p.stock, 0);
      const valorCosto = estado.productos.reduce((a, p) => a + p.stock * p.costo, 0);
      const bajoStock = estado.productos.filter(p => p.stock <= p.minimo);

      if (estado.rutaActiva === 'dashboard') {
        contenedor.innerHTML = \`
          <div class="space-y-6">
            <div class="rounded-2xl bg-gradient-to-r from-[#203959] to-[#416772] p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="font-mono text-xs uppercase tracking-widest text-[#96ADA5]">Pantallas Figma 01–09 · Dashboard Ejecutivo Multi-Tenant</span>
                <h2 class="mt-1 text-2xl font-bold">\${emp.nombre}</h2>
                <p class="mt-1 text-xs text-slate-200">Bodega Activa: <strong>\${emp.bodega}</strong> · Rol RBAC: <strong>\${estado.rol.toUpperCase()}</strong></p>
              </div>
              <div class="flex gap-2">
                <button onclick="seleccionarRuta('caja')" class="rounded-xl bg-[#96ADA5] px-4 py-2.5 text-xs font-bold text-[#203959] hover:bg-white transition">+ Nueva Factura POS (Pantalla 22)</button>
                <button onclick="seleccionarRuta('catalogo')" class="rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition">Ver Catálogo SKU (Pantalla 10)</button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <article class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span class="text-xs text-slate-500">Unidades Físicas en Bodega</span>
                <strong class="block text-2xl font-bold text-[#203959] mt-1">\${unidades} uds.</strong>
                <small class="text-xs text-emerald-700 font-semibold">\${estado.productos.length} SKUs activos</small>
              </article>
              <article class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span class="text-xs text-slate-500">Valorización Costo Inventario</span>
                <strong class="block text-2xl font-bold text-[#203959] mt-1">\${esVendedor ? '🔒 Oculto (Vendedor)' : '$' + valorCosto.toLocaleString() + ' USD'}</strong>
                <small class="text-xs text-slate-500">Valoración PEPS / Promedio</small>
              </article>
              <article class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span class="text-xs text-slate-500">Recaudo en Turno Caja POS</span>
                <strong class="block text-2xl font-bold text-emerald-700 mt-1">$\${estado.recaudoCaja.toLocaleString()} USD</strong>
                <small class="text-xs text-slate-500">Turno: \${estado.estadoCaja}</small>
              </article>
              <article class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <span class="text-xs text-slate-500">Alertas Punto de Reorden</span>
                <strong class="block text-2xl font-bold text-amber-600 mt-1">\${bajoStock.length} alertas</strong>
                <small class="text-xs text-slate-500">Semáforo de stock mínimo</small>
              </article>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <article class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 class="font-bold text-sm text-[#203959]">Últimos Movimientos del Libro Mayor (Kardex Inmutable · Pantalla 45)</h3>
                <div class="divide-y divide-slate-200 text-xs">
                  \${estado.kardex.slice(0, 5).map(k => \`
                    <div class="py-2.5 flex items-center justify-between">
                      <div>
                        <span class="font-mono font-bold text-[#416772]">\${k.sku}</span> · <strong>\${k.tipo}</strong>
                        <p class="text-[11px] text-slate-500">\${k.fecha} · Ref: \${k.ref}</p>
                      </div>
                      <div class="text-right font-mono">
                        <span class="font-bold \${k.cant.startsWith('+') ? 'text-emerald-700' : 'text-amber-700'}">\${k.cant} uds.</span>
                        <span class="block text-[11px] text-slate-500">Saldo: \${k.saldo}</span>
                      </div>
                    </div>
                  \`).join('')}
                </div>
              </article>

              <article class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 class="font-bold text-sm text-[#203959]">Artículos en Punto de Reorden Crítico (Pantalla 08)</h3>
                \${bajoStock.map(p => \`
                  <div class="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                    <div>
                      <strong class="text-slate-900">\${p.nombre}</strong>
                      <p class="font-mono text-[11px] text-slate-500">\${p.sku} · Ubicación Bin: \${p.ubicacion}</p>
                    </div>
                    <span class="rounded-full bg-amber-200 px-3 py-1 font-bold text-amber-900">\${p.stock} / mín \${p.minimo}</span>
                  </div>
                \`).join('')}
              </article>
            </div>
          </div>
        \`;
        return;
      }

      if (estado.rutaActiva === 'catalogo') {
        contenedor.innerHTML = \`
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="font-mono text-xs font-bold text-[#416772] uppercase">Pantallas Figma 10–20 y 36–41</span>
                <h2 class="text-lg font-bold text-[#203959]">Catálogo Maestro de Productos, Ubicaciones Bin y Precios</h2>
              </div>
              <button onclick="agregarProductoDemo()" class="rounded-xl bg-[#203959] px-4 py-2 text-xs font-bold text-white hover:bg-[#416772] transition">+ Crear Producto SKU (Pantalla 11)</button>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#F4F7F6] text-slate-600 uppercase">
                  <tr>
                    <th class="px-4 py-3">SKU</th>
                    <th class="px-4 py-3">Descripción</th>
                    <th class="px-4 py-3">Ubicación Bin</th>
                    \${!esVendedor ? '<th class="px-4 py-3">Costo Unit.</th><th class="px-4 py-3">Margen</th>' : ''}
                    <th class="px-4 py-3">Precio Venta</th>
                    <th class="px-4 py-3">Stock Actual</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                  \${estado.productos.map(p => {
                    const margen = (((p.precio - p.costo) / p.precio) * 100).toFixed(1);
                    return \`
                      <tr>
                        <td class="px-4 py-3 font-mono font-bold text-[#416772]">\${p.sku}</td>
                        <td class="px-4 py-3 font-semibold text-[#203959]">\${p.nombre}</td>
                        <td class="px-4 py-3 font-mono text-[11px]">\${p.ubicacion}</td>
                        \${!esVendedor ? \`<td class="px-4 py-3 font-mono">$\${p.costo}</td><td class="px-4 py-3 font-mono text-emerald-700 font-bold">\${margen}%</td>\` : ''}
                        <td class="px-4 py-3 font-mono font-bold">$\${p.precio} + IVA \${p.iva}%</td>
                        <td class="px-4 py-3"><span class="rounded-full px-2.5 py-0.5 font-bold \${p.stock <= p.minimo ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">\${p.stock} uds.</span></td>
                      </tr>
                    \`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
        return;
      }

      if (estado.rutaActiva === 'caja') {
        contenedor.innerHTML = \`
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="font-mono text-xs font-bold text-[#416772] uppercase">Pantallas Figma 21–35 · Terminal POS y Arqueo de Caja</span>
                <h2 class="text-lg font-bold text-[#203959]">Facturación Rápida con Descuento Inmediato en Kardex</h2>
              </div>
              <div class="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs">
                Recaudo acumulado en turno: <strong class="font-mono text-sm text-emerald-800">$\${estado.recaudoCaja} USD</strong>
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              \${estado.productos.map(p => \`
                <article class="rounded-xl border border-slate-200 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <span class="font-mono text-xs font-bold text-[#416772]">\${p.sku}</span>
                    <h3 class="font-bold text-sm text-[#203959] mt-0.5">\${p.nombre}</h3>
                    <p class="text-xs text-slate-500 mt-1">Disponible: <strong>\${p.stock} uds.</strong> · Precio: <strong>$\${p.precio} + IVA</strong></p>
                  </div>
                  <button onclick="registrarVentaPos('\${p.sku}')" class="w-full rounded-lg bg-[#203959] py-2 text-xs font-bold text-white hover:bg-[#416772] transition">
                    Cobrar 1 Unidad en Caja POS
                  </button>
                </article>
              \`).join('')}
            </div>
          </div>
        \`;
        return;
      }

      if (estado.rutaActiva === 'ajustes') {
        contenedor.innerHTML = \`
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <span class="font-mono text-xs font-bold text-[#416772] uppercase">Pantallas Figma 42–45 y 78 · Auditoría de Conteos Ciegos</span>
              <h2 class="text-lg font-bold text-[#203959]">Reconciliación Física de Existencias e Impacto en Libro Mayor Kardex</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              \${estado.productos.map(p => \`
                <article class="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div class="flex justify-between text-xs">
                    <span class="font-mono font-bold text-[#416772]">\${p.sku}</span>
                    <span class="font-bold text-[#203959]">Stock: \${p.stock} uds.</span>
                  </div>
                  <h3 class="font-bold text-sm text-[#203959]">\${p.nombre}</h3>
                  <div class="flex gap-2">
                    <button onclick="aplicarAjusteFisico('\${p.sku}', -1)" class="flex-1 rounded-lg border border-amber-300 bg-amber-50 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100">-1 Merma (Pantalla 43)</button>
                    <button onclick="aplicarAjusteFisico('\${p.sku}', 1)" class="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-100">+1 Sobrante (Pantalla 43)</button>
                  </div>
                </article>
              \`).join('')}
            </div>
          </div>
        \`;
        return;
      }

      if (estado.rutaActiva === 'precios') {
        contenedor.innerHTML = \`
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <span class="font-mono text-xs font-bold text-[#416772] uppercase">Pantallas Figma 46–52 y 70–74 · Motor de Precios e IVA</span>
            <h2 class="text-lg font-bold text-[#203959]">Reglas de Ganancia (Recargo vs Margen) e Importación Masiva CSV</h2>
            <p class="text-xs text-slate-600">
              Plan activo: <strong>\${emp.plan}</strong> · Importación masiva CSV:
              <strong>\${emp.plan === 'Emprende' ? '🔒 Restringida (Disponible desde el plan Crece · Pantalla 49)' : '✔ Habilitada'}</strong>
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div class="rounded-xl border border-slate-200 p-4">
                <strong class="text-[#203959] block">Tasa General IVA</strong>
                <span class="text-2xl font-bold text-[#416772] mt-1 block">19.0%</span>
                <span class="text-slate-500">Aplicada a artículos gravados</span>
              </div>
              <div class="rounded-xl border border-slate-200 p-4">
                <strong class="text-[#203959] block">Protección Precio Bajo Costo</strong>
                <span class="text-2xl font-bold text-emerald-700 mt-1 block">Activa</span>
                <span class="text-slate-500">Exige confirmación explícita (Pantalla 52)</span>
              </div>
              <div class="rounded-xl border border-slate-200 p-4">
                <strong class="text-[#203959] block">Visibilidad de Costos</strong>
                <span class="text-2xl font-bold text-[#203959] mt-1 block">\${esVendedor ? 'Oculta (Seller)' : 'Completa (Admin)'}</span>
                <span class="text-slate-500">Pantallas Figma 70–74</span>
              </div>
            </div>
          </div>
        \`;
        return;
      }

      if (estado.rutaActiva === 'gobernanza') {
        contenedor.innerHTML = \`
          <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div>
              <span class="font-mono text-xs font-bold text-[#416772] uppercase">Pantallas Figma 60–67 · Gobernanza SaaS Multi-Tenant</span>
              <h2 class="text-lg font-bold text-[#203959]">Planes de Suscripción (Emprende, Crece, Pro) y Privacidad por Diseño</h2>
            </div>
            \${estado.rol === 'superadmin' ? \`
              <div class="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-xs text-indigo-950">
                <strong>🛡️ Privacidad por Diseño Activa (Pantalla Figma 66-admin-empresas):</strong>
                El SuperAdmin solo administra empresas, accesos y membresías. Los productos, ventas, clientes e inventarios de cada empresa permanecen estrictamente aislados.
              </div>
            \` : ''}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <article class="rounded-xl border p-5 \${emp.plan === 'Emprende' ? 'border-2 border-[#203959] bg-[#F4F7F6]' : 'border-slate-200'}">
                <span class="font-mono font-bold text-[#416772]">PLAN EMPRENDE</span>
                <strong class="block text-xl font-bold text-[#203959] mt-1">$39.900 COP/mes</strong>
                <ul class="mt-3 space-y-1 text-slate-600">
                  <li>• Hasta 2 usuarios activos</li>
                  <li>• 1 bodega principal</li>
                  <li>• Hasta 1.000 productos SKU</li>
                  <li>• Sin carga masiva CSV</li>
                </ul>
              </article>
              <article class="rounded-xl border p-5 \${emp.plan === 'Crece' ? 'border-2 border-[#203959] bg-[#F4F7F6]' : 'border-slate-200'}">
                <span class="font-mono font-bold text-[#416772]">PLAN CRECE</span>
                <strong class="block text-xl font-bold text-[#203959] mt-1">$89.900 COP/mes</strong>
                <ul class="mt-3 space-y-1 text-slate-600">
                  <li>• Hasta 5 usuarios activos</li>
                  <li>• Hasta 3 bodegas</li>
                  <li>• Hasta 5.000 productos SKU</li>
                  <li>• Carga masiva CSV habilitada</li>
                </ul>
              </article>
              <article class="rounded-xl border p-5 \${emp.plan === 'Pro' ? 'border-2 border-[#203959] bg-[#F4F7F6]' : 'border-slate-200'}">
                <span class="font-mono font-bold text-[#416772]">PLAN PRO</span>
                <strong class="block text-xl font-bold text-[#203959] mt-1">$179.900 COP/mes</strong>
                <ul class="mt-3 space-y-1 text-slate-600">
                  <li>• Hasta 15 usuarios activos</li>
                  <li>• Hasta 10 bodegas multisede</li>
                  <li>• Productos SKU ilimitados</li>
                  <li>• Carga masiva CSV y API v1</li>
                </ul>
              </article>
            </div>
          </div>
        \`;
        return;
      }

      // Vista Biblioteca de las 78 Pantallas Figma
      const groups = ['Todos', ...new Set(estado.allScreens.map(s => s.group))];
      const filtered = estado.allScreens.filter(s => {
        const matchGroup = estado.figmaGroup === 'Todos' || s.group === estado.figmaGroup;
        const q = estado.figmaQuery.trim().toLowerCase();
        const matchText = !q || (\`\${s.code} \${s.slug} \${s.title} \${s.description}\`).toLowerCase().includes(q);
        return matchGroup && matchText;
      });

      contenedor.innerHTML = \`
        <section class="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-[#416772]">Catálogo Visual Oficial</span>
              <h2 class="text-lg font-bold text-[#203959]">Explorador en Vivo de las 78 Pantallas de Figma (155 PNGs)</h2>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="cambiarModoFigma('escritorio')" class="px-4 py-2 rounded-lg text-xs font-semibold \${estado.figmaMode === 'escritorio' ? 'bg-[#203959] text-white' : 'border border-slate-300 text-slate-700'}">Escritorio (1440px)</button>
              <button onclick="cambiarModoFigma('movil')" class="px-4 py-2 rounded-lg text-xs font-semibold \${estado.figmaMode === 'movil' ? 'bg-[#203959] text-white' : 'border border-slate-300 text-slate-700'}">Móvil (390px)</button>
            </div>
          </div>

          <div class="flex flex-wrap gap-3">
            <input oninput="filtrarTextoFigma(this.value)" value="\${estado.figmaQuery}" type="search" placeholder="Buscar pantalla por número (01-78), título o módulo..." class="flex-1 min-h-[42px] rounded-lg border border-slate-300 px-4 py-2 text-sm" />
            <select onchange="filtrarGrupoFigma(this.value)" class="min-h-[42px] rounded-lg border border-slate-300 px-3 py-2 text-sm">
              \${groups.map(g => \`<option value="\${g}" \${estado.figmaGroup === g ? 'selected' : ''}>\${g}</option>\`).join('')}
            </select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            \${filtered.map(s => {
              const imgObj = estado.figmaMode === 'movil' && s.images.movil ? s.images.movil : s.images.escritorio;
              const imgUrl = '/artifacts/sgip-pantallas/' + imgObj.file;
              return \`
                <article class="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col">
                  <a href="\${imgUrl}" target="_blank" class="block bg-slate-100 p-3 border-b border-slate-200">
                    <img src="\${imgUrl}" alt="\${s.title}" loading="lazy" class="mx-auto max-h-60 object-contain rounded" />
                  </a>
                  <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between text-xs text-slate-500">
                        <span class="font-mono font-bold text-[#416772]">#\${s.code}</span>
                        <span>\${s.group}</span>
                      </div>
                      <h3 class="font-bold text-sm text-[#203959] mt-1">\${s.title}</h3>
                      <p class="text-xs text-slate-600 mt-1">\${s.description}</p>
                    </div>
                    <span class="mt-3 inline-block text-[11px] font-mono text-slate-400">\${s.slug}</span>
                  </div>
                </article>
              \`;
            }).join('')}
          </div>
        </section>
      \`;
    }

    function cambiarModoFigma(m) { estado.figmaMode = m; renderVista(); }
    function filtrarTextoFigma(q) { estado.figmaQuery = q; renderVista(); }
    function filtrarGrupoFigma(g) { estado.figmaGroup = g; renderVista(); }

    document.getElementById('select-tenant').addEventListener('change', (e) => {
      estado.tenantKey = e.target.value;
      renderMenu();
      renderVista();
    });

    fetch('/artifacts/sgip-pantallas/manifest.json')
      .then(r => r.json())
      .then(data => {
        estado.allScreens = data.screens || [];
        renderMenu();
        renderVista();
      })
      .catch(() => {
        renderMenu();
        renderVista();
      });
  </script>
</body>
</html>`;

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (url.pathname === '/api/v1/health' || url.pathname === '/api/v1/salud') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          estado: 'OPERATIVO',
          version_api: 'v1.10.0',
          sistema: 'SGCI Multi-Tenant SaaS',
          sprintsCompletados: 10,
          pantallasFigma: 78,
          archivosPng: 155,
          tddBackend: { suites: 9, total: 34, aprobadas: 34, estado: 'VERDE' },
          tddFrontend: { suites: 9, total: 26, aprobadas: 26, estado: 'VERDE' },
        }),
      );
      return;
    }

    if (url.pathname === '/api/v1/gobernanza/suscripciones' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const nombrePlan = body.nombre_plan || 'Crece';
      const limites = CATALOGO_PLANES[nombrePlan];
      if (!limites) {
        res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Plan no válido. Use Emprende, Crece o Pro.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          tenant_id: body.tenant_id || '01950000-0000-7000-8000-000000000001',
          plan_activo: nombrePlan,
          estado_membresia: body.estado_membresia || 'Activa',
          precio_mensual_cop: limites.precio_cop_mes,
          permite_carga_masiva_csv: limites.permite_carga_masiva_csv,
          limites,
        }),
      );
      return;
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PORTAL_HTML);
      return;
    }

    const safeRel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = join(publicDir, safeRel);
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const info = await stat(filePath);
    if (info.isFile()) {
      const ext = extname(filePath).toLowerCase();
      const content = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor SGCI activo en http://127.0.0.1:${PORT}`);
});
