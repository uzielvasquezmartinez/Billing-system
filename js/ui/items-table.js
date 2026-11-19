/**
 * Controlador de Lista de Productos Dinámica
 * El usuario agrega renglones buscando y seleccionando el servicio por nombre desde el buscador del catálogo.
 * Al seleccionar un servicio, Servicio, SKU (id_service) y precioUnitario se llenan automáticamente en modo readonly.
 * El usuario únicamente captura la cantidad.
 */

import { facturaStore } from '../state/factura-store.js';
import { getServicios } from '../api/servicios.js';
import { session } from '../auth/session.js';
import { formatMoney } from '../utils/money.js';
import { validateSKU } from '../utils/validators.js';

export class ItemsTableController {
  constructor() {
    this.tableBody = document.getElementById('productsTableBody');
    this.addBtn = document.getElementById('addProductBtn');
    this.searchBox = document.getElementById('serviceSearchBox');
    this.filterInput = document.getElementById('serviceFilterInput');
    this.resultsDropdown = document.getElementById('serviceSearchResults');

    this.catalogServices = [];
    this.servicesBySku = new Map();
    this.servicesLoaded = false;
    this.servicesLoadError = null;
    this.filterQuery = '';
  }

  init() {
    if (!this.tableBody) return;

    this.bindEvents();

    facturaStore.subscribe((state) => {
      this.renderRows(state.productos);
    });

    if (session.isAuthenticated()) {
      this.loadServices();
    }
  }

