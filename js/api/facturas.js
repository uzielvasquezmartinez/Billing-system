/**
 * Servicios de API para Facturas
 * Cumple con el contrato exacto de la Sección 7 (API REST Flask + Oracle + DynamoDB).
 */

import { apiClient } from './client.js';

/**
 * Valida los productos contra DynamoDB ListServices en el backend
 * Envía ÚNICAMENTE { sku, cantidad } por renglón.
 * @param {Array<{sku: string, cantidad: number}>} productos
 * @returns {Promise<{subtotal: number, impuestos: number, total: number, itemsValidados?: Array}>}
 */
export async function validarProductos(productos) {
  return apiClient('/facturas/validar', {
    method: 'POST',
    body: JSON.stringify({ productos })
  });
}

/**
 * Registra una nueva factura en estado PENDIENTE
 * @param {object} datosFactura - CrearFacturaRequestDTO
 * @returns {Promise<{id: number, folio: number, serie: string, estado: string, subtotal: number, impuestos: number, total: number}>}
 */
export async function crearFactura(datosFactura) {
  return apiClient('/facturas', {
    method: 'POST',
    body: JSON.stringify(datosFactura)
  });
}

/**
 * Solicita el timbrado y emisión oficial de la factura
 * @param {string | number} id - Identificador de la factura creada
 * @returns {Promise<object>} FacturaDetalleResponseDTO
 */
export async function emitirFactura(id) {
  return apiClient(`/facturas/${encodeURIComponent(id)}/emitir`, {
    method: 'POST'
  });
}

/**
 * Cancela una factura timbrada con motivo auditable
 * @param {string | number} id - Identificador de la factura
 * @param {string} motivo - Motivo de cancelación (5..300 caracteres)
 * @returns {Promise<object>}
 */
export async function cancelarFactura(id, motivo) {
  return apiClient(`/facturas/${encodeURIComponent(id)}/cancelar`, {
    method: 'POST',
    body: JSON.stringify({ motivo })
  });
}

/**
 * Obtiene la URL prefirmada de Amazon S3 para descarga en formato PDF o XML
 * @param {string | number} id
 * @param {'pdf' | 'xml'} formato
 * @returns {Promise<{formato: string, url: string, expiraEnSegundos: number}>}
 */
export async function exportarFactura(id, formato = 'pdf') {
  return apiClient(`/facturas/${encodeURIComponent(id)}/exportar?formato=${encodeURIComponent(formato)}`, {
    method: 'GET'
  });
}
