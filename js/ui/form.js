/**
 * Controlador de Formulario: Datos de la Factura
 * Maneja fecha, RFC emisor, RFC receptor, dirección y comentarios.
 * Validación local conforme a especificaciones del SAT.
 */

import { facturaStore } from '../state/factura-store.js';
import { validateRFC } from '../utils/validators.js';

export class InvoiceFormController {
  constructor() {
    this.fechaInput = document.getElementById('fechaFactura');
    this.rfcEmisorInput = document.getElementById('rfcEmisor');
    this.rfcReceptorInput = document.getElementById('rfcReceptor');
    this.direccionInput = document.getElementById('direccion');
    this.comentariosInput = document.getElementById('comentarios');

    this.fechaError = document.getElementById('fechaError');
    this.rfcEmisorError = document.getElementById('rfcEmisorError');
    this.rfcReceptorError = document.getElementById('rfcReceptorError');
    this.direccionError = document.getElementById('direccionError');
  }

  init() {
    if (!this.fechaInput) return;

    this.bindEvents();
    this.populateInitialValues();
  }

  populateInitialValues() {
    const state = facturaStore.getState();
    if (this.fechaInput) this.fechaInput.value = state.fecha;
    if (this.rfcEmisorInput) this.rfcEmisorInput.value = state.rfcEmisor;
    if (this.rfcReceptorInput) this.rfcReceptorInput.value = state.rfcReceptor;
    if (this.direccionInput) this.direccionInput.value = state.direccion;
    if (this.comentariosInput) this.comentariosInput.value = state.comentarios;
  }

  bindEvents() {
    // Sincronización con el store
    this.fechaInput.addEventListener('change', (e) => {
      facturaStore.setField('fecha', e.target.value);
      this.validateFecha();
    });

    this.rfcEmisorInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
      facturaStore.setField('rfcEmisor', e.target.value);
    });
    this.rfcEmisorInput.addEventListener('blur', () => this.validateRfcEmisor());

    this.rfcReceptorInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
      facturaStore.setField('rfcReceptor', e.target.value);
    });
    this.rfcReceptorInput.addEventListener('blur', () => this.validateRfcReceptor());

    this.direccionInput.addEventListener('input', (e) => {
      facturaStore.setField('direccion', e.target.value);
    });
    this.direccionInput.addEventListener('blur', () => this.validateDireccion());

    this.comentariosInput.addEventListener('input', (e) => {
      facturaStore.setField('comentarios', e.target.value);
    });
  }

  validateFecha() {
    const val = this.fechaInput.value.trim();
    if (!val) {
      this.showError(this.fechaInput, this.fechaError, 'La fecha de factura es obligatoria.');
      return false;
    }
    this.clearError(this.fechaInput, this.fechaError);
    return true;
  }

  validateRfcEmisor() {
    const result = validateRFC(this.rfcEmisorInput.value);
    if (!result.isValid) {
      this.showError(this.rfcEmisorInput, this.rfcEmisorError, result.message);
      return false;
    }
    this.clearError(this.rfcEmisorInput, this.rfcEmisorError);
    return true;
  }

  validateRfcReceptor() {
    const result = validateRFC(this.rfcReceptorInput.value);
    if (!result.isValid) {
      this.showError(this.rfcReceptorInput, this.rfcReceptorError, result.message);
      return false;
    }
    this.clearError(this.rfcReceptorInput, this.rfcReceptorError);
    return true;
  }

  validateDireccion() {
    const val = this.direccionInput.value.trim();
    if (!val) {
      this.showError(this.direccionInput, this.direccionError, 'La dirección es obligatoria.');
      return false;
    }
    this.clearError(this.direccionInput, this.direccionError);
    return true;
  }

  /**
   * Valida todos los campos de encabezado
   * @returns {boolean}
   */
  validateAll() {
    const v1 = this.validateFecha();
    const v2 = this.validateRfcEmisor();
    const v3 = this.validateRfcReceptor();
    const v4 = this.validateDireccion();
    return v1 && v2 && v3 && v4;
  }

  showError(inputEl, errorEl, message) {
    inputEl.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  }

  clearError(inputEl, errorEl) {
    inputEl.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
    }
  }

  /**
   * Restablece el formulario a su estado inicial y limpia errores visuales
   */
  resetForm() {
    facturaStore.reset();
    this.populateInitialValues();
    if (this.fechaInput) this.clearError(this.fechaInput, this.fechaError);
    if (this.rfcEmisorInput) this.clearError(this.rfcEmisorInput, this.rfcEmisorError);
    if (this.rfcReceptorInput) this.clearError(this.rfcReceptorInput, this.rfcReceptorError);
    if (this.direccionInput) this.clearError(this.direccionInput, this.direccionError);
    if (this.fechaInput) {
      this.fechaInput.focus();
    }
  }
}
