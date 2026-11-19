/**
 * Controlador de Navegación y Enrutador Modular
 * Carga de forma asíncrona las plantillas desde /views/*.html.
 * Gestiona la barra superior encapsulada, la sesión y la transición entre vistas.
 */

import { session } from '../auth/session.js';
import { viewLoader } from './view-loader.js';

export class NavbarController {
  constructor(viewCallbacks = {}) {
    this.viewCallbacks = viewCallbacks;

    // Contenedores estructurales
    this.mainHeader = document.getElementById('appHeader');
    this.mainContent = document.getElementById('mainContent');
    this.viewContainer = document.getElementById('viewContainer');
    this.loginContainer = document.getElementById('loginContainer');

    this.currentView = null;
  }

  /**
   * Inicializa la cabecera y el enrutador
   */
  async init() {
    // 1. Cargar la plantilla modular del Navbar desde /views/navbar.html
    await viewLoader.renderInto('navbar', this.mainHeader);

    // 2. Referencias a los elementos del navbar recién montados
    this.navCapsule = document.getElementById('mainNavCapsule');
    this.navLinks = document.querySelectorAll('.nav-module-btn');
    this.logoutBtn = document.getElementById('navbarLogoutBtn');
    this.userBadge = document.getElementById('navbarUserEmail');
    this.modalUserEmail = document.getElementById('modalUserEmail');
    this.logoutModal = document.getElementById('logoutModal');
    this.cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    this.confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

    this.bindEvents();
    this.updateUserBadge();

    // 3. Determinar la vista inicial según hash o sesión
    let initialView = window.location.hash.replace('#', '');
    if (!initialView || initialView === 'factura-emitida') {
      initialView = session.isAuthenticated() ? 'factura-nueva' : 'login';
    }

    await this.switchView(initialView, true);
  }

  bindEvents() {
    // Clics en los módulos principales de la cápsula
    this.navLinks.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const targetView = e.currentTarget.getAttribute('data-view');
        if (targetView && targetView !== this.currentView) {
          await this.switchView(targetView, true);
        }
      });
    });

    // Botón de Usuario / Salir: abre el mini modal accesible de confirmación
    if (this.logoutBtn && this.logoutModal) {
      this.logoutBtn.addEventListener('click', () => {
        this.updateUserBadge();
        if (typeof this.logoutModal.showModal === 'function') {
          this.logoutModal.showModal();
        } else {
          // Fallback en entornos donde <dialog> no tenga soporte modal
          if (window.confirm('¿Deseas cerrar tu sesión institucional?')) {
            session.logout(false);
            this.switchView('login', true);
          }
        }
      });
    }

    // Botón Cancelar del modal
    if (this.cancelLogoutBtn && this.logoutModal) {
      this.cancelLogoutBtn.addEventListener('click', () => {
        this.logoutModal.close();
      });
    }

    // Botón Confirmar cierre de sesión del modal
    if (this.confirmLogoutBtn && this.logoutModal) {
      this.confirmLogoutBtn.addEventListener('click', async () => {
        this.logoutModal.close();
        session.logout(false);
        await this.switchView('login', true);
      });
    }

    // Fallback de light-dismiss (clic fuera del diálogo) si closedby no está soportado nativamente
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

    // Escuchar cambios de hash (navegación histórica del navegador)
    window.addEventListener('hashchange', async () => {
      const hash = window.location.hash.replace('#', '');
      const targetHash = hash === 'factura-emitida' ? 'factura-nueva' : hash;
      if (targetHash && targetHash !== this.currentView) {
        await this.switchView(targetHash, false);
      }
    });
  }

  updateUserBadge() {
    const user = session.getUser();
    const email = user?.email || 'admin@universidad.edu.mx';
    const initial = email.charAt(0).toUpperCase();

    if (this.userBadge) {
      this.userBadge.textContent = email;
    }
    if (this.modalUserEmail) {
      this.modalUserEmail.textContent = email;
    }

    const navbarAvatar = document.querySelector('.user-info-pill .user-avatar') || document.querySelector('.user-profile-btn .user-avatar') || document.querySelector('.user-avatar');
    if (navbarAvatar) navbarAvatar.textContent = initial;

    const modalAvatar = document.querySelector('.user-avatar-tag') || document.querySelector('.logout-account-avatar');
    if (modalAvatar) modalAvatar.textContent = initial;
  }

  /**
   * Conmuta la vista activa cargando dinámicamente el HTML modular correspondiente
   * @param {string} viewId - 'login' | 'factura-nueva' | 'catalogo'
   * @param {boolean} [updateHash=true]
   */
  async switchView(viewId, updateHash = true) {
    const validViews = ['factura-nueva', 'catalogo', 'login'];
    // Redirige 'factura-emitida' directamente a 'factura-nueva' (ahora unificada)
    const normalizedView = viewId === 'factura-emitida' ? 'factura-nueva' : viewId;
    const activeView = validViews.includes(normalizedView) ? normalizedView : 'factura-nueva';

    this.currentView = activeView;

    if (updateHash && window.location.hash !== `#${activeView}`) {
      window.location.hash = `#${activeView}`;
    }

    if (activeView === 'login') {
      // Ocultar cabecera y contenedor principal
      if (this.mainHeader) this.mainHeader.style.display = 'none';
      if (this.mainContent) this.mainContent.style.display = 'none';

      // Cargar y mostrar la vista modular de Login desde /views/login.html
      await viewLoader.renderInto('login', this.loginContainer);
      if (this.loginContainer) {
        this.loginContainer.style.display = '';
      }

      // Notificar al callback para inicializar el formulario de Login
      if (typeof this.viewCallbacks.onLoginMount === 'function') {
        this.viewCallbacks.onLoginMount();
      }
    } else {
      // Mostrar cabecera y contenedor principal
      if (this.mainHeader) this.mainHeader.style.display = '';
      if (this.mainContent) this.mainContent.style.display = '';
      this.updateUserBadge();

      // Ocultar contenedor de login
      if (this.loginContainer) {
        this.loginContainer.style.display = 'none';
      }

      // Actualizar estado activo en los botones de la cápsula
      if (this.navLinks) {
        this.navLinks.forEach((btn) => {
          const isTarget = btn.getAttribute('data-view') === activeView;
          btn.classList.toggle('is-active', isTarget);
          btn.setAttribute('aria-current', isTarget ? 'page' : 'false');
        });
      }

      // Cargar la vista modular solicitada desde /views/{activeView}.html
      await viewLoader.renderInto(activeView, this.viewContainer);

      // Notificar al callback para inicializar los controladores de la vista
      if (typeof this.viewCallbacks.onModuleMount === 'function') {
        this.viewCallbacks.onModuleMount(activeView);
      }
    }

    // Scroll arriba suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
