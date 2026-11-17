/**
 * Cargador Modular de Vistas y Plantillas HTML
 * Carga de forma asíncrona y almacena en caché las vistas desde /views/*.html.
 * Garantiza separación de responsabilidades y desacoplamiento de marcado.
 */

class ViewLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Obtiene el contenido HTML de una vista modular
   * @param {string} viewName - Nombre de la vista (ej. 'login', 'factura-nueva', 'navbar')
   * @returns {Promise<string>} Contenido HTML
   */
  async loadView(viewName) {
    if (this.cache.has(viewName)) {
      return this.cache.get(viewName);
    }

    try {
      const response = await fetch(`/views/${viewName}.html`, {
        headers: { 'Accept': 'text/html' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al cargar /views/${viewName}.html`);
      }

      const html = await response.text();
      this.cache.set(viewName, html);
      return html;
    } catch (err) {
      console.error(`Error al cargar la plantilla /views/${viewName}.html:`, err);
      throw err;
    }
  }

  /**
   * Inyecta una vista en un contenedor destino
   * @param {string} viewName
   * @param {HTMLElement} targetElement
   * @returns {Promise<void>}
   */
  async renderInto(viewName, targetElement) {
    if (!targetElement) return;
    const html = await this.loadView(viewName);
    targetElement.innerHTML = html;
  }
}

export const viewLoader = new ViewLoader();
