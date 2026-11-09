# Acta de Entrega del MVP para Prueba de Usuario (UAT) — SGCI v1.12.0
## Sistema de Gestión de Control de Inventarios (Multi-Tenant SaaS)

---

## 1. Resumen Ejecutivo del MVP Entregable

El **MVP de SGCI (`v1.12.0-MVP`)** se entrega listo para pruebas de aceptación de usuario (**UAT**), con **persistencia en disco vía API REST v1** ([`database/mvp-storage.json`](file:///C:/dev/SGCI/database/mvp-storage.json)), **47 capturas oficiales integradas** (`22` de menú expandido/contraído/móvil + `15` de escritorio `1440px` + `10` móviles `390px`), **menú lateral desplegable sin superposición de iconos** y **suites TDD 100% en verde** (**38/38 Backend** y **30/30 Frontend**).

### Acceso Inmediato al MVP
- **URL del Portal Interactivo MVP:** `http://127.0.0.1:4173`
- **URL del Comparador de las 47 Pantallas Oficiales:** `http://127.0.0.1:4173/artifacts/sgci-pantallas/INDICE.html`
- **Endpoint de Estado y Salud (`API v1`):** `http://127.0.0.1:4173/api/v1/health`
- **Lanzador de 1 Clic en Windows:** [INICIAR-MVP-PRUEBA.bat](file:///C:/dev/SGCI/INICIAR-MVP-PRUEBA.bat)

---

## 2. Credenciales y Contexto Preconfigurado de Prueba

| Parámetro | Valor Preconfigurado en el MVP |
|---|---|
| **Organización (Tenant)** | `Industrias Alfa S.A.S.` (`IND-ALFA` · `tenant_id: 8f2a...c91d`) |
| **Usuario Principal** | `Laura Mendoza` (`laura@industriasalfa.com`) |
| **Rol Activo por Defecto** | `JEFE_ALMACEN` (Conmutable en vivo en la barra superior a `ADMIN_EMPRESA`, `AUDITOR_CONTEOS`, `OPERADOR_PISO`, `SUPER_ADMIN_SAAS`) |
| **Bodega Activa** | `ALM-CENTRAL-01 — Bodega Central Monterrey` (Conmutable a `Saltillo` y `Querétaro`) |
| **Token de Recuperación (`05b`)** | `SGCI-RST-8F2A-2026` |

---

## 3. Guion de Pruebas de Aceptación (10 Escenarios UAT Interactivos)

Dentro del portal (`http://127.0.0.1:4173`) dispones del botón superior **`🧪 Guía Prueba MVP`** y del botón **`↺ Reset MVP`** para restaurar los datos iniciales en cualquier momento:

1. **Menú Lateral Expandido (`252px`), Contraído (`72px`) y Móvil (`390px`):**
   - Pulsa el botón `[|◁]` junto al logo `SGCI` para contraer el menú a `72px`: verifica que los textos desaparecen del DOM sin ninguna superposición de iconos y que al pasar el cursor se despliegan tooltips flotantes.
2. **Catálogo Maestro y Validación de Punto de Reorden (`Pantalla 08` y `08b`):**
   - Entra en **Productos y ROP** $\rightarrow$ **`+ Nuevo producto (Ventana 08b)`**. Intenta guardar un producto con `ROP < Stock Mínimo` para verificar el bloqueo de invariante de negocio, y luego guárdalo con `ROP >= Mínimo`.
3. **Topología de Almacenes y Transferencia en 2 Pasos (`Pantalla 09` y `09b`):**
   - Entra en **Almacenes** $\rightarrow$ revisa el mapa de ocupación por pasillo (`Pasillo A`, `Pasillo B`, `Zona Cuarentena`) $\rightarrow$ pulsa **`🚚 + Nueva Transferencia Inter-Almacén (2 Pasos)`** y luego **`Confirmar Llegada (Paso 2)`**.
4. **Libro Mayor Kardex Inmutable (`Pantalla 10`):**
   - Entra en **Libro Kardex** $\rightarrow$ alterna las pestañas **`PEPS / FIFO`**, **`UEPS / LIFO`** y **`PROMEDIO`** y verifica que todas las operaciones ejecutadas en otros módulos han generado asientos contables inmutables (`HASH · 8F2A...C91D`).
5. **Trazabilidad Sanitaria y Despacho Automático FEFO (`Pantalla 11` y `11b`):**
   - Entra en **Lotes y FEFO** $\rightarrow$ abre **`⚡ Simulador Despacho FEFO Multi-Lote`** $\rightarrow$ despacha `10 PZA` y comprueba cómo consume primero `LOTE-2026-089` (12 días para vencer), completa con `LOTE-2026-101` y omite automáticamente `LOTE-2026-019` en `CUARENTENA`.
6. **Conteos Ciegos y Doble Firma Mancomunada (`Pantalla 12`):**
   - Entra en **Conteos y auditoría** $\rightarrow$ sobre el ciclo `CC-2026-028` pulsa **`Firmar 2ª Aprobación → Kardex`** para autorizar el ajuste con segregación de funciones (`JEFE_ALMACEN + AUDITOR_CONTEOS`).
7. **Abastecimiento y Recepción Física en Muelle (`Pantalla 13` y `13b`):**
   - Entra en **Abastecimiento** $\rightarrow$ pulsa **`📥 Ventana 13b · Recepción en Muelle`** $\rightarrow$ confirma el ingreso de `40.0000 PZA` de `OC-2026-0119` y comprueba cómo el stock de `RB-220-INOX` sube de `14` a `54 PZA` (`ÓPTIMO`).
8. **Analítica Patrimonial y Clasificación Pareto ABC (`Pantalla 14`):**
   - Entra en **Analítica** $\rightarrow$ conmuta entre **`PEPS`** (`$ 2,441,470.00`), **`UEPS`** (`$ 2,418,920.00`) y **`CPP`** (`$ 2,430,195.00`) para comparar el impacto patrimonial y la clasificación ABC por almacén.
9. **Terminal Móvil PWA `390px` y Cola Offline IndexedDB (`Pantallas M07–M10`):**
   - Entra en **App Móvil PWA (390px)** $\rightarrow$ abre el menú hamburguesa **`☰`** (`10..13-MENU-MOVIL-ABIERTO`) $\rightarrow$ registra un conteo en **`09 · Conteos`** con el teclado numérico táctil y sincroniza la cola en **`10 · Cola`**.
10. **Acceso Corporativo, Demo Animada y Recuperación por Token (`Pantallas 01–06` y `05b`):**
    - Entra en **Landing y Login (01–06)** $\rightarrow$ prueba **`05b · Nueva Contraseña (Token)`** validando la política OWASP y revocación automática de sesiones.
