/**
 * Controlador de Formulario: Datos Fiscales de la Factura
 * Maneja todos los campos requeridos por Oracle / CrearFacturaRequestDTO
 * y puebla los 4 catálogos SAT desde GET /catalogos/sat.
 */

import { facturaStore } from '../state/factura-store.js';
import {
  validateRFC,
  validateRazonSocial,
  validateCodigoPostal,
  validateEmail,
  validateDireccion
} from '../utils/validators.js';

export class InvoiceFormController {
  constructor() {
    this.fechaInput = document.getElementById('fechaFactura');
    this.rfcEmisorInput = document.getElementById('rfcEmisor');
    this.rfcReceptorInput = document.getElementById('rfcReceptor');
    this.razonSocialInput = document.getElementById('razonSocial');
    this.codigoPostalInput = document.getElementById('codigoPostal');
    this.emailReceptorInput = document.getElementById('emailReceptor');
    this.regimenFiscalSelect = document.getElementById('regimenFiscal');
    this.usoCfdiSelect = document.getElementById('usoCfdi');
    this.formaPagoSelect = document.getElementById('formaPago');
    this.metodoPagoSelect = document.getElementById('metodoPago');
    this.direccionInput = document.getElementById('direccion');
    this.comentariosInput = document.getElementById('comentarios');

    this.fechaError = document.getElementById('fechaError');
    this.rfcEmisorError = document.getElementById('rfcEmisorError');
    this.rfcReceptorError = document.getElementById('rfcReceptorError');
    this.razonSocialError = document.getElementById('razonSocialError');
    this.codigoPostalError = document.getElementById('codigoPostalError');
    this.emailReceptorError = document.getElementById('emailReceptorError');
    this.regimenFiscalError = document.getElementById('regimenFiscalError');
    this.usoCfdiError = document.getElementById('usoCfdiError');
    this.formaPagoError = document.getElementById('formaPagoError');
    this.metodoPagoError = document.getElementById('metodoPagoError');
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
    if (this.razonSocialInput) this.razonSocialInput.value = state.razonSocial;
    if (this.codigoPostalInput) this.codigoPostalInput.value = state.codigoPostal;
    if (this.emailReceptorInput) this.emailReceptorInput.value = state.emailReceptor;
    if (this.regimenFiscalSelect) this.regimenFiscalSelect.value = state.regimenFiscal;
    if (this.usoCfdiSelect) this.usoCfdiSelect.value = state.usoCfdi;
    if (this.formaPagoSelect) this.formaPagoSelect.value = state.formaPago;
    if (this.metodoPagoSelect) this.metodoPagoSelect.value = state.metodoPago;
    if (this.direccionInput) this.direccionInput.value = state.direccion;
    if (this.comentariosInput) this.comentariosInput.value = state.comentarios;
  }

  /**
   * Puebla los 4 selects SAT con la respuesta de GET /catalogos/sat usando textContent
   * @param {object} catalogos
   */
  populateSatCatalogs(catalogos) {
    if (!catalogos || typeof catalogos !== 'object') return;

    const regimenes = catalogos.regimenesFiscales || catalogos.regimenes_fiscales || [];
    const usos = catalogos.usosCfdi || catalogos.usos_cfdi || [];
    const formas = catalogos.formasPago || catalogos.formas_pago || [];
    const metodos = catalogos.metodosPago || catalogos.metodos_pago || [];

    const state = facturaStore.getState();

    this.fillSelect(
      this.regimenFiscalSelect,
      regimenes,
      'Selecciona un régimen fiscal',
      state.regimenFiscal || ''
    );

    this.fillSelect(
      this.usoCfdiSelect,
      usos,
      'Selecciona un uso de CFDI',
      state.usoCfdi || ''
    );

    const defaultForma = this.hasClave(formas, state.formaPago || '03')
      ? state.formaPago || '03'
      : formas[0]?.clave || '';
    this.fillSelect(
      this.formaPagoSelect,
      formas,
      'Selecciona una forma de pago',
      defaultForma
    );
    if (defaultForma) {
      facturaStore.setField('formaPago', defaultForma);
    }

    const defaultMetodo = this.hasClave(metodos, state.metodoPago || 'PUE')
      ? state.metodoPago || 'PUE'
      : metodos[0]?.clave || '';
    this.fillSelect(
      this.metodoPagoSelect,
      metodos,
      'Selecciona un método de pago',
      defaultMetodo
    );
    if (defaultMetodo) {
      facturaStore.setField('metodoPago', defaultMetodo);
    }
  }

