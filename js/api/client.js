/**
 * Cliente HTTP y Wrapper de Fetch
 * Maneja URL base, cabecera Authorization Bearer, timeout con AbortController,
 * errores normalizados, sesión expirada (401) y simulación offline (MOCK_MODE).
 */

import { CONFIG } from '../config.js';
import { session } from '../auth/session.js';
import { roundToTwo } from '../utils/money.js';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Realiza una petición HTTP estandarizada
 * @param {string} endpoint - Ruta relativa al API_BASE_URL (ej. '/facturas/validar')
 * @param {object} [options={}] - Opciones de fetch
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  // Manejo de peticiones simuladas en desarrollo local
  if (CONFIG.MOCK_MODE) {
    return handleMockRequest(endpoint, options);
  }

  const url = `${CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const token = session.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Si el token expiró o es inválido, cerramos sesión
    if (response.status === 401) {
      session.logout(true);
      throw new ApiError('Tu sesión ha expirado o no estás autorizado. Por favor inicia sesión nuevamente.', 401);
    }

    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const message = responseData?.mensaje || responseData?.message || `Error del servidor (${response.status})`;
      throw new ApiError(message, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError('Tiempo de espera agotado al conectar con el servidor.', 408);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('No fue posible conectar con el servidor. Revisa tu conexión de red.', 0, error);
  }
}

/**
 * Base de datos simulada en memoria para persistencia durante la sesión
 */
const mockDatabase = {
  invoices: new Map(),
  lastFolioNumber: 123
};

/**
 * Simulación de respuestas para desarrollo y pruebas sin backend activo
 */
async function handleMockRequest(endpoint, options) {
  // Latencia de red simulada (300ms - 500ms)
  await new Promise((resolve) => setTimeout(resolve, 400));

  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : {};

  // 1. Autenticación / Login
  if (endpoint.includes('/auth/login') || endpoint.includes('/login')) {
    const { email, password } = body;
    if (!email || !password) {
      throw new ApiError('Credenciales incompletas.', 400);
    }
    if (password === 'fail1234') {
      throw new ApiError('Correo electrónico o contraseña incorrectos.', 401);
    }
    return {
      token: 'mock-jwt-token-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJkZXYiLCJyb2xlIjoiYWRtaW4ifQ',
      user: {
        id: 'usr_8923472',
        email: email,
        name: email.split('@')[0],
        role: 'ADMIN_ACADEMICO'
      }
    };
  }

  // 2. Validación de Productos: POST /facturas/validar
  if (endpoint.includes('/facturas/validar') && method === 'POST') {
    const productos = body.productos || [];
    const validCatalogSKUs = new Set(
      CONFIG.CATALOG_SERVICES.flatMap((s) => s.skus)
    );

    const errores = [];
    let subtotalCalculado = 0;

    productos.forEach((item, index) => {
      const cleanSku = (item.sku || '').trim().toUpperCase();
      const cantidad = parseInt(item.cantidad, 10) || 0;
      const precioUnitario = parseFloat(item.precioUnitario) || 0;

      // Verificar si el SKU existe en el catálogo de servicios
      if (!validCatalogSKUs.has(cleanSku)) {
        errores.push({
          renglon: index + 1,
          sku: cleanSku,
          mensaje: 'Este SKU no tiene un servicio asociado.'
        });
      }

      subtotalCalculado += cantidad * precioUnitario;
    });

    // Regla de negocio: Si al menos un SKU no tiene servicio asociado, se rechaza la factura completa
    if (errores.length > 0) {
      throw new ApiError('Errores de validación en la lista de productos.', 422, { errores });
    }

    const subtotal = roundToTwo(subtotalCalculado);
    const impuestos = roundToTwo(subtotal * 0.16); // IVA 16% calculado por el servidor
    const total = roundToTwo(subtotal + impuestos);

    return {
      subtotal,
      impuestos,
      total
    };
  }

  // 3. Crear Factura: POST /facturas
  if (endpoint === '/facturas' && method === 'POST') {
    const id = `FAC-${Date.now()}`;
    mockDatabase.invoices.set(id, {
      id,
      ...body,
      creadaEn: new Date().toISOString(),
      estado: 'BORRADOR'
    });
    return { id };
  }

  // 4. Emitir Factura: POST /facturas/{id}/emitir
  const emitirMatch = endpoint.match(/\/facturas\/([^/]+)\/emitir/);
  if (emitirMatch && method === 'POST') {
    const id = emitirMatch[1];
    const invoice = mockDatabase.invoices.get(id) || { id, ...body };
    mockDatabase.lastFolioNumber += 1;

    const folio = `A-${String(mockDatabase.lastFolioNumber).padStart(6, '0')}`;
    const uuid = '3f2b9c1e-7a4d-4e8b-9c21-5d6f0a1b7e34'; // Conforme al diseño
    const fecha = invoice.fecha || new Date().toISOString().split('T')[0];

    const emitida = {
      id,
      folio,
      uuid,
      fecha,
      estado: 'TIMBRADA',
      detalles: invoice
    };

    mockDatabase.invoices.set(id, emitida);
    return emitida;
  }

  // 5. Exportar Factura: GET /facturas/{id}/exportar?formato=pdf|xml
  const exportarMatch = endpoint.match(/\/facturas\/([^/]+)\/exportar/);
  if (exportarMatch && method === 'GET') {
    const formato = new URLSearchParams(endpoint.split('?')[1] || '').get('formato') || 'pdf';
    return {
      url: `https://facturacion-academica-s3.s3.amazonaws.com/cfdi/${exportarMatch[1]}.${formato}?X-Amz-Signature=mock-signed-url-token`
    };
  }

  return { ok: true, mensaje: 'Simulación exitosa' };
}
