/**
 * Servicios de API para el Catálogo de Servicios (DynamoDB ListServices)
 * y Catálogos Fiscales SAT (Oracle RDS).
 */

import { apiClient } from './client.js';

/**
 * Obtiene el listado paginado de servicios desde DynamoDB
 * @param {object} [params]
 * @param {string} [params.q='']
 * @param {number} [params.page=1]
 * @param {number} [params.limit=12]
 * @returns {Promise<object>}
 */
export async function getServicios({ q = '', page = 1, limit = 12 } = {}) {
  const query = new URLSearchParams({
    q: String(q || ''),
    page: String(page),
    limit: String(limit)
  });
  return apiClient(`/servicios?${query.toString()}`, {
    method: 'GET'
  });
}

/**
 * Obtiene el detalle completo de un servicio y sus 50 características agrupadas en 5 secciones
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getServicioById(id) {
  return apiClient(`/servicios/${encodeURIComponent(id)}`, {
    method: 'GET'
  });
}

/**
 * Obtiene los 4 catálogos SAT activos desde Oracle RDS (SP_LISTAR_CATALOGOS_SAT)
 * @returns {Promise<{formasPago: Array, metodosPago: Array, regimenesFiscales: Array, usosCfdi: Array}>}
 */
export async function getCatalogosSat() {
  return apiClient('/catalogos/sat', {
    method: 'GET'
  });
}
