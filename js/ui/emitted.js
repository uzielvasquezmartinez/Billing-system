/**
 * Controlador de la Vista: Factura Emitida y Exportar
 * Muestra el comprobante timbrado con Folio, UUID y desglose fiscal.
 * Maneja la descarga de PDF y XML mediante URLs firmadas de S3.
 */

import { formatMoney } from '../utils/money.js';
import { exportarFactura } from '../api/facturas.js';
import { facturaStore } from '../state/factura-store.js';

export class EmittedInvoiceController {
  constructor(onNewInvoice) {
    this.onNewInvoice = onNewInvoice;
    this.currentInvoiceData = null;

    // Elementos del DOM
    this.container = document.getElementById('viewFacturaEmitida');
    this.folioEl = document.getElementById('emittedFolio');
    this.fechaEl = document.getElementById('emittedFecha');
    this.uuidEl = document.getElementById('emittedUuid');
    this.rfcEmisorEl = document.getElementById('emittedRfcEmisor');
    this.rfcReceptorEl = document.getElementById('emittedRfcReceptor');
    this.direccionEl = document.getElementById('emittedDireccion');
    this.comentariosEl = document.getElementById('emittedComentarios');

    this.tableBody = document.getElementById('emittedTableBody');
    this.subtotalEl = document.getElementById('emittedSubtotal');
    this.ivaEl = document.getElementById('emittedIva');
    this.totalEl = document.getElementById('emittedTotal');

    this.downloadPdfBtn = document.getElementById('downloadPdfBtn');
    this.downloadXmlBtn = document.getElementById('downloadXmlBtn');
    this.nuevaFacturaBtn = document.getElementById('nuevaFacturaBtn');
  }

  init() {
    if (!this.container) return;

    this.bindEvents();
    this.renderSampleData();
  }

  bindEvents() {
    if (this.downloadPdfBtn) {
      this.downloadPdfBtn.addEventListener('click', () => this.handleExport('pdf'));
    }
    if (this.downloadXmlBtn) {
      this.downloadXmlBtn.addEventListener('click', () => this.handleExport('xml'));
    }
    if (this.nuevaFacturaBtn) {
      this.nuevaFacturaBtn.addEventListener('click', () => {
        facturaStore.reset();
        if (typeof this.onNewInvoice === 'function') {
          this.onNewInvoice();
        }
      });
    }
  }

  renderSampleData() {
    // Datos iniciales de referencia idénticos al diseño aprobado
    this.showInvoice({
      id: 'FAC-SAMPLE-01',
      folio: 'A-000123',
      uuid: '3f2b9c1e-7a4d-4e8b-9c21-5d6f0a1b7e34',
      fecha: '13/10/2026',
      rfcEmisor: 'EMI010203AB1',
      rfcReceptor: 'REC040506CD2',
      direccion: 'Av. Universidad 100, Col. Centro, Cuernavaca, Morelos',
      comentarios: 'Pago a 30 días.',
      productos: [
        { sku: 'SRV-HOST-001', cantidad: 2, precioUnitario: 1200.00, importe: 2400.00 },
        { sku: 'SRV-SOP-014', cantidad: 1, precioUnitario: 850.00, importe: 850.00 },
        { sku: 'SRV-DOM-003', cantidad: 3, precioUnitario: 300.00, importe: 900.00 }
      ],
      subtotal: 4150.00,
      impuestos: 664.00,
      total: 4814.00
    });
  }

  showInvoice(data) {
    this.currentInvoiceData = data;

    if (this.folioEl) this.folioEl.textContent = data.folio || 'A-000123';
    if (this.fechaEl) this.fechaEl.textContent = data.fecha || '13/10/2026';
    if (this.uuidEl) this.uuidEl.textContent = data.uuid || '3f2b9c1e-7a4d-4e8b-9c21-5d6f0a1b7e34';
    if (this.rfcEmisorEl) this.rfcEmisorEl.textContent = data.rfcEmisor || 'EMI010203AB1';
    if (this.rfcReceptorEl) this.rfcReceptorEl.textContent = data.rfcReceptor || 'REC040506CD2';
    if (this.direccionEl) this.direccionEl.textContent = data.direccion || 'Av. Universidad 100, Col. Centro, Cuernavaca, Morelos';
    if (this.comentariosEl) this.comentariosEl.textContent = data.comentarios || 'Pago a 30 días.';

    if (this.subtotalEl) this.subtotalEl.textContent = formatMoney(data.subtotal || 4150.00);
    if (this.ivaEl) this.ivaEl.textContent = formatMoney(data.impuestos || 664.00);
    if (this.totalEl) this.totalEl.textContent = formatMoney(data.total || 4814.00);

    // Renderizar tabla de productos
    if (this.tableBody && data.productos) {
      const fragment = document.createDocumentFragment();
      data.productos.forEach((p) => {
        const tr = document.createElement('tr');
        tr.className = 'emitted-table-row';

        const tdSku = document.createElement('td');
        tdSku.className = 'font-mono';
        tdSku.textContent = p.sku;

        const tdQty = document.createElement('td');
        tdQty.textContent = p.cantidad;

        const tdPrice = document.createElement('td');
        tdPrice.className = 'font-mono text-right';
        tdPrice.textContent = formatMoney(p.precioUnitario);

        const tdTotal = document.createElement('td');
        tdTotal.className = 'font-mono text-right';
        tdTotal.textContent = formatMoney(p.importe);

        tr.appendChild(tdSku);
        tr.appendChild(tdQty);
        tr.appendChild(tdPrice);
        tr.appendChild(tdTotal);
        fragment.appendChild(tr);
      });
      this.tableBody.replaceChildren(fragment);
    }
  }

  async handleExport(formato) {
    if (!this.currentInvoiceData) return;

    const btn = formato === 'pdf' ? this.downloadPdfBtn : this.downloadXmlBtn;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = `Generando ${formato.toUpperCase()}…`;

    try {
      const { url } = await exportarFactura(this.currentInvoiceData.id || 'FAC-SAMPLE-01', formato);
      // Simular apertura/descarga de URL firmada de S3
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(`No fue posible descargar el archivo ${formato.toUpperCase()}: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}
