/**
 * Servicios de API para Facturas
 * Cumple con el contrato con el backend de AWS (API Gateway + Lambda).
 * Si la especificación del servidor cambia, únicamente se modifica este archivo.
 */

import { apiClient } from './client.js';

/**
 * Valida los productos contra el catálogo de servicios en el backend
 * @param {Array<{sku: string, cantidad: number, precioUnitario: number}>} productos
 * @returns {Promise<{subtotal: number, impuestos: number, total: number}>}
 */
export async function validarProductos(productos) {
  return apiClient('/facturas/validar', {
    method: 'POST',
    body: JSON.stringify({ productos })
  });
}

/**
 * Registra una nueva factura en estado preliminar / borrador
 * @param {object} datosFactura
 * @param {string} datosFactura.fecha
 * @param {string} datosFactura.rfcEmisor
 * @param {string} datosFactura.rfcReceptor
 * @param {string} datosFactura.direccion
 * @param {string} [datosFactura.comentarios]
 * @param {Array} datosFactura.productos
 * @returns {Promise<{id: string}>}
 */
export async function crearFactura(datosFactura) {
  return apiClient('/facturas', {
    method: 'POST',
    body: JSON.stringify(datosFactura)
  });
}

/**
 * Solicita el timbrado y emisión oficial de la factura
 * @param {string} id - Identificador de la factura creada
 * @returns {Promise<{id: string, folio: string, uuid: string, fecha: string, estado: string}>}
 */
export async function emitirFactura(id) {
  return apiClient(`/facturas/${id}/emitir`, {
    method: 'POST'
  });
}

/**
 * Obtiene la URL prefirmada de Amazon S3 para descarga en formato PDF o XML
 * @param {string} id
 * @param {'pdf' | 'xml'} formato
 * @returns {Promise<{url: string}>}
 */
export async function exportarFactura(id, formato = 'pdf') {
  return apiClient(`/facturas/${id}/exportar?formato=${encodeURIComponent(formato)}`, {
    method: 'GET'
  });
}
