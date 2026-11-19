/**
 * Controlador del Resumen Lateral, Catálogos SAT y Flujo Validar -> Emitir
 * Carga GET /catalogos/sat al iniciar, valida productos en POST /facturas/validar
 * enviando únicamente { sku, cantidad } por renglón, pinta totales oficiales y habilita Emitir.
 */

import { facturaStore } from '../state/factura-store.js';
import { formatMoney } from '../utils/money.js';
import { getCatalogosSat } from '../api/servicios.js';
import { validarProductos, crearFactura, emitirFactura } from '../api/facturas.js';
import { ApiError } from '../api/client.js';
import { session } from '../auth/session.js';

export class SummaryController {
  constructor(alertManager, formController, itemsController, onInvoiceEmitted) {
    this.alertManager = alertManager;
    this.formController = formController;
    this.itemsController = itemsController;
    this.onInvoiceEmitted = onInvoiceEmitted;

    this.subtotalEl = document.getElementById('summarySubtotal');
    this.ivaEl = document.getElementById('summaryIva');
    this.totalEl = document.getElementById('summaryTotal');
    this.validarBtn = document.getElementById('validarFacturaBtn');
    this.emitirBtn = document.getElementById('emitirFacturaBtn');
  }

  init() {
    if (!this.emitirBtn) return;

    this.bindEvents();

    facturaStore.subscribe((state) => {
      this.updateDisplay(state);
    });

    if (session.isAuthenticated()) {
      this.loadCatalogosSat();
    }
  }

  bindEvents() {
    if (this.validarBtn) {
      this.validarBtn.addEventListener('click', () => this.handleValidar());
    }
    this.emitirBtn.addEventListener('click', () => this.handleEmitir());
  }

  async loadCatalogosSat() {
    if (!session.isAuthenticated()) return;
    try {
      const catalogos = await getCatalogosSat();
      this.formController?.populateSatCatalogs(catalogos);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No fue posible cargar los catálogos fiscales del SAT.';
      this.alertManager.showError(msg);
    }
  }

  updateDisplay(state) {
    if (!this.subtotalEl || !this.ivaEl || !this.totalEl) return;

    if (state.isValidated && state.serverCalc && state.serverCalc.impuestos !== null) {
      this.subtotalEl.textContent = formatMoney(state.serverCalc.subtotal);
      this.ivaEl.textContent = formatMoney(state.serverCalc.impuestos);
      this.totalEl.textContent = formatMoney(state.serverCalc.total);
    } else {
      this.subtotalEl.textContent = formatMoney(state.subtotalLocal);
      this.ivaEl.textContent = '—';
      this.totalEl.textContent = '—';
    }

    if (this.validarBtn) {
      this.validarBtn.disabled = state.isValidating || state.isSubmitting;
      this.validarBtn.setAttribute('aria-busy', state.isValidating ? 'true' : 'false');
      const labelSpan = this.validarBtn.querySelector('span');
      if (labelSpan) {
        labelSpan.textContent = state.isValidating ? 'Validando...' : 'Validar productos';
      }
    }

    const canEmit = state.isValidated && !state.isValidating && !state.isSubmitting;
    this.emitirBtn.disabled = !canEmit;
    this.emitirBtn.setAttribute('aria-busy', state.isSubmitting ? 'true' : 'false');
    const emitirSpan = this.emitirBtn.querySelector('span');
    if (emitirSpan) {
      emitirSpan.textContent = state.isSubmitting ? 'Emitiendo...' : 'Emitir factura';
    } else {
      this.emitirBtn.textContent = state.isSubmitting ? 'Emitiendo...' : 'Emitir factura';
    }
  }

  buildProductosPayload(productos) {
    return (productos || []).map((p) => ({
      sku: String(p.sku || '').trim().toUpperCase(),
      cantidad: Number(p.cantidad)
    }));
  }

  async handleValidar() {
    const state = facturaStore.getState();
    if (state.isValidating || state.isSubmitting) return;

    this.alertManager.clear();
    facturaStore.clearSkuErrors();

    if (!this.itemsController.validateAll()) {
      this.alertManager.showError('Selecciona un servicio válido y una cantidad mayor a 0 en todos los renglones.');
      return;
    }

    const payloadProductos = this.buildProductosPayload(state.productos);
    facturaStore.setValidating(true);

    try {
      const valResult = await validarProductos(payloadProductos);
      facturaStore.setServerCalculation(valResult);
      this.alertManager.showSuccess(
        'Productos validados con éxito. Totales calculados por el servidor.'
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && Array.isArray(err.details?.errores)) {
        facturaStore.setSkuErrors(err.details.errores);
        this.alertManager.showSkuError(err.details.errores);
        return;
      }

      const msg =
        err instanceof ApiError ? err.message : 'Error inesperado al validar los productos.';
      this.alertManager.showError(msg);
    } finally {
      facturaStore.setValidating(false);
    }
  }

  async handleEmitir() {
    const state = facturaStore.getState();
    if (state.isSubmitting || state.isValidating) return;

    this.alertManager.clear();

    if (!state.isValidated) {
      this.alertManager.showError('Valida primero los productos antes de emitir la factura.');
      return;
    }

    const isFormValid = this.formController.validateAll();
    const areItemsValid = this.itemsController.validateAll();

    if (!isFormValid || !areItemsValid) {
      this.alertManager.showError(
        'Por favor completa todos los campos fiscales obligatorios con el formato correcto.'
      );
      return;
    }

    const payloadProductos = this.buildProductosPayload(state.productos);
    const cleanComentarios = state.comentarios ? state.comentarios.trim() : '';

    const nuevaFacturaPayload = {
      rfcEmisor: state.rfcEmisor.trim().toUpperCase(),
      rfcReceptor: state.rfcReceptor.trim().toUpperCase(),
      razonSocial: state.razonSocial.trim(),
      codigoPostal: state.codigoPostal.trim(),
      emailReceptor: state.emailReceptor.trim(),
      regimenFiscal: state.regimenFiscal,
      usoCfdi: state.usoCfdi,
      formaPago: state.formaPago,
      metodoPago: state.metodoPago,
      direccion: state.direccion.trim(),
      ...(cleanComentarios ? { comentarios: cleanComentarios } : {}),
      productos: payloadProductos
    };

    facturaStore.setSubmitting(true);

    try {
      const creada = await crearFactura(nuevaFacturaPayload);
      const facturaEmitida = await emitirFactura(creada.id);

      if (typeof this.onInvoiceEmitted === 'function') {
        this.onInvoiceEmitted(facturaEmitida, facturaStore.getState());
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && Array.isArray(err.details?.errores)) {
        facturaStore.setSkuErrors(err.details.errores);
        this.alertManager.showSkuError(err.details.errores);
        return;
      }

      const msg =
        err instanceof ApiError ? err.message : 'Error inesperado al emitir la factura.';
      this.alertManager.showError(msg);
    } finally {
      facturaStore.setSubmitting(false);
    }
  }
}
