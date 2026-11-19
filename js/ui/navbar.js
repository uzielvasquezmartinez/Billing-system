/**
 * Controlador de Navegación y Enrutador Modular
 * Separa estrictamente rutas públicas (#login, #forgot) y privadas (#factura-nueva, #catalogo).
 * Toda ruta privada o desconocida sin token JWT válido oculta la barra superior y redirige a #login.
 */

import { session } from '../auth/session.js';
import { viewLoader } from './view-loader.js';

export const PUBLIC_ROUTES = Object.freeze(['login', 'forgot']);
export const PRIVATE_ROUTES = Object.freeze(['factura-nueva', 'catalogo']);

export class NavbarController {
  constructor(viewCallbacks = {}) {
    this.viewCallbacks = viewCallbacks;
    this.publicRoutes = viewCallbacks.publicRoutes || PUBLIC_ROUTES;
    this.privateRoutes = viewCallbacks.privateRoutes || PRIVATE_ROUTES;

    // Contenedores estructurales
    this.mainHeader = document.getElementById('appHeader');
    this.mainContent = document.getElementById('mainContent');
    this.viewContainer = document.getElementById('viewContainer');
    this.loginContainer = document.getElementById('loginContainer');

    this.currentView = null;
    this.navbarMounted = false;
    this.navSeq = 0;
  }

