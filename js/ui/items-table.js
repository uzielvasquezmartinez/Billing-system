/**
 * Controlador de Lista de Productos Dinámica
 * Renglones editables (SKU, cantidad, precio unitario, importe calculado).
 * Acciones: agregar renglón, quitar renglón (mínimo 1), marcado de SKUs sin servicio.
 */

import { facturaStore } from '../state/factura-store.js';
import { formatMoney } from '../utils/money.js';
import { validateSKU } from '../utils/validators.js';

export class ItemsTableController {
  constructor() {
    this.tableBody = document.getElementById('productsTableBody');
    this.addBtn = document.getElementById('addProductBtn');
  }

  init() {
    if (!this.tableBody) return;

    this.bindEvents();

    // Suscribirse a cambios en la lista de productos
    facturaStore.subscribe((state) => {
      this.renderRows(state.productos);
    });
  }

  bindEvents() {
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        facturaStore.addProduct();
      });
    }
  }

  /**
   * Renderiza los renglones usando creación segura del DOM
   * @param {Array} productos
   */
  renderRows(productos) {
    if (!this.tableBody) return;

    // Verificar SKUs repetidos para advertencia de usabilidad
    const skuCounts = new Map();
    productos.forEach((p) => {
      const clean = (p.sku || '').trim().toUpperCase();
      if (clean) {
        skuCounts.set(clean, (skuCounts.get(clean) || 0) + 1);
      }
    });

    const isOnlyOneRow = productos.length <= 1;

    // Reemplazo seguro de nodos hijos
    const fragment = document.createDocumentFragment();

    productos.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = `product-row ${item.skuError ? 'has-sku-error' : ''}`;
      row.setAttribute('data-id', item.id);

      // Columna 1: SKU
      const skuCol = document.createElement('div');
      skuCol.className = 'col-sku';

      const skuInput = document.createElement('input');
      skuInput.type = 'text';
      skuInput.className = `form-input input-sku font-mono ${item.skuError ? 'input-error' : ''}`;
      skuInput.value = item.sku;
      skuInput.placeholder = 'Ej. SRV-HOST-001';
      skuInput.maxLength = 30;
      skuInput.setAttribute('aria-label', `SKU del producto renglón ${index + 1}`);

      if (item.skuError) {
        skuInput.setAttribute('aria-invalid', 'true');
      }

      skuInput.addEventListener('input', (e) => {
        facturaStore.updateProduct(item.id, 'sku', e.target.value);
      });

      skuCol.appendChild(skuInput);

      // Mensaje de error de SKU si el servidor lo rechazó
      if (item.skuError) {
        const errorMsg = document.createElement('span');
        errorMsg.className = 'sku-error-msg';
        errorMsg.textContent = item.skuError;
        skuCol.appendChild(errorMsg);
      } else if (item.sku && (skuCounts.get(item.sku.trim().toUpperCase()) || 0) > 1) {
        const warnMsg = document.createElement('span');
        warnMsg.className = 'sku-warn-msg';
        warnMsg.textContent = 'Advertencia: SKU repetido en la lista.';
        skuCol.appendChild(warnMsg);
      }

      // Columna 2: Cantidad (entero >= 1)
      const qtyCol = document.createElement('div');
      qtyCol.className = 'col-qty';

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.step = '1';
      qtyInput.className = 'form-input input-qty';
      qtyInput.value = item.cantidad;
      qtyInput.setAttribute('aria-label', `Cantidad renglón ${index + 1}`);

      qtyInput.addEventListener('change', (e) => {
        facturaStore.updateProduct(item.id, 'cantidad', e.target.value);
      });

      qtyCol.appendChild(qtyInput);

      // Columna 3: Precio unitario (número >= 0)
      const priceCol = document.createElement('div');
      priceCol.className = 'col-price';

      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.min = '0';
      priceInput.step = '0.01';
      priceInput.className = 'form-input input-price font-mono';
      priceInput.value = item.precioUnitario.toFixed(2);
      priceInput.setAttribute('aria-label', `Precio unitario renglón ${index + 1}`);

      priceInput.addEventListener('change', (e) => {
        facturaStore.updateProduct(item.id, 'precioUnitario', e.target.value);
      });

      priceCol.appendChild(priceInput);

      // Columna 4: Importe (calculado automáticamente, no editable)
      const totalCol = document.createElement('div');
      totalCol.className = 'col-total font-mono';
      totalCol.textContent = formatMoney(item.importe);
      totalCol.setAttribute('aria-label', `Importe calculado renglón ${index + 1}`);

      // Columna 5: Acción eliminar renglón
      const actionCol = document.createElement('div');
      actionCol.className = 'col-action';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-row';
      deleteBtn.setAttribute('aria-label', `Quitar producto renglón ${index + 1}`);
      deleteBtn.disabled = isOnlyOneRow; // Mínimo 1 renglón requerido

      // Icono bote de basura SVG
      deleteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      `;

      deleteBtn.addEventListener('click', () => {
        facturaStore.removeProduct(item.id);
      });

      actionCol.appendChild(deleteBtn);

      row.appendChild(skuCol);
      row.appendChild(qtyCol);
      row.appendChild(priceCol);
      row.appendChild(totalCol);
      row.appendChild(actionCol);

      fragment.appendChild(row);
    });

    this.tableBody.replaceChildren(fragment);
  }

  /**
   * Validación local de la lista de productos
   * @returns {boolean}
   */
  validateAll() {
    const state = facturaStore.getState();
    let allValid = true;

    state.productos.forEach((item) => {
      const skuRes = validateSKU(item.sku);
      if (!skuRes.isValid) {
        allValid = false;
      }
      if (item.cantidad < 1 || isNaN(item.cantidad)) {
        allValid = false;
      }
      if (item.precioUnitario < 0 || isNaN(item.precioUnitario)) {
        allValid = false;
      }
    });

    return allValid;
  }
}
