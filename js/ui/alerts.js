/**
 * Componente de Alertas Accesibles
 * Cumple con role="alert", aria-live="assertive" y contraste WCAG AA.
 * Renderiza avisos de errores generales y lista de SKUs sin servicio asociado.
 * Protegido contra XSS (uso estricto de textContent y createElement).
 */

export class AlertManager {
  /**
   * @param {HTMLElement} containerElement
   */
  constructor(containerElement) {
    this.container = containerElement;
  }

  /**
   * Muestra el aviso específico de SKUs sin servicio asociado conforme al diseño aprobado
   * @param {Array<{renglon: number, sku: string, mensaje: string}>} errores
   */
  showSkuError(errores) {
    if (!this.container) return;

    this.clear();
    this.container.classList.add('is-visible', 'alert-sku-error');
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'assertive');

    // Icono de advertencia (!)
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'alert-icon-wrapper';
    iconWrapper.setAttribute('aria-hidden', 'true');

    const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    iconSvg.setAttribute('class', 'alert-icon');
    iconSvg.setAttribute('viewBox', '0 0 24 24');
    iconSvg.setAttribute('fill', 'none');
    iconSvg.setAttribute('stroke', 'currentColor');
    iconSvg.setAttribute('stroke-width', '2');
    iconSvg.setAttribute('stroke-linecap', 'round');
    iconSvg.setAttribute('stroke-linejoin', 'round');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '12');
    line.setAttribute('y1', '8');
    line.setAttribute('x2', '12');
    line.setAttribute('y2', '12');

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    dot.setAttribute('x1', '12');
    dot.setAttribute('y1', '16');
    dot.setAttribute('x2', '12.01');
    dot.setAttribute('y2', '16');

    iconSvg.appendChild(circle);
    iconSvg.appendChild(line);
    iconSvg.appendChild(dot);
    iconWrapper.appendChild(iconSvg);

    // Contenido del mensaje
    const contentDiv = document.createElement('div');
    contentDiv.className = 'alert-content';

    const titleEl = document.createElement('strong');
    titleEl.className = 'alert-title';
    titleEl.textContent = 'No se emitió la factura';

    const count = errores.length;
    const skuListText = errores.map((e) => e.sku).join(' y ');

    const descEl = document.createElement('p');
    descEl.className = 'alert-desc';
    descEl.textContent = `${count} SKU no ${count === 1 ? 'tiene' : 'tienen'} un servicio asociado: ${skuListText}. Corrígelos y vuelve a emitir.`;

    contentDiv.appendChild(titleEl);
    contentDiv.appendChild(descEl);

    this.container.appendChild(iconWrapper);
    this.container.appendChild(contentDiv);
  }

  /**
   * Muestra un mensaje de error general
   * @param {string} message
   */
  showError(message) {
    this.renderSimple(message, 'error');
  }

  /**
   * Muestra un mensaje de éxito
   * @param {string} message
   */
  showSuccess(message) {
    this.renderSimple(message, 'success');
  }

  /**
   * Oculta y limpia el contenedor de alerta
   */
  clear() {
    if (!this.container) return;
    this.container.classList.remove('is-visible', 'alert-error', 'alert-success', 'alert-sku-error');
    this.container.replaceChildren();
  }

  /**
   * Renderizado simple para avisos rápidos
   * @private
   */
  renderSimple(message, type) {
    if (!this.container) return;

    this.clear();
    this.container.classList.add('is-visible', type === 'error' ? 'alert-error' : 'alert-success');
    this.container.setAttribute('role', 'alert');
    this.container.setAttribute('aria-live', 'assertive');

    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    this.container.appendChild(textSpan);
  }
}
