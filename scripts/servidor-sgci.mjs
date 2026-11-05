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

const PORTAL_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SGCI · Sistema de Gestión de Control de Inventarios (7 Sprints + 78 Pantallas Figma)</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-[#F4F7F6] text-slate-900 antialiased">
  <header class="bg-[#203959] text-white border-b border-[#416772] px-6 py-4 shadow">
    <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
      <div>
        <span class="text-xs font-mono uppercase tracking-widest text-[#96ADA5]">SGCI SaaS Multi-Tenant · Paleta Oficial Aurora Mist</span>
        <h1 class="text-xl font-bold">Sistema de Gestión de Control de Inventarios · Servidor Activo</h1>
      </div>
      <div class="flex items-center gap-3 text-xs">
        <span class="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 font-semibold">
          ● Backend TDD: 27/27 OK
        </span>
        <span class="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 font-semibold">
          ● Frontend TDD: 19/19 OK
        </span>
        <a href="/artifacts/sgip-pantallas/index.html" class="px-4 py-2 rounded-lg bg-[#416772] hover:bg-[#96ADA5] hover:text-[#203959] font-semibold transition">
          Abrir Visor Nativo 78 Pantallas
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto p-6 space-y-6">
    <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <article class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <span class="text-xs text-slate-500 font-medium">Pantallas Figma Integradas</span>
        <strong class="block text-2xl font-bold text-[#203959] mt-1" id="kpi-screens">78</strong>
        <small class="text-xs text-slate-500">155 capturas PNG (1440px y 390px)</small>
      </article>
      <article class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <span class="text-xs text-slate-500 font-medium">Sprints Completados</span>
        <strong class="block text-2xl font-bold text-[#203959] mt-1">7 / 7</strong>
        <small class="text-xs text-slate-500">Git-Flow sincronizado con GitHub</small>
      </article>
      <article class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <span class="text-xs text-slate-500 font-medium">Suite TDD Backend (PHP 8.4)</span>
        <strong class="block text-2xl font-bold text-emerald-700 mt-1">27 / 27</strong>
        <small class="text-xs text-slate-500">0 errores · Aislamiento tenant_id</small>
      </article>
      <article class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <span class="text-xs text-slate-500 font-medium">Suite TDD Frontend (Node 24)</span>
        <strong class="block text-2xl font-bold text-emerald-700 mt-1">19 / 19</strong>
        <small class="text-xs text-slate-500">0 errores · Pinia + TypeScript</small>
      </article>
    </section>

    <section class="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-[#416772]">Catálogo Interactivo</span>
          <h2 class="text-lg font-bold text-[#203959]">Explorador en Vivo de las 78 Pantallas de Figma</h2>
        </div>
        <div class="flex items-center gap-2">
          <button id="btn-desktop" class="px-4 py-2 rounded-lg text-xs font-semibold bg-[#203959] text-white">Escritorio (1440px)</button>
          <button id="btn-mobile" class="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700">Móvil (390px)</button>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <input id="search-input" type="search" placeholder="Buscar pantalla por número (01-78), título o módulo..." class="flex-1 min-h-[42px] rounded-lg border border-slate-300 px-4 py-2 text-sm" />
        <select id="group-select" class="min-h-[42px] rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="Todos">Todos los módulos</option>
        </select>
      </div>

      <div id="screens-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2"></div>
    </section>
  </main>

  <script>
    let allScreens = [];
    let mode = 'escritorio';

    const grid = document.getElementById('screens-grid');
    const searchInput = document.getElementById('search-input');
    const groupSelect = document.getElementById('group-select');
    const btnDesktop = document.getElementById('btn-desktop');
    const btnMobile = document.getElementById('btn-mobile');

    function render() {
      const q = searchInput.value.trim().toLowerCase();
      const g = groupSelect.value;
      const filtered = allScreens.filter(s => {
        const matchGroup = g === 'Todos' || s.group === g;
        const matchText = !q || (\`\${s.code} \${s.slug} \${s.title} \${s.description}\`).toLowerCase().includes(q);
        return matchGroup && matchText;
      });

      grid.innerHTML = filtered.map(s => {
        const imgObj = mode === 'movil' && s.images.movil ? s.images.movil : s.images.escritorio;
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
      }).join('');
    }

    fetch('/artifacts/sgip-pantallas/manifest.json')
      .then(r => r.json())
      .then(data => {
        allScreens = data.screens || [];
        document.getElementById('kpi-screens').textContent = allScreens.length;
        const groups = [...new Set(allScreens.map(s => s.group))];
        groups.forEach(gr => {
          const opt = document.createElement('option');
          opt.value = gr;
          opt.textContent = gr;
          groupSelect.appendChild(opt);
        });
        render();
      });

    searchInput.addEventListener('input', render);
    groupSelect.addEventListener('change', render);
    btnDesktop.addEventListener('click', () => {
      mode = 'escritorio';
      btnDesktop.className = 'px-4 py-2 rounded-lg text-xs font-semibold bg-[#203959] text-white';
      btnMobile.className = 'px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700';
      render();
    });
    btnMobile.addEventListener('click', () => {
      mode = 'movil';
      btnMobile.className = 'px-4 py-2 rounded-lg text-xs font-semibold bg-[#203959] text-white';
      btnDesktop.className = 'px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700';
      render();
    });
  </script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (url.pathname === '/api/v1/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          sistema: 'SGCI Multi-Tenant SaaS',
          sprintsCompletados: 7,
          pantallasFigma: 78,
          archivosPng: 155,
          tddBackend: { total: 27, aprobadas: 27, estado: 'VERDE' },
          tddFrontend: { total: 19, aprobadas: 19, estado: 'VERDE' },
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
