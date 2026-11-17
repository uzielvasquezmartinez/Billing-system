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

    this.bindEvents();
    this.updateUserBadge();

    // 3. Determinar la vista inicial según hash o sesión
    let initialView = window.location.hash.replace('#', '');
    if (!initialView) {
      initialView = session.isAuthenticated() ? 'factura-nueva' : 'login';
    }

    await this.switchView(initialView, true);
  }

  bindEvents() {
    // Clics en los 3 módulos de la cápsula
    this.navLinks.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const targetView = e.currentTarget.getAttribute('data-view');
        if (targetView && targetView !== this.currentView) {
          await this.switchView(targetView, true);
        }
      });
    });

    // Botón Salir: Cierra sesión y redirige al Login
    if (this.logoutBtn) {
      this.logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        session.logout(false);
        await this.switchView('login', true);
      });
    }

    // Escuchar cambios de hash (navegación histórica del navegador)
    window.addEventListener('hashchange', async () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== this.currentView) {
        await this.switchView(hash, false);
      }
    });
  }

  updateUserBadge() {
    if (!this.userBadge) return;
    const user = session.getUser();
    this.userBadge.textContent = user?.email || 'admin@universidad.edu.mx';
  }

  /**
   * Conmuta la vista activa cargando dinámicamente el HTML modular correspondiente
   * @param {string} viewId - 'login' | 'factura-nueva' | 'factura-emitida' | 'catalogo'
   * @param {boolean} [updateHash=true]
   */
  async switchView(viewId, updateHash = true) {
    const validViews = ['factura-nueva', 'factura-emitida', 'catalogo', 'login'];
    const activeView = validViews.includes(viewId) ? viewId : 'factura-nueva';

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
