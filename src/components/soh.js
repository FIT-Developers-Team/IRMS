import { db } from '../data/db.js';

export function renderSoh(container, currentUser) {
  let skuQuery = '';
  let nameQuery = '';
  let mobileSearchQuery = '';
  let foodFilter = 'all';
  let categoryFilter = 'all';
  let l1CategoryFilterVal = 'all';
  let l2CategoryFilterVal = 'all';
  let actionFilterVal = 'all';

  // Numeric queries
  let locationsQuery = '';
  let qtySohQuery = '';
  let qtyOnSoQuery = '';
  let countSoQuery = '';
  let qtyOnLdpQuery = '';
  let stockAgeQuery = '';

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">inventory_2</span>
            Stock On Hand (SOH)
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">
            Real-time stock levels and sales allocation status
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-secondary);" id="sohCountBadge">0 SKUs</span>
        </div>
      </div>

      <!-- SOH Summary Analytics Cards -->
      <div class="form-grid soh-kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-top: 16px;">
        <div class="soh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">qr_code</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Unique SKUs</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statUniqueSkus">0</strong>
          </div>
        </div>

        <div class="soh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">layers</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Total SOH Qty</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statTotalQty">0</strong>
          </div>
        </div>

        <div class="soh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">shopping_bag</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Qty On SO</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statQtyOnSo">0</strong>
          </div>
        </div>

        <div class="soh-kpi-card" style="background: #ffffff; padding: 16px; border: 1.5px solid var(--border-light); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">schedule</span>
          </div>
          <div>
            <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Oldest Stock Age</span>
            <strong style="font-size: 18px; display: block; color: var(--text-primary); margin-top: 2px;" id="statOldestAge">0d</strong>
          </div>
        </div>
      </div>

      <!-- Mobile-only Filters Header -->
      <div class="mobile-only-filters-container" style="margin-top: 16px;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <div class="search-box-wrapper" style="flex: 1; position: relative;">
            <input 
              type="text" 
              id="mobileSohSearchInput" 
              class="text-control" 
              placeholder="Search SKU, Product..." 
              style="padding-left: 36px;"
            />
            <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
          </div>
          <button id="mobileFilterToggleBtn" class="btn-secondary" style="height: 40px; padding: 0 12px; display: flex; align-items: center; gap: 6px; border-radius: 10px; font-size: 13px; font-weight: 700;">
            <span class="material-icons-round" style="font-size: 18px;">filter_alt</span>
            <span>Filters</span>
          </button>
        </div>

        <div id="mobileFiltersPanel" style="display: none; background: #f8fafc; border: 1.5px solid var(--border-light); border-radius: 14px; padding: 12px; margin-top: 8px; gap: 10px; flex-direction: column;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); width: 60px;">Type:</label>
            <div class="custom-dropdown-container" id="dropdown-mobile-food" style="flex: 1;">
              <button type="button" class="custom-dropdown-trigger" id="trigger-mobile-food" style="height: 36px; padding: 0 12px; font-size: 12px;">
                <span class="trigger-label">All Types</span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" id="menu-mobile-food"></div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); width: 60px;">L0 Cat:</label>
            <div class="custom-dropdown-container" id="dropdown-mobile-l0" style="flex: 1;">
              <button type="button" class="custom-dropdown-trigger" id="trigger-mobile-l0" style="height: 36px; padding: 0 12px; font-size: 12px;">
                <span class="trigger-label">All L0</span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" id="menu-mobile-l0"></div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); width: 60px;">L1 Cat:</label>
            <div class="custom-dropdown-container" id="dropdown-mobile-l1" style="flex: 1;">
              <button type="button" class="custom-dropdown-trigger" id="trigger-mobile-l1" style="height: 36px; padding: 0 12px; font-size: 12px;">
                <span class="trigger-label">All L1</span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" id="menu-mobile-l1"></div>
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <label style="font-size: 11px; font-weight: 700; color: var(--text-muted); width: 60px;">L2 Cat:</label>
            <div class="custom-dropdown-container" id="dropdown-mobile-l2" style="flex: 1;">
              <button type="button" class="custom-dropdown-trigger" id="trigger-mobile-l2" style="height: 36px; padding: 0 12px; font-size: 12px;">
                <span class="trigger-label">All L2</span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" id="menu-mobile-l2"></div>
            </div>
          </div>

          <div style="border-top: 1px dashed #e2e8f0; margin-top: 6px; padding-top: 8px;">
            <div style="font-size: 10px; font-weight: 800; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase;">Stock Metrics (e.g. >10, <5)</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
              <input type="text" id="mobileLocationsFilter" class="text-control" placeholder="Locations (e.g. >1)" style="height: 32px; font-size: 11px;" />
              <input type="text" id="mobileQtySohFilter" class="text-control" placeholder="Qty SOH (e.g. >10)" style="height: 32px; font-size: 11px;" />
              <input type="text" id="mobileQtyOnSoFilter" class="text-control" placeholder="Qty On SO" style="height: 32px; font-size: 11px;" />
              <input type="text" id="mobileCountSoFilter" class="text-control" placeholder="Count SO" style="height: 32px; font-size: 11px;" />
              <input type="text" id="mobileQtyOnLdpFilter" class="text-control" placeholder="Qty LDP" style="height: 32px; font-size: 11px;" />
              <input type="text" id="mobileStockAgeFilter" class="text-control" placeholder="Stock Age" style="height: 32px; font-size: 11px;" />
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop Table View with Premium Custom Header Dropdowns -->
      <div class="data-table-wrapper" style="margin-top: 16px; overflow-x: auto;">
        <table class="custom-table">
          <thead>
            <tr class="header-label-row">
              <th style="min-width: 110px;">SKU Code</th>
              <th style="min-width: 160px;">Product Name</th>
              <th style="min-width: 100px;">Type</th>
              <th style="min-width: 110px;">L0 Cat</th>
              <th style="min-width: 110px;">L1 Cat</th>
              <th style="min-width: 110px;">L2 Cat</th>
              <th style="width: 90px; text-align: center;">Locations</th>
              <th style="width: 80px; text-align: center;">Qty SOH</th>
              <th style="width: 85px; text-align: center;">Qty On SO</th>
              <th style="width: 75px; text-align: center;">Count SO</th>
              <th style="width: 85px; text-align: center;">Qty LDP</th>
              <th style="width: 100px; text-align: center;">Stock Age</th>
              <th style="min-width: 150px; text-align: center;">Action</th>
            </tr>
            <tr class="header-filter-row">
              <th>
                <input type="text" id="headerSkuFilter" class="text-control header-filter-input" placeholder="Filter SKU..." style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box;" />
              </th>
              <th>
                <input type="text" id="headerNameFilter" class="text-control header-filter-input" placeholder="Filter Product..." style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box;" />
              </th>
              <th>
                <div class="custom-dropdown-container" id="dropdown-food">
                  <button type="button" class="custom-dropdown-trigger" id="trigger-food">
                    <span class="trigger-label">All</span>
                    <span class="material-icons-round trigger-icon">expand_more</span>
                  </button>
                  <div class="custom-dropdown-menu" id="menu-food"></div>
                </div>
              </th>
              <th>
                <div class="custom-dropdown-container" id="dropdown-l0">
                  <button type="button" class="custom-dropdown-trigger" id="trigger-l0">
                    <span class="trigger-label">All L0</span>
                    <span class="material-icons-round trigger-icon">expand_more</span>
                  </button>
                  <div class="custom-dropdown-menu" id="menu-l0"></div>
                </div>
              </th>
              <th>
                <div class="custom-dropdown-container" id="dropdown-l1">
                  <button type="button" class="custom-dropdown-trigger" id="trigger-l1">
                    <span class="trigger-label">All L1</span>
                    <span class="material-icons-round trigger-icon">expand_more</span>
                  </button>
                  <div class="custom-dropdown-menu" id="menu-l1"></div>
                </div>
              </th>
              <th>
                <div class="custom-dropdown-container" id="dropdown-l2">
                  <button type="button" class="custom-dropdown-trigger" id="trigger-l2">
                    <span class="trigger-label">All L2</span>
                    <span class="material-icons-round trigger-icon">expand_more</span>
                  </button>
                  <div class="custom-dropdown-menu" id="menu-l2"></div>
                </div>
              </th>
              <th>
                <input type="text" id="headerLocationsFilter" class="text-control header-filter-input" placeholder="e.g. >1" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="headerQtySohFilter" class="text-control header-filter-input" placeholder="e.g. >10" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="headerQtyOnSoFilter" class="text-control header-filter-input" placeholder="e.g. >0" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="headerCountSoFilter" class="text-control header-filter-input" placeholder="e.g. >0" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="headerQtyOnLdpFilter" class="text-control header-filter-input" placeholder="e.g. >0" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <input type="text" id="headerStockAgeFilter" class="text-control header-filter-input" placeholder="e.g. >30" style="padding: 4px 8px; font-size: 11px; height: 28px; width: 100%; box-sizing: border-box; text-align: center;" />
              </th>
              <th>
                <div class="custom-dropdown-container" id="dropdown-action">
                  <button type="button" class="custom-dropdown-trigger" id="trigger-action">
                    <span class="trigger-label">All Actions</span>
                    <span class="material-icons-round trigger-icon">expand_more</span>
                  </button>
                  <div class="custom-dropdown-menu" id="menu-action"></div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody id="sohTableBody"></tbody>
        </table>
      </div>

      <!-- Mobile Card List View -->
      <div id="sohMobileCardList" class="mobile-card-list"></div>
    </div>
  `;

  // Dom references (Desktop filters)
  const headerSkuFilter = container.querySelector('#headerSkuFilter');
  const headerNameFilter = container.querySelector('#headerNameFilter');
  const headerLocationsFilter = container.querySelector('#headerLocationsFilter');
  const headerQtySohFilter = container.querySelector('#headerQtySohFilter');
  const headerQtyOnSoFilter = container.querySelector('#headerQtyOnSoFilter');
  const headerCountSoFilter = container.querySelector('#headerCountSoFilter');
  const headerQtyOnLdpFilter = container.querySelector('#headerQtyOnLdpFilter');
  const headerStockAgeFilter = container.querySelector('#headerStockAgeFilter');
  const headerActionFilter = container.querySelector('#dropdown-action');

  // Dom references (Mobile filters)
  const mobileSohSearchInput = container.querySelector('#mobileSohSearchInput');
  const mobileFilterToggleBtn = container.querySelector('#mobileFilterToggleBtn');
  const mobileFiltersPanel = container.querySelector('#mobileFiltersPanel');
  const mobileLocationsFilter = container.querySelector('#mobileLocationsFilter');
  const mobileQtySohFilter = container.querySelector('#mobileQtySohFilter');
  const mobileQtyOnSoFilter = container.querySelector('#mobileQtyOnSoFilter');
  const mobileCountSoFilter = container.querySelector('#mobileCountSoFilter');
  const mobileQtyOnLdpFilter = container.querySelector('#mobileQtyOnLdpFilter');
  const mobileStockAgeFilter = container.querySelector('#mobileStockAgeFilter');

  const sohTableBody = container.querySelector('#sohTableBody');
  const sohMobileCardList = container.querySelector('#sohMobileCardList');
  const sohCountBadge = container.querySelector('#sohCountBadge');

  const statUniqueSkus = container.querySelector('#statUniqueSkus');
  const statTotalQty = container.querySelector('#statTotalQty');
  const statQtyOnSo = container.querySelector('#statQtyOnSo');
  const statOldestAge = container.querySelector('#statOldestAge');

  // Toggle mobile filter panel
  mobileFilterToggleBtn.addEventListener('click', () => {
    const isHidden = mobileFiltersPanel.style.display === 'none';
    mobileFiltersPanel.style.display = isHidden ? 'flex' : 'none';
    mobileFilterToggleBtn.classList.toggle('active', isHidden);
  });

  // Populate dynamic category dropdown options (Hierarchical cascade)
  function populateFilters() {
    const list = db.getSohList();
    const l0Set = new Set();
    const l1Set = new Set();
    const l2Set = new Set();
    const actionSet = new Set();

    list.forEach(item => {
      // L0 is always fully loaded from unique items
      if (item.l0CategoryName && item.l0CategoryName !== 'N/A') {
        l0Set.add(item.l0CategoryName.trim());
      }
      if (item.actionSuggestion) {
        actionSet.add(item.actionSuggestion.trim());
      }

      // L1 filters by current selected L0
      if (categoryFilter === 'all' || item.l0CategoryName === categoryFilter) {
        if (item.l1CategoryName && item.l1CategoryName !== 'N/A') {
          l1Set.add(item.l1CategoryName.trim());
        }
      }

      // L2 filters by selected L0 and L1
      if (categoryFilter === 'all' || item.l0CategoryName === categoryFilter) {
        if (l1CategoryFilterVal === 'all' || item.l1CategoryName === l1CategoryFilterVal) {
          if (item.l2CategoryName && item.l2CategoryName !== 'N/A') {
            l2Set.add(item.l2CategoryName.trim());
          }
        }
      }
    });

    const l0Options = Array.from(l0Set).sort();
    const l1Options = Array.from(l1Set).sort();
    const l2Options = Array.from(l2Set).sort();
    const actionOptions = Array.from(actionSet).sort();

    // -- Populate Desktop dropdown options --
    const foodMenu = container.querySelector('#menu-food');
    foodMenu.innerHTML = `
      <div class="custom-dropdown-option ${foodFilter === 'all' ? 'active' : ''}" data-value="all">All</div>
      <div class="custom-dropdown-option ${foodFilter === 'Food' ? 'active' : ''}" data-value="Food">Food</div>
      <div class="custom-dropdown-option ${foodFilter === 'Non Food' ? 'active' : ''}" data-value="Non Food">Non Food</div>
    `;
    container.querySelector('#trigger-food .trigger-label').textContent = foodFilter === 'all' ? 'All' : foodFilter;

    const actionMenu = container.querySelector('#menu-action');
    actionMenu.innerHTML = `
      <div class="custom-dropdown-option ${actionFilterVal === 'all' ? 'active' : ''}" data-value="all">All Actions</div>
      ${actionOptions.map(act => `<div class="custom-dropdown-option ${actionFilterVal === act ? 'active' : ''}" data-value="${escapeHtml(act)}">${escapeHtml(act)}</div>`).join('')}
    `;
    container.querySelector('#trigger-action .trigger-label').textContent = actionFilterVal === 'all' ? 'All Actions' : actionFilterVal;

    const l0Menu = container.querySelector('#menu-l0');
    l0Menu.innerHTML = `
      <div class="custom-dropdown-option ${categoryFilter === 'all' ? 'active' : ''}" data-value="all">All L0</div>
      ${l0Options.map(cat => `<div class="custom-dropdown-option ${categoryFilter === cat ? 'active' : ''}" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('')}
    `;
    container.querySelector('#trigger-l0 .trigger-label').textContent = categoryFilter === 'all' ? 'All L0' : categoryFilter;

    const l1Menu = container.querySelector('#menu-l1');
    l1Menu.innerHTML = `
      <div class="custom-dropdown-option ${l1CategoryFilterVal === 'all' ? 'active' : ''}" data-value="all">All L1</div>
      ${l1Options.map(cat => `<div class="custom-dropdown-option ${l1CategoryFilterVal === cat ? 'active' : ''}" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('')}
    `;
    container.querySelector('#trigger-l1 .trigger-label').textContent = l1CategoryFilterVal === 'all' ? 'All L1' : l1CategoryFilterVal;

    const l2Menu = container.querySelector('#menu-l2');
    l2Menu.innerHTML = `
      <div class="custom-dropdown-option ${l2CategoryFilterVal === 'all' ? 'active' : ''}" data-value="all">All L2</div>
      ${l2Options.map(cat => `<div class="custom-dropdown-option ${l2CategoryFilterVal === cat ? 'active' : ''}" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('')}
    `;
    container.querySelector('#trigger-l2 .trigger-label').textContent = l2CategoryFilterVal === 'all' ? 'All L2' : l2CategoryFilterVal;


    // -- Populate Mobile dropdown options --
    const mobileFoodMenu = container.querySelector('#menu-mobile-food');
    mobileFoodMenu.innerHTML = `
      <div class="custom-dropdown-option ${foodFilter === 'all' ? 'active' : ''}" data-value="all">All Types</div>
      <div class="custom-dropdown-option ${foodFilter === 'Food' ? 'active' : ''}" data-value="Food">Food</div>
      <div class="custom-dropdown-option ${foodFilter === 'Non Food' ? 'active' : ''}" data-value="Non Food">Non Food</div>
    `;
    container.querySelector('#trigger-mobile-food .trigger-label').textContent = foodFilter === 'all' ? 'All Types' : foodFilter;

    const mobileL0Menu = container.querySelector('#menu-mobile-l0');
    mobileL0Menu.innerHTML = `
      <div class="custom-dropdown-option ${categoryFilter === 'all' ? 'active' : ''}" data-value="all">All L0</div>
      ${l0Options.map(cat => `<div class="custom-dropdown-option ${categoryFilter === cat ? 'active' : ''}" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('')}
    `;
    container.querySelector('#trigger-mobile-l0 .trigger-label').textContent = categoryFilter === 'all' ? 'All L0' : categoryFilter;

    const mobileL1Menu = container.querySelector('#menu-mobile-l1');
    mobileL1Menu.innerHTML = `
      <div class="custom-dropdown-option ${l1CategoryFilterVal === 'all' ? 'active' : ''}" data-value="all">All L1</div>
      ${l1Options.map(cat => `<div class="custom-dropdown-option ${l1CategoryFilterVal === cat ? 'active' : ''}" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('')}
    `;
    container.querySelector('#trigger-mobile-l1 .trigger-label').textContent = l1CategoryFilterVal === 'all' ? 'All L1' : l1CategoryFilterVal;

    const mobileL2Menu = container.querySelector('#menu-mobile-l2');
    mobileL2Menu.innerHTML = `
      <div class="custom-dropdown-option ${l2CategoryFilterVal === 'all' ? 'active' : ''}" data-value="all">All L2</div>
      ${l2Options.map(cat => `<div class="custom-dropdown-option ${l2CategoryFilterVal === cat ? 'active' : ''}" data-value="${escapeHtml(cat)}">${escapeHtml(cat)}</div>`).join('')}
    `;
    container.querySelector('#trigger-mobile-l2 .trigger-label').textContent = l2CategoryFilterVal === 'all' ? 'All L2' : l2CategoryFilterVal;


    // Wire clicks to custom options (Desktop)
    const dropdownKeys = ['food', 'l0', 'l1', 'l2', 'action'];
    dropdownKeys.forEach(k => {
      const dropContainer = container.querySelector(`#dropdown-${k}`);
      const menuEl = container.querySelector(`#menu-${k}`);
      
      menuEl.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.dataset.value;
          dropContainer.classList.remove('open');
          
          if (k === 'food') updateFilters({ foodFilter: val });
          if (k === 'l0') updateFilters({ categoryFilter: val });
          if (k === 'l1') updateFilters({ l1CategoryFilterVal: val });
          if (k === 'l2') updateFilters({ l2CategoryFilterVal: val });
          if (k === 'action') updateFilters({ actionFilterVal: val });
        });
      });
    });

    // Wire clicks to custom options (Mobile)
    const mobileDropdownKeys = ['mobile-food', 'mobile-l0', 'mobile-l1', 'mobile-l2'];
    mobileDropdownKeys.forEach(k => {
      const dropContainer = container.querySelector(`#dropdown-${k}`);
      const menuEl = container.querySelector(`#menu-${k}`);
      
      menuEl.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.dataset.value;
          dropContainer.classList.remove('open');
          
          if (k === 'mobile-food') updateFilters({ foodFilter: val });
          if (k === 'mobile-l0') updateFilters({ categoryFilter: val });
          if (k === 'mobile-l1') updateFilters({ l1CategoryFilterVal: val });
          if (k === 'mobile-l2') updateFilters({ l2CategoryFilterVal: val });
        });
      });
    });
  }

  // Wire trigger toggle clicks (Desktop & Mobile)
  const allDropdownKeys = ['food', 'l0', 'l1', 'l2', 'action', 'mobile-food', 'mobile-l0', 'mobile-l1', 'mobile-l2'];
  allDropdownKeys.forEach(k => {
    const trigger = container.querySelector(`#trigger-${k}`);
    const dropContainer = container.querySelector(`#dropdown-${k}`);
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropContainer.classList.contains('open');
      
      // Close other dropdowns
      container.querySelectorAll('.custom-dropdown-container').forEach(c => c.classList.remove('open'));
      
      if (!isOpen) {
        dropContainer.classList.add('open');
      }
    });
  });

  // Global click event to close dropdowns when clicking outside
  const onOutsideClick = () => {
    if (container.isConnected) {
      container.querySelectorAll('.custom-dropdown-container').forEach(c => c.classList.remove('open'));
    } else {
      window.removeEventListener('click', onOutsideClick);
    }
  };
  window.addEventListener('click', onOutsideClick);

  // Helper: render a color-coded badge for Action Suggestion values
  function renderActionBadge(action) {
    if (!action || action === 'None' || action === '') return '<span style="color: var(--text-muted); font-size: 11px;">—</span>';
    const styles = {
      'LDP RECOVERY': 'background: #fff3cd; color: #856404; border: 1px solid #ffc107;',
      'WH ADJUST IN': 'background: #d1fae5; color: #065f46; border: 1px solid #10b981;',
    };
    const style = styles[action.toUpperCase()] || 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
    return `<span style="display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; letter-spacing: 0.3px; ${style}">${escapeHtml(action)}</span>`;
  }

  // Math-operator numeric matching logic (e.g. >10, <=5, etc)
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
    const rawList = db.getSohList();

    // 1. Calculate raw analytics
    const uniqueSkus = new Set(rawList.map(i => i.skuCode)).size;
    const totalQty = rawList.reduce((sum, i) => sum + (i.qtySoh || 0), 0);
    const totalQtyOnSo = rawList.reduce((sum, i) => sum + (i.qtyOnSo || 0), 0);
    const validAgeItems = rawList.filter(i => i.stockAge && i.stockAge > 0);
    const maxAge = validAgeItems.length > 0
      ? Math.max(...validAgeItems.map(i => i.stockAge))
      : 0;

    statUniqueSkus.textContent = uniqueSkus;
    statTotalQty.textContent = totalQty;
    statQtyOnSo.textContent = totalQtyOnSo;
    statOldestAge.textContent = `${maxAge}d`;

    // 2. Aggregate raw items by SKU
    const skuGroups = {};
    rawList.forEach(item => {
      const sku = item.skuCode;
      if (!skuGroups[sku]) {
        skuGroups[sku] = {
          skuCode: sku,
          productId: item.productId,
          productName: item.productName,
          l0CategoryName: item.l0CategoryName,
          l1CategoryName: item.l1CategoryName,
          l2CategoryName: item.l2CategoryName,
          foodOrNonFood: item.foodOrNonFood,
          qtySoh: 0,
          qtyOnSo: item.qtyOnSo || 0,
          countSo: item.countSo || 0,
          qtyOnLdp: item.qtyOnLdp || 0,
          stockAge: item.stockAge || 0,
          actionSuggestion: item.actionSuggestion || 'None',
          locations: [],
          updatedAt: item.updatedAt
        };
      }
      
      skuGroups[sku].qtySoh += item.qtySoh;
      skuGroups[sku].locations.push({
        rackLocation: item.rackLocation,
        qtySoh: item.qtySoh,
        stockAge: item.stockAge || 0,
        updatedAt: item.updatedAt
      });

      if (item.stockAge > skuGroups[sku].stockAge) {
        skuGroups[sku].stockAge = item.stockAge;
      }
      if (new Date(item.updatedAt) > new Date(skuGroups[sku].updatedAt)) {
        skuGroups[sku].updatedAt = item.updatedAt;
      }
    });

    let aggregatedList = Object.values(skuGroups);
    aggregatedList.sort((a, b) => a.skuCode.localeCompare(b.skuCode));

    // 3. Apply text search filters
    if (skuQuery) {
      const q = skuQuery.toLowerCase();
      aggregatedList = aggregatedList.filter(item => (item.skuCode || '').toLowerCase().includes(q));
    }
    if (nameQuery) {
      const q = nameQuery.toLowerCase();
      aggregatedList = aggregatedList.filter(item => (item.productName || '').toLowerCase().includes(q));
    }
    if (mobileSearchQuery) {
      const q = mobileSearchQuery.toLowerCase();
      aggregatedList = aggregatedList.filter(item => 
        (item.skuCode || '').toLowerCase().includes(q) ||
        (item.productName || '').toLowerCase().includes(q)
      );
    }

    // Apply category select filters
    if (foodFilter !== 'all') {
      aggregatedList = aggregatedList.filter(item => item.foodOrNonFood === foodFilter);
    }
    if (categoryFilter !== 'all') {
      aggregatedList = aggregatedList.filter(item => item.l0CategoryName === categoryFilter);
    }
    if (l1CategoryFilterVal !== 'all') {
      aggregatedList = aggregatedList.filter(item => item.l1CategoryName === l1CategoryFilterVal);
    }
    if (l2CategoryFilterVal !== 'all') {
      aggregatedList = aggregatedList.filter(item => item.l2CategoryName === l2CategoryFilterVal);
    }
    if (actionFilterVal !== 'all') {
      aggregatedList = aggregatedList.filter(item => item.actionSuggestion === actionFilterVal);
    }

    // Apply math-operator numeric filters
    if (locationsQuery) {
      aggregatedList = aggregatedList.filter(item => matchNumericFilter(item.locations.length, locationsQuery));
    }
    if (qtySohQuery) {
      aggregatedList = aggregatedList.filter(item => matchNumericFilter(item.qtySoh, qtySohQuery));
    }
    if (qtyOnSoQuery) {
      aggregatedList = aggregatedList.filter(item => matchNumericFilter(item.qtyOnSo, qtyOnSoQuery));
    }
    if (countSoQuery) {
      aggregatedList = aggregatedList.filter(item => matchNumericFilter(item.countSo, countSoQuery));
    }
    if (qtyOnLdpQuery) {
      aggregatedList = aggregatedList.filter(item => matchNumericFilter(item.qtyOnLdp, qtyOnLdpQuery));
    }
    if (stockAgeQuery) {
      aggregatedList = aggregatedList.filter(item => matchNumericFilter(item.stockAge, stockAgeQuery));
    }

    sohCountBadge.textContent = `${aggregatedList.length} SKU${aggregatedList.length === 1 ? '' : 's'}`;

    if (!aggregatedList.length) {
      const emptyHtml = `
        <div class="empty-state">
          <span class="material-icons-round">inventory_2</span>
          <p>No SOH records found matching the filters.</p>
        </div>
      `;
      sohTableBody.innerHTML = `
        <tr>
          <td colspan="13">
            ${emptyHtml}
          </td>
        </tr>
      `;
      sohMobileCardList.innerHTML = emptyHtml;
      return;
    }

    // 4. Render Desktop table body
    sohTableBody.innerHTML = aggregatedList.map(item => `
      <tr class="soh-sku-row" data-sku="${escapeHtml(item.skuCode)}" style="cursor: pointer;">
        <td><strong style="color: var(--primary-700); font-family: monospace; font-size: 13px;">${escapeHtml(item.skuCode)}</strong></td>
        <td>
          <span style="font-weight: 700; color: var(--text-primary); display: block; font-size: 13px;">${escapeHtml(item.productName)}</span>
        </td>
        <td><span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${escapeHtml(item.foodOrNonFood)}</span></td>
        <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.l0CategoryName)}</span></td>
        <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.l1CategoryName)}</span></td>
        <td><span style="font-size: 12px; color: var(--text-muted);">${escapeHtml(item.l2CategoryName)}</span></td>
        <td style="text-align: center;">
          <span class="location-badge" style="font-weight: 700; font-size: 11px; color: var(--primary-700); background: var(--primary-50); padding: 4px 8px; border-radius: 6px;">
            ${item.locations.length} locs
          </span>
        </td>
        <td style="text-align: center;"><strong style="font-size: 15px;">${item.qtySoh}</strong></td>
        <td style="text-align: center;"><span style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">${item.qtyOnSo}</span></td>
        <td style="text-align: center;"><span style="font-size: 13px; color: var(--text-secondary);">${item.countSo}</span></td>
        <td style="text-align: center;"><span style="font-size: 13px; color: var(--text-secondary);">${item.qtyOnLdp}</span></td>
        <td style="text-align: center;"><span style="font-size: 13px; font-weight: 600; color: ${item.stockAge > 30 ? 'var(--danger)' : 'var(--text-secondary)'}; ">${item.stockAge} days</span></td>
        <td style="text-align: center;">${renderActionBadge(item.actionSuggestion)}</td>
      </tr>
    `).join('');

    // 5. Render Mobile cards
    sohMobileCardList.innerHTML = aggregatedList.map(item => `
      <div class="mobile-task-card soh-sku-card" data-sku="${escapeHtml(item.skuCode)}">
        <div class="card-header-row">
          <span class="picking-id-label" style="font-size: 14px;">${escapeHtml(item.skuCode)}</span>
          <span class="location-badge" style="font-weight: 700; font-size: 11px; color: var(--primary-700); background: var(--primary-50);">${item.locations.length} locations</span>
        </div>
        
        <div class="card-body-content">
          <div class="product-name" style="font-size: 14px; font-weight: 700;">${escapeHtml(item.productName)}</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
            Category: <strong>${escapeHtml(item.l0CategoryName)}</strong> / ${escapeHtml(item.l1CategoryName)} / ${escapeHtml(item.l2CategoryName)} | ${escapeHtml(item.foodOrNonFood)}
          </div>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 10px; margin-top: 10px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px; border: 1px solid var(--border-light);">
          <div>SOH Qty: <strong style="font-size: 13px; color: var(--primary-700);">${item.qtySoh}</strong></div>
          <div>Qty On SO: <strong style="font-size: 13px; color: var(--text-primary);">${item.qtyOnSo}</strong></div>
          <div>Count SO: <strong style="font-size: 12px; color: var(--text-secondary);">${item.countSo}</strong></div>
          <div>Qty On LDP: <strong style="font-size: 12px; color: var(--text-secondary);">${item.qtyOnLdp}</strong></div>
          <div style="grid-column: span 2; border-top: 1px dashed #e2e8f0; padding-top: 6px; margin-top: 2px; color: ${item.stockAge > 30 ? 'var(--danger)' : 'var(--text-secondary)'}; ">
            Stock Age: <strong>${item.stockAge} days</strong>
          </div>
          ${item.actionSuggestion ? `<div style="grid-column: span 2; margin-top: 4px;">${renderActionBadge(item.actionSuggestion)}</div>` : ''}
        </div>
        
        <div style="font-size: 10px; color: var(--primary-600); font-weight: 700; margin-top: 8px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
          <span>Tap to view rack breakdown</span>
          <span class="material-icons-round" style="font-size: 14px;">chevron_right</span>
        </div>
      </div>
    `).join('');

    // Wire clicks to open Sku Details Modal
    container.querySelectorAll('.soh-sku-row, .soh-sku-card').forEach(el => {
      el.addEventListener('click', () => {
        const sku = el.dataset.sku;
        const matchedItem = aggregatedList.find(i => i.skuCode === sku);
        if (matchedItem) {
          openSkuDetailsModal(matchedItem);
        }
      });
    });
  }

  function openSkuDetailsModal(skuItem) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'skuDetailsFormModal';
    modalOverlay.style.zIndex = '3500';

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 550px; border-radius: 20px;">
        <div class="form-modal-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">inventory_2</span>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">SKU Stock Breakdown</h3>
          </div>
          <button class="form-modal-close-btn" id="closeSkuDetailsModalBtn" title="Close" style="border: none; background: transparent; cursor: pointer;">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body" style="padding-top: 14px; max-height: calc(90vh - 80px); overflow-y: auto;">
          <div style="background: #f8fafc; padding: 14px; border-radius: 12px; margin-bottom: 16px; border: 1.5px solid var(--border-light);">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Product Information</div>
            <div style="font-size: 15px; font-weight: 800; color: var(--primary-800); margin-top: 4px; font-family: monospace;">SKU: ${escapeHtml(skuItem.skuCode)}</div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${escapeHtml(skuItem.productName)}</div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
              Category: <strong>${escapeHtml(skuItem.l0CategoryName)}</strong> / ${escapeHtml(skuItem.l1CategoryName)} / ${escapeHtml(skuItem.l2CategoryName)} | ${escapeHtml(skuItem.foodOrNonFood)}
            </div>
          </div>

          <div class="form-grid" style="grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div style="background: #ffffff; padding: 10px; border: 1px solid var(--border-light); border-radius: 10px; text-align: center;">
              <div style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Total SOH</div>
              <div style="font-size: 15px; font-weight: 800; color: var(--primary-700); margin-top: 2px;">${skuItem.qtySoh}</div>
            </div>
            <div style="background: #ffffff; padding: 10px; border: 1px solid var(--border-light); border-radius: 10px; text-align: center;">
              <div style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Qty On SO</div>
              <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${skuItem.qtyOnSo}</div>
            </div>
            <div style="background: #ffffff; padding: 10px; border: 1px solid var(--border-light); border-radius: 10px; text-align: center;">
              <div style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Qty LDP</div>
              <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin-top: 2px;">${skuItem.qtyOnLdp}</div>
            </div>
            <div style="background: #ffffff; padding: 10px; border: 1px solid var(--border-light); border-radius: 10px; text-align: center;">
              <div style="font-size: 9px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Stock Age</div>
              <div style="font-size: 15px; font-weight: 800; color: ${skuItem.stockAge > 30 ? 'var(--danger)' : 'var(--text-secondary)'}; margin-top: 2px;">${skuItem.stockAge}d</div>
            </div>
          </div>

          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
            Locations Breakdown (${skuItem.locations.length} rack zones)
          </div>
          
          <div class="data-table-wrapper" style="display: block !important; border: 1px solid var(--border-light); border-radius: 10px; max-height: 180px; overflow-y: auto;">
            <table class="custom-table" style="font-size: 12px; margin: 0;">
              <thead>
                <tr style="background: #f8fafc; position: sticky; top: 0; z-index: 10;">
                  <th style="padding: 8px 12px;">Rack Location</th>
                  <th style="padding: 8px 12px; width: 80px;">Qty SOH</th>
                  <th style="padding: 8px 12px; width: 80px;">Stock Age</th>
                  <th style="padding: 8px 12px; width: 140px;">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                ${skuItem.locations.map(loc => `
                  <tr>
                    <td style="padding: 8px 12px;"><span class="location-badge" style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--primary-800); background: var(--primary-50); padding: 4px 8px; border-radius: 6px;">${escapeHtml(loc.rackLocation)}</span></td>
                    <td style="padding: 8px 12px;"><strong style="font-size: 13px;">${loc.qtySoh}</strong></td>
                    <td style="padding: 8px 12px;"><strong style="font-size: 12px; color: ${loc.stockAge > 30 ? 'var(--danger)' : 'var(--text-secondary)'};">${loc.stockAge} days</strong></td>
                    <td style="padding: 8px 12px; color: var(--text-muted); font-size: 11px;">${loc.updatedAt ? new Date(loc.updatedAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="form-modal-footer-actions" style="margin-top: 20px; display: flex; justify-content: flex-end;">
            <button type="button" class="btn-secondary" id="closeSkuDetailsFooterBtn" style="width: 100px; height: 36px; padding: 0;">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeBtn = modalOverlay.querySelector('#closeSkuDetailsModalBtn');
    const closeFooterBtn = modalOverlay.querySelector('#closeSkuDetailsFooterBtn');
    const closeModal = () => modalOverlay.remove();
    
    closeBtn.addEventListener('click', closeModal);
    closeFooterBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Filter Sync Controller
  function updateFilters(updates) {
    let needsRefilterOptions = false;

    if (updates.skuQuery !== undefined) {
      skuQuery = updates.skuQuery;
      headerSkuFilter.value = skuQuery;
    }
    if (updates.nameQuery !== undefined) {
      nameQuery = updates.nameQuery;
      headerNameFilter.value = nameQuery;
    }
    if (updates.mobileSearchQuery !== undefined) {
      mobileSearchQuery = updates.mobileSearchQuery;
      mobileSohSearchInput.value = mobileSearchQuery;
    }
    if (updates.foodFilter !== undefined) {
      foodFilter = updates.foodFilter;
    }
    if (updates.categoryFilter !== undefined) {
      categoryFilter = updates.categoryFilter;
      // Reset hierarchical children
      l1CategoryFilterVal = 'all';
      l2CategoryFilterVal = 'all';
      needsRefilterOptions = true;
    }
    if (updates.l1CategoryFilterVal !== undefined) {
      l1CategoryFilterVal = updates.l1CategoryFilterVal;
      // Reset hierarchical children
      l2CategoryFilterVal = 'all';
      needsRefilterOptions = true;
    }
    if (updates.l2CategoryFilterVal !== undefined) {
      l2CategoryFilterVal = updates.l2CategoryFilterVal;
    }

    // Numeric sync
    if (updates.locationsQuery !== undefined) {
      locationsQuery = updates.locationsQuery;
      headerLocationsFilter.value = locationsQuery;
      mobileLocationsFilter.value = locationsQuery;
    }
    if (updates.qtySohQuery !== undefined) {
      qtySohQuery = updates.qtySohQuery;
      headerQtySohFilter.value = qtySohQuery;
      mobileQtySohFilter.value = qtySohQuery;
    }
    if (updates.qtyOnSoQuery !== undefined) {
      qtyOnSoQuery = updates.qtyOnSoQuery;
      headerQtyOnSoFilter.value = qtyOnSoQuery;
      mobileQtyOnSoFilter.value = qtyOnSoQuery;
    }
    if (updates.countSoQuery !== undefined) {
      countSoQuery = updates.countSoQuery;
      headerCountSoFilter.value = countSoQuery;
      mobileCountSoFilter.value = countSoQuery;
    }
    if (updates.qtyOnLdpQuery !== undefined) {
      qtyOnLdpQuery = updates.qtyOnLdpQuery;
      headerQtyOnLdpFilter.value = qtyOnLdpQuery;
      mobileQtyOnLdpFilter.value = qtyOnLdpQuery;
    }
    if (updates.stockAgeQuery !== undefined) {
      stockAgeQuery = updates.stockAgeQuery;
      headerStockAgeFilter.value = stockAgeQuery;
      mobileStockAgeFilter.value = stockAgeQuery;
    }
    if (updates.actionFilterVal !== undefined) {
      actionFilterVal = updates.actionFilterVal;
    }

    populateFilters();
    renderTable();
  }

  // Event Listeners (Desktop Headers)
  headerSkuFilter.addEventListener('input', (e) => updateFilters({ skuQuery: e.target.value.trim() }));
  headerNameFilter.addEventListener('input', (e) => updateFilters({ nameQuery: e.target.value.trim() }));
  headerLocationsFilter.addEventListener('input', (e) => updateFilters({ locationsQuery: e.target.value.trim() }));
  headerQtySohFilter.addEventListener('input', (e) => updateFilters({ qtySohQuery: e.target.value.trim() }));
  headerQtyOnSoFilter.addEventListener('input', (e) => updateFilters({ qtyOnSoQuery: e.target.value.trim() }));
  headerCountSoFilter.addEventListener('input', (e) => updateFilters({ countSoQuery: e.target.value.trim() }));
  headerQtyOnLdpFilter.addEventListener('input', (e) => updateFilters({ qtyOnLdpQuery: e.target.value.trim() }));
  headerStockAgeFilter.addEventListener('input', (e) => updateFilters({ stockAgeQuery: e.target.value.trim() }));

  // Event Listeners (Mobile View)
  mobileSohSearchInput.addEventListener('input', (e) => updateFilters({ mobileSearchQuery: e.target.value.trim() }));
  mobileLocationsFilter.addEventListener('input', (e) => updateFilters({ locationsQuery: e.target.value.trim() }));
  mobileQtySohFilter.addEventListener('input', (e) => updateFilters({ qtySohQuery: e.target.value.trim() }));
  mobileQtyOnSoFilter.addEventListener('input', (e) => updateFilters({ qtyOnSoQuery: e.target.value.trim() }));
  mobileCountSoFilter.addEventListener('input', (e) => updateFilters({ countSoQuery: e.target.value.trim() }));
  mobileQtyOnLdpFilter.addEventListener('input', (e) => updateFilters({ qtyOnLdpQuery: e.target.value.trim() }));
  mobileStockAgeFilter.addEventListener('input', (e) => updateFilters({ stockAgeQuery: e.target.value.trim() }));

  // Capture the root element this component just rendered
  const ownRoot = container.firstElementChild;

  // Subscribe to DB updates - unsubscribe when this component is no longer active
  const unsubscribe = db.subscribe(() => {
    if (!container.isConnected || container.firstElementChild !== ownRoot) {
      unsubscribe();
      return;
    }
    renderTable();
  });

  // Init
  populateFilters();
  renderTable();
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
