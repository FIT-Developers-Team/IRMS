import { db } from '../data/db.js';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { openCameraScanner } from '../utils/scanner.js';

export function renderSohwh(container, currentUser) {
  let searchQuery = '';
  let qtyStockQuery = '';
  let reserveStockQuery = '';
  let virtualSohQuery = '';
  let lastSohwhList = [];
  let currentPage = 1;
  const pageSize = 50;

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); margin-bottom: 0; width: 100%; box-sizing: border-box;">
        <div style="min-width: 0;">
          <h3 style="display: flex; align-items: center; gap: 6px; margin: 0; white-space: nowrap; font-size: 15px;">
            <span class="material-icons-round" style="color: var(--primary-600); flex-shrink: 0; font-size: 20px;">warehouse</span>
            <span>WH - Stock Inquery</span>
          </h3>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; position: relative;">
          <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); white-space: nowrap; margin-right: 4px;" id="sohwhCountBadge">0 Records</span>
          
          <!-- SOHWH Export Dropdown -->
          <div class="custom-dropdown-container" id="dropdown-sohwh-export">
            <button id="sohwhExportBtn" class="btn-secondary" title="Export Stock Data" style="height: 28px; padding: 0 10px; font-size: 11px; font-weight: 700; gap: 4px; border-radius: 20px; flex-shrink: 0; white-space: nowrap; display: flex; align-items: center;">
              <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">download</span>
              <span>Export</span>
              <span class="material-icons-round trigger-icon" style="font-size: 14px;">expand_more</span>
            </button>
            <div class="custom-dropdown-menu" id="menu-sohwh-export" style="right: 0; left: auto; min-width: 220px; z-index: 2000; padding: 6px 0;">
              <div class="custom-dropdown-option" data-value="sku-csv" style="display: flex; align-items: center; padding: 8px 12px; font-size: 12px; cursor: pointer;">
                <span class="material-icons-round" style="font-size:16px; margin-right:8px; color:var(--success);">table_view</span>
                SKU Summary (CSV)
              </div>
              <div class="custom-dropdown-option" data-value="sku-xlsx" style="display: flex; align-items: center; padding: 8px 12px; font-size: 12px; cursor: pointer;">
                <span class="material-icons-round" style="font-size:16px; margin-right:8px; color:var(--primary-600);">grid_on</span>
                SKU Summary (Excel)
              </div>
              <div style="border-top: 1px solid var(--border-light); margin: 4px 0;"></div>
              <div class="custom-dropdown-option" data-value="loc-csv" style="display: flex; align-items: center; padding: 8px 12px; font-size: 12px; cursor: pointer;">
                <span class="material-icons-round" style="font-size:16px; margin-right:8px; color:var(--success);">table_view</span>
                Location Details (CSV)
              </div>
              <div class="custom-dropdown-option" data-value="loc-xlsx" style="display: flex; align-items: center; padding: 8px 12px; font-size: 12px; cursor: pointer;">
                <span class="material-icons-round" style="font-size:16px; margin-right:8px; color:var(--primary-600);">grid_on</span>
                Location Details (Excel)
              </div>
            </div>
          </div>

          <button id="toggleSohwhKpiBtn" class="btn-secondary" title="Toggle KPI summary cards" style="height: 28px; padding: 0 10px; font-size: 11px; font-weight: 700; gap: 4px; border-radius: 20px; flex-shrink: 0; white-space: nowrap;">
            <span class="material-icons-round" id="toggleSohwhKpiIcon" style="font-size: 15px;">${localStorage.getItem('irms_hide_kpis_wh') === 'true' ? 'expand_more' : 'expand_less'}</span>
            <span id="toggleSohwhKpiText">${localStorage.getItem('irms_hide_kpis_wh') === 'true' ? 'Show KPIs' : 'Hide KPIs'}</span>
          </button>
        </div>
      </div>

      <!-- SOHWH Summary Analytics Cards -->
      <div class="form-grid sohwh-kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 16px;">
        <div class="sohwh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">qr_code</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Unique SKUs</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statUniqueSkus">0</strong>
          </div>
        </div>

        <div class="sohwh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">layers</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Total Stock</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statTotalStock">0</strong>
          </div>
        </div>

        <div class="sohwh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">lock</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Reserve Stock</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statReserveStock">0</strong>
          </div>
        </div>

        <div class="sohwh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">laptop_mac</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Virtual SOH</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statVirtualSoh">0</strong>
          </div>
        </div>
      </div>

      <!-- Live Search / Filtering Bar -->
      <div style="display: flex; gap: 12px; margin-top: 16px; align-items: center; flex-wrap: wrap;">
        <div class="search-box-wrapper" style="flex: 2; min-width: 240px; position: relative;">
          <input 
            type="text" 
            id="sohwhSearchInput" 
            class="text-control" 
            placeholder="Search SKU, Product, or Rack Location..." 
            style="padding-left: 36px; padding-right: 36px; height: 38px; width: 100%; border-radius: 10px; font-size: 13px;"
          />
          <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
          <button id="sohwhScannerBtn" type="button" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; padding: 0; margin: 0; color: var(--primary-600); cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none;" title="Scan Barcode">
            <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
          </button>
        </div>
      </div>

      <!-- Desktop Table View -->
      <div class="data-table-wrapper" style="margin-top: 16px; overflow-x: auto;">
        <table class="custom-table">
          <thead>
            <tr class="header-label-row">
              <th style="min-width: 100px;">Product ID</th>
              <th style="min-width: 110px;">SKU Number</th>
              <th style="min-width: 180px;">Product Name</th>
              <th style="min-width: 120px;">Rack Name</th>
              <th style="width: 100px; text-align: center;">Qty Stock</th>
              <th style="width: 100px; text-align: center;">Reserve Stock</th>
              <th style="width: 120px; text-align: center;">Final Virtual SOH</th>
            </tr>
            <tr class="header-filter-row">
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th>
                <input type="text" id="filterQtyStock" class="text-control header-filter-input" placeholder="e.g. >0" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="filterReserveStock" class="text-control header-filter-input" placeholder="e.g. >0" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="filterVirtualSoh" class="text-control header-filter-input" placeholder="e.g. >0" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
            </tr>
          </thead>
          <tbody id="sohwhTableBody"></tbody>
        </table>
      </div>

      <!-- Mobile Card List View -->
      <div id="sohwhMobileCardList" class="mobile-card-list" style="margin-top: 16px;"></div>

      <!-- Pagination Footer -->
      <div id="sohwhPaginationWrapper" style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; flex-wrap: wrap; gap: 10px; border-top: 1.5px solid var(--border-light); padding-top: 12px; box-sizing: border-box;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text-secondary);" id="sohwhPaginationInfo">Showing 0 to 0 of 0 records</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="sohwhPrevPageBtn" class="btn-secondary" style="height: 32px; padding: 0 12px; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 2px;">
            <span class="material-icons-round" style="font-size: 14px;">chevron_left</span>
            <span>Prev</span>
          </button>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);" id="sohwhPageIndicator">Page 1 of 1</span>
          <button id="sohwhNextPageBtn" class="btn-secondary" style="height: 32px; padding: 0 12px; font-size: 11px; font-weight: 700; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 2px;">
            <span>Next</span>
            <span class="material-icons-round" style="font-size: 14px;">chevron_right</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // DOM elements
  const sohwhSearchInput = container.querySelector('#sohwhSearchInput');
  const filterQtyStock = container.querySelector('#filterQtyStock');
  const filterReserveStock = container.querySelector('#filterReserveStock');
  const filterVirtualSoh = container.querySelector('#filterVirtualSoh');

  const sohwhTableBody = container.querySelector('#sohwhTableBody');
  const sohwhMobileCardList = container.querySelector('#sohwhMobileCardList');
  const sohwhCountBadge = container.querySelector('#sohwhCountBadge');

  const statUniqueSkus = container.querySelector('#statUniqueSkus');
  const statTotalStock = container.querySelector('#statTotalStock');
  const statReserveStock = container.querySelector('#statReserveStock');
  const statVirtualSoh = container.querySelector('#statVirtualSoh');

  // KPI Toggle Handlers
  const kpiGrid = container.querySelector('.sohwh-kpi-grid');
  const toggleKpiBtn = container.querySelector('#toggleSohwhKpiBtn');

  function applyKpiVisibility() {
    const isHidden = localStorage.getItem('irms_hide_kpis_wh') === 'true';
    if (kpiGrid) {
      if (isHidden) {
        kpiGrid.style.display = 'none';
      } else {
        kpiGrid.style.display = '';
      }
    }
  }

  if (toggleKpiBtn) {
    toggleKpiBtn.addEventListener('click', () => {
      const isHidden = localStorage.getItem('irms_hide_kpis_wh') === 'true';
      const newHidden = !isHidden;
      localStorage.setItem('irms_hide_kpis_wh', newHidden);

      const icon = container.querySelector('#toggleSohwhKpiIcon');
      const text = container.querySelector('#toggleSohwhKpiText');
      if (icon) icon.textContent = newHidden ? 'expand_more' : 'expand_less';
      if (text) text.textContent = newHidden ? 'Show KPIs' : 'Hide KPIs';

      applyKpiVisibility();
    });
  }

  applyKpiVisibility();

  // Operators parsing (e.g. >10, <=5)
  function matchNumericFilter(value, filterStr) {
    if (!filterStr) return true;
    const clean = filterStr.trim();
    if (clean.startsWith('>=')) {
      const num = parseFloat(clean.substring(2));
      return isNaN(num) ? true : value >= num;
    }
    if (clean.startsWith('<=')) {
      const num = parseFloat(clean.substring(2));
      return isNaN(num) ? true : value <= num;
    }
    if (clean.startsWith('>')) {
      const num = parseFloat(clean.substring(1));
      return isNaN(num) ? true : value > num;
    }
    if (clean.startsWith('<')) {
      const num = parseFloat(clean.substring(1));
      return isNaN(num) ? true : value < num;
    }
    const num = parseFloat(clean);
    return isNaN(num) ? true : value === num;
  }

  function renderTable() {
    const rawList = db.getSohwhList();

    // Calculate original totals
    const uniqueSkus = new Set(rawList.map(i => i.skuNumber)).size;
    const totalQtyStock = rawList.reduce((sum, i) => sum + (i.qtyStock || 0), 0);
    const totalReserve = rawList.reduce((sum, i) => sum + (i.reserveStock || 0), 0);
    const totalVirtual = rawList.reduce((sum, i) => sum + (i.finalVirtualSoh || 0), 0);

    statUniqueSkus.textContent = uniqueSkus;
    statTotalStock.textContent = totalQtyStock;
    statReserveStock.textContent = totalReserve;
    statVirtualSoh.textContent = totalVirtual;

    // Filter list
    let filtered = [...rawList];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        (item.skuNumber || '').toLowerCase().includes(q) ||
        (item.productName || '').toLowerCase().includes(q) ||
        (item.rackName || '').toLowerCase().includes(q) ||
        (item.productId || '').toLowerCase().includes(q)
      );
    }

    if (qtyStockQuery) {
      filtered = filtered.filter(item => matchNumericFilter(item.qtyStock, qtyStockQuery));
    }
    if (reserveStockQuery) {
      filtered = filtered.filter(item => matchNumericFilter(item.reserveStock, reserveStockQuery));
    }
    if (virtualSohQuery) {
      filtered = filtered.filter(item => matchNumericFilter(item.finalVirtualSoh, virtualSohQuery));
    }

    // Sort by Product ID / SKU Number
    filtered.sort((a, b) => (a.productId || '').localeCompare(b.productId || ''));

    lastSohwhList = filtered;
    sohwhCountBadge.textContent = `${filtered.length} Record${filtered.length === 1 ? '' : 's'}`;

    const totalRecords = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalRecords);
    const paginatedList = filtered.slice(startIdx, endIdx);

    // Update pagination controls
    const pagWrapper = container.querySelector('#sohwhPaginationWrapper');
    const pagInfo = container.querySelector('#sohwhPaginationInfo');
    const pageInd = container.querySelector('#sohwhPageIndicator');
    const prevBtn = container.querySelector('#sohwhPrevPageBtn');
    const nextBtn = container.querySelector('#sohwhNextPageBtn');

    if (totalRecords === 0) {
      if (pagWrapper) pagWrapper.style.display = 'none';
    } else {
      if (pagWrapper) pagWrapper.style.display = 'flex';
      if (pagInfo) pagInfo.textContent = `Showing ${startIdx + 1} to ${endIdx} of ${totalRecords} records`;
      if (pageInd) pageInd.textContent = `Page ${currentPage} of ${totalPages}`;
      if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.style.pointerEvents = currentPage === 1 ? 'none' : 'auto';
      }
      if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        nextBtn.style.pointerEvents = currentPage === totalPages ? 'none' : 'auto';
      }
    }

    if (!totalRecords) {
      const emptyHtml = `
        <div class="empty-state">
          <span class="material-icons-round">warehouse</span>
          <p>No stock inquiry records found matching the filters.</p>
        </div>
      `;
      sohwhTableBody.innerHTML = `
        <tr>
          <td colspan="7">
            ${emptyHtml}
          </td>
        </tr>
      `;
      sohwhMobileCardList.innerHTML = emptyHtml;
      return;
    }

    // Render Desktop rows
    sohwhTableBody.innerHTML = paginatedList.map(item => `
      <tr>
        <td><span style="font-size:12px; color:var(--text-secondary); font-family: monospace;">${escapeHtml(item.productId)}</span></td>
        <td><strong style="color:var(--primary-700); font-family: monospace; font-size: 13px;">${escapeHtml(item.skuNumber)}</strong></td>
        <td><strong style="font-size: 13px; color: var(--text-primary); display:block;">${escapeHtml(item.productName)}</strong></td>
        <td>
          <span class="location-badge" style="font-family: monospace; font-size:11px; font-weight: 700; color: var(--primary-800); background: var(--primary-50); padding: 4px 8px; border-radius: 6px;">
            ${escapeHtml(item.rackName)}
          </span>
        </td>
        <td style="text-align: center;"><strong style="font-size: 14px;">${item.qtyStock}</strong></td>
        <td style="text-align: center;"><span style="font-size:13px; font-weight: 600; color: var(--text-secondary);">${item.reserveStock}</span></td>
        <td style="text-align: center;"><strong style="font-size: 14px; color: var(--success);">${item.finalVirtualSoh}</strong></td>
      </tr>
    `).join('');

    // Render Mobile Cards
    sohwhMobileCardList.innerHTML = paginatedList.map(item => `
      <div class="mobile-task-card" style="padding: 14px;">
        <div class="card-header-row">
          <span class="picking-id-label" style="font-size: 14px; font-family: monospace;">${escapeHtml(item.skuNumber)}</span>
          <span class="location-badge" style="font-family: monospace; font-size:11px; font-weight: 700; color: var(--primary-800); background: var(--primary-50);">${escapeHtml(item.rackName)}</span>
        </div>
        
        <div class="card-body-content" style="margin-top: 6px;">
          <div class="product-name" style="font-size: 14px; font-weight: 700;">${escapeHtml(item.productName)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: monospace;">ID: ${escapeHtml(item.productId)}</div>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 10px; margin-top: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 11px; border: 1px solid var(--border-light); text-align: center;">
          <div>
            <div style="color:var(--text-muted); font-size:9px; font-weight:700; text-transform:uppercase;">Qty Stock</div>
            <strong style="font-size: 13px; color: var(--text-primary);">${item.qtyStock}</strong>
          </div>
          <div>
            <div style="color:var(--text-muted); font-size:9px; font-weight:700; text-transform:uppercase;">Reserve</div>
            <strong style="font-size: 13px; color: var(--text-secondary);">${item.reserveStock}</strong>
          </div>
          <div>
            <div style="color:var(--text-muted); font-size:9px; font-weight:700; text-transform:uppercase;">Virtual SOH</div>
            <strong style="font-size: 13px; color: var(--success);">${item.finalVirtualSoh}</strong>
          </div>
        </div>
      </div>
    `).join('');
  }

  // --- Export Functionality (CSV & XLSX) ---
  function getExportTimestamp() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  function downloadCsv(data, filename) {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadXlsx(data, sheetName, filename) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filename);
  }

  function getSkuSummaryExportData() {
    const skuGroups = {};
    lastSohwhList.forEach(item => {
      const sku = item.skuNumber;
      if (!skuGroups[sku]) {
        skuGroups[sku] = {
          'SKU Number': sku,
          'Product ID': item.productId,
          'Product Name': item.productName,
          'Locations Count': 0,
          'Total Qty Stock': 0,
          'Total Reserve Stock': 0,
          'Total Virtual SOH': 0
        };
      }
      skuGroups[sku]['Locations Count'] += 1;
      skuGroups[sku]['Total Qty Stock'] += item.qtyStock;
      skuGroups[sku]['Total Reserve Stock'] += item.reserveStock;
      skuGroups[sku]['Total Virtual SOH'] += item.finalVirtualSoh;
    });
    return Object.values(skuGroups);
  }

  function getLocationDetailsExportData() {
    return lastSohwhList.map(item => ({
      'Product ID': item.productId,
      'SKU Number': item.skuNumber,
      'Product Name': item.productName,
      'Rack Name': item.rackName,
      'Qty Stock': item.qtyStock,
      'Reserve Stock': item.reserveStock,
      'Final Virtual SOH': item.finalVirtualSoh
    }));
  }

  // Bind filter events
  sohwhSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });

  filterQtyStock.addEventListener('input', (e) => {
    qtyStockQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });

  filterReserveStock.addEventListener('input', (e) => {
    reserveStockQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });

  filterVirtualSoh.addEventListener('input', (e) => {
    virtualSohQuery = e.target.value.trim();
    currentPage = 1;
    renderTable();
  });

  // Bind Export Dropdown events
  const exportDropdown = container.querySelector('#dropdown-sohwh-export');
  const exportBtn = container.querySelector('#sohwhExportBtn');
  const exportMenu = container.querySelector('#menu-sohwh-export');

  if (exportDropdown && exportBtn && exportMenu) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = exportDropdown.classList.contains('open');
      container.querySelectorAll('.custom-dropdown-container').forEach(c => {
        if (c !== exportDropdown) c.classList.remove('open');
      });
      if (isOpen) {
        exportDropdown.classList.remove('open');
      } else {
        exportDropdown.classList.add('open');
      }
    });

    exportMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const value = opt.dataset.value;
        exportDropdown.classList.remove('open');

        if (lastSohwhList.length === 0) {
          alert('No SOHWH data matches your filters to export.');
          return;
        }

        const timestamp = getExportTimestamp();
        if (value === 'sku-csv') {
          const exportData = getSkuSummaryExportData();
          downloadCsv(exportData, `SOHWH_Summary_${timestamp}.csv`);
        } else if (value === 'sku-xlsx') {
          const exportData = getSkuSummaryExportData();
          downloadXlsx(exportData, 'SOHWH Summary', `SOHWH_Summary_${timestamp}.xlsx`);
        } else if (value === 'loc-csv') {
          const exportData = getLocationDetailsExportData();
          downloadCsv(exportData, `SOHWH_Location_Details_${timestamp}.csv`);
        } else if (value === 'loc-xlsx') {
          const exportData = getLocationDetailsExportData();
          downloadXlsx(exportData, 'SOHWH Locations', `SOHWH_Location_Details_${timestamp}.xlsx`);
        }
      });
    });
  }

  // --- Barcode Scanner Event Bindings ---
  const sohwhScannerBtn = container.querySelector('#sohwhScannerBtn');
  if (sohwhScannerBtn) {
    sohwhScannerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCameraScanner((scannedValue) => {
        searchQuery = scannedValue;
        sohwhSearchInput.value = scannedValue;
        currentPage = 1;
        renderTable();
      });
    });
  }

  // --- Pagination Button Event Bindings ---
  const prevBtn = container.querySelector('#sohwhPrevPageBtn');
  const nextBtn = container.querySelector('#sohwhNextPageBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(lastSohwhList.length / pageSize);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });
  }

  // Capture the root element this component just rendered
  const ownRoot = container.firstElementChild;

  // Subscribe to DB updates
  const unsubscribe = db.subscribe(() => {
    if (!container.isConnected || container.firstElementChild !== ownRoot) {
      unsubscribe();
      return;
    }
    renderTable();
  });

  // Init
  renderTable();
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
