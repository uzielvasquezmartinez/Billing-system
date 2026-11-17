# Sistema de Facturación Académico — Frontend

Frontend de alto rendimiento y accesibilidad desarrollado con **HTML5 semántico, CSS puro (tokens y variables CSS) y JavaScript moderno (módulos ES nativos)**.
Sin frameworks (sin React, Angular ni Vue), sin librerías externas y **sin paso de compilación obligatorio**.

Diseñado para hospedarse en **Amazon S3 detrás de Amazon CloudFront** y consumir una API REST serverless (**Amazon API Gateway + AWS Lambda**).

---

## 🎨 Paleta Oficial Exclusiva

* **Esmerald (`#065f46`):** Color institucional primario. Gobierna la barra superior (en su tono profundo `#022c22` / `#064e3b`), la tarjeta lateral de Resumen, las cabeceras de tabla, las acciones principales (`Emitir factura`, `Submit`, `Nueva factura`) y los bordes estructurados.
* **Mint (`#A7F3D0`):** Color de acento e interactividad. Gobierna el módulo activo en la cápsula central del navbar, los botones de acción secundaria (`+ Agregar producto`, `Descargar PDF`, `Descargar XML`), el importe Total destacado en el Resumen, los badges de SKUs del catálogo y los anillos de foco accesible.
* **Cream (`#FFF8E7`):** Fondo oficial de la aplicación (canvas del cuerpo y superficies), tarjetas y tipografía de alto contraste en los paneles esmeralda oscuros.

Tipografías oficiales:
* **DM Sans:** Lectura general, encabezados y etiquetas.
* **DM Mono:** Folios (`A-000123`), UUIDs, RFCs, SKUs e importes monetarios.

---

## 🧭 Navbar Encapsulado Central (Los 3 Módulos)

La barra de navegación cuenta con un diseño flotante **en el centro dentro de una cápsula rectangular** (`.nav-capsule` con backdrop-blur, borde Mint `#A7F3D0` y sombra de elevación) que agrupa los **3 módulos**:

1. **📄 Factura nueva:** Formulario completo para capturar datos fiscales, tabla dinámica de productos (SKU, cantidad, precio unitario, importe calculado), validación contra SKUs no asociados, subtotal local y resumen lateral con cálculo de IVA y Total.
2. **📑 Factura emitida:** Vista de comprobante con timbre fiscal simulado (Folio, UUID, fecha, desglose de partidas, comentarios) y panel lateral de exportación para descarga de **PDF** y **XML** mediante URLs temporales firmadas de S3.
3. **📦 Catálogo:** Buscador reactivo por servicio o SKU, tabla paginada de servicios con precio base y panel lateral interactivo con pestañas de especificaciones y detalles fiscales del SAT (Clave Prod/Serv, Unidad, Tasa IVA, Retenciones, etc.).

Adicionalmente:
* **Identidad Institucional (Izquierda):** Logotipo geométrico en Mint `#A7F3D0` + "Facturación".
* **Acción Salir (Derecha):** Cierre de sesión seguro con limpieza de almacenamiento y redirección a la pantalla de Login.

---

## 📁 Estructura Modular y Separación de HTML (`/views/`)

Siguiendo las mejores prácticas de arquitectura frontend, el archivo `index.html` actúa exclusivamente como el cascarón (*app shell*), mientras que cada vista y componente cuenta con su **propio archivo HTML en la carpeta `/views/`**:

