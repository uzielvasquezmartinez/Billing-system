/**
 * Controlador de la Vista: Factura Emitida, Exportación y Cancelación
 * Renderiza dinámicamente FacturaDetalleResponseDTO mediante textContent,
 * gestiona descargas PDF/XML con URL firmada de S3 y cancelación auditada.
 */

import { formatMoney } from '../utils/money.js';
import { exportarFactura, cancelarFactura } from '../api/facturas.js';
import { ApiError } from '../api/client.js';
import { facturaStore } from '../state/factura-store.js';
import { AlertManager } from './alerts.js';

export class EmittedInvoiceController {
  constructor(onNewInvoice) {
    this.onNewInvoice = onNewInvoice;
    this.currentInvoiceData = null;
    this.isCancelling = false;
    this.eventsBound = false;
  }

  init() {
    this.container = document.getElementById('invoiceEmittedState');
    this.alertManager = new AlertManager(document.getElementById('emittedAlert'));
    this.modalAlertManager = new AlertManager(document.getElementById('cancelModalAlert'));

    this.chipTextEl = document.getElementById('emittedChipText');
    this.estadoBadgeEl = document.getElementById('emittedEstadoBadge');
    this.serieEl = document.getElementById('emittedSerie');
    this.monedaEl = document.getElementById('emittedMoneda');
    this.folioEl = document.getElementById('emittedFolio');
    this.fechaEmisionEl = document.getElementById('emittedFechaEmision');
    this.fechaTimbradoEl = document.getElementById('emittedFechaTimbrado');
    this.uuidEl = document.getElementById('emittedUuid');

    this.rfcEmisorEl = document.getElementById('emittedRfcEmisor');
    this.formaPagoEl = document.getElementById('emittedFormaPago');
    this.metodoPagoEl = document.getElementById('emittedMetodoPago');

    this.rfcReceptorEl = document.getElementById('emittedRfcReceptor');
    this.razonSocialEl = document.getElementById('emittedRazonSocial');
    this.codigoPostalEmailEl = document.getElementById('emittedCodigoPostalEmail');
    this.regimenFiscalEl = document.getElementById('emittedRegimenFiscal');
    this.usoCfdiEl = document.getElementById('emittedUsoCfdi');

    this.direccionEl = document.getElementById('emittedDireccion');
    this.comentariosEl = document.getElementById('emittedComentarios');

    this.tableBody = document.getElementById('emittedTableBody');
    this.subtotalEl = document.getElementById('emittedSubtotal');
    this.ivaEl = document.getElementById('emittedIva');
    this.totalEl = document.getElementById('emittedTotal');

    this.stampIdEl = document.getElementById('emittedStampId');
    this.stampUuidEl = document.getElementById('emittedStampUuid');
    this.stampMetaEl = document.getElementById('emittedStampMeta');

    this.downloadPdfBtn = document.getElementById('downloadPdfBtn');
    this.downloadXmlBtn = document.getElementById('downloadXmlBtn');
    this.cancelarFacturaBtn = document.getElementById('cancelarFacturaBtn');
    this.nuevaFacturaBtn = document.getElementById('nuevaFacturaBtn');

    this.cancelModal = document.getElementById('cancelInvoiceModal');
    this.cancelMotivoInput = document.getElementById('cancelMotivoInput');
    this.cancelMotivoError = document.getElementById('cancelMotivoError');
    this.cancelModalCloseBtn = document.getElementById('cancelModalCloseBtn');
    this.confirmCancelInvoiceBtn = document.getElementById('confirmCancelInvoiceBtn');

    if (!this.container || this.eventsBound) return;

    this.bindEvents();
    this.eventsBound = true;
  }

