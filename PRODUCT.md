# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML5 semántico, CSS3 nativo (tokens y variables CSS), JavaScript ES Modules (sin frameworks, sin librerías externas, sin paso de compilación obligatorio). Alojamiento estático en Amazon S3 detrás de Amazon CloudFront, consumiendo Amazon API Gateway + AWS Lambda.

## Users

Personal administrativo, directores académicos y contadores de instituciones educativas en México que necesitan generar, timbrar y exportar comprobantes fiscales digitales (CFDI 4.0) asociados a servicios académicos e infraestructura escolar.

## Product Purpose

Proporcionar una interfaz web precisa, accesible y rápida para emitir facturas institucionales, verificar la asociación de servicios por SKU contra el catálogo del SAT, timbrar comprobantes fiscales y exportar representaciones impresas (PDF) y archivos tributarios (XML).

## Positioning

Sistema de facturación institucional especializado en el entorno académico que garantiza integridad tributaria mediante validación estricta de servicios y autoridad de cálculo centralizada en el servidor, sin requerir dependencias de software complejas ni compiladores.

## Operating Context

Navegadores modernos en equipos de cómputo de oficinas administrativas y dispositivos móviles o tabletas en campus (pantallas desde 360 px hasta monitores 4K). Tareas críticas de timbrado donde un error de SKU o RFC puede invalidar un proceso contable ante el SAT.

## Capabilities and Constraints

- **Formulario de Emisión:** Fecha de factura, RFC emisor (12-13 caracteres SAT), RFC receptor, dirección, comentarios opcionales.
- **Lista de Productos Dinámica:** SKU alfanumérico, cantidad (entero ≥ 1), precio unitario (≥ 0.00), importe calculado automáticamente. Mínimo 1 renglón requerido.
- **Regla de Negocio de Validación:** Si un solo SKU carece de servicio asociado, se rechaza la factura completa con un aviso global consolidado (`role="alert"`) y marcado visual en cada renglón afectado.
- **Autoridad de Cálculo:** El cliente calcula el subtotal provisional; los impuestos (IVA 16%) y el Total final son gobernados exclusivamente por el backend.
- **Catálogo de Servicios:** Consulta y búsqueda reactiva de servicios con especificaciones tributarias SAT (claves de producto/servicio, unidades, retenciones).
- **Exportación:** Generación de enlaces temporales prefirmados de Amazon S3 para descarga de PDF y XML.
- **Seguridad:** Cero secretos en código cliente, almacenamiento de token en `sessionStorage` con captura de excepciones, compatibilidad estricta con CSP.

## Brand Commitments

- **Paleta Oficial:** Esmerald (`#065f46`), Mint (`#A7F3D0`) y Cream (`#FFF8E7`).
- **Tipografía:** `DM Sans` para la interfaz general y `DM Mono` para RFC, SKU, folios, UUIDs e importes.
- **Navegación:** Barra superior con cápsula rectangular centralizada con los tres módulos principales (`Factura nueva`, `Factura emitida`, `Catálogo`) y salida de sesión segura.

## Evidence on Hand

- Bocetos oficiales aprobados:
  - `src/assets/Factura nueva@1x.png`
  - `src/assets/Factura nueva · SKU sin servicio@1x.png`
  - `src/assets/Factura emitida y exportar@1x.png`
  - `src/assets/Catálogo de servicios@1x.png`
  - `src/assets/login.png`

## Product Principles

1. **El servidor es la autoridad tributaria:** El cliente asiste y anticipa el subtotal, pero nunca inventa impuestos sin confirmación del backend.
2. **Claridad total en el fallo:** Cuando hay errores en la lista de productos, se reportan todos los SKUs inválidos simultáneamente con instrucciones de corrección accionables.
3. **Artesanía nativa:** Sin dependencias de terceros; interfaces rápidas, predecibles y de carga inmediata sobre estándares web.
4. **Accesibilidad sin excusas:** Contrastes WCAG AA superiores a 4.5:1, foco visible riguroso, etiquetas para lectores de pantalla y soporte de reducción de movimiento.

## Accessibility & Inclusion

- Cumplimiento WCAG 2.1 nivel AA.
- Objetivos táctiles mínimos de 44x44 px.
- Anuncios dinámicos accesibles (`aria-invalid`, `aria-describedby`, `aria-live`, `role="alert"`).
- Estructura navegable 100% por teclado sin trampas de foco.
