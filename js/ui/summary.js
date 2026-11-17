/**
 * Controlador del Resumen Lateral y Emisión de Factura
 * Maneja subtotal, impuestos y total conforme al servidor (autoridad de cálculo).
 * Orquesta el flujo: validación local → validarProductos → crearFactura → emitirFactura.
 */

import { facturaStore } from '../state/factura-store.js';
import { formatMoney } from '../utils/money.js';
import { validarProductos, crearFactura, emitirFactura } from '../api/facturas.js';
import { ApiError } from '../api/client.js';

export class SummaryController {
  constructor(alertManager, formController, itemsController, onInvoiceEmitted) {
    this.alertManager = alertManager;
    this.formController = formController;
    this.itemsController = itemsController;
    this.onInvoiceEmitted = onInvoiceEmitted;

    this.subtotalEl = document.getElementById('summarySubtotal');
    this.ivaEl = document.getElementById('summaryIva');
    this.totalEl = document.getElementById('summaryTotal');
    this.emitirBtn = document.getElementById('emitirFacturaBtn');
  }

  init() {
    if (!this.emitirBtn) return;

    this.bindEvents();

    facturaStore.subscribe((state) => {
      this.updateDisplay(state);
    });
  }

  bindEvents() {
    this.emitirBtn.addEventListener('click', () => this.handleEmitir());
  }

  updateDisplay(state) {
    if (!this.subtotalEl || !this.ivaEl || !this.totalEl) return;

    // Subtotal local mientras se captura
    this.subtotalEl.textContent = formatMoney(state.subtotalLocal);

    // El servidor es la autoridad de cálculo: Si no hay respuesta del servidor, muestra "—"
    if (state.serverCalc && state.serverCalc.impuestos !== null) {
      this.ivaEl.textContent = formatMoney(state.serverCalc.impuestos);
      this.totalEl.textContent = formatMoney(state.serverCalc.total);
    } else {
      this.ivaEl.textContent = '—';
      this.totalEl.textContent = '—';
    }

    // Estado del botón "Emitiendo..."
    if (state.isSubmitting) {
      this.emitirBtn.disabled = true;
      this.emitirBtn.textContent = 'Emitiendo…';
      this.emitirBtn.setAttribute('aria-busy', 'true');
    } else {
      this.emitirBtn.disabled = false;
      this.emitirBtn.textContent = 'Emitir factura';
      this.emitirBtn.setAttribute('aria-busy', 'false');
    }
  }

  async handleEmitir() {
    const state = facturaStore.getState();
    if (state.isSubmitting) return;

    // 1. Limpieza de alertas previas
    this.alertManager.clear();
    facturaStore.clearSkuErrors();

    // 2. Validación local de usabilidad (sin confiar en el cliente)
    const isFormValid = this.formController.validateAll();
    const areItemsValid = this.itemsController.validateAll();

    if (!isFormValid || !areItemsValid) {
      this.alertManager.showError('Por favor completa todos los campos obligatorios con el formato correcto.');
      return;
    }

    facturaStore.setSubmitting(true);

    try {
      // 3. Paso A: validarProductos() en el backend
      const payloadProductos = state.productos.map((p) => ({
        sku: p.sku.trim().toUpperCase(),
        cantidad: p.cantidad,
        precioUnitario: p.precioUnitario
      }));

      let valResult;
      try {
        valResult = await validarProductos(payloadProductos);
        // Actualizar totales autorizados por el servidor
        facturaStore.setServerCalculation(valResult);
      } catch (err) {
        // Regla de negocio: Si algún SKU no tiene servicio asociado (422)
        if (err instanceof ApiError && err.status === 422 && err.details?.errores) {
          facturaStore.setSkuErrors(err.details.errores);
          this.alertManager.showSkuError(err.details.errores);
          return;
        }
        throw err;
      }

      // 4. Paso B: crearFactura()
      const nuevaFacturaPayload = {
        fecha: state.fecha,
        rfcEmisor: state.rfcEmisor,
        rfcReceptor: state.rfcReceptor,
        direccion: state.direccion,
        comentarios: state.comentarios,
        productos: payloadProductos
      };

      const { id } = await crearFactura(nuevaFacturaPayload);

      // 5. Paso C: emitirFactura()
      const facturaEmitida = await emitirFactura(id);

      // 6. Notificar emisión exitosa y cambiar de vista a Factura Emitida
      if (typeof this.onInvoiceEmitted === 'function') {
        this.onInvoiceEmitted(facturaEmitida, state);
      }

    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Error inesperado al emitir la factura.';
      this.alertManager.showError(msg);
    } finally {
      facturaStore.setSubmitting(false);
    }
  }
}