  bindEvents() {
    this.downloadPdfBtn?.addEventListener('click', () => this.handleExport('pdf'));
    this.downloadXmlBtn?.addEventListener('click', () => this.handleExport('xml'));

    this.cancelarFacturaBtn?.addEventListener('click', () => this.openCancelModal());
    this.cancelModalCloseBtn?.addEventListener('click', () => this.closeCancelModal());
    this.confirmCancelInvoiceBtn?.addEventListener('click', () => this.handleConfirmCancel());

    this.cancelMotivoInput?.addEventListener('input', () => {
      if (this.cancelMotivoInput.getAttribute('aria-invalid') === 'true') {
        this.validateMotivo();
      }
    });

    if (this.cancelModal && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      this.cancelModal.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e, this.cancelModal);
      });
      this.cancelModal.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e, this.cancelModal)) {
          this.closeCancelModal();
        }
      });
    }

    this.nuevaFacturaBtn?.addEventListener('click', () => {
      this.alertManager?.clear();
      facturaStore.reset();
      if (typeof this.onNewInvoice === 'function') {
        this.onNewInvoice();
      }
    });
  }

  formatDateTime(value) {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed);
  }

  formatClaveDescripcion(obj) {
    if (!obj) return '—';
    if (typeof obj === 'string') return obj;
    const clave = obj.clave ?? '';
    const desc = obj.descripcion ?? '';
    if (clave && desc) return `${clave} - ${desc}`;
    return String(clave || desc || '—');
  }

  /**
   * Renderiza dinámicamente FacturaDetalleResponseDTO con textContent
   * @param {object} data
   */
  showInvoice(data) {
    if (!data || typeof data !== 'object') return;
    this.currentInvoiceData = { ...data };
    this.alertManager?.clear();

    const serie = data.serie || 'A';
    const folioNum = data.folio !== undefined && data.folio !== null ? String(data.folio) : '';
    const folioFormatted = folioNum
      ? `${serie}-${folioNum.padStart(6, '0')}`
      : '—';
    const estado = String(data.estado || 'TIMBRADA').toUpperCase();
    const moneda = data.moneda || 'MXN';
    const receptor = data.receptor || {};

    this.updateEstadoUI(estado);

    if (this.serieEl) this.serieEl.textContent = serie;
    if (this.monedaEl) this.monedaEl.textContent = moneda;
    if (this.folioEl) this.folioEl.textContent = folioFormatted;
    if (this.fechaEmisionEl) this.fechaEmisionEl.textContent = this.formatDateTime(data.fechaEmision);
    if (this.fechaTimbradoEl) this.fechaTimbradoEl.textContent = this.formatDateTime(data.fechaTimbrado);
    if (this.uuidEl) this.uuidEl.textContent = data.uuid || '—';

    if (this.rfcEmisorEl) this.rfcEmisorEl.textContent = data.rfcEmisor || '—';
    if (this.formaPagoEl) this.formaPagoEl.textContent = this.formatClaveDescripcion(data.formaPago);
    if (this.metodoPagoEl) this.metodoPagoEl.textContent = this.formatClaveDescripcion(data.metodoPago);

    if (this.rfcReceptorEl) this.rfcReceptorEl.textContent = receptor.rfc || '—';
    if (this.razonSocialEl) this.razonSocialEl.textContent = receptor.razonSocial || '—';
    if (this.codigoPostalEmailEl) {
      const cp = receptor.codigoPostal || '—';
      const email = receptor.email || '—';
      this.codigoPostalEmailEl.textContent = `C.P. ${cp} | ${email}`;
    }
    if (this.regimenFiscalEl) this.regimenFiscalEl.textContent = receptor.regimenFiscal || '—';
    if (this.usoCfdiEl) this.usoCfdiEl.textContent = receptor.usoCfdi || '—';

    if (this.direccionEl) this.direccionEl.textContent = data.direccion || '—';
    if (this.comentariosEl) this.comentariosEl.textContent = data.comentarios || 'Sin comentarios';

    if (this.subtotalEl) this.subtotalEl.textContent = formatMoney(data.subtotal ?? 0);
    if (this.ivaEl) this.ivaEl.textContent = formatMoney(data.impuestos ?? 0);
    if (this.totalEl) this.totalEl.textContent = `${formatMoney(data.total ?? 0)} ${moneda}`;

    if (this.stampIdEl) {
      this.stampIdEl.textContent = `ID: ${data.id ?? '—'} | Serie: ${serie} | Folio: ${folioNum || '—'}`;
    }
    if (this.stampUuidEl) {
      this.stampUuidEl.textContent = data.uuid || '—';
    }
    if (this.stampMetaEl) {
      this.stampMetaEl.textContent = `${this.formatDateTime(data.fechaTimbrado)} | Estado: ${estado}`;
    }

    this.renderConceptos(Array.isArray(data.conceptos) ? data.conceptos : []);
  }

  updateEstadoUI(estado) {
    const normalized = String(estado || '').toUpperCase();
    const isCancelled = normalized === 'CANCELADA';

    if (this.estadoBadgeEl) {
      this.estadoBadgeEl.textContent = normalized || '—';
    }
    if (this.chipTextEl) {
      this.chipTextEl.textContent = isCancelled
        ? 'Factura Cancelada'
        : 'Factura Timbrada con Éxito';
    }
    if (this.cancelarFacturaBtn) {
      this.cancelarFacturaBtn.disabled = isCancelled || normalized !== 'TIMBRADA';
    }
    if (this.stampMetaEl && this.currentInvoiceData) {
      this.stampMetaEl.textContent = `${this.formatDateTime(this.currentInvoiceData.fechaTimbrado)} | Estado: ${normalized}`;
    }
  }

  renderConceptos(conceptos) {
    if (!this.tableBody) return;

    const fragment = document.createDocumentFragment();

    if (conceptos.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'summary-note';
      td.textContent = 'Sin conceptos registrados.';
      tr.appendChild(td);
      fragment.appendChild(tr);
      this.tableBody.replaceChildren(fragment);
      return;
    }

    conceptos.forEach((c) => {
      const tr = document.createElement('tr');
      tr.className = 'emitted-table-row';

      const tdDesc = document.createElement('td');
      const skuSpan = document.createElement('span');
      skuSpan.className = 'font-mono font-semibold';
      skuSpan.textContent = c.sku || '—';
      tdDesc.appendChild(skuSpan);
      if (c.descripcion) {
        const descText = document.createElement('div');
        descText.className = 'cfdi-doc-subtitle';
        descText.textContent = c.descripcion;
        tdDesc.appendChild(descText);
      }

      const tdClaves = document.createElement('td');
      tdClaves.className = 'font-mono';
      const prodSat = c.claveSatProducto || '—';
      const uniSat = c.claveSatUnidad || '—';
      tdClaves.textContent = `${prodSat} / ${uniSat}`;

      const tdQty = document.createElement('td');
      tdQty.className = 'font-mono';
      tdQty.textContent = String(c.cantidad ?? 0);

      const tdPrice = document.createElement('td');
      tdPrice.className = 'font-mono text-right';
      tdPrice.textContent = formatMoney(c.precioUnitario ?? 0);

      const tdIva = document.createElement('td');
      tdIva.className = 'font-mono text-right';
      tdIva.textContent = formatMoney(c.iva ?? 0);

      const tdTotal = document.createElement('td');
      tdTotal.className = 'font-mono text-right';
      tdTotal.textContent = formatMoney(c.importe ?? 0);

      tr.appendChild(tdDesc);
      tr.appendChild(tdClaves);
      tr.appendChild(tdQty);
      tr.appendChild(tdPrice);
      tr.appendChild(tdIva);
      tr.appendChild(tdTotal);
      fragment.appendChild(tr);
    });

    this.tableBody.replaceChildren(fragment);
  }

  async handleExport(formato) {
    if (!this.currentInvoiceData?.id) return;

    const btn = formato === 'pdf' ? this.downloadPdfBtn : this.downloadXmlBtn;
    const labelSpan = btn?.querySelector('span');
    const originalLabel = labelSpan ? labelSpan.textContent : '';

    this.alertManager?.clear();
    if (btn) btn.disabled = true;
    if (labelSpan) labelSpan.textContent = `Generando ${formato.toUpperCase()}...`;

    try {
      const response = await exportarFactura(this.currentInvoiceData.id, formato);
      if (!response?.url) {
        throw new ApiError('El servidor no devolvió una URL de descarga válida.', 500);
      }
      window.open(response.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : `No fue posible descargar el archivo ${formato.toUpperCase()}.`;
      this.alertManager?.showError(msg);
    } finally {
      if (btn) btn.disabled = false;
      if (labelSpan) labelSpan.textContent = originalLabel;
    }
  }

  openCancelModal() {
    if (!this.currentInvoiceData?.id) return;
    if (String(this.currentInvoiceData.estado).toUpperCase() === 'CANCELADA') return;

    this.modalAlertManager?.clear();
    if (this.cancelMotivoInput) {
      this.cancelMotivoInput.value = '';
      this.cancelMotivoInput.removeAttribute('aria-invalid');
    }
    if (this.cancelMotivoError) {
      this.cancelMotivoError.textContent = '';
      this.cancelMotivoError.classList.remove('is-visible');
    }

    if (this.cancelModal && typeof this.cancelModal.showModal === 'function') {
      this.cancelModal.showModal();
      this.cancelMotivoInput?.focus();
    } else {
      const motivo = window.prompt('Motivo de cancelación (mínimo 5 caracteres):', '');
      if (motivo !== null) {
        if (this.cancelMotivoInput) this.cancelMotivoInput.value = motivo;
        this.handleConfirmCancel();
      }
    }
  }

  closeCancelModal() {
    if (this.cancelModal?.open) {
      this.cancelModal.close();
    }
  }

  validateMotivo() {
    const motivo = (this.cancelMotivoInput?.value || '').trim();
    if (motivo.length < 5 || motivo.length > 300) {
      if (this.cancelMotivoInput) this.cancelMotivoInput.setAttribute('aria-invalid', 'true');
      if (this.cancelMotivoError) {
        this.cancelMotivoError.textContent =
          'El motivo de cancelación debe tener entre 5 y 300 caracteres.';
        this.cancelMotivoError.classList.add('is-visible');
      }
      return false;
    }

    if (this.cancelMotivoInput) this.cancelMotivoInput.removeAttribute('aria-invalid');
    if (this.cancelMotivoError) {
      this.cancelMotivoError.textContent = '';
      this.cancelMotivoError.classList.remove('is-visible');
    }
    return true;
  }

  async handleConfirmCancel() {
    if (this.isCancelling || !this.currentInvoiceData?.id) return;

    this.modalAlertManager?.clear();
    if (!this.validateMotivo()) {
      this.cancelMotivoInput?.focus();
      return;
    }

    const motivo = this.cancelMotivoInput.value.trim();
    const confirmSpan = this.confirmCancelInvoiceBtn?.querySelector('span');

    this.isCancelling = true;
    if (this.confirmCancelInvoiceBtn) this.confirmCancelInvoiceBtn.disabled = true;
    if (this.cancelModalCloseBtn) this.cancelModalCloseBtn.disabled = true;
    if (confirmSpan) confirmSpan.textContent = 'Cancelando...';

    try {
      const result = await cancelarFactura(this.currentInvoiceData.id, motivo);
      const nextEstado = result?.estado || 'CANCELADA';
      this.currentInvoiceData.estado = nextEstado;
      this.updateEstadoUI(nextEstado);
      this.closeCancelModal();
      this.alertManager?.showSuccess(
        `Factura ${this.folioEl?.textContent || this.currentInvoiceData.id} cancelada correctamente.`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No fue posible cancelar la factura en el servidor.';
      this.modalAlertManager?.showError(msg);
    } finally {
      this.isCancelling = false;
      if (this.confirmCancelInvoiceBtn) this.confirmCancelInvoiceBtn.disabled = false;
      if (this.cancelModalCloseBtn) this.cancelModalCloseBtn.disabled = false;
      if (confirmSpan) confirmSpan.textContent = 'Confirmar cancelación';
    }
  }
}
