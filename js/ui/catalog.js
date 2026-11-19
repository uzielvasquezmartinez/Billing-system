/**
 * Controlador de la Vista: Catálogo de Servicios
 * Búsqueda reactiva, paginación real (GET /servicios?q=&page=&limit=12)
 * y detalle dinámico de 5 secciones / 50 características (GET /servicios/{id}).
 */

import { getServicios, getServicioById } from '../api/servicios.js';
import { ApiError } from '../api/client.js';
import { session } from '../auth/session.js';
import { formatMoney } from '../utils/money.js';
import { AlertManager } from './alerts.js';

const PAGE_LIMIT = 12;

export class CatalogController {
  constructor() {
    this.container = document.getElementById('viewCatalogo');
    this.searchInput = document.getElementById('catalogSearchInput');
    this.tableBody = document.getElementById('catalogTableBody');
    this.paginationInfo = document.getElementById('catalogPaginationInfo');
    this.prevBtn = document.getElementById('catalogPrevBtn');
    this.nextBtn = document.getElementById('catalogNextBtn');

    this.detailTitle = document.getElementById('catalogDetailTitle');
    this.detailSkusContainer = document.getElementById('catalogDetailSkus');
    this.accordionsContainer = document.getElementById('catalogAccordions');

    const alertEl = document.getElementById('catalogAlert');
    this.alertManager = new AlertManager(alertEl);

    this.services = [];
    this.selectedServiceId = null;
    this.currentQuery = '';
    this.currentPage = 1;
    this.totalPages = 1;
    this.totalItems = 0;

    this.searchDebounceTimer = null;
    this.listRequestSeq = 0;
    this.detailRequestSeq = 0;
  }

