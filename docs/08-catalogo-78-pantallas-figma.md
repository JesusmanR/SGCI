# 08 · Catálogo Maestro de las 78 Pantallas Oficiales de Figma (155 Vistas Escritorio 1440px y Móvil 390px)

- **Ubicación integrada en el repositorio:** [frontend/public/artifacts/sgip-pantallas/](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas)
- **Índice interactivo HTML:** [index.html](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/index.html)
- **Manifiesto JSON de pantallas:** [manifest.json](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/manifest.json)
- **Vista panorámica general:** [vista-general.png](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/vista-general.png)

---

## 1. Resumen de la Biblioteca Visual de Figma

La biblioteca visual exportada desde Figma consta de **78 pantallas y estados interactivos** (**155 archivos PNG**: 78 de escritorio en `1440 px` y 77 móviles en `390 px`), organizados en **9 grupos funcionales**:

| Grupo Funcional | Rango de IDs | Cantidad de Pantallas | Módulos SGCI Vinculados |
| :--- | :---: | :---: | :--- |
| **1. Acceso y Seguridad** | `01` – `07`, `58` | 8 | `Tenants`, `Autenticacion` (`PasswordGate`, cambio obligatorio de contraseña) |
| **2. Administrador (Operación y Gestión)** | `08` – `24` | 17 | `Catalogo`, `Almacenes`, `Kardex`, `Tenants`, `Autenticacion` |
| **3. Caja y Punto de Cobro** | `25` – `35` | 11 | `Caja` / `Facturacion` (apertura, cobro efectivo/tarjeta/transferencia, arqueo y cierre con justificación de diferencia) |
| **4. Compras, Recepción y Ajustes de Inventario** | `36` – `45`, `78` | 11 | `Compras` (`OC`, recepción parcial/confirmada) y `AuditoriaConteos` (`Conteo físico`, `Producto dañado / merma`, `Pérdida`, `Corrección de registro`, `Otro`) |
| **5. Impuestos, Reglas de Ganancia y Listas de Precios CSV** | `46` – `52`, `77` | 8 | `Catalogo` / `Precios` (`Recargo sobre el costo`, `Margen sobre la venta`, importación CSV con alerta de precio bajo costo) |
| **6. Estados del Sistema y Resiliencia** | `53` – `59` | 7 | `Compartido` / `PWA` (`Sin datos`, `Cargando`, `Error ERR_CONNECTION`, `Conexión restablecida`, `Prueba vencida`, `Empresa desactivada`) |
| **7. Vendedor y Lector Óptico QR / Barras** | `60` – `69` | 10 | `Catalogo`, `Ventas`, `Escaner` (`68-lector-codigos`, `69-lector-resultado`) |
| **8. SuperAdmin SaaS Multi-Tenant** | `70` – `75` | 6 | `Tenants` (`70-panel-superadmin`, `71-empresas-clientes`, `72-suscripciones-plataforma`, `73-facturas-membresias`, `74-accesos-contrasenas`, `75-restablecimiento-acceso`) |
| **9. Variantes de Plan (`Emprende` vs `Crece`)** | `76` – `77` | 2 | `Tenants` / `Suscripciones` |

---

## 2. Matriz Completa de las 78 Pantallas (Escritorio `1440px` y Móvil `390px`)

### Grupo 1: Acceso (`01` – `07`)
1. **`01-landing` — Sitio público y planes:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/01-landing.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/01-landing.png)
2. **`02-registro` — Registro de empresa:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/02-registro.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/02-registro.png)
3. **`03-login` — Inicio de sesión:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/03-login.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/03-login.png)
4. **`04-recuperar-contrasena` — Recuperación de contraseña:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/04-recuperar-contrasena.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/04-recuperar-contrasena.png)
5. **`05-recuperacion-enviada` — Enlace de recuperación enviado:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/05-recuperacion-enviada.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/05-recuperacion-enviada.png)
6. **`06-cambio-obligatorio` — Cambio obligatorio de contraseña:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/06-cambio-obligatorio.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/06-cambio-obligatorio.png)
7. **`07-contrasenas-no-coinciden` — Validación: las contraseñas no coinciden:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/07-contrasenas-no-coinciden.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/07-contrasenas-no-coinciden.png)

