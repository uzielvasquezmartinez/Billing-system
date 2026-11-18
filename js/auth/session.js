/**
 * Módulo de Gestión de Sesión y Autenticación
 * Interfaz aislada compatible con AWS Cognito o proveedor JWT personalizado.
 * Protegido con try/catch en sessionStorage.
 */

import { CONFIG } from '../config.js';

class SessionManager {
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
   * Comprueba si el usuario está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = this.getToken();
    return Boolean(token && token.trim().length > 0);
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