  bindEvents() {
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        if (this.filterInput) {
          this.filterInput.focus();
          this.openResultsDropdown();
        }
      });
    }

    if (this.filterInput) {
      this.filterInput.addEventListener('focus', () => {
        this.openResultsDropdown();
      });

      this.filterInput.addEventListener('input', (e) => {
        this.filterQuery = e.target.value.trim().toLowerCase();
        this.openResultsDropdown();
      });

      this.filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeResultsDropdown();
        } else if (e.key === 'Enter') {
          const matches = this.getFilteredServices();
          if (matches.length > 0 && !this.resultsDropdown?.classList.contains('is-hidden')) {
            e.preventDefault();
            this.handleSelectService(matches[0]);
          }
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (this.searchBox && !this.searchBox.contains(e.target)) {
        this.closeResultsDropdown();
      }
    });
  }

  async loadServices() {
    if (!session.isAuthenticated()) return;

    this.servicesLoaded = false;
    this.servicesLoadError = null;

    try {
      const response = await getServicios({ q: '', page: 1, limit: 100 });
      const items = Array.isArray(response)
        ? response
        : response?.items || response?.servicios || response?.data || response?.results || [];

      this.catalogServices = items.map((s) => {
        const sku = String(s.sku || s.id || '').trim().toUpperCase();
        return {
          id: sku,
          sku,
          nombre: String(s.nombre || s.servicio || sku),
          precioUnitario: Number(s.precioUnitario ?? s.precio_unitario ?? 0) || 0,
          descripcion: String(s.descripcion || '')
        };
      });

      this.servicesBySku = new Map();
      this.catalogServices.forEach((s) => {
        if (s.sku) {
          this.servicesBySku.set(s.sku, s);
        }
      });

      this.servicesLoaded = true;
    } catch (err) {
      this.servicesLoadError = err?.message || 'Error al cargar servicios del catálogo.';
      this.servicesLoaded = true;
    }

    if (this.resultsDropdown && !this.resultsDropdown.classList.contains('is-hidden')) {
      this.renderSearchResults();
    }
  }

  getFilteredServices() {
    const query = this.filterQuery;
    if (!query) {
      return this.catalogServices;
    }
    return this.catalogServices.filter((s) => {
      return (
        s.nombre.toLowerCase().includes(query) ||
        s.sku.toLowerCase().includes(query) ||
        s.descripcion.toLowerCase().includes(query)
      );
    });
  }

  openResultsDropdown() {
    if (!this.resultsDropdown) return;
    this.renderSearchResults();
    this.resultsDropdown.classList.remove('is-hidden');
    this.filterInput?.setAttribute('aria-expanded', 'true');
  }

  closeResultsDropdown() {
    if (!this.resultsDropdown) return;
    this.resultsDropdown.classList.add('is-hidden');
    this.filterInput?.setAttribute('aria-expanded', 'false');
  }

  renderSearchResults() {
    if (!this.resultsDropdown) return;

    const fragment = document.createDocumentFragment();

    if (!this.servicesLoaded) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'service-search-empty';
      loadingDiv.textContent = 'Cargando catálogo de servicios...';
      fragment.appendChild(loadingDiv);
      this.resultsDropdown.replaceChildren(fragment);
      return;
    }

    if (this.servicesLoadError) {
      const errDiv = document.createElement('div');
      errDiv.className = 'service-search-empty';
      errDiv.textContent = this.servicesLoadError;
      fragment.appendChild(errDiv);
      this.resultsDropdown.replaceChildren(fragment);
      return;
    }

    const matches = this.getFilteredServices();
    if (matches.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'service-search-empty';
      emptyDiv.textContent = 'No se encontraron servicios con ese criterio.';
      fragment.appendChild(emptyDiv);
      this.resultsDropdown.replaceChildren(fragment);
      return;
    }

    matches.forEach((srv) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'service-search-item';
      btn.setAttribute('role', 'option');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'service-search-name';
      nameSpan.textContent = srv.nombre;

      const metaSpan = document.createElement('span');
      metaSpan.className = 'service-search-meta font-mono';
      metaSpan.textContent = `${srv.sku} | ${formatMoney(srv.precioUnitario)}`;

      btn.appendChild(nameSpan);
      btn.appendChild(metaSpan);

      btn.addEventListener('click', () => {
        this.handleSelectService(srv);
      });

      fragment.appendChild(btn);
    });

    this.resultsDropdown.replaceChildren(fragment);
  }

  handleSelectService(service) {
    facturaStore.addProductWithService(service);
    this.filterQuery = '';
    if (this.filterInput) {
      this.filterInput.value = '';
    }
    this.closeResultsDropdown();
  }

  /**
   * Renderiza los renglones usando creación segura del DOM y textContent
   * @param {Array} productos
   */
  renderRows(productos) {
    if (!this.tableBody) return;

    const skuCounts = new Map();
    productos.forEach((p) => {
      const clean = (p.sku || '').trim().toUpperCase();
      if (clean) {
        skuCounts.set(clean, (skuCounts.get(clean) || 0) + 1);
      }
    });

    const isOnlyOneRow = productos.length <= 1;
    const fragment = document.createDocumentFragment();

    productos.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = `product-row ${item.skuError ? 'has-sku-error' : ''}`;
      row.setAttribute('data-id', item.id);

      // Columna 1: Nombre del servicio asignado (readonly)
      const serviceCol = document.createElement('div');
      serviceCol.className = 'col-service';

      const serviceInput = document.createElement('input');
      serviceInput.type = 'text';
      serviceInput.readOnly = true;
      serviceInput.setAttribute('readonly', '');
      serviceInput.setAttribute('aria-readonly', 'true');
      serviceInput.className = 'form-input is-readonly';
      serviceInput.value = item.nombreServicio || '';
      serviceInput.placeholder = 'Selecciona un servicio arriba';
      serviceInput.setAttribute('aria-label', `Servicio del renglón ${index + 1}`);

      serviceCol.appendChild(serviceInput);

      // Columna 2: SKU interno vinculado al servicio (strictly readonly, no editable manualmente)
      const skuCol = document.createElement('div');
      skuCol.className = 'col-sku';

      const skuInput = document.createElement('input');
      skuInput.type = 'text';
      skuInput.readOnly = true;
      skuInput.setAttribute('readonly', '');
      skuInput.setAttribute('aria-readonly', 'true');
      skuInput.className = `form-input input-sku font-mono is-readonly ${item.skuError ? 'input-error' : ''}`;
      skuInput.value = item.sku || '';
      skuInput.placeholder = 'Auto-asignado';
      skuInput.setAttribute('aria-label', `SKU del renglón ${index + 1}`);

      if (item.skuError) {
        skuInput.setAttribute('aria-invalid', 'true');
      }

      skuCol.appendChild(skuInput);

      if (item.skuError) {
        const errorMsg = document.createElement('span');
        errorMsg.className = 'sku-error-msg';
        errorMsg.textContent = item.skuError;
        skuCol.appendChild(errorMsg);
      } else if (item.sku && (skuCounts.get(item.sku.trim().toUpperCase()) || 0) > 1) {
        const warnMsg = document.createElement('span');
        warnMsg.className = 'sku-warn-msg';
        warnMsg.textContent = 'Advertencia: servicio repetido en la lista.';
        skuCol.appendChild(warnMsg);
      }

      // Columna 3: Cantidad (único campo editable por el usuario, entero 1..9999)
      const qtyCol = document.createElement('div');
      qtyCol.className = 'col-qty';

      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.max = '9999';
      qtyInput.step = '1';
      qtyInput.className = 'form-input input-qty';
      qtyInput.value = item.cantidad;
      qtyInput.setAttribute('aria-label', `Cantidad renglón ${index + 1}`);

      qtyInput.addEventListener('change', (e) => {
        facturaStore.updateProduct(item.id, 'cantidad', e.target.value);
      });

      qtyCol.appendChild(qtyInput);

      // Columna 4: Precio unitario (readonly, llenado desde DynamoDB)
      const priceCol = document.createElement('div');
      priceCol.className = 'col-price';

      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.readOnly = true;
      priceInput.setAttribute('readonly', '');
      priceInput.setAttribute('aria-readonly', 'true');
      priceInput.className = 'form-input input-price font-mono is-readonly';
      priceInput.value = Number(item.precioUnitario || 0).toFixed(2);
      priceInput.setAttribute('aria-label', `Precio unitario renglón ${index + 1}`);

      priceCol.appendChild(priceInput);

      // Columna 5: Importe (calculado automáticamente, no editable)
      const totalCol = document.createElement('div');
      totalCol.className = 'col-total font-mono';
      totalCol.textContent = formatMoney(item.importe);
      totalCol.setAttribute('aria-label', `Importe calculado renglón ${index + 1}`);

      // Columna 6: Acción eliminar renglón
      const actionCol = document.createElement('div');
      actionCol.className = 'col-action';

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-delete-row';
      deleteBtn.setAttribute('aria-label', `Quitar producto renglón ${index + 1}`);
      deleteBtn.disabled = isOnlyOneRow;

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

      row.appendChild(serviceCol);
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
    if (!state.productos || state.productos.length === 0) {
      return false;
    }

    return state.productos.every((item) => {
      const skuRes = validateSKU(item.sku);
      const validQty = Number.isInteger(item.cantidad) && item.cantidad >= 1 && item.cantidad <= 9999;
      return skuRes.isValid && validQty;
    });
  }
}
