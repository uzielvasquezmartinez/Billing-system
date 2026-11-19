/**
 * Controlador de Lista de Productos Dinámica
 * Selector de servicios poblado desde GET /servicios?limit=100 (sin captura manual de SKU),
 * precioUnitario en modo readonly, cantidad, importe calculado y marcado de errores 422.
 */

import { facturaStore } from '../state/factura-store.js';
import { getServicios } from '../api/servicios.js';
import { formatMoney } from '../utils/money.js';
import { validateSKU } from '../utils/validators.js';

export class ItemsTableController {
  constructor() {
    this.tableBody = document.getElementById('productsTableBody');
    this.addBtn = document.getElementById('addProductBtn');
    this.filterInput = document.getElementById('serviceFilterInput');

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

    this.loadServices();
  }

  bindEvents() {
    if (this.addBtn) {
      this.addBtn.addEventListener('click', () => {
        facturaStore.addProduct();
      });
    }

    if (this.filterInput) {
      this.filterInput.addEventListener('input', (e) => {
        this.filterQuery = e.target.value.trim().toLowerCase();
        this.renderRows(facturaStore.getState().productos);
      });
    }
  }

  async loadServices() {
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

    this.renderRows(facturaStore.getState().productos);
  }

  getFilteredServices(currentSku) {
    const query = this.filterQuery;
    const baseList = !query
      ? this.catalogServices
      : this.catalogServices.filter((s) => {
          return (
            s.nombre.toLowerCase().includes(query) ||
            s.sku.toLowerCase().includes(query) ||
            s.descripcion.toLowerCase().includes(query)
          );
        });

    if (currentSku && !baseList.some((s) => s.sku === currentSku)) {
      const currentService = this.servicesBySku.get(currentSku);
      if (currentService) {
        return [currentService, ...baseList];
      }
    }

    return baseList;
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

      // Columna 1: Selector de Servicio (almacena id_service SRV-XXX)
      const skuCol = document.createElement('div');
      skuCol.className = 'col-sku';

      const serviceSelect = document.createElement('select');
      serviceSelect.className = `form-input input-sku ${item.skuError ? 'input-error' : ''}`;
      serviceSelect.setAttribute('aria-label', `Servicio del renglón ${index + 1}`);

      if (item.skuError) {
        serviceSelect.setAttribute('aria-invalid', 'true');
      }

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      if (!this.servicesLoaded) {
        defaultOption.textContent = 'Cargando servicios...';
      } else if (this.servicesLoadError) {
        defaultOption.textContent = 'Error al cargar servicios';
      } else {
        defaultOption.textContent = 'Selecciona un servicio...';
      }
      serviceSelect.appendChild(defaultOption);

      const optionsList = this.getFilteredServices(item.sku);
      optionsList.forEach((srv) => {
        const opt = document.createElement('option');
        opt.value = srv.sku;
        opt.textContent = `${srv.nombre} (${srv.sku})`;
        serviceSelect.appendChild(opt);
      });

      // Si el renglón tiene un SKU que ya no existe en el listado, conservar la opción visible para depuración
      if (item.sku && !optionsList.some((s) => s.sku === item.sku)) {
        const orphanOpt = document.createElement('option');
        orphanOpt.value = item.sku;
        orphanOpt.textContent = item.nombreServicio
          ? `${item.nombreServicio} (${item.sku})`
          : item.sku;
        serviceSelect.appendChild(orphanOpt);
      }

      serviceSelect.value = item.sku || '';

      serviceSelect.addEventListener('change', (e) => {
        const selectedSku = e.target.value.trim().toUpperCase();
        const selectedService = selectedSku ? this.servicesBySku.get(selectedSku) || null : null;
        facturaStore.setProductService(item.id, selectedService);
      });

      skuCol.appendChild(serviceSelect);

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

      // Columna 2: Cantidad (entero 1..9999)
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

      // Columna 3: Precio unitario (readonly, llenado desde DynamoDB)
      const priceCol = document.createElement('div');
      priceCol.className = 'col-price';

      const priceInput = document.createElement('input');
      priceInput.type = 'number';
      priceInput.readOnly = true;
      priceInput.setAttribute('readonly', '');
      priceInput.setAttribute('aria-readonly', 'true');
      priceInput.className = 'form-input input-price font-mono';
      priceInput.value = Number(item.precioUnitario || 0).toFixed(2);
      priceInput.setAttribute('aria-label', `Precio unitario renglón ${index + 1}`);

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
