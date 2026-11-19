/**
 * Cliente HTTP y Wrapper de Fetch
 * Maneja URL base, cabecera Authorization Bearer (excepto rutas públicas de /auth),
 * timeouts diferenciados (30s estándar, 45s en creación/emisión de facturas),
 * bloqueo preventivo de rutas protegidas sin token y manejo de HTTP 401.
 */

import { CONFIG } from '../config.js';
import { session } from '../auth/session.js';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const EXPIRED_SESSION_MESSAGE =
  'Tu sesión ha expirado o no estás autorizado. Por favor inicia sesión nuevamente.';

const PUBLIC_AUTH_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/forgot-password',
  '/auth/confirm-forgot-password'
]);

function resolveTimeoutMs(pathOnly, method, customTimeoutMs) {
  if (typeof customTimeoutMs === 'number' && customTimeoutMs > 0) {
    return customTimeoutMs;
  }

  if (
    method === 'POST' &&
    (pathOnly === '/facturas' || /^\/facturas\/[^/]+\/emitir$/.test(pathOnly))
  ) {
    return CONFIG.INVOICE_MUTATION_TIMEOUT_MS;
  }

  return CONFIG.REQUEST_TIMEOUT_MS;
}

/**
 * Realiza una petición HTTP estandarizada
 * @param {string} endpoint - Ruta relativa al API_BASE_URL (ej. '/facturas/validar')
 * @param {object} [options={}] - Opciones de fetch (+ timeoutMs opcional)
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const pathOnly = normalizedEndpoint.split('?')[0];
  const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.has(pathOnly);
  const { timeoutMs: customTimeoutMs, headers: customHeaders, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();

  // Evitar enviar peticiones a endpoints protegidos sin token JWT válido
  if (!isPublicAuth && !session.isAuthenticated()) {
    session.setAuthNotice(EXPIRED_SESSION_MESSAGE, 'error');
    session.logout(true);
    throw new ApiError(EXPIRED_SESSION_MESSAGE, 401);
  }

  const url = `${CONFIG.API_BASE_URL}${normalizedEndpoint}`;
  const timeoutMs = resolveTimeoutMs(pathOnly, method, customTimeoutMs);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(customHeaders || {})
  };

  if (!isPublicAuth) {
    const token = session.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else {
    delete headers['Authorization'];
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (response.status === 401) {
      if (!isPublicAuth) {
        session.setAuthNotice(EXPIRED_SESSION_MESSAGE, 'error');
        session.logout(true);
        window.dispatchEvent(
          new CustomEvent('auth:session-expired', {
            detail: { message: EXPIRED_SESSION_MESSAGE }
          })
        );
        throw new ApiError(EXPIRED_SESSION_MESSAGE, 401, responseData);
      }

      const authMessage =
        responseData?.mensaje || responseData?.message || 'Credenciales inválidas';
      throw new ApiError(authMessage, 401, responseData);
    }

    if (!response.ok) {
      const message =
        responseData?.mensaje ||
        responseData?.message ||
        `Error del servidor (${response.status})`;
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

    throw new ApiError(
      'No fue posible conectar con el servidor. Revisa tu conexión de red.',
      0,
      error
    );
  }
}
