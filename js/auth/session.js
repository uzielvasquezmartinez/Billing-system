/**
 * Módulo de Gestión de Sesión y Autenticación
 * Interfaz aislada compatible con AWS Cognito / JWT RS256.
 * Protegido con try/catch en sessionStorage.
 */

import { CONFIG } from '../config.js';

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

class SessionManager {
  constructor() {
    this.authNotice = null;
  }

  /**
   * Registra un aviso temporal en memoria para mostrarlo al montar #login
   * @param {string} message
   * @param {'error' | 'success'} [type='error']
   */
  setAuthNotice(message, type = 'error') {
    this.authNotice = message ? { message, type } : null;
  }

  /**
   * Obtiene y limpia el aviso temporal de autenticación
   * @returns {{ message: string, type: 'error' | 'success' } | null}
   */
  consumeAuthNotice() {
    const notice = this.authNotice;
    this.authNotice = null;
    return notice;
  }

  /**
   * Alias de compatibilidad para avisos de sesión expirada
   * @param {string} message
   */
  setSessionExpiredMessage(message) {
    this.setAuthNotice(message, 'error');
  }

  /**
   * Alias de compatibilidad para consumir aviso de sesión expirada
   * @returns {string | null}
   */
  consumeSessionExpiredMessage() {
    const notice = this.consumeAuthNotice();
    return notice?.message || null;
  }

  /**
   * Obtiene el token JWT actual de la sesión
   * @returns {string | null}
   */
  getToken() {
    try {
      return sessionStorage.getItem(CONFIG.AUTH.STORAGE_KEY_TOKEN);
    } catch {
      return null;
    }
  }

  /**
   * Comprueba si existe un token JWT válido (no vacío ni expirado) en sesión
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token || token.trim().length === 0) {
      return false;
    }

    const payload = decodeJwtPayload(token.trim());
    if (payload && typeof payload.exp === 'number') {
      const isExpired = Date.now() >= payload.exp * 1000;
      if (isExpired) {
        this.clearSession(false);
        return false;
      }
    }

    return true;
  }

  /**
   * Guarda los datos de la sesión activa
   * @param {string} token - Token de autenticación JWT
   * @param {object} [user] - Información pública del usuario
   * @param {boolean} [remember=false] - Persistencia opcional
   */
  setSession(token, user = null, remember = false) {
    try {
      sessionStorage.setItem(CONFIG.AUTH.STORAGE_KEY_TOKEN, token);
      if (user) {
        sessionStorage.setItem(CONFIG.AUTH.STORAGE_KEY_USER, JSON.stringify(user));
      }
      if (remember) {
        localStorage.setItem('auth_remember_email', user?.email || '');
      } else {
        localStorage.removeItem('auth_remember_email');
      }
    } catch (err) {
      console.warn('Storage no disponible para almacenar sesión.', err);
    }
  }

  /**
   * Obtiene los datos del usuario logueado
   * @returns {object | null}
   */
  getUser() {
    try {
      const raw = sessionStorage.getItem(CONFIG.AUTH.STORAGE_KEY_USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Limpia el almacenamiento de sesión de forma segura
   * @param {boolean} [redirect=false]
   */
  clearSession(redirect = false) {
    try {
      sessionStorage.removeItem(CONFIG.AUTH.STORAGE_KEY_TOKEN);
      sessionStorage.removeItem(CONFIG.AUTH.STORAGE_KEY_USER);
      sessionStorage.clear();
    } catch (err) {
      console.warn('Error al limpiar sessionStorage.', err);
    }

    if (redirect) {
      window.location.hash = '#login';
    }
  }

  /**
   * Cierra la sesión activa y redirige al login
   * @param {boolean} [redirect=true]
   */
  logout(redirect = true) {
    this.clearSession(redirect);
  }
}

export const session = new SessionManager();