```text
├── index.html                   # App Shell mínimo (enlaces a CSS, contenedores de montaje y carga de scripts)
├── views/                       # Carpeta de Vistas y Plantillas HTML Modulares
│   ├── navbar.html              # Barra superior con cápsula central (los 3 módulos) y botón Salir
│   ├── login.html               # Pantalla de acceso institucional (formulario split-screen)
│   ├── factura-nueva.html       # Formulario de factura, tabla dinámica de productos y resumen
│   ├── factura-emitida.html     # Comprobante timbrado fiscal con acciones de exportar (PDF/XML)
│   └── catalogo.html            # Catálogo de servicios con buscador y detalle fiscal del SAT
├── css/
│   ├── variables.css            # Paleta oficial estricta (Esmerald, Mint, Cream), tokens y curvas spring
│   ├── base.css                 # Reset moderno, Google Fonts (DM Sans, DM Mono) y accesibilidad
│   ├── layout.css               # Rejilla Split, barra encapsulada central y adaptabilidad a 360 px
│   └── components.css           # Tablas dinámicas, inputs, resumen lateral, alertas y tarjetas de catálogo
├── js/
│   ├── config.js                # Endpoints, catálogo base de servicios y MOCK_MODE (sin secretos)
│   ├── api/
│   │   ├── client.js            # Wrapper de fetch con timeout, Bearer token, manejo 401 y simulación
│   │   └── facturas.js          # validarProductos(), crearFactura(), emitirFactura(), exportarFactura()
│   ├── auth/
│   │   └── session.js           # Gestión segura de sesión en sessionStorage con try/catch
│   ├── state/
│   │   └── factura-store.js     # Estado único reactivo para el formulario y notificación a suscriptores
│   ├── utils/
│   │   ├── validators.js        # Validaciones de RFC (SAT), SKU, Cantidad, Precio y Correo
│   │   └── money.js             # Formato monetario MXN mediante Intl.NumberFormat
│   ├── ui/
│   │   ├── view-loader.js       # Cargador asíncrono con caché de vistas desde /views/*.html
│   │   ├── navbar.js            # Controlador del navbar encapsulado y enrutador dinámico
│   │   ├── form.js              # Controlador del encabezado de la factura
│   │   ├── items-table.js       # Tabla de productos (cálculo de importe, agregar, quitar, errores)
│   │   ├── summary.js           # Resumen lateral y orquestación del flujo de emisión
│   │   ├── emitted.js           # Vista de factura emitida y descarga de PDF/XML
│   │   ├── catalog.js           # Buscador y detalle fiscal del catálogo de servicios
│   │   ├── login-form.js        # Formulario de acceso institucional
│   │   └── alerts.js            # Banner accesible (role="alert") para errores de SKUs sin servicio
│   └── main.js                  # Inicialización y arranque de módulos ES
└── src/
    └── assets/                  # Bocetos aprobados y capturas de diseño de referencia
```

---

## ⚡ Reglas de Negocio Implementadas

1. **Rechazo total por SKU sin servicio:** Si un solo SKU capturado no existe en el catálogo de servicios, el backend responde HTTP 422 y el frontend muestra TODOS los SKU con error simultáneamente en el aviso superior con `role="alert"`, marcando en rojo cada fila afectada con la leyenda *"Este SKU no tiene un servicio asociado."*.
2. **Autoridad de cálculo en el servidor:** El subtotal se actualiza localmente en tiempo real mientras se captura, pero el IVA y el Total provienen de la respuesta del servidor. Mientras no haya cálculo del servidor se muestra "—".
3. **Flujo de emisión:** Validación local → `validarProductos()` → `crearFactura()` → `emitirFactura()` → Transición automática a la pantalla de factura emitida con su Folio y UUID.
4. **Mínimo un renglón:** La tabla de productos siempre mantiene al menos una fila; el botón de eliminación se deshabilita automáticamente cuando solo queda un producto.

---

## 🚀 Cómo probar en Local

Al utilizar módulos ES nativos (`import`/`export`) y carga dinámica de plantillas (`fetch`), debe servirse mediante HTTP(S):

### Opción 1: Servidor Vite
```bash
npm run dev
```

### Opción 2: Servidor Python
```bash
python3 -m http.server 8080
```
Abre en tu navegador `http://localhost:8080/`.

---

## ☁️ Despliegue en AWS (S3 + CloudFront)

1. Subir archivos estáticos (incluyendo la carpeta `views/`):
   ```bash
   aws s3 sync . s3://tu-bucket-facturacion/ \
     --exclude "node_modules/*" \
     --exclude ".git/*" \
     --exclude "package*.json" \
     --delete
   ```
2. CloudFront distribuirá el contenido con compresión Gzip/Brotli, certificado SSL y headers de seguridad estrictos.
