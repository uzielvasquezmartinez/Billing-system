/**
 * Controlador de Interfaz: Formulario de Login
 * Eventos, validaciones accesibles (aria-invalid, aria-describedby),
 * alternancia de contraseña y estados interactivos (normal, enviando, error, éxito).
 */

import { validateEmail, validatePassword } from '../utils/validators.js';
import { apiClient, ApiError } from '../api/client.js';
import { session } from '../auth/session.js';
import { AlertManager } from './alerts.js';

export class LoginFormController {
  constructor(onLoginSuccess = null) {
    this.onLoginSuccess = onLoginSuccess;

    // Referencias a elementos del DOM
    this.form = document.getElementById('loginForm');
    this.emailInput = document.getElementById('email');
    this.passwordInput = document.getElementById('password');
    this.rememberCheckbox = document.getElementById('remember');
    this.submitBtn = document.getElementById('submitBtn');
    this.btnText = document.getElementById('btnText');
    this.btnSpinner = document.getElementById('btnSpinner');
    this.togglePasswordBtn = document.getElementById('togglePasswordBtn');

    this.emailError = document.getElementById('emailError');
    this.passwordError = document.getElementById('passwordError');

    const alertEl = document.getElementById('globalAlert');
    this.alertManager = new AlertManager(alertEl);

    this.isSubmitting = false;
  }

  /**
   * Inicializa escuchadores de eventos y estado inicial
   */
  init() {
    if (!this.form) return;

    this.loadRememberedEmail();
    this.bindEvents();
  }

  /**
   * Carga el correo guardado si el usuario activó "Recordarme"
   */
  loadRememberedEmail() {
    try {
      const savedEmail = localStorage.getItem('auth_remember_email');
      if (savedEmail && this.emailInput && this.rememberCheckbox) {
        this.emailInput.value = savedEmail;
        this.rememberCheckbox.checked = true;
      }
    } catch {
      // Manejo silencioso si localStorage está deshabilitado
    }
  }

  /**
   * Enlaza eventos sin variables globales ni onclick inline
   */
  bindEvents() {
    // Validación al perder el foco (blur)
    this.emailInput.addEventListener('blur', () => this.validateEmailField());
    this.passwordInput.addEventListener('blur', () => this.validatePasswordField());

    // Limpieza de error en tiempo real al escribir
    this.emailInput.addEventListener('input', () => {
      if (this.emailInput.getAttribute('aria-invalid') === 'true') {
        this.validateEmailField();
      }
    });

    this.passwordInput.addEventListener('input', () => {
      if (this.passwordInput.getAttribute('aria-invalid') === 'true') {
        this.validatePasswordField();
      }
    });

    // Alternar visibilidad de contraseña
    if (this.togglePasswordBtn) {
      this.togglePasswordBtn.addEventListener('click', () => this.togglePasswordVisibility());
    }

    // Envío del formulario
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  /**
   * Alterna entre input type="password" y type="text"
   */
  togglePasswordVisibility() {
    const isPassword = this.passwordInput.getAttribute('type') === 'password';
    this.passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
    this.togglePasswordBtn.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    this.togglePasswordBtn.setAttribute(
      'aria-label',
      isPassword ? 'Ocultar contraseña' : 'Ver contraseña'
    );

    // Actualizar icono SVG
    const eyeOpen = this.togglePasswordBtn.querySelector('.icon-eye-open');
    const eyeClosed = this.togglePasswordBtn.querySelector('.icon-eye-closed');
    if (eyeOpen && eyeClosed) {
      eyeOpen.classList.toggle('is-hidden', isPassword);
      eyeClosed.classList.toggle('is-hidden', !isPassword);
    }
  }

  /**
   * Valida campo de correo electrónico
   * @returns {boolean}
   */
  validateEmailField() {
    const result = validateEmail(this.emailInput.value);
    if (!result.isValid) {
      this.showFieldError(this.emailInput, this.emailError, result.message);
      return false;
    }
    this.clearFieldError(this.emailInput, this.emailError);
    return true;
  }

  /**
   * Valida campo de contraseña
   * @returns {boolean}
   */
  validatePasswordField() {
    const result = validatePassword(this.passwordInput.value);
    if (!result.isValid) {
      this.showFieldError(this.passwordInput, this.passwordError, result.message);
      return false;
    }
    this.clearFieldError(this.passwordInput, this.passwordError);
    return true;
  }

  /**
   * Muestra error de campo con atributos accesibles
   */
  showFieldError(inputEl, errorEl, message) {
    inputEl.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  }

  /**
   * Limpia error de campo
   */
  clearFieldError(inputEl, errorEl) {
    inputEl.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
    }
  }

  /**
   * Gestiona el envío seguro y accesible del formulario
   * @param {Event} e
   */
  async handleSubmit(e) {
    e.preventDefault();
    if (this.isSubmitting) return;

    this.alertManager.clear();

    const isEmailValid = this.validateEmailField();
    const isPasswordValid = this.validatePasswordField();

    if (!isEmailValid || !isPasswordValid) {
      // Foco en el primer campo inválido para accesibilidad por teclado
      if (!isEmailValid) {
        this.emailInput.focus();
      } else {
        this.passwordInput.focus();
      }
      return;
    }

    this.setSubmittingState(true);

    try {
      const email = this.emailInput.value.trim();
      const password = this.passwordInput.value;
      const remember = this.rememberCheckbox ? this.rememberCheckbox.checked : false;

      const response = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      session.setSession(response.token, response.user, remember);
      this.alertManager.showSuccess(`¡Bienvenido de vuelta, ${response.user?.name || 'Usuario'}! Acceso concedido.`);

      // Notificación y redirección inmediata a Factura nueva
      setTimeout(() => {
        if (typeof this.onLoginSuccess === 'function') {
          this.onLoginSuccess(response.user);
        } else {
          window.location.hash = '#factura-nueva';
        }
      }, 700);

    } catch (err) {
      const errorMsg = err instanceof ApiError ? err.message : 'Error inesperado al iniciar sesión.';
      this.alertManager.showError(errorMsg);
    } finally {
      this.setSubmittingState(false);
    }
  }

  /**
   * Actualiza el estado visual y accesible del botón de envío
   * @param {boolean} submitting
   */
  setSubmittingState(submitting) {
    this.isSubmitting = submitting;
    this.submitBtn.disabled = submitting;
    this.submitBtn.setAttribute('aria-busy', submitting ? 'true' : 'false');

    if (submitting) {
      this.btnText.textContent = 'Iniciando sesión…';
      this.btnSpinner.classList.remove('is-hidden');
    } else {
      this.btnText.textContent = 'Iniciar sesión';
      this.btnSpinner.classList.add('is-hidden');
    }
  }
}