  init() {
    if (!this.container || !session.isAuthenticated()) return;

    this.bindEvents();
    this.loadServices(1, '');
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = setTimeout(() => {
          this.loadServices(1, query);
        }, 250);
      });

      this.searchInput.addEventListener('search', (e) => {
        clearTimeout(this.searchDebounceTimer);
        this.loadServices(1, e.target.value.trim());
      });
    }

    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.loadServices(this.currentPage - 1, this.currentQuery);
        }
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        if (this.currentPage < this.totalPages) {
          this.loadServices(this.currentPage + 1, this.currentQuery);
        }
      });
    }
  }

  async loadServices(page = 1, query = '') {
    const requestId = ++this.listRequestSeq;
    this.currentPage = page;
    this.currentQuery = query;
    this.alertManager.clear();

    if (this.paginationInfo) {
      this.paginationInfo.textContent = 'Cargando servicios...';
    }
    if (this.prevBtn) this.prevBtn.disabled = true;
    if (this.nextBtn) this.nextBtn.disabled = true;

    try {
      const response = await getServicios({
        q: query,
        page,
        limit: PAGE_LIMIT
      });

      if (requestId !== this.listRequestSeq) return;

      const items = Array.isArray(response)
        ? response
        : response?.items || response?.servicios || response?.data || response?.results || [];

      const total = Number(
        response?.total ??
        response?.totalItems ??
        response?.pagination?.total ??
        items.length
      );

      const resolvedPage = Number(
        response?.page ?? response?.pagination?.page ?? page
      );

      const resolvedLimit = Number(
        response?.limit ?? response?.pagination?.limit ?? PAGE_LIMIT
      );

      const resolvedTotalPages = Number(
        response?.totalPages ??
        response?.total_pages ??
        response?.pagination?.totalPages ??
        Math.max(1, Math.ceil(total / (resolvedLimit || PAGE_LIMIT)))
      );

      this.services = items;
      this.currentPage = Math.max(1, resolvedPage);
      this.totalItems = Number.isFinite(total) ? total : items.length;
      this.totalPages = Math.max(1, Number.isFinite(resolvedTotalPages) ? resolvedTotalPages : 1);

      this.renderTable(this.services);
      this.updatePaginationUI();

      if (this.services.length > 0) {
        const stillVisible = this.services.find(
          (s) => (s.id || s.sku) === this.selectedServiceId
        );
        const initialItem = stillVisible || this.services[0];
        this.selectService(initialItem);
      } else {
        this.selectedServiceId = null;
        this.renderEmptyDetail();
      }
    } catch (err) {
      if (requestId !== this.listRequestSeq) return;
      const msg = err instanceof ApiError ? err.message : 'No fue posible cargar el catálogo de servicios.';
      this.alertManager.showError(msg);
      this.services = [];
      this.renderTable([]);
      if (this.paginationInfo) {
        this.paginationInfo.textContent = 'Error al cargar servicios';
      }
      this.renderEmptyDetail();
    }
  }

  updatePaginationUI() {
    if (this.paginationInfo) {
      if (this.totalItems === 0 || this.services.length === 0) {
        this.paginationInfo.textContent = 'Sin resultados para mostrar';
      } else {
        const start = (this.currentPage - 1) * PAGE_LIMIT + 1;
        const end = start + this.services.length - 1;
        this.paginationInfo.textContent =
          `Mostrando ${start}-${end} de ${this.totalItems} servicios (Página ${this.currentPage} de ${this.totalPages})`;
      }
    }

    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentPage <= 1;
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentPage >= this.totalPages;
    }
  }

  renderTable(items) {
    if (!this.tableBody) return;

    const fragment = document.createDocumentFragment();

    if (!items || items.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'summary-note';
      td.textContent = 'No se encontraron servicios en el catálogo.';
      tr.appendChild(td);
      fragment.appendChild(tr);
      this.tableBody.replaceChildren(fragment);
      return;
    }

    items.forEach((item) => {
      const serviceId = item.id || item.sku || '';
      const isSelected = this.selectedServiceId === serviceId;

      const tr = document.createElement('tr');
      tr.className = `catalog-row ${isSelected ? 'is-selected' : ''}`;
      tr.setAttribute('data-service-id', serviceId);
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      const tdSku = document.createElement('td');
      tdSku.className = 'font-mono font-semibold';
      tdSku.textContent = item.sku || serviceId || '—';

      const tdNombre = document.createElement('td');
      tdNombre.className = 'font-semibold';
      tdNombre.textContent = item.nombre || item.servicio || '—';

      const tdDesc = document.createElement('td');
      tdDesc.textContent = item.descripcion || '—';

      const tdPrecio = document.createElement('td');
      tdPrecio.className = 'font-mono';
      const precio = item.precioUnitario ?? item.precio_unitario ?? item.precioBase ?? 0;
      tdPrecio.textContent = formatMoney(precio);

      tr.appendChild(tdSku);
      tr.appendChild(tdNombre);
      tr.appendChild(tdDesc);
      tr.appendChild(tdPrecio);

      const handleSelect = () => {
        this.selectService(item);
      };

      tr.addEventListener('click', handleSelect);
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      });

      fragment.appendChild(tr);
    });

    this.tableBody.replaceChildren(fragment);
  }

  selectService(item) {
    if (!item) return;
    const serviceId = item.id || item.sku;
    if (!serviceId) return;

    this.selectedServiceId = serviceId;

    if (this.tableBody) {
      this.tableBody.querySelectorAll('.catalog-row').forEach((row) => {
        const isCurrent = row.getAttribute('data-service-id') === serviceId;
        row.classList.toggle('is-selected', isCurrent);
        row.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      });
    }

    this.loadServiceDetail(serviceId, item);
  }

  async loadServiceDetail(serviceId, summaryItem = null) {
    const requestId = ++this.detailRequestSeq;

    if (this.detailTitle && summaryItem) {
      this.detailTitle.textContent = summaryItem.nombre || serviceId;
    }
    if (this.detailSkusContainer && summaryItem) {
      this.renderSkuPills(summaryItem);
    }
    if (this.accordionsContainer) {
      const loadingNote = document.createElement('p');
      loadingNote.className = 'summary-note';
      loadingNote.textContent = 'Cargando características del servicio...';
      this.accordionsContainer.replaceChildren(loadingNote);
    }

    try {
      const detail = await getServicioById(serviceId);
      if (requestId !== this.detailRequestSeq) return;

      this.renderDetail(detail);
    } catch (err) {
      if (requestId !== this.detailRequestSeq) return;
      const msg = err instanceof ApiError ? err.message : 'No fue posible cargar el detalle del servicio.';
      this.alertManager.showError(msg);
      if (this.accordionsContainer) {
        const errorNote = document.createElement('p');
        errorNote.className = 'summary-note';
        errorNote.textContent = 'Detalle no disponible.';
        this.accordionsContainer.replaceChildren(errorNote);
      }
    }
  }

  renderSkuPills(service) {
    if (!this.detailSkusContainer) return;

    const skus = Array.isArray(service.skus) && service.skus.length > 0
      ? service.skus
      : [service.sku || service.id].filter(Boolean);

    const frag = document.createDocumentFragment();
    skus.forEach((sku) => {
      const badge = document.createElement('span');
      badge.className = 'sku-pill font-mono';
      badge.textContent = String(sku);
      frag.appendChild(badge);
    });
    this.detailSkusContainer.replaceChildren(frag);
  }

  renderDetail(service) {
    if (!service) return;

    if (this.detailTitle) {
      this.detailTitle.textContent = service.nombre || service.servicio || service.id || 'Servicio';
    }

    this.renderSkuPills(service);

    if (!this.accordionsContainer) return;

    const secciones = Array.isArray(service.secciones) ? service.secciones : [];
    if (secciones.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'summary-note';
      emptyMsg.textContent = 'Este servicio no tiene secciones de características registradas.';
      this.accordionsContainer.replaceChildren(emptyMsg);
      return;
    }

    const fragment = document.createDocumentFragment();

    secciones.forEach((seccion, index) => {
      const details = document.createElement('details');
      details.className = 'accordion-item';
      if (index === 0) {
        details.open = true;
      }

      const summary = document.createElement('summary');
      summary.className = 'accordion-title';

      const titleSpan = document.createElement('span');
      titleSpan.textContent = seccion.titulo || `Sección ${index + 1}`;

      const atributos = Array.isArray(seccion.atributos) ? seccion.atributos : [];
      const countSpan = document.createElement('span');
      countSpan.className = 'font-mono';
      countSpan.textContent = String(atributos.length);

      summary.appendChild(titleSpan);
      summary.appendChild(countSpan);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'accordion-content';

      atributos.forEach((attr) => {
        const row = document.createElement('div');
        row.className = 'fiscal-detail-row';

        const dt = document.createElement('span');
        dt.className = 'fiscal-label';
        dt.textContent = attr.etiqueta || attr.clave || '';

        const dd = document.createElement('span');
        dd.className = 'fiscal-value font-mono';
        const rawVal = attr.valor;
        dd.textContent =
          rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
            ? String(rawVal)
            : '—';

        row.appendChild(dt);
        row.appendChild(dd);
        contentDiv.appendChild(row);
      });

      details.appendChild(summary);
      details.appendChild(contentDiv);
      fragment.appendChild(details);
    });

    this.accordionsContainer.replaceChildren(fragment);
  }

  renderEmptyDetail() {
    if (this.detailTitle) {
      this.detailTitle.textContent = 'Selecciona un servicio';
    }
    if (this.detailSkusContainer) {
      this.detailSkusContainer.replaceChildren();
    }
    if (this.accordionsContainer) {
      this.accordionsContainer.replaceChildren();
    }
  }
}
