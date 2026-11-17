/**
 * Controlador de la Vista: Catálogo de Servicios
 * Búsqueda reactiva por nombre o SKU, tabla paginada y panel lateral de detalle SAT.
 */

import { CONFIG } from '../config.js';
import { formatMoney } from '../utils/money.js';

export class CatalogController {
  constructor() {
    this.container = document.getElementById('viewCatalogo');
    this.searchInput = document.getElementById('catalogSearchInput');
    this.tableBody = document.getElementById('catalogTableBody');

    this.detailTitle = document.getElementById('catalogDetailTitle');
    this.detailSkusContainer = document.getElementById('catalogDetailSkus');
    this.fiscalDetailsList = document.getElementById('catalogFiscalDetails');

    this.services = [...CONFIG.CATALOG_SERVICES];
    this.selectedService = this.services[0];
  }

  init() {
    if (!this.container) return;

    this.bindEvents();
    this.renderTable(this.services);
    this.renderDetail(this.selectedService);
  }

  bindEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const filtered = this.services.filter((s) => {
          const matchName = s.servicio.toLowerCase().includes(query);
          const matchCategory = s.categoria.toLowerCase().includes(query);
          const matchSku = s.skus.some((sku) => sku.toLowerCase().includes(query));
          return matchName || matchCategory || matchSku;
        });
        this.renderTable(filtered);
      });
    }
  }

  renderTable(items) {
    if (!this.tableBody) return;

    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const isSelected = this.selectedService?.id === item.id;
      const tr = document.createElement('tr');
      tr.className = `catalog-row ${isSelected ? 'is-selected' : ''}`;
      tr.setAttribute('tabindex', '0');
      tr.setAttribute('role', 'button');
      tr.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      const tdServicio = document.createElement('td');
      tdServicio.className = 'font-semibold';
      tdServicio.textContent = item.servicio;

      const tdCat = document.createElement('td');
      tdCat.textContent = item.categoria;

      const tdTipo = document.createElement('td');
      tdTipo.textContent = item.tipo;

      const tdPrecio = document.createElement('td');
      tdPrecio.className = 'font-mono';
      tdPrecio.textContent = formatMoney(item.precioBase);

      tr.appendChild(tdServicio);
      tr.appendChild(tdCat);
      tr.appendChild(tdTipo);
      tr.appendChild(tdPrecio);

      // Eventos de selección
      const selectItem = () => {
        this.selectedService = item;
        this.renderDetail(item);
        this.tableBody.querySelectorAll('.catalog-row').forEach((r) => {
          r.classList.remove('is-selected');
          r.setAttribute('aria-pressed', 'false');
        });
        tr.classList.add('is-selected');
        tr.setAttribute('aria-pressed', 'true');
      };

      tr.addEventListener('click', selectItem);
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectItem();
        }
      });

      fragment.appendChild(tr);
    });

    this.tableBody.replaceChildren(fragment);
  }

  renderDetail(service) {
    if (!service) return;

    if (this.detailTitle) {
      this.detailTitle.textContent = service.servicio;
    }

    if (this.detailSkusContainer) {
      const frag = document.createDocumentFragment();
      service.skus.forEach((sku) => {
        const badge = document.createElement('span');
        badge.className = 'sku-pill font-mono';
        badge.textContent = sku;
        frag.appendChild(badge);
      });
      this.detailSkusContainer.replaceChildren(frag);
    }

    if (this.fiscalDetailsList && service.sat) {
      const satFields = [
        { label: 'Clave de producto o servicio SAT', value: service.sat.claveProdServ },
        { label: 'Clave de unidad SAT', value: service.sat.claveUnidad },
        { label: 'Unidad de medida', value: service.sat.unidadMedida },
        { label: 'Objeto de impuesto', value: service.sat.objetoImpuesto },
        { label: 'Tasa de IVA', value: service.sat.tasaIva },
        { label: 'Aplica IEPS', value: service.sat.aplicaIeps },
        { label: 'Retención de IVA', value: service.sat.retencionIva },
        { label: 'Retención de ISR', value: service.sat.retencionIsr },
        { label: 'Exento de IVA', value: service.sat.exentoIva },
        { label: 'Fundamento legal o nota fiscal', value: service.sat.fundamentoFiscal },
        { label: 'Requiere factura', value: service.sat.requiereFactura },
        { label: 'Cuenta contable', value: service.sat.cuentaContable }
      ];

      const fragment = document.createDocumentFragment();
      satFields.forEach(({ label, value }) => {
        const row = document.createElement('div');
        row.className = 'fiscal-detail-row';

        const dt = document.createElement('span');
        dt.className = 'fiscal-label';
        dt.textContent = label;

        const dd = document.createElement('span');
        dd.className = 'fiscal-value font-mono';
        dd.textContent = value;

        row.appendChild(dt);
        row.appendChild(dd);
        fragment.appendChild(row);
      });

      this.fiscalDetailsList.replaceChildren(fragment);
    }
  }
}
