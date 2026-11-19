/**
 * Controlador de Interfaz: Recuperación de Contraseña (#forgot)
 * Flujo en 2 pasos conectado a POST /auth/forgot-password y POST /auth/confirm-forgot-password.
 */

import { validateEmail, validatePassword } from '../utils/validators.js';
import { apiClient, ApiError } from '../api/client.js';
import { session } from '../auth/session.js';
import { AlertManager } from './alerts.js';

const CODE_REGEX = /^\d{6}$/;

export class ForgotPasswordController {
  constructor(onResetSuccess = null) {
    this.onResetSuccess = onResetSuccess;

    this.step1Form = document.getElementById('forgotStep1Form');
    this.step2Form = document.getElementById('forgotStep2Form');
    this.subtitleEl = document.getElementById('forgotSubtitle');

    this.emailInput = document.getElementById('forgotEmail');
    this.emailError = document.getElementById('forgotEmailError');
    this.sendCodeBtn = document.getElementById('sendCodeBtn');
    this.sendCodeText = document.getElementById('sendCodeText');
    this.sendCodeSpinner = document.getElementById('sendCodeSpinner');

    this.emailReadonlyInput = document.getElementById('forgotEmailReadonly');
    this.codeInput = document.getElementById('forgotCode');
    this.codeError = document.getElementById('forgotCodeError');
    this.newPasswordInput = document.getElementById('forgotNewPassword');
    this.newPasswordError = document.getElementById('forgotNewPasswordError');
    this.confirmPasswordInput = document.getElementById('forgotConfirmPassword');
    this.confirmPasswordError = document.getElementById('forgotConfirmPasswordError');

    this.toggleNewPasswordBtn = document.getElementById('toggleNewPasswordBtn');
    this.toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPasswordBtn');

    this.resetPasswordBtn = document.getElementById('resetPasswordBtn');
    this.resetPwdText = document.getElementById('resetPwdText');
    this.resetPwdSpinner = document.getElementById('resetPwdSpinner');

    this.alertManager = new AlertManager(document.getElementById('forgotAlert'));

    this.targetEmail = '';
    this.isSendingCode = false;
    this.isResetting = false;
  }

  init() {
    if (!this.step1Form || !this.step2Form) return;
    this.bindEvents();
    this.emailInput?.focus();
  }

