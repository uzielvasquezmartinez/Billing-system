/**
 * Estado Único del Formulario de Facturación
 * Patrón Store reactivo con notificación a suscriptores.
 * El importe de cada renglón se calcula automáticamente (no se captura).
 */

import { roundToTwo } from '../utils/money.js';
import { CONFIG } from '../config.js';

class FacturaStore {
  constructor() {
    this.listeners = new Set();
    this.reset();
  }

  /**
   * Restablece el estado con valores iniciales
   */
  reset() {
    // Formato de fecha de hoy (YYYY-MM-DD para input date)
    const today = new Date().toISOString().split('T')[0];

    this.state = {
      // Datos de la factura
      fecha: today,
      rfcEmisor: 'EMI010203AB1',
      rfcReceptor: 'REC040506CD2',
      direccion: 'Av. Universidad 100, Col. Centro, Cuernavaca, Morelos',
      comentarios: 'Pago a 30 días.',

      // Lista de productos con banderas fiscales (mínimo 1 renglón)
      productos: [
        {
          id: 'row-1',
          sku: 'SRV-HOST-001',
          servicioId: 'srv-1',
          cantidad: 2,
          precioUnitario: 1200.00,
          importe: 2400.00,
          aplicaIVA: true,
          tasaIVA: CONFIG.IVA_DEFAULT,
          descuentoMaximo: 0,
          skuError: null
        },
        {
          id: 'row-2',
          sku: 'SRV-SOP-014',
          servicioId: 'srv-4',
          cantidad: 1,
          precioUnitario: 850.00,
          importe: 850.00,
          aplicaIVA: true,
          tasaIVA: CONFIG.IVA_DEFAULT,
          descuentoMaximo: 0,
          skuError: null
        },
        {
          id: 'row-3',
          sku: 'SRV-DOM-003',
          servicioId: 'srv-3',
          cantidad: 3,
          precioUnitario: 300.00,
          importe: 900.00,
          aplicaIVA: true,
          tasaIVA: CONFIG.IVA_DEFAULT,
          descuentoMaximo: 0,
          skuError: null
        }
      ],

      // Cálculo local preliminar
      subtotalLocal: 4150.00,

      // Totales autorizados por el backend (servidor es la autoridad de cálculo)
      serverCalc: {
        subtotal: 4150.00,
        impuestos: 664.00, // IVA 16%
        total: 4814.00
      },

      // Estado de envío y errores globales
      isSubmitting: false,
      globalError: null,
      skuErrorsList: []
    };

    this.recalculateLocalSubtotal();
  }

  /**
   * Obtiene una copia inmutable del estado actual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Suscribe un listener a cambios de estado
   * @param {Function} listener
   * @returns {Function} Función para cancelar la suscripción
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Notificación inmediata al suscribirse
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
   * Agrega un nuevo renglón de producto a la lista
   */
  addProduct(initialData = {}) {
    const newId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cantidad = initialData.cantidad || 1;
    const precio = initialData.precioUnitario || 0;
    const importe = roundToTwo(cantidad * precio);

    this.state.productos.push({
      id: newId,
      sku: initialData.sku || '',
      servicioId: initialData.servicioId || null,
      cantidad,
      precioUnitario: precio,
      importe,
      aplicaIVA: initialData.aplicaIVA !== undefined ? initialData.aplicaIVA : true,
      tasaIVA: initialData.tasaIVA !== undefined ? initialData.tasaIVA : CONFIG.IVA_DEFAULT,
      descuentoMaximo: initialData.descuentoMaximo || 0,
      skuError: null
    });

    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
  }

  /**
   * Quita un renglón de producto (mínimo 1 renglón requerido)
   */
  removeProduct(rowId) {
    if (this.state.productos.length <= 1) {
      return false; // No se puede eliminar el último renglón
    }

    this.state.productos = this.state.productos.filter((p) => p.id !== rowId);
    this.recalculateLocalSubtotal();
    this.invalidateServerCalculation();
    this.notify();
    return true;
  }

  /**
   * Actualiza los valores de un renglón de producto
   */
  updateProduct(rowId, field, value) {
    const item = this.state.productos.find((p) => p.id === rowId);
    if (!item) return;

    if (field === 'cantidad') {
      item.cantidad = Math.max(1, parseInt(value, 10) || 1);
    } else if (field === 'precioUnitario') {
      item.precioUnitario = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'sku') {
      item.sku = String(value).trim().toUpperCase();
      item.skuError = null; // Limpiar error de SKU al editar
    }

    // El importe del renglón se calcula automáticamente, nunca se captura
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
   * Invalida los totales del servidor si el usuario modifica cantidades, precios o SKUs
   */
  invalidateServerCalculation() {
    this.state.serverCalc = {
      subtotal: this.state.subtotalLocal,
      impuestos: null, // Muestra "—" mientras no haya respuesta del servidor
      total: null
    };
  }

  /**
   * Establece los totales calculados por la autoridad del servidor
   */
  setServerCalculation({ subtotal, impuestos, total }) {
    this.state.serverCalc = {
      subtotal: roundToTwo(subtotal),
      impuestos: roundToTwo(impuestos),
      total: roundToTwo(total)
    };
    this.notify();
  }

  /**
   * Registra errores de SKU devueltos por el backend
   * Marca cada renglón afectado y prepara la lista global
   */
  setSkuErrors(errores) {
    this.state.skuErrorsList = errores;

    // Limpiar errores previos en renglones
    this.state.productos.forEach((p) => (p.skuError = null));

    // Asignar errores a los renglones correspondientes
    errores.forEach((err) => {
      const index = err.renglon - 1;
      if (this.state.productos[index]) {
        this.state.productos[index].skuError = err.mensaje;
      }
    });

    this.notify();
  }

  /**
   * Limpia los errores de SKU
   */
  clearSkuErrors() {
    this.state.skuErrorsList = [];
    this.state.productos.forEach((p) => (p.skuError = null));
    this.notify();
  }

  /**
   * Establece el estado de envío (botón Emitiendo...)
   */
  setSubmitting(isSubmitting) {
    this.state.isSubmitting = isSubmitting;
    this.notify();
  }
}

export const facturaStore = new FacturaStore();
