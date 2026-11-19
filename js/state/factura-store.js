/**
 * Estado Único del Formulario de Facturación
 * Patrón Store reactivo con notificación a suscriptores.
 * El precioUnitario proviene del servicio seleccionado (readonly) y los totales oficiales los calcula el servidor.
 */

import { roundToTwo } from '../utils/money.js';

function createEmptyRow(index = 1) {
  return {
    id: `row-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    sku: '',
    servicioId: null,
    nombreServicio: '',
    cantidad: 1,
    precioUnitario: 0,
    importe: 0,
    skuError: null
  };
}

class FacturaStore {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  /**
   * Restablece el estado con valores iniciales limpios (sin datos mock ni servicioId cruzado)
   */
  reset() {
    const today = new Date().toISOString().split('T')[0];

    this.state = {
      // Datos fiscales requeridos por Oracle / CrearFacturaRequestDTO
      fecha: today,
      rfcEmisor: '',
      rfcReceptor: '',
      razonSocial: '',
      codigoPostal: '',
      emailReceptor: '',
      regimenFiscal: '',
      usoCfdi: '',
      formaPago: '03',
      metodoPago: 'PUE',
      direccion: '',
      comentarios: '',

      // Lista de productos (mínimo 1 renglón limpio)
      productos: [createEmptyRow(1)],

      // Cálculo local preliminar
      subtotalLocal: 0,

      // Totales autorizados por el backend (servidor es la autoridad de cálculo)
      serverCalc: {
        subtotal: 0,
        impuestos: null,
        total: null
      },

      // Banderas de validación y envío
      isValidated: false,
      isValidating: false,
      isSubmitting: false,
      globalError: null,
      skuErrorsList: []
    };

    this.recalculateLocalSubtotal();
    this.notify();
  }

  /**
   * Obtiene una copia del estado actual
   */
  getState() {
    return {
      ...this.state,
      productos: this.state.productos.map((p) => ({ ...p })),
      serverCalc: { ...this.state.serverCalc }
    };
  }

  /**
   * Suscribe un listener a cambios de estado
   * @param {Function} listener
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /**
   * Notifica a todos los suscriptores
   */
  notify() {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.error('Error en listener de FacturaStore:', err);
      }
    });
  }

  /**
   * Actualiza un campo del encabezado de la factura
   */
  setField(fieldName, value) {
    this.state[fieldName] = value;
    this.notify();
  }

  /**
   * Agrega un nuevo renglón limpio a la lista
   */
  addProduct() {
    this.state.productos.push(createEmptyRow(this.state.productos.length + 1));
    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
  }

  /**
   * Agrega un renglón desde el buscador del catálogo o completa el primer renglón vacío
   * @param {object} service
   */
  addProductWithService(service) {
    if (!service) return;

    const firstRow = this.state.productos[0];
    if (this.state.productos.length === 1 && firstRow && !firstRow.sku) {
      this.setProductService(firstRow.id, service);
      return;
    }

    const row = createEmptyRow(this.state.productos.length + 1);
    const idService = String(service.sku || service.id || '').trim().toUpperCase();
    const precio = Math.max(
      0,
      parseFloat(service.precioUnitario ?? service.precio_unitario ?? 0) || 0
    );

    row.sku = idService;
    row.servicioId = idService;
    row.nombreServicio = service.nombre || '';
    row.precioUnitario = precio;
    row.importe = roundToTwo(row.cantidad * precio);

    this.state.productos.push(row);
    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
  }

  /**
   * Quita un renglón de producto (mínimo 1 renglón requerido)
   */
  removeProduct(rowId) {
    if (this.state.productos.length <= 1) {
      return false;
    }

    this.state.productos = this.state.productos.filter((p) => p.id !== rowId);
    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
    return true;
  }

  /**
   * Asigna un servicio del catálogo de DynamoDB a un renglón
   * @param {string} rowId
   * @param {object | null} service
   */
  setProductService(rowId, service) {
    const item = this.state.productos.find((p) => p.id === rowId);
    if (!item) return;

    if (!service) {
      item.sku = '';
      item.servicioId = null;
      item.nombreServicio = '';
      item.precioUnitario = 0;
      item.importe = 0;
      item.skuError = null;
    } else {
      const idService = String(service.sku || service.id || '').trim().toUpperCase();
      const precio = Math.max(
        0,
        parseFloat(service.precioUnitario ?? service.precio_unitario ?? 0) || 0
      );
      item.sku = idService;
      item.servicioId = idService;
      item.nombreServicio = service.nombre || '';
      item.precioUnitario = precio;
      item.importe = roundToTwo(item.cantidad * precio);
      item.skuError = null;
    }

    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
  }

  /**
   * Actualiza la cantidad (u otro campo permitido) de un renglón de producto
   */
  updateProduct(rowId, field, value) {
    const item = this.state.productos.find((p) => p.id === rowId);
    if (!item) return;

    if (field === 'cantidad') {
      const parsed = parseInt(value, 10);
      item.cantidad = Math.min(9999, Math.max(1, Number.isNaN(parsed) ? 1 : parsed));
    }

    item.importe = roundToTwo(item.cantidad * item.precioUnitario);

    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
  }

  /**
   * Recalcula el subtotal local a partir de la suma de los importes
   */
  recalculateLocalSubtotal() {
    const total = this.state.productos.reduce((sum, item) => sum + item.importe, 0);
    this.state.subtotalLocal = roundToTwo(total);
  }

  /**
   * Invalida los totales del servidor y deshabilita Emitir cuando cambian los productos
   */
  invalidateServerCalculation() {
    this.state.isValidated = false;
    this.state.serverCalc = {
      subtotal: this.state.subtotalLocal,
      impuestos: null,
      total: null
    };
  }

  /**
   * Establece los totales calculados por la autoridad del servidor y habilita Emitir
   */
  setServerCalculation({ subtotal, impuestos, total, itemsValidados }) {
    if (Array.isArray(itemsValidados)) {
      itemsValidados.forEach((validItem) => {
        const idx = Number(validItem.renglon) - 1;
        const row = this.state.productos[idx];
        if (row && validItem.precioUnitario !== undefined) {
          row.precioUnitario = Math.max(0, parseFloat(validItem.precioUnitario) || 0);
          row.importe = roundToTwo(validItem.importe ?? row.cantidad * row.precioUnitario);
          if (validItem.nombre) {
            row.nombreServicio = validItem.nombre;
          }
          row.skuError = null;
        }
      });
      this.recalculateLocalSubtotal();
    }

    this.state.serverCalc = {
      subtotal: roundToTwo(subtotal),
      impuestos: roundToTwo(impuestos),
      total: roundToTwo(total)
    };
    this.state.isValidated = true;
    this.notify();
  }

  /**
   * Registra errores de SKU devueltos por el backend (HTTP 422, renglon base 1)
   */
  setSkuErrors(errores) {
    this.state.isValidated = false;
    this.state.skuErrorsList = Array.isArray(errores) ? errores : [];

    this.state.productos.forEach((p) => {
      p.skuError = null;
    });

    this.state.skuErrorsList.forEach((err) => {
      const index = Number(err.renglon) - 1;
      if (this.state.productos[index]) {
        this.state.productos[index].skuError = err.mensaje || 'SKU sin servicio válido.';
      }
    });

    this.notify();
  }

  /**
   * Limpia los errores de SKU
   */
  clearSkuErrors() {
    this.state.skuErrorsList = [];
    this.state.productos.forEach((p) => {
      p.skuError = null;
    });
    this.notify();
  }

  /**
   * Establece el estado de validación contra el backend
   */
  setValidating(isValidating) {
    this.state.isValidating = Boolean(isValidating);
    this.notify();
  }

  /**
   * Establece el estado de envío (botón Emitiendo...)
   */
  setSubmitting(isSubmitting) {
    this.state.isSubmitting = Boolean(isSubmitting);
    this.notify();
  }
}

export const facturaStore = new FacturaStore();
