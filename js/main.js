/**
 * Punto de Entrada Principal (ES Module)
 * Define explícitamente rutas públicas (#login, #forgot) y privadas (#factura-nueva, #catalogo),
 * conectando el enrutador con las vistas modulares y sus controladores.
 */

import { NavbarController, PUBLIC_ROUTES, PRIVATE_ROUTES } from './ui/navbar.js';
import { InvoiceFormController } from './ui/form.js';
import { ItemsTableController } from './ui/items-table.js';
import { SummaryController } from './ui/summary.js';
import { EmittedInvoiceController } from './ui/emitted.js';
import { CatalogController } from './ui/catalog.js';
import { LoginFormController } from './ui/login-form.js';
import { ForgotPasswordController } from './ui/forgot-form.js';
import { AlertManager } from './ui/alerts.js';
import { session } from './auth/session.js';

document.addEventListener('DOMContentLoaded', () => {
  let lastEmittedData = null;
  let navbarController;

  navbarController = new NavbarController({
    publicRoutes: PUBLIC_ROUTES,
    privateRoutes: PRIVATE_ROUTES,

    // Vista pública: #login
    onLoginMount: () => {
      const loginFormController = new LoginFormController(() => {
        navbarController.switchView('factura-nueva', true);
      });
      loginFormController.init();
    },

    // Vista pública: #forgot
    onForgotMount: () => {
      const forgotController = new ForgotPasswordController(() => {
        navbarController.switchView('login', true);
      });
      forgotController.init();
    },

    // Vistas privadas: #factura-nueva | #catalogo
    onModuleMount: (moduleName) => {
      if (!session.isAuthenticated()) {
        navbarController.switchView('login', true);
        return;
      }

      if (moduleName === 'factura-nueva') {
        const globalAlertContainer = document.getElementById('facturaAlert');
        const alertManager = new AlertManager(globalAlertContainer);

        const formController = new InvoiceFormController();
        formController.init();

        const itemsController = new ItemsTableController();
        itemsController.init();

        const creationStateEl = document.getElementById('invoiceCreationState');
        const emittedStateEl = document.getElementById('invoiceEmittedState');

        const emittedController = new EmittedInvoiceController(() => {
          if (creationStateEl && emittedStateEl) {
            emittedStateEl.classList.add('is-hidden');
            creationStateEl.classList.remove('is-hidden');
            formController.resetForm();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
        emittedController.init();

        const summaryController = new SummaryController(
          alertManager,
          formController,
          itemsController,
          (facturaEmitida) => {
            lastEmittedData = facturaEmitida;

            if (creationStateEl && emittedStateEl) {
              creationStateEl.classList.add('is-hidden');
              emittedStateEl.classList.remove('is-hidden');
              emittedController.showInvoice(lastEmittedData);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        );
        summaryController.init();
      }

      if (moduleName === 'catalogo') {
        const catalogController = new CatalogController();
        catalogController.init();
      }
    }
  });

  navbarController.init();
});