  hasClave(items, targetClave) {
    return Array.isArray(items) && items.some((item) => String(item.clave) === String(targetClave));
  }

  fillSelect(selectEl, items, placeholder, selectedValue) {
    if (!selectEl) return;

    const fragment = document.createDocumentFragment();

    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = placeholder;
    fragment.appendChild(defaultOpt);

    (Array.isArray(items) ? items : []).forEach((item) => {
      const clave = item.clave ?? item.id ?? '';
      const desc = item.descripcion ?? item.nombre ?? '';
      const opt = document.createElement('option');
      opt.value = String(clave);
      opt.textContent = desc ? `${clave} - ${desc}` : String(clave);
      fragment.appendChild(opt);
    });

    selectEl.replaceChildren(fragment);

    if (selectedValue && this.hasClave(items, selectedValue)) {
      selectEl.value = String(selectedValue);
    } else {
      selectEl.value = '';
    }
  }

  bindEvents() {
    this.rfcEmisorInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
      facturaStore.setField('rfcEmisor', e.target.value);
    });
    this.rfcEmisorInput?.addEventListener('blur', () => this.validateRfcEmisor());

    this.rfcReceptorInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
      facturaStore.setField('rfcReceptor', e.target.value);
    });
    this.rfcReceptorInput?.addEventListener('blur', () => this.validateRfcReceptor());

    this.razonSocialInput?.addEventListener('input', (e) => {
      facturaStore.setField('razonSocial', e.target.value);
    });
    this.razonSocialInput?.addEventListener('blur', () => this.validateRazonSocialField());

    this.codigoPostalInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5);
      facturaStore.setField('codigoPostal', e.target.value);
    });
    this.codigoPostalInput?.addEventListener('blur', () => this.validateCodigoPostalField());

    this.emailReceptorInput?.addEventListener('input', (e) => {
      facturaStore.setField('emailReceptor', e.target.value);
    });
    this.emailReceptorInput?.addEventListener('blur', () => this.validateEmailReceptorField());

    this.regimenFiscalSelect?.addEventListener('change', (e) => {
      facturaStore.setField('regimenFiscal', e.target.value);
      this.validateSelectField(
        this.regimenFiscalSelect,
        this.regimenFiscalError,
        'Selecciona un régimen fiscal.'
      );
    });

    this.usoCfdiSelect?.addEventListener('change', (e) => {
      facturaStore.setField('usoCfdi', e.target.value);
      this.validateSelectField(
        this.usoCfdiSelect,
        this.usoCfdiError,
        'Selecciona un uso de CFDI.'
      );
    });

    this.formaPagoSelect?.addEventListener('change', (e) => {
      facturaStore.setField('formaPago', e.target.value);
      this.validateSelectField(
        this.formaPagoSelect,
        this.formaPagoError,
        'Selecciona una forma de pago.'
      );
    });

    this.metodoPagoSelect?.addEventListener('change', (e) => {
      facturaStore.setField('metodoPago', e.target.value);
      this.validateSelectField(
        this.metodoPagoSelect,
        this.metodoPagoError,
        'Selecciona un método de pago.'
      );
    });

    this.direccionInput?.addEventListener('input', (e) => {
      facturaStore.setField('direccion', e.target.value);
    });
    this.direccionInput?.addEventListener('blur', () => this.validateDireccionField());

    this.comentariosInput?.addEventListener('input', (e) => {
      facturaStore.setField('comentarios', e.target.value);
    });
  }

  validateFecha() {
    const val = this.fechaInput?.value.trim() || '';
    if (!val) {
      this.showError(this.fechaInput, this.fechaError, 'La fecha de factura es obligatoria.');
      return false;
    }
    this.clearError(this.fechaInput, this.fechaError);
    return true;
  }

  validateRfcEmisor() {
    const result = validateRFC(this.rfcEmisorInput?.value);
    if (!result.isValid) {
      this.showError(this.rfcEmisorInput, this.rfcEmisorError, result.message);
      return false;
    }
    this.clearError(this.rfcEmisorInput, this.rfcEmisorError);
    return true;
  }

  validateRfcReceptor() {
    const result = validateRFC(this.rfcReceptorInput?.value);
    if (!result.isValid) {
      this.showError(this.rfcReceptorInput, this.rfcReceptorError, result.message);
      return false;
    }
    this.clearError(this.rfcReceptorInput, this.rfcReceptorError);
    return true;
  }

  validateRazonSocialField() {
    const result = validateRazonSocial(this.razonSocialInput?.value);
    if (!result.isValid) {
      this.showError(this.razonSocialInput, this.razonSocialError, result.message);
      return false;
    }
    this.clearError(this.razonSocialInput, this.razonSocialError);
    return true;
  }

  validateCodigoPostalField() {
    const result = validateCodigoPostal(this.codigoPostalInput?.value);
    if (!result.isValid) {
      this.showError(this.codigoPostalInput, this.codigoPostalError, result.message);
      return false;
    }
    this.clearError(this.codigoPostalInput, this.codigoPostalError);
    return true;
  }

  validateEmailReceptorField() {
    const result = validateEmail(this.emailReceptorInput?.value);
    if (!result.isValid) {
      this.showError(this.emailReceptorInput, this.emailReceptorError, result.message);
      return false;
    }
    this.clearError(this.emailReceptorInput, this.emailReceptorError);
    return true;
  }

  validateSelectField(selectEl, errorEl, message) {
    if (!selectEl || !selectEl.value.trim()) {
      this.showError(selectEl, errorEl, message);
      return false;
    }
    this.clearError(selectEl, errorEl);
    return true;
  }

  validateDireccionField() {
    const result = validateDireccion(this.direccionInput?.value);
    if (!result.isValid) {
      this.showError(this.direccionInput, this.direccionError, result.message);
      return false;
    }
    this.clearError(this.direccionInput, this.direccionError);
    return true;
  }

  /**
   * Valida todos los campos fiscales del encabezado
   * @returns {boolean}
   */
  validateAll() {
    const checks = [
      this.validateFecha(),
      this.validateRfcEmisor(),
      this.validateRfcReceptor(),
      this.validateRazonSocialField(),
      this.validateCodigoPostalField(),
      this.validateEmailReceptorField(),
      this.validateSelectField(
        this.regimenFiscalSelect,
        this.regimenFiscalError,
        'Selecciona un régimen fiscal.'
      ),
      this.validateSelectField(
        this.usoCfdiSelect,
        this.usoCfdiError,
        'Selecciona un uso de CFDI.'
      ),
      this.validateSelectField(
        this.formaPagoSelect,
        this.formaPagoError,
        'Selecciona una forma de pago.'
      ),
      this.validateSelectField(
        this.metodoPagoSelect,
        this.metodoPagoError,
        'Selecciona un método de pago.'
      ),
      this.validateDireccionField()
    ];

    return checks.every(Boolean);
  }

  showError(inputEl, errorEl, message) {
    if (inputEl) inputEl.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  }

  clearError(inputEl, errorEl) {
    if (inputEl) inputEl.removeAttribute('aria-invalid');
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

    this.clearError(this.fechaInput, this.fechaError);
    this.clearError(this.rfcEmisorInput, this.rfcEmisorError);
    this.clearError(this.rfcReceptorInput, this.rfcReceptorError);
    this.clearError(this.razonSocialInput, this.razonSocialError);
    this.clearError(this.codigoPostalInput, this.codigoPostalError);
    this.clearError(this.emailReceptorInput, this.emailReceptorError);
    this.clearError(this.regimenFiscalSelect, this.regimenFiscalError);
    this.clearError(this.usoCfdiSelect, this.usoCfdiError);
    this.clearError(this.formaPagoSelect, this.formaPagoError);
    this.clearError(this.metodoPagoSelect, this.metodoPagoError);
    this.clearError(this.direccionInput, this.direccionError);

    this.rfcEmisorInput?.focus();
  }
}
