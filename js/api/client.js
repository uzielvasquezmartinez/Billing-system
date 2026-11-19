/**
 * Cliente HTTP y Wrapper de Fetch
 * Maneja URL base, cabecera Authorization Bearer (excepto /auth/login),
 * timeout con AbortController, errores normalizados y sesión expirada (401).
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

/**
 * Realiza una petición HTTP estandarizada
 * @param {string} endpoint - Ruta relativa al API_BASE_URL (ej. '/facturas/validar')
 * @param {object} [options={}] - Opciones de fetch
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const isAuthLogin =
    normalizedEndpoint === '/auth/login' || normalizedEndpoint.startsWith('/auth/login?');
  const url = `${CONFIG.API_BASE_URL}${normalizedEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (!isAuthLogin) {
    const token = session.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else {
    delete headers['Authorization'];
  }

  try {
    const response = await fetch(url, {
      ...options,
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

    // Si una ruta protegida responde 401, limpia sessionStorage, notifica sesión expirada y redirige a #login
    if (response.status === 401) {
      if (!isAuthLogin) {
        session.setSessionExpiredMessage(EXPIRED_SESSION_MESSAGE);
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