  normalizeRoute(rawHash) {
    return String(rawHash || '')
      .replace(/^#/, '')
      .split('?')[0]
      .trim()
      .toLowerCase();
  }

  hidePrivateShell() {
    if (this.mainHeader) this.mainHeader.style.display = 'none';
    if (this.mainContent) this.mainContent.style.display = 'none';
    if (this.viewContainer) this.viewContainer.replaceChildren();
  }

  async ensureNavbarMounted() {
    if (this.navbarMounted) return;

    await viewLoader.renderInto('navbar', this.mainHeader);

    this.navCapsule = document.getElementById('mainNavCapsule');
    this.navLinks = document.querySelectorAll('.nav-module-btn');
    this.logoutBtn = document.getElementById('navbarLogoutBtn');
    this.userBadge = document.getElementById('navbarUserEmail');
    this.modalUserEmail = document.getElementById('modalUserEmail');
    this.logoutModal = document.getElementById('logoutModal');
    this.cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    this.confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

    this.bindNavbarEvents();
    this.navbarMounted = true;
  }

  /**
   * Inicializa el enrutador asegurando que el cascarón privado permanezca oculto sin sesión
   */
  async init() {
    this.hidePrivateShell();
    this.bindGlobalRouterEvents();

    const requested = this.normalizeRoute(window.location.hash);
    if (!requested) {
      const initialView = session.isAuthenticated() ? 'factura-nueva' : 'login';
      await this.switchView(initialView, true);
      return;
    }

    await this.switchView(requested, true);
  }

  bindGlobalRouterEvents() {
    window.addEventListener('hashchange', async () => {
      const requested = this.normalizeRoute(window.location.hash);
      const targetView = requested || (session.isAuthenticated() ? 'factura-nueva' : 'login');
      if (targetView !== this.currentView) {
        await this.switchView(targetView, false);
      }
    });
  }

  bindNavbarEvents() {
    this.navLinks?.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const targetView = e.currentTarget.getAttribute('data-view');
        if (targetView && targetView !== this.currentView) {
          await this.switchView(targetView, true);
        }
      });
    });

    if (this.logoutBtn && this.logoutModal) {
      this.logoutBtn.addEventListener('click', () => {
        this.updateUserBadge();
        if (typeof this.logoutModal.showModal === 'function') {
          this.logoutModal.showModal();
        } else if (window.confirm('¿Deseas cerrar tu sesión institucional?')) {
          session.logout(false);
          this.switchView('login', true);
        }
      });
    }

    if (this.cancelLogoutBtn && this.logoutModal) {
      this.cancelLogoutBtn.addEventListener('click', () => {
        this.logoutModal.close();
      });
    }

    if (this.confirmLogoutBtn && this.logoutModal) {
      this.confirmLogoutBtn.addEventListener('click', async () => {
        this.logoutModal.close();
        session.logout(false);
        await this.switchView('login', true);
      });
    }

    if (this.logoutModal && !('closedBy' in HTMLDialogElement.prototype)) {
      const isOutside = (e, dialog) => {
        const r = dialog.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      let pressedOutside = false;
      this.logoutModal.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e, this.logoutModal);
      });
      this.logoutModal.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e, this.logoutModal)) {
          this.logoutModal.close();
        }
      });
    }
  }

  updateUserBadge() {
    const user = session.getUser();
    const email = (user?.email || '').trim();
    const initial = email ? email.charAt(0).toUpperCase() : '';

    if (this.userBadge) {
      this.userBadge.textContent = email;
    }
    if (this.modalUserEmail) {
      this.modalUserEmail.textContent = email;
    }

    const navbarAvatar =
      document.querySelector('.user-info-pill .user-avatar') ||
      document.querySelector('.user-profile-btn .user-avatar') ||
      document.querySelector('.user-avatar');
    if (navbarAvatar) navbarAvatar.textContent = initial;

    const modalAvatar =
      document.querySelector('.user-avatar-tag') ||
      document.querySelector('.logout-account-avatar');
    if (modalAvatar) modalAvatar.textContent = initial;
  }

  /**
   * Resuelve y monta la vista respetando la separación de rutas públicas y privadas
   * @param {string} viewId
   * @param {boolean} [updateHash=true]
   */
  async switchView(viewId, updateHash = true) {
    const seq = ++this.navSeq;
    const requested = this.normalizeRoute(viewId);
    const isPublic = this.publicRoutes.includes(requested);
    const authenticated = session.isAuthenticated();

    let activeView;

    if (isPublic) {
      activeView = requested;
    } else if (!authenticated) {
      // Cualquier ruta privada o desconocida sin token válido fuerza redirección a #login
      this.hidePrivateShell();
      activeView = 'login';
    } else {
      const normalizedPrivate = requested === 'factura-emitida' ? 'factura-nueva' : requested;
      activeView = this.privateRoutes.includes(normalizedPrivate)
        ? normalizedPrivate
        : 'factura-nueva';
    }

    this.currentView = activeView;

    if ((updateHash || activeView !== requested) && window.location.hash !== `#${activeView}`) {
      window.location.hash = `#${activeView}`;
    }

    if (this.publicRoutes.includes(activeView)) {
      this.hidePrivateShell();

      await viewLoader.renderInto(activeView, this.loginContainer);
      if (seq !== this.navSeq) return;

      if (this.loginContainer) {
        this.loginContainer.style.display = '';
      }

      if (activeView === 'login' && typeof this.viewCallbacks.onLoginMount === 'function') {
        this.viewCallbacks.onLoginMount();
      } else if (activeView === 'forgot' && typeof this.viewCallbacks.onForgotMount === 'function') {
        this.viewCallbacks.onForgotMount();
      }
    } else {
      await this.ensureNavbarMounted();
      if (seq !== this.navSeq) return;

      if (this.mainHeader) this.mainHeader.style.display = '';
      if (this.mainContent) this.mainContent.style.display = '';
      this.updateUserBadge();

      if (this.loginContainer) {
        this.loginContainer.style.display = 'none';
        this.loginContainer.replaceChildren();
      }

      if (this.navLinks) {
        this.navLinks.forEach((btn) => {
          const isTarget = btn.getAttribute('data-view') === activeView;
          btn.classList.toggle('is-active', isTarget);
          btn.setAttribute('aria-current', isTarget ? 'page' : 'false');
        });
      }

      await viewLoader.renderInto(activeView, this.viewContainer);
      if (seq !== this.navSeq) return;

      if (typeof this.viewCallbacks.onModuleMount === 'function') {
        this.viewCallbacks.onModuleMount(activeView);
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
