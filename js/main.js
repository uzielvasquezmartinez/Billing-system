/**
 * Punto de Entrada Principal (ES Module)
 * Conecta el enrutador asíncrono con las vistas modulares (/views/*.html)
 * y los controladores específicos de cada pantalla.
 */

import { NavbarController } from './ui/navbar.js';
import { InvoiceFormController } from './ui/form.js';
import { ItemsTableController } from './ui/items-table.js';
import { SummaryController } from './ui/summary.js';
import { EmittedInvoiceController } from './ui/emitted.js';
import { CatalogController } from './ui/catalog.js';
import { LoginFormController } from './ui/login-form.js';
import { AlertManager } from './ui/alerts.js';

document.addEventListener('DOMContentLoaded', () => {
  // Estado local para conservar la última factura timbrada al navegar
  let lastEmittedData = null;

  // Enrutador y controlador de navegación
  let navbarController;

  navbarController = new NavbarController({
    // Callback cuando se monta la vista de Login (/views/login.html)
    onLoginMount: () => {
      const loginFormController = new LoginFormController(() => {
        navbarController.switchView('factura-nueva', true);
      });
      loginFormController.init();
    },

    // Callback cuando se monta un módulo principal (/views/{modulo}.html)
    onModuleMount: (moduleName) => {
      if (moduleName === 'factura-nueva') {
        const globalAlertContainer = document.getElementById('facturaAlert');
        const alertManager = new AlertManager(globalAlertContainer);

        const formController = new InvoiceFormController();
        formController.init();

        const itemsController = new ItemsTableController();
        itemsController.init();

        const summaryController = new SummaryController(
          alertManager,
          formController,
          itemsController,
          (facturaEmitida, estadoFactura) => {
            lastEmittedData = {
              id: facturaEmitida.id,
              folio: facturaEmitida.folio,
              uuid: facturaEmitida.uuid,
              fecha: facturaEmitida.fecha,
              rfcEmisor: estadoFactura.rfcEmisor,
              rfcReceptor: estadoFactura.rfcReceptor,
              direccion: estadoFactura.direccion,
              comentarios: estadoFactura.comentarios,
              productos: estadoFactura.productos,
              subtotal: estadoFactura.serverCalc.subtotal,
              impuestos: estadoFactura.serverCalc.impuestos,
              total: estadoFactura.serverCalc.total
            };
            navbarController.switchView('factura-emitida', true);
          }
        );
        summaryController.init();
      }

      if (moduleName === 'factura-emitida') {
        const emittedController = new EmittedInvoiceController(() => {
          navbarController.switchView('factura-nueva', true);
        });
        emittedController.init();

        if (lastEmittedData) {
          emittedController.showInvoice(lastEmittedData);
        }
      }

      if (moduleName === 'catalogo') {
        const catalogController = new CatalogController();
        catalogController.init();
      }
    }
  });

  // Inicialización de la aplicación
  navbarController.init();
});