### Grupo 2: Administrador (`08` – `24`)
8. **`08-inicio-admin` — Inicio · Administrador:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/08-inicio-admin.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/08-inicio-admin.png)
9. **`09-menu-movil` — Navegación móvil:** [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/09-menu-movil.png)
10. **`10-perfil-empresa` — Perfil de empresa:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/10-perfil-empresa.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/10-perfil-empresa.png)
11. **`11-productos` — Productos e inventario:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/11-productos.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/11-productos.png)
12. **`12-catalogo` — Catálogo de productos:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/12-catalogo.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/12-catalogo.png)
13. **`13-clientes` — Clientes:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/13-clientes.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/13-clientes.png)
14. **`14-cotizaciones` — Cotizaciones:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/14-cotizaciones.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/14-cotizaciones.png)
15. **`15-ventas` — Ventas:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/15-ventas.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/15-ventas.png)
16. **`16-facturacion` — Nueva factura:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/16-facturacion.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/16-facturacion.png)
17. **`17-proveedores` — Proveedores:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/17-proveedores.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/17-proveedores.png)
18. **`18-movimientos` — Movimientos de inventario:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/18-movimientos.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/18-movimientos.png)
19. **`19-reportes` — Reportes:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/19-reportes.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/19-reportes.png)
20. **`20-usuarios` — Usuarios vendedores:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/20-usuarios.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/20-usuarios.png)
21. **`21-suscripcion` — Suscripción y planes:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/21-suscripcion.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/21-suscripcion.png)
22. **`22-registrar-producto` — Registrar producto:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/22-registrar-producto.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/22-registrar-producto.png)
23. **`23-detalle-producto` — Ficha y detalle del producto:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/23-detalle-producto.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/23-detalle-producto.png)
24. **`24-centro-ayuda` — Centro de ayuda:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/24-centro-ayuda.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/24-centro-ayuda.png)

### Grupo 3: Caja y Arqueo (`25` – `35`)
25. **`25-caja-abierta` — Caja abierta · Sin cobros:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/25-caja-abierta.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/25-caja-abierta.png)
26. **`26-caja-venta-pendiente` — Caja · Venta pendiente de cobro:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/26-caja-venta-pendiente.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/26-caja-venta-pendiente.png)
27. **`27-cobro-efectivo` — Cobro en efectivo y cambio:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/27-cobro-efectivo.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/27-cobro-efectivo.png)
28. **`28-cobro-tarjeta` — Cobro con tarjeta:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/28-cobro-tarjeta.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/28-cobro-tarjeta.png)
29. **`29-cobro-transferencia` — Cobro por transferencia:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/29-cobro-transferencia.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/29-cobro-transferencia.png)
30. **`30-cobro-confirmado` — Cobro confirmado y resumen de caja:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/30-cobro-confirmado.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/30-cobro-confirmado.png)
31. **`31-cierre-caja` — Cierre de caja · Arqueo:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/31-cierre-caja.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/31-cierre-caja.png)
32. **`32-cierre-diferencia` — Cierre · Diferencia de efectivo sin justificar:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/32-cierre-diferencia.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/32-cierre-diferencia.png)
33. **`33-cierre-justificado` — Cierre · Motivo de la diferencia:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/33-cierre-justificado.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/33-cierre-justificado.png)
34. **`34-caja-cerrada` — Caja cerrada y resumen del arqueo:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/34-caja-cerrada.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/34-caja-cerrada.png)
35. **`35-apertura-caja` — Abrir sesión de caja y base inicial:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/35-apertura-caja.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/35-apertura-caja.png)

### Grupo 4: Compras e Inventario / Conteos y Ajustes (`36` – `45`, `78`)
36. **`36-ordenes-compra` — Órdenes de compra:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/36-ordenes-compra.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/36-ordenes-compra.png)
37. **`37-nueva-orden` — Nueva orden de compra:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/37-nueva-orden.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/37-nueva-orden.png)
38. **`38-recepcion-mercancia` — Recepción de mercancía:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/38-recepcion-mercancia.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/38-recepcion-mercancia.png)
39. **`39-recepcion-parcial` — Recepción parcial · Cantidades recibidas:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/39-recepcion-parcial.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/39-recepcion-parcial.png)
40. **`40-recepcion-confirmada` — Recepción confirmada · Stock actualizado:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/40-recepcion-confirmada.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/40-recepcion-confirmada.png)
41. **`41-compras-sin-resultados` — Compras · Búsqueda sin resultados:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/41-compras-sin-resultados.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/41-compras-sin-resultados.png)
42. **`42-historial-inventario` — Historial de inventario de la sesión:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/42-historial-inventario.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/42-historial-inventario.png)
43. **`43-nuevo-ajuste` — Ajuste de inventario con motivo:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/43-nuevo-ajuste.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/43-nuevo-ajuste.png)
44. **`44-ajuste-revision` — Revisión del ajuste antes de confirmar:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/44-ajuste-revision.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/44-ajuste-revision.png)
45. **`45-ajuste-confirmado` — Ajuste confirmado y trazabilidad:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/45-ajuste-confirmado.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/45-ajuste-confirmado.png)
46. **`78-inventario-sin-movimientos` — Inventario · Historial vacío:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/78-inventario-sin-movimientos.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/78-inventario-sin-movimientos.png)