  bindEvents() {
    this.emailInput?.addEventListener('blur', () => this.validateEmailField());
    this.emailInput?.addEventListener('input', () => {
      if (this.emailInput.getAttribute('aria-invalid') === 'true') {
        this.validateEmailField();
      }
    });

    this.codeInput?.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      if (this.codeInput.getAttribute('aria-invalid') === 'true') {
        this.validateCodeField();
      }
    });
    this.codeInput?.addEventListener('blur', () => this.validateCodeField());

    this.newPasswordInput?.addEventListener('blur', () => this.validateNewPasswordField());
    this.newPasswordInput?.addEventListener('input', () => {
      if (this.newPasswordInput.getAttribute('aria-invalid') === 'true') {
        this.validateNewPasswordField();
      }
      if (this.confirmPasswordInput?.value) {
        this.validateConfirmPasswordField();
      }
    });

    this.confirmPasswordInput?.addEventListener('blur', () => this.validateConfirmPasswordField());
    this.confirmPasswordInput?.addEventListener('input', () => {
      if (this.confirmPasswordInput.getAttribute('aria-invalid') === 'true') {
        this.validateConfirmPasswordField();
      }
    });

    this.toggleNewPasswordBtn?.addEventListener('click', () => {
      this.toggleVisibility(this.newPasswordInput, this.toggleNewPasswordBtn);
    });
    this.toggleConfirmPasswordBtn?.addEventListener('click', () => {
      this.toggleVisibility(this.confirmPasswordInput, this.toggleConfirmPasswordBtn);
    });

    this.step1Form.addEventListener('submit', (e) => this.handleSendCode(e));
    this.step2Form.addEventListener('submit', (e) => this.handleResetPassword(e));
  }

  toggleVisibility(inputEl, btnEl) {
    if (!inputEl || !btnEl) return;
    const isPassword = inputEl.getAttribute('type') === 'password';
    inputEl.setAttribute('type', isPassword ? 'text' : 'password');
    btnEl.setAttribute('aria-pressed', isPassword ? 'true' : 'false');

    const eyeOpen = btnEl.querySelector('.icon-eye-open');
    const eyeClosed = btnEl.querySelector('.icon-eye-closed');
    if (eyeOpen && eyeClosed) {
      eyeOpen.classList.toggle('is-hidden', isPassword);
      eyeClosed.classList.toggle('is-hidden', !isPassword);
    }
  }

  validateEmailField() {
    const result = validateEmail(this.emailInput?.value);
    if (!result.isValid) {
      this.showFieldError(this.emailInput, this.emailError, result.message);
      return false;
    }
    this.clearFieldError(this.emailInput, this.emailError);
    return true;
  }

  validateCodeField() {
    const code = (this.codeInput?.value || '').trim();
    if (!CODE_REGEX.test(code)) {
      this.showFieldError(
        this.codeInput,
        this.codeError,
        'Ingresa el código de verificación de 6 dígitos.'
      );
      return false;
    }
    this.clearFieldError(this.codeInput, this.codeError);
    return true;
  }

  validateNewPasswordField() {
    const result = validatePassword(this.newPasswordInput?.value);
    if (!result.isValid) {
      this.showFieldError(this.newPasswordInput, this.newPasswordError, result.message);
      return false;
    }
    this.clearFieldError(this.newPasswordInput, this.newPasswordError);
    return true;
  }

  validateConfirmPasswordField() {
    const pwd = this.newPasswordInput?.value || '';
    const confirm = this.confirmPasswordInput?.value || '';
    if (!confirm) {
      this.showFieldError(
        this.confirmPasswordInput,
        this.confirmPasswordError,
        'Confirma tu nueva contraseña.'
      );
      return false;
    }
    if (pwd !== confirm) {
      this.showFieldError(
        this.confirmPasswordInput,
        this.confirmPasswordError,
        'Las contraseñas no coinciden.'
      );
      return false;
    }
    this.clearFieldError(this.confirmPasswordInput, this.confirmPasswordError);
    return true;
  }

  showFieldError(inputEl, errorEl, message) {
    inputEl?.setAttribute('aria-invalid', 'true');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('is-visible');
    }
  }

  clearFieldError(inputEl, errorEl) {
    inputEl?.removeAttribute('aria-invalid');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('is-visible');
    }
  }

  setStep1Loading(loading) {
    this.isSendingCode = loading;
    if (this.sendCodeBtn) {
      this.sendCodeBtn.disabled = loading;
      this.sendCodeBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
    }
    if (this.sendCodeText) {
      this.sendCodeText.textContent = loading ? 'Enviando código...' : 'Enviar código de verificación';
    }
    if (this.sendCodeSpinner) {
      this.sendCodeSpinner.classList.toggle('is-hidden', !loading);
    }
  }

  setStep2Loading(loading) {
    this.isResetting = loading;
    if (this.resetPasswordBtn) {
      this.resetPasswordBtn.disabled = loading;
      this.resetPasswordBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
    }
    if (this.resetPwdText) {
      this.resetPwdText.textContent = loading ? 'Restableciendo...' : 'Restablecer contraseña';
    }
    if (this.resetPwdSpinner) {
      this.resetPwdSpinner.classList.toggle('is-hidden', !loading);
    }
  }

  async handleSendCode(e) {
    e.preventDefault();
    if (this.isSendingCode) return;

    this.alertManager.clear();
    if (!this.validateEmailField()) {
      this.emailInput?.focus();
      return;
    }

    const email = this.emailInput.value.trim();
    this.setStep1Loading(true);

    try {
      const response = await apiClient('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      this.targetEmail = email;
      if (this.emailReadonlyInput) {
        this.emailReadonlyInput.value = email;
      }

      this.step1Form.classList.add('is-hidden');
      this.step2Form.classList.remove('is-hidden');
      if (this.subtitleEl) {
        this.subtitleEl.textContent =
          'Ingresa el código de 6 dígitos enviado a tu correo y define tu nueva contraseña.';
      }

      const successMsg =
        response?.mensaje ||
        response?.message ||
        'Código de verificación enviado. Revisa tu correo institucional.';
      this.alertManager.showSuccess(successMsg);
      this.codeInput?.focus();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No fue posible enviar el código de verificación.';
      this.alertManager.showError(msg);
    } finally {
      this.setStep1Loading(false);
    }
  }

  async handleResetPassword(e) {
    e.preventDefault();
    if (this.isResetting) return;

    this.alertManager.clear();

    const vCode = this.validateCodeField();
    const vPwd = this.validateNewPasswordField();
    const vConfirm = this.validateConfirmPasswordField();

    if (!vCode || !vPwd || !vConfirm) {
      if (!vCode) this.codeInput?.focus();
      else if (!vPwd) this.newPasswordInput?.focus();
      else this.confirmPasswordInput?.focus();
      return;
    }

    const code = this.codeInput.value.trim();
    const newPassword = this.newPasswordInput.value;

    this.setStep2Loading(true);

    try {
      await apiClient('/auth/confirm-forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: this.targetEmail,
          code,
          newPassword
        })
      });

      const okMsg =
        'Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.';
      session.setAuthNotice(okMsg, 'success');

      if (typeof this.onResetSuccess === 'function') {
        this.onResetSuccess();
      } else {
        window.location.hash = '#login';
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No fue posible restablecer la contraseña.';
      this.alertManager.showError(msg);
    } finally {
      this.setStep2Loading(false);
    }
  }
}