### Grupo 5: Impuestos y Precios (`46` – `52`)
47. **`46-impuestos-recargo` — Impuestos y ganancia · Recargo sobre costo:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/46-impuestos-recargo.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/46-impuestos-recargo.png)
48. **`47-impuestos-margen` — Impuestos y ganancia · Margen sobre venta:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/47-impuestos-margen.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/47-impuestos-margen.png)
49. **`48-lista-precios` — Lista de precios vigente e importación CSV:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/48-lista-precios.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/48-lista-precios.png)
50. **`49-revision-lista` — Revisión de lista de precios antes de aplicar:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/49-revision-lista.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/49-revision-lista.png)
51. **`50-precios-aplicados` — Precios aplicados y confirmación:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/50-precios-aplicados.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/50-precios-aplicados.png)
52. **`51-precios-bajo-costo` — Revisión de precios · Alerta por debajo del costo:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/51-precios-bajo-costo.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/51-precios-bajo-costo.png)
53. **`52-error-importacion` — Error de validación del archivo CSV:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/52-error-importacion.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/52-error-importacion.png)

### Grupo 6: Estados del Sistema (`53` – `59`)
54. **`53-estado-vacio` — Estado vacío · Primer producto:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/53-estado-vacio.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/53-estado-vacio.png)
55. **`54-estado-carga` — Estado de carga:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/54-estado-carga.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/54-estado-carga.png)
56. **`55-estado-error` — Error de conexión y reintento:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/55-estado-error.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/55-estado-error.png)
57. **`56-prueba-vencida` — Empresa con prueba vencida:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/56-prueba-vencida.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/56-prueba-vencida.png)
58. **`57-empresa-desactivada` — Empresa desactivada:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/57-empresa-desactivada.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/57-empresa-desactivada.png)
59. **`58-estado-contrasena` — Vista de cambio obligatorio de contraseña:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/58-estado-contrasena.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/58-estado-contrasena.png)
60. **`59-conexion-restablecida` — Conexión restablecida después del error:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/59-conexion-restablecida.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/59-conexion-restablecida.png)

### Grupo 7: Vendedor y Escáner Óptico (`60` – `69`)
61. **`60-inicio-vendedor` — Inicio · Vendedor:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/60-inicio-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/60-inicio-vendedor.png)
62. **`61-catalogo-vendedor` — Catálogo · Vendedor:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/61-catalogo-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/61-catalogo-vendedor.png)
63. **`62-precios-vendedor` — Lista de precios · Solo consulta:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/62-precios-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/62-precios-vendedor.png)
64. **`63-clientes-vendedor` — Clientes · Vendedor:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/63-clientes-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/63-clientes-vendedor.png)
65. **`64-cotizaciones-vendedor` — Cotizaciones · Vendedor:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/64-cotizaciones-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/64-cotizaciones-vendedor.png)
66. **`65-facturacion-vendedor` — Facturación · Vendedor:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/65-facturacion-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/65-facturacion-vendedor.png)
67. **`66-caja-vendedor` — Caja · Vendedor:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/66-caja-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/66-caja-vendedor.png)
68. **`67-ventas-vendedor` — Mis ventas:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/67-ventas-vendedor.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/67-ventas-vendedor.png)
69. **`68-lector-codigos` — Lector QR y códigos de barras:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/68-lector-codigos.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/68-lector-codigos.png)
70. **`69-lector-resultado` — Lector · Producto identificado:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/69-lector-resultado.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/69-lector-resultado.png)

### Grupo 8: SuperAdmin (`70` – `75`) y Variantes de Plan (`76` – `77`)
71. **`70-panel-superadmin` — Panel de control · SuperAdmin:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/70-panel-superadmin.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/70-panel-superadmin.png)
72. **`71-empresas-clientes` — Directorio de empresas clientes:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/71-empresas-clientes.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/71-empresas-clientes.png)
73. **`72-suscripciones-plataforma` — Suscripciones de la plataforma:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/72-suscripciones-plataforma.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/72-suscripciones-plataforma.png)
74. **`73-facturas-membresias` — Facturación de membresías:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/73-facturas-membresias.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/73-facturas-membresias.png)
75. **`74-accesos-contrasenas` — Accesos y contraseñas de clientes:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/74-accesos-contrasenas.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/74-accesos-contrasenas.png)
76. **`75-restablecimiento-acceso` — Confirmación de restablecimiento de acceso:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/75-restablecimiento-acceso.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/75-restablecimiento-acceso.png)
77. **`76-inicio-emprende` — Inicio · Plan Emprende:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/76-inicio-emprende.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/76-inicio-emprende.png)
78. **`77-precios-emprende` — Precios · Plan Emprende sin importación masiva:** [Escritorio](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/escritorio/77-precios-emprende.png) · [Móvil](file:///C:/dev/SGCI/frontend/public/artifacts/sgip-pantallas/movil/77-precios-emprende.png)
