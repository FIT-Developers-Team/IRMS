import { db } from '../data/db.js';
import { parseJakartaTimestamp, formatJakartaDateTime, getTimeAgo, getJakartaDateString } from '../utils/dateTime.js';
import { openCustomDateRangePicker } from '../utils/customDatePicker.js';

export function renderTroubleShoot(container, currentUser) {
  let searchQuery = '';
  let kpiExpanded = false;

  let filterState = {
    requestTimestampFrom: '',
    requestTimestampTo: '',
    requestedBy: '',
    checkerLine: '',
    reason: '',
    soNumber: '',
    wave: '',
    skuNumber: '',
    productName: '',
    originRackName: '',
    assignedBy: '',
    assignedTo: '',
    statusTicket: 'all',
    foundAt: '',
    updateAtFrom: '',
    updateAtTo: ''
  };

  container.innerHTML = `
    <div class="card-panel ts-admin-panel" style="display: flex; flex-direction: column; height: 100%; min-height: 0; box-sizing: border-box; overflow-y: auto;">
      
      <!-- Panel Header -->
      <div class="card-title-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); margin-bottom: 0; width: 100%; box-sizing: border-box; flex-wrap: nowrap; flex-shrink: 0;">
        <div style="flex: 1 1 0; min-width: 0; overflow: hidden;">
          <h3 style="display: flex; align-items: center; gap: 8px; margin: 0; flex-wrap: wrap; word-break: break-word; font-size: 16px;">
            <span class="material-icons-round" style="color: var(--primary-600); flex-shrink: 0; font-size: 22px;">troubleshoot</span>
            <span>Troubleshoot Assignment</span>
          </h3>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="tsToggleKpiBtn" class="btn-secondary" style="font-size: 11px; padding: 5px 10px; border-radius: 8px; gap: 4px; display: inline-flex; align-items: center; cursor: pointer; border: 1.5px solid var(--border-light); font-weight: 700;">
            <span class="material-icons-round" style="font-size: 15px; color: var(--primary-600);">insights</span>
            <span id="tsToggleKpiText">Show KPIs</span>
            <span class="material-icons-round" id="tsToggleKpiIcon" style="font-size: 15px; transition: transform 0.2s;">expand_more</span>
          </button>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); white-space: nowrap; background: var(--surface-body); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border-light);" id="tsAdminCountBadge">0 Tickets</span>
        </div>
      </div>

      <!-- Collapsible KPI Cards (Hidden by default) -->
      <div id="tsKpiContainer" style="display: none; margin-top: 12px; flex-shrink: 0; animation: slideDown 0.2s ease;">
        <div class="form-grid ts-kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
          <div class="ts-kpi-card" style="background: #ffffff; padding: 12px; border: 1.5px solid var(--border-light); border-radius: 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 20px;">pending</span>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Open</span>
              <strong style="font-size: 16px; display: block; color: var(--primary-600);" id="tsKpiOpen">0</strong>
            </div>
          </div>
          <div class="ts-kpi-card" style="background: #ffffff; padding: 12px; border: 1.5px solid var(--border-light); border-radius: 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #f3e8ff; color: #7c3aed; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 20px;">person_add</span>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Assigned</span>
              <strong style="font-size: 16px; display: block; color: #7c3aed;" id="tsKpiAssigned">0</strong>
            </div>
          </div>
          <div class="ts-kpi-card" style="background: #ffffff; padding: 12px; border: 1.5px solid var(--border-light); border-radius: 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #fff7ed; color: #ea580c; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 20px;">directions_run</span>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">In Progress</span>
              <strong style="font-size: 16px; display: block; color: #ea580c;" id="tsKpiInProgress">0</strong>
            </div>
          </div>
          <div class="ts-kpi-card" style="background: #ffffff; padding: 12px; border: 1.5px solid var(--border-light); border-radius: 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 20px;">check_circle</span>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Found Today</span>
              <strong style="font-size: 16px; display: block; color: #10b981;" id="tsKpiFound">0</strong>
            </div>
          </div>
          <div class="ts-kpi-card" style="background: #ffffff; padding: 12px; border: 1.5px solid var(--border-light); border-radius: 14px; display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 10px; background: #fef2f2; color: #ef4444; display: flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 20px;">cancel</span>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Not Found</span>
              <strong style="font-size: 16px; display: block; color: #ef4444;" id="tsKpiNotFound">0</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Toolbar (Search + Filter Button + Reset Button) -->
      <div style="margin-top: 14px; display: flex; gap: 8px; align-items: center; flex-shrink: 0; flex-wrap: wrap;">
        <div style="flex: 1 1 180px; position: relative;">
          <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-muted);">search</span>
          <input type="text" id="tsAdminSearch" placeholder="Search by ID, SO, SKU, product, troubleshooter..." style="width: 100%; padding: 8px 10px 8px 34px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 13px; background: #ffffff; color: var(--text-primary); box-sizing: border-box;">
        </div>

        <button id="tsFilterModalBtn" class="btn-secondary" style="height: 38px; padding: 0 14px; border-radius: 10px; font-size: 13px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border: 1.5px solid var(--border-light); background: #ffffff; white-space: nowrap;">
          <span class="material-icons-round" style="font-size: 18px; color: var(--primary-600);">filter_list</span>
          <span>Filter</span>
          <span id="tsFilterCountBadge" class="filter-count-badge" style="display: none;">0</span>
        </button>

        <button id="tsResetFilterBtn" class="btn-secondary" style="height: 38px; padding: 0 12px; border-radius: 10px; font-size: 12px; font-weight: 600; display: none; align-items: center; gap: 4px; cursor: pointer; border: 1.5px dashed #fca5a5; background: #fff5f5; color: #dc2626; white-space: nowrap;" title="Clear all filters">
          <span class="material-icons-round" style="font-size: 16px;">clear_all</span>
          <span>Reset</span>
        </button>
      </div>

      <!-- Active Filter Pills Chips Row -->
      <div id="tsActiveFilterPills" style="display: none; margin-top: 8px; gap: 6px; flex-wrap: wrap; align-items: center; flex-shrink: 0;"></div>

      <!-- Scrollable Ticket List Area -->
      <div id="tsAdminScrollArea" style="flex: 1; min-height: 0; overflow-y: auto; margin-top: 12px; padding-right: 2px;">
        <div id="tsAdminList"></div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#tsAdminSearch');
  const listContainer = container.querySelector('#tsAdminList');
  const countBadge = container.querySelector('#tsAdminCountBadge');
  const filterBtn = container.querySelector('#tsFilterModalBtn');
  const resetFilterBtn = container.querySelector('#tsResetFilterBtn');
  const activePillsContainer = container.querySelector('#tsActiveFilterPills');
  const filterBadge = container.querySelector('#tsFilterCountBadge');

  // KPI Toggle
  const toggleKpiBtn = container.querySelector('#tsToggleKpiBtn');
  const kpiContainer = container.querySelector('#tsKpiContainer');
  const toggleKpiText = container.querySelector('#tsToggleKpiText');
  const toggleKpiIcon = container.querySelector('#tsToggleKpiIcon');

  if (toggleKpiBtn) {
    toggleKpiBtn.addEventListener('click', () => {
      kpiExpanded = !kpiExpanded;
      if (kpiExpanded) {
        kpiContainer.style.display = 'block';
        toggleKpiText.textContent = 'Hide KPIs';
        toggleKpiIcon.textContent = 'expand_less';
      } else {
        kpiContainer.style.display = 'none';
        toggleKpiText.textContent = 'Show KPIs';
        toggleKpiIcon.textContent = 'expand_more';
      }
    });
  }

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderList();
  });

  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      openFilterModal();
    });
  }

  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', () => {
      Object.keys(filterState).forEach(k => {
        filterState[k] = (k === 'statusTicket' ? 'all' : '');
      });
      renderList();
    });
  }

  function parseInputDateTime(val, isEndOfMinute = false) {
    if (!val) return null;
    let str = val.trim();
    if (str.length === 16) {
      str += isEndOfMinute ? ':59' : ':00';
    }
    if (!str.includes('+') && !str.includes('Z')) {
      str += '+07:00';
    }
    const ms = new Date(str).getTime();
    return isNaN(ms) ? null : ms;
  }

  function renderActiveFilterPills() {
    const activePills = [];

    if (filterState.requestTimestampFrom || filterState.requestTimestampTo) {
      const fromL = filterState.requestTimestampFrom ? filterState.requestTimestampFrom.replace('T', ' ') : 'Start';
      const toL = filterState.requestTimestampTo ? filterState.requestTimestampTo.replace('T', ' ') : 'End';
      activePills.push({
        label: `Req Time: ${fromL} → ${toL}`,
        clear: () => { filterState.requestTimestampFrom = ''; filterState.requestTimestampTo = ''; }
      });
    }

    if (filterState.updateAtFrom || filterState.updateAtTo) {
      const fromL = filterState.updateAtFrom ? filterState.updateAtFrom.replace('T', ' ') : 'Start';
      const toL = filterState.updateAtTo ? filterState.updateAtTo.replace('T', ' ') : 'End';
      activePills.push({
        label: `Update Time: ${fromL} → ${toL}`,
        clear: () => { filterState.updateAtFrom = ''; filterState.updateAtTo = ''; }
      });
    }

    if (filterState.statusTicket && filterState.statusTicket !== 'all') {
      activePills.push({
        label: `Status: ${filterState.statusTicket}`,
        clear: () => { filterState.statusTicket = 'all'; }
      });
    }

    const textFields = [
      { key: 'requestedBy', label: 'Requested By' },
      { key: 'checkerLine', label: 'Checker Line' },
      { key: 'reason', label: 'Reason' },
      { key: 'soNumber', label: 'SO' },
      { key: 'wave', label: 'Wave' },
      { key: 'skuNumber', label: 'SKU' },
      { key: 'productName', label: 'Product' },
      { key: 'originRackName', label: 'Origin Rack' },
      { key: 'assignedBy', label: 'Assigned By' },
      { key: 'assignedTo', label: 'Assigned To' },
      { key: 'foundAt', label: 'Found At' }
    ];

    textFields.forEach(f => {
      if (filterState[f.key]) {
        activePills.push({
          label: `${f.label}: ${filterState[f.key]}`,
          clear: () => { filterState[f.key] = ''; }
        });
      }
    });

    if (activePills.length > 0) {
      filterBadge.textContent = activePills.length;
      filterBadge.style.display = 'inline-flex';
      resetFilterBtn.style.display = 'inline-flex';
      activePillsContainer.style.display = 'flex';
      activePillsContainer.innerHTML = activePills.map((p, idx) => `
        <span class="filter-pill-chip">
          <span>${escapeHtml(p.label)}</span>
          <button type="button" class="remove-pill-btn" data-idx="${idx}" title="Remove filter">
            <span class="material-icons-round" style="font-size: 14px;">close</span>
          </button>
        </span>
      `).join('');

      activePillsContainer.querySelectorAll('.remove-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx, 10);
          if (activePills[idx]) {
            activePills[idx].clear();
            renderList();
          }
        });
      });
    } else {
      filterBadge.style.display = 'none';
      resetFilterBtn.style.display = 'none';
      activePillsContainer.style.display = 'none';
      activePillsContainer.innerHTML = '';
    }
  }

  function getStatusLabel(val) {
    if (!val || val === 'all') return 'All Statuses';
    return val;
  }

  function openFilterModal() {
    const existing = document.getElementById('tsFilterModal');
    if (existing) existing.remove();

    const allTickets = db.getTroubleShootTickets();

    // Collect distinct suggestions for autocomplete/datalists
    const uniqueVals = (key) => [...new Set(allTickets.map(t => String(t[key] || '').trim()).filter(Boolean))].sort();

    const dlRequesters = uniqueVals('requestedBy');
    const dlCheckerLines = uniqueVals('checkerLine');
    const dlReasons = uniqueVals('reason');
    const dlWaves = uniqueVals('wave');
    const dlAssignedBy = uniqueVals('assignedBy');
    const dlAssignedTo = uniqueVals('assignedTo');

    const overlay = document.createElement('div');
    overlay.id = 'tsFilterModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display: flex; align-items: center; justify-content: center; z-index: 9999;';

    overlay.innerHTML = `
      <div class="modal-card ts-filter-modal-card">
        <!-- Header -->
        <div class="form-modal-header" style="flex-shrink: 0; padding: 16px 20px; border-bottom: 1px solid var(--border-light);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; color: var(--primary-600); display: flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 20px;">filter_list</span>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: var(--text-primary);">Filter Troubleshoot Tickets</h3>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Filter tickets by any combination of fields below</span>
            </div>
          </div>
          <button class="form-modal-close-btn" id="tsFilterModalCloseBtn" title="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- Datalist suggestions for convenience -->
        <datalist id="dl-requestedBy">${dlRequesters.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>
        <datalist id="dl-checkerLine">${dlCheckerLines.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>
        <datalist id="dl-reason">${dlReasons.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>
        <datalist id="dl-wave">${dlWaves.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>
        <datalist id="dl-assignedBy">${dlAssignedBy.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>
        <datalist id="dl-assignedTo">${dlAssignedTo.map(v => `<option value="${escapeHtml(v)}">`).join('')}</datalist>

        <!-- Form Body -->
        <div class="form-modal-body" style="flex: 1; overflow-y: auto; padding: 18px 20px;">
          <div class="ts-filter-grid">

            <!-- Row 1: Request Timestamp & Update At (Both single-column custom range cards) -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">schedule</span>
                <span>Request Timestamp</span>
              </label>
              <div class="custom-dt-range-card ${filterState.requestTimestampFrom || filterState.requestTimestampTo ? 'has-value' : ''}" id="card_requestTimestamp" tabindex="0">
                <div class="custom-dt-range-content">
                  <div class="custom-dt-range-row">
                    <span class="custom-dt-tag start">Start</span>
                    <span class="custom-dt-val ${filterState.requestTimestampFrom ? '' : 'placeholder'}" id="lbl_requestTimestampFrom">
                      ${filterState.requestTimestampFrom ? filterState.requestTimestampFrom.replace('T', ' ') : 'Select start date & time'}
                    </span>
                  </div>
                  <div class="custom-dt-range-row">
                    <span class="custom-dt-tag end">End</span>
                    <span class="custom-dt-val ${filterState.requestTimestampTo ? '' : 'placeholder'}" id="lbl_requestTimestampTo">
                      ${filterState.requestTimestampTo ? filterState.requestTimestampTo.replace('T', ' ') : 'Select end date & time'}
                    </span>
                  </div>
                </div>
                <div class="custom-dt-range-icons">
                  <button type="button" class="custom-dt-clear-btn" id="clear_requestTimestamp" title="Clear range" style="${(filterState.requestTimestampFrom || filterState.requestTimestampTo) ? 'display: flex;' : 'display: none;'}">
                    <span class="material-icons-round">close</span>
                  </button>
                  <div class="custom-dt-cal-icon-wrap">
                    <span class="material-icons-round">calendar_month</span>
                  </div>
                </div>
              </div>
              <input type="hidden" id="f_requestTimestampFrom" value="${escapeHtml(filterState.requestTimestampFrom || '')}">
              <input type="hidden" id="f_requestTimestampTo" value="${escapeHtml(filterState.requestTimestampTo || '')}">
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: #10b981;">update</span>
                <span>Update At</span>
              </label>
              <div class="custom-dt-range-card ${filterState.updateAtFrom || filterState.updateAtTo ? 'has-value' : ''}" id="card_updateAt" tabindex="0">
                <div class="custom-dt-range-content">
                  <div class="custom-dt-range-row">
                    <span class="custom-dt-tag start">Start</span>
                    <span class="custom-dt-val ${filterState.updateAtFrom ? '' : 'placeholder'}" id="lbl_updateAtFrom">
                      ${filterState.updateAtFrom ? filterState.updateAtFrom.replace('T', ' ') : 'Select start date & time'}
                    </span>
                  </div>
                  <div class="custom-dt-range-row">
                    <span class="custom-dt-tag end">End</span>
                    <span class="custom-dt-val ${filterState.updateAtTo ? '' : 'placeholder'}" id="lbl_updateAtTo">
                      ${filterState.updateAtTo ? filterState.updateAtTo.replace('T', ' ') : 'Select end date & time'}
                    </span>
                  </div>
                </div>
                <div class="custom-dt-range-icons">
                  <button type="button" class="custom-dt-clear-btn" id="clear_updateAt" title="Clear range" style="${(filterState.updateAtFrom || filterState.updateAtTo) ? 'display: flex;' : 'display: none;'}">
                    <span class="material-icons-round">close</span>
                  </button>
                  <div class="custom-dt-cal-icon-wrap" style="background: #ecfdf5; color: #059669;">
                    <span class="material-icons-round">calendar_month</span>
                  </div>
                </div>
              </div>
              <input type="hidden" id="f_updateAtFrom" value="${escapeHtml(filterState.updateAtFrom || '')}">
              <input type="hidden" id="f_updateAtTo" value="${escapeHtml(filterState.updateAtTo || '')}">
            </div>

            <!-- Row 2: Status Ticket (Custom Dropdown) & Requested By -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">flag</span>
                <span>Status Ticket</span>
              </label>
              <div class="custom-dropdown-container" id="dropdown-filter-status" style="position: relative; width: 100%;">
                <button type="button" class="custom-dropdown-trigger" id="filterStatusTrigger" style="height: 38px; border-radius: 10px; padding: 0 12px; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1.5px solid var(--border-light); width: 100%; cursor: pointer;">
                  <span class="trigger-label" id="filterStatusLabel">${getStatusLabel(filterState.statusTicket)}</span>
                  <span class="material-icons-round trigger-icon" style="font-size: 18px; color: var(--text-muted); transition: transform 0.2s;">expand_more</span>
                </button>
                <input type="hidden" id="f_statusTicket" value="${escapeHtml(filterState.statusTicket)}">
                <div class="custom-dropdown-menu" id="filterStatusMenu" style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 1000; max-height: 220px; overflow-y: auto; background: #ffffff; border: 1px solid var(--border-light); border-radius: 12px; padding: 6px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);">
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'all' ? 'active' : ''}" data-value="all">All Statuses</div>
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'Open' ? 'active' : ''}" data-value="Open">Open</div>
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'Assigned' ? 'active' : ''}" data-value="Assigned">Assigned</div>
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'Picked Up' ? 'active' : ''}" data-value="Picked Up">Picked Up</div>
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'Found' ? 'active' : ''}" data-value="Found">Found</div>
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'Found Partial' ? 'active' : ''}" data-value="Found Partial">Found Partial</div>
                  <div class="custom-dropdown-option ${filterState.statusTicket === 'Not Found' ? 'active' : ''}" data-value="Not Found">Not Found</div>
                </div>
              </div>
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">person</span>
                <span>Requested By</span>
              </label>
              <input type="text" id="f_requestedBy" value="${escapeHtml(filterState.requestedBy)}" placeholder="Filter by requester..." list="dl-requestedBy">
            </div>

            <!-- Row 3: Checker Line & Reason -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">view_timeline</span>
                <span>Checker Line</span>
              </label>
              <input type="text" id="f_checkerLine" value="${escapeHtml(filterState.checkerLine)}" placeholder="e.g. Line 1..." list="dl-checkerLine">
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: #ea580c;">help_outline</span>
                <span>Reason</span>
              </label>
              <input type="text" id="f_reason" value="${escapeHtml(filterState.reason)}" placeholder="e.g. Missing, damaged..." list="dl-reason">
            </div>

            <!-- Row 4: SO Number & Wave -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">tag</span>
                <span>SO Number</span>
              </label>
              <input type="text" id="f_soNumber" value="${escapeHtml(filterState.soNumber)}" placeholder="Filter by SO Number...">
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">waves</span>
                <span>Wave</span>
              </label>
              <input type="text" id="f_wave" value="${escapeHtml(filterState.wave)}" placeholder="e.g. Wave 1, 2..." list="dl-wave">
            </div>

            <!-- Row 5: SKU Number & Product Name -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">qr_code_2</span>
                <span>SKU Number</span>
              </label>
              <input type="text" id="f_skuNumber" value="${escapeHtml(filterState.skuNumber)}" placeholder="Filter by SKU Number...">
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">inventory</span>
                <span>Product Name</span>
              </label>
              <input type="text" id="f_productName" value="${escapeHtml(filterState.productName)}" placeholder="Filter by Product Name...">
            </div>

            <!-- Row 6: Origin Rack & Found At -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">grid_view</span>
                <span>Origin Rack</span>
              </label>
              <input type="text" id="f_originRackName" value="${escapeHtml(filterState.originRackName)}" placeholder="e.g. A-01-02...">
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: #10b981;">pin_drop</span>
                <span>Found At</span>
              </label>
              <input type="text" id="f_foundAt" value="${escapeHtml(filterState.foundAt)}" placeholder="Found location / rack...">
            </div>

            <!-- Row 7: Assigned By & Assigned To -->
            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: #7c3aed;">how_to_reg</span>
                <span>Assigned By</span>
              </label>
              <input type="text" id="f_assignedBy" value="${escapeHtml(filterState.assignedBy)}" placeholder="Filter by assigner..." list="dl-assignedBy">
            </div>

            <div class="ts-filter-field">
              <label>
                <span class="material-icons-round" style="font-size: 16px; color: #7c3aed;">person_pin</span>
                <span>Assigned To</span>
              </label>
              <input type="text" id="f_assignedTo" value="${escapeHtml(filterState.assignedTo)}" placeholder="Filter by troubleshooter..." list="dl-assignedTo">
            </div>

          </div>
        </div>

        <!-- Footer Actions -->
        <div class="form-modal-footer-actions" style="padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); flex-shrink: 0; background: #ffffff;">
          <button type="button" class="btn-secondary" id="tsFilterResetModalBtn" style="color: #dc2626; border-color: #fca5a5; display: inline-flex; align-items: center; gap: 4px;">
            <span class="material-icons-round" style="font-size: 16px;">restart_alt</span> Reset
          </button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-secondary" id="tsFilterCancelModalBtn">Cancel</button>
            <button type="button" class="btn-primary" id="tsFilterApplyModalBtn" style="display: inline-flex; align-items: center; gap: 6px;">
              <span class="material-icons-round" style="font-size: 16px;">done</span> Apply Filters
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#tsFilterModalCloseBtn').addEventListener('click', closeModal);
    overlay.querySelector('#tsFilterCancelModalBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    // Custom Dropdown wiring for Status Ticket
    const statusDropdown = overlay.querySelector('#dropdown-filter-status');
    const statusTrigger = overlay.querySelector('#filterStatusTrigger');
    const statusLabel = overlay.querySelector('#filterStatusLabel');
    const statusInput = overlay.querySelector('#f_statusTicket');
    const statusMenu = overlay.querySelector('#filterStatusMenu');

    if (statusTrigger && statusDropdown && statusMenu) {
      statusTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        statusDropdown.classList.toggle('open');
      });

      statusMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.dataset.value;
          statusInput.value = val;
          statusLabel.textContent = opt.textContent;
          statusMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.toggle('active', o.dataset.value === val));
          statusDropdown.classList.remove('open');
        });
      });

      overlay.addEventListener('click', (e) => {
        if (!statusDropdown.contains(e.target)) {
          statusDropdown.classList.remove('open');
        }
      });
    }

    // Custom Date Range Cards Wiring
    const cardReq = overlay.querySelector('#card_requestTimestamp');
    const inputReqFrom = overlay.querySelector('#f_requestTimestampFrom');
    const inputReqTo = overlay.querySelector('#f_requestTimestampTo');
    const lblReqFrom = overlay.querySelector('#lbl_requestTimestampFrom');
    const lblReqTo = overlay.querySelector('#lbl_requestTimestampTo');
    const clearReqBtn = overlay.querySelector('#clear_requestTimestamp');

    function updateReqCardUi(start, end) {
      inputReqFrom.value = start || '';
      inputReqTo.value = end || '';
      if (start) {
        lblReqFrom.textContent = start.replace('T', ' ');
        lblReqFrom.classList.remove('placeholder');
      } else {
        lblReqFrom.textContent = 'Select start date & time';
        lblReqFrom.classList.add('placeholder');
      }
      if (end) {
        lblReqTo.textContent = end.replace('T', ' ');
        lblReqTo.classList.remove('placeholder');
      } else {
        lblReqTo.textContent = 'Select end date & time';
        lblReqTo.classList.add('placeholder');
      }
      const hasVal = Boolean(start || end);
      cardReq.classList.toggle('has-value', hasVal);
      clearReqBtn.style.display = hasVal ? 'flex' : 'none';
    }

    if (cardReq) {
      cardReq.addEventListener('click', (e) => {
        if (e.target.closest('#clear_requestTimestamp')) return;
        openCustomDateRangePicker({
          title: 'Request Timestamp Range',
          subtitle: 'Filter tickets by request date and time range',
          initialStart: inputReqFrom.value,
          initialEnd: inputReqTo.value,
          onApply: (startVal, endVal) => {
            updateReqCardUi(startVal, endVal);
          },
          onClear: () => {
            updateReqCardUi('', '');
          }
        });
      });

      clearReqBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateReqCardUi('', '');
      });
    }

    const cardUpd = overlay.querySelector('#card_updateAt');
    const inputUpdFrom = overlay.querySelector('#f_updateAtFrom');
    const inputUpdTo = overlay.querySelector('#f_updateAtTo');
    const lblUpdFrom = overlay.querySelector('#lbl_updateAtFrom');
    const lblUpdTo = overlay.querySelector('#lbl_updateAtTo');
    const clearUpdBtn = overlay.querySelector('#clear_updateAt');

    function updateUpdCardUi(start, end) {
      inputUpdFrom.value = start || '';
      inputUpdTo.value = end || '';
      if (start) {
        lblUpdFrom.textContent = start.replace('T', ' ');
        lblUpdFrom.classList.remove('placeholder');
      } else {
        lblUpdFrom.textContent = 'Select start date & time';
        lblUpdFrom.classList.add('placeholder');
      }
      if (end) {
        lblUpdTo.textContent = end.replace('T', ' ');
        lblUpdTo.classList.remove('placeholder');
      } else {
        lblUpdTo.textContent = 'Select end date & time';
        lblUpdTo.classList.add('placeholder');
      }
      const hasVal = Boolean(start || end);
      cardUpd.classList.toggle('has-value', hasVal);
      clearUpdBtn.style.display = hasVal ? 'flex' : 'none';
    }

    if (cardUpd) {
      cardUpd.addEventListener('click', (e) => {
        if (e.target.closest('#clear_updateAt')) return;
        openCustomDateRangePicker({
          title: 'Update At Range',
          subtitle: 'Filter tickets by last update date and time range',
          initialStart: inputUpdFrom.value,
          initialEnd: inputUpdTo.value,
          onApply: (startVal, endVal) => {
            updateUpdCardUi(startVal, endVal);
          },
          onClear: () => {
            updateUpdCardUi('', '');
          }
        });
      });

      clearUpdBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        updateUpdCardUi('', '');
      });
    }

    // Reset fields inside modal
    overlay.querySelector('#tsFilterResetModalBtn').addEventListener('click', () => {
      updateReqCardUi('', '');
      updateUpdCardUi('', '');
      if (statusInput) statusInput.value = 'all';
      if (statusLabel) statusLabel.textContent = 'All Statuses';
      if (statusMenu) {
        statusMenu.querySelectorAll('.custom-dropdown-option').forEach(o => o.classList.toggle('active', o.dataset.value === 'all'));
      }
      overlay.querySelector('#f_requestedBy').value = '';
      overlay.querySelector('#f_checkerLine').value = '';
      overlay.querySelector('#f_reason').value = '';
      overlay.querySelector('#f_soNumber').value = '';
      overlay.querySelector('#f_wave').value = '';
      overlay.querySelector('#f_skuNumber').value = '';
      overlay.querySelector('#f_productName').value = '';
      overlay.querySelector('#f_originRackName').value = '';
      overlay.querySelector('#f_foundAt').value = '';
      overlay.querySelector('#f_assignedBy').value = '';
      overlay.querySelector('#f_assignedTo').value = '';
    });

    // Apply filters
    overlay.querySelector('#tsFilterApplyModalBtn').addEventListener('click', () => {
      filterState.requestTimestampFrom = overlay.querySelector('#f_requestTimestampFrom').value.trim();
      filterState.requestTimestampTo = overlay.querySelector('#f_requestTimestampTo').value.trim();
      filterState.updateAtFrom = overlay.querySelector('#f_updateAtFrom').value.trim();
      filterState.updateAtTo = overlay.querySelector('#f_updateAtTo').value.trim();
      filterState.statusTicket = statusInput ? statusInput.value.trim() : 'all';
      filterState.requestedBy = overlay.querySelector('#f_requestedBy').value.trim();
      filterState.checkerLine = overlay.querySelector('#f_checkerLine').value.trim();
      filterState.reason = overlay.querySelector('#f_reason').value.trim();
      filterState.soNumber = overlay.querySelector('#f_soNumber').value.trim();
      filterState.wave = overlay.querySelector('#f_wave').value.trim();
      filterState.skuNumber = overlay.querySelector('#f_skuNumber').value.trim();
      filterState.productName = overlay.querySelector('#f_productName').value.trim();
      filterState.originRackName = overlay.querySelector('#f_originRackName').value.trim();
      filterState.foundAt = overlay.querySelector('#f_foundAt').value.trim();
      filterState.assignedBy = overlay.querySelector('#f_assignedBy').value.trim();
      filterState.assignedTo = overlay.querySelector('#f_assignedTo').value.trim();

      closeModal();
      renderList();
    });
  }

  function updateKpis(allTickets) {
    const todayJakarta = getJakartaDateString(new Date());
    const openCount = allTickets.filter(t => t.statusTicket === 'Open').length;
    const assignedCount = allTickets.filter(t => t.statusTicket === 'Assigned').length;

    const elOpen = document.getElementById('tsKpiOpen');
    const elAssigned = document.getElementById('tsKpiAssigned');
    const elProgress = document.getElementById('tsKpiInProgress');
    const elFound = document.getElementById('tsKpiFound');
    const elNotFound = document.getElementById('tsKpiNotFound');

    if (elOpen) elOpen.textContent = openCount;
    if (elAssigned) elAssigned.textContent = assignedCount;
    if (elProgress) elProgress.textContent = allTickets.filter(t => t.statusTicket === 'Picked Up').length;
    if (elFound) elFound.textContent = allTickets.filter(t =>
      (t.statusTicket === 'Found' || t.statusTicket === 'Found Partial') &&
      Boolean(t.updateAt) && getJakartaDateString(t.updateAt) === todayJakarta
    ).length;
    if (elNotFound) elNotFound.textContent = allTickets.filter(t =>
      t.statusTicket === 'Not Found' &&
      Boolean(t.updateAt) && getJakartaDateString(t.updateAt) === todayJakarta
    ).length;
  }

  function renderList() {
    const allTickets = db.getTroubleShootTickets();
    updateKpis(allTickets);
    renderActiveFilterPills();

    let filtered = allTickets;

    // 1. Request Timestamp Range
    if (filterState.requestTimestampFrom) {
      const fromMs = parseInputDateTime(filterState.requestTimestampFrom, false);
      if (fromMs !== null) {
        filtered = filtered.filter(t => parseJakartaTimestamp(t.requestTimestamp) >= fromMs);
      }
    }
    if (filterState.requestTimestampTo) {
      const toMs = parseInputDateTime(filterState.requestTimestampTo, true);
      if (toMs !== null) {
        filtered = filtered.filter(t => parseJakartaTimestamp(t.requestTimestamp) <= toMs);
      }
    }

    // 2. Update At Range
    if (filterState.updateAtFrom) {
      const fromMs = parseInputDateTime(filterState.updateAtFrom, false);
      if (fromMs !== null) {
        filtered = filtered.filter(t => {
          if (!t.updateAt) return false;
          return parseJakartaTimestamp(t.updateAt) >= fromMs;
        });
      }
    }
    if (filterState.updateAtTo) {
      const toMs = parseInputDateTime(filterState.updateAtTo, true);
      if (toMs !== null) {
        filtered = filtered.filter(t => {
          if (!t.updateAt) return false;
          return parseJakartaTimestamp(t.updateAt) <= toMs;
        });
      }
    }

    // 3. Status Ticket
    if (filterState.statusTicket && filterState.statusTicket !== 'all') {
      filtered = filtered.filter(t => String(t.statusTicket || '').toLowerCase() === filterState.statusTicket.toLowerCase());
    }

    // 4. Specific text fields
    if (filterState.requestedBy) {
      const q = filterState.requestedBy.toLowerCase();
      filtered = filtered.filter(t => String(t.requestedBy || '').toLowerCase().includes(q) || String(t.staffId || '').toLowerCase().includes(q));
    }
    if (filterState.checkerLine) {
      const q = filterState.checkerLine.toLowerCase();
      filtered = filtered.filter(t => String(t.checkerLine || '').toLowerCase().includes(q));
    }
    if (filterState.reason) {
      const q = filterState.reason.toLowerCase();
      filtered = filtered.filter(t => String(t.reason || '').toLowerCase().includes(q));
    }
    if (filterState.soNumber) {
      const q = filterState.soNumber.toLowerCase();
      filtered = filtered.filter(t => String(t.soNumber || '').toLowerCase().includes(q));
    }
    if (filterState.wave) {
      const q = filterState.wave.toLowerCase();
      filtered = filtered.filter(t => String(t.wave || '').toLowerCase().includes(q));
    }
    if (filterState.skuNumber) {
      const q = filterState.skuNumber.toLowerCase();
      filtered = filtered.filter(t => String(t.skuNumber || '').toLowerCase().includes(q));
    }
    if (filterState.productName) {
      const q = filterState.productName.toLowerCase();
      filtered = filtered.filter(t => String(t.productName || '').toLowerCase().includes(q));
    }
    if (filterState.originRackName) {
      const q = filterState.originRackName.toLowerCase();
      filtered = filtered.filter(t => String(t.originRackName || '').toLowerCase().includes(q));
    }
    if (filterState.foundAt) {
      const q = filterState.foundAt.toLowerCase();
      filtered = filtered.filter(t => String(t.foundAt || '').toLowerCase().includes(q));
    }
    if (filterState.assignedBy) {
      const q = filterState.assignedBy.toLowerCase();
      filtered = filtered.filter(t => String(t.assignedBy || '').toLowerCase().includes(q));
    }
    if (filterState.assignedTo) {
      const q = filterState.assignedTo.toLowerCase();
      filtered = filtered.filter(t => String(t.assignedTo || '').toLowerCase().includes(q));
    }

    // 5. Global Search query
    if (searchQuery) {
      filtered = filtered.filter(t => {
        const haystack = [t.id, t.soNumber, t.skuNumber, t.productName, t.requestedBy, t.assignedTo, t.originRackName, t.reason, t.wave, t.foundAt, t.checkerLine].join(' ').toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    countBadge.textContent = `${filtered.length} Ticket${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <span class="material-icons-round" style="font-size: 48px; opacity: 0.3;">troubleshoot</span>
          <p style="margin-top: 8px; font-size: 13px;">No tickets match the current filters.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(t => {
      const statusClass = getStatusClass(t.statusTicket);
      const timeAgo = getTimeAgo(t.requestTimestamp);
      const isResolved = ['Found', 'Found Partial', 'Not Found'].includes(t.statusTicket);
      const isAssignable = !isResolved;
      const isReassign = t.statusTicket !== 'Open' && isAssignable;

      return `
        <div class="ts-ticket-card" data-id="${escapeHtml(t.id)}" style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 14px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600);">confirmation_number</span>
              <span style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${escapeHtml(t.id)}</span>
            </div>
            <span class="ts-status-badge ${statusClass}">${escapeHtml(t.statusTicket)}</span>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary); display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px;">
            <span><strong>SO:</strong> ${escapeHtml(t.soNumber)}</span>
            <span><strong>SKU:</strong> ${escapeHtml(t.skuNumber)}</span>
            <span style="grid-column: 1 / -1;"><strong>Product:</strong> ${escapeHtml(t.productName)}</span>
            <span><strong>Rack:</strong> ${escapeHtml(t.originRackName)}</span>
            <span><strong>Qty:</strong> ${escapeHtml(t.requestQuantity)}</span>
            <span><strong>Wave:</strong> <span style="color: var(--primary-700); font-weight: 700;">${escapeHtml(t.wave || '-')}</span></span>
            <span><strong>Reason:</strong> ${escapeHtml(t.reason)}</span>
            <span style="grid-column: 1 / -1;"><strong>By:</strong> ${escapeHtml(t.requestedBy)} · ${timeAgo}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px dashed var(--border-light); padding-top: 8px;">
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 8px;">
              ${t.photo ? '<span style="color: var(--primary-600); display: flex; align-items: center; gap: 2px;"><span class="material-icons-round" style="font-size: 14px;">photo_camera</span> Photo</span>' : ''}
              ${t.troubleshootEvidence ? '<span style="color: #10b981; display: flex; align-items: center; gap: 2px;"><span class="material-icons-round" style="font-size: 14px;">verified</span> Evidence</span>' : ''}
              ${t.assignedTo ? `<span style="color: #7c3aed; font-weight: 600;">Assigned: ${escapeHtml(t.assignedTo)}</span>` : ''}
            </div>
            ${isAssignable ? (
              isReassign ? `
                <button class="ts-assign-btn ts-reassign-btn" data-id="${escapeHtml(t.id)}" style="height: 28px; padding: 0 12px; font-size: 11px; font-weight: 700; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; background: #f5f3ff; color: #7c3aed; border: 1.5px solid #ddd6fe; cursor: pointer; transition: all 0.2s;">
                  <span class="material-icons-round" style="font-size: 15px;">swap_horiz</span> Reassign
                </button>
              ` : `
                <button class="btn-primary ts-assign-btn" data-id="${escapeHtml(t.id)}" style="height: 28px; padding: 0 12px; font-size: 11px; font-weight: 700; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
                  <span class="material-icons-round" style="font-size: 15px;">person_add</span> Assign
                </button>
              `
            ) : `
              <span style="font-size: 11px; color: var(--primary-600); font-weight: 600; display: flex; align-items: center; gap: 2px;">View Details <span class="material-icons-round" style="font-size: 14px;">chevron_right</span></span>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers for details popup
    listContainer.querySelectorAll('.ts-ticket-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.ts-assign-btn')) return; // ignore click on assign button
        const ticketId = card.dataset.id;
        const ticket = allTickets.find(t => t.id === ticketId);
        if (ticket) openDetailModal(ticket);
      });
    });

    // Attach assign handlers
    listContainer.querySelectorAll('.ts-assign-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openAssignModal(btn.dataset.id);
      });
    });
  }

  function openDetailModal(ticket) {
    const existing = document.getElementById('tsDetailModal');
    if (existing) existing.remove();

    const statusClass = getStatusClass(ticket.statusTicket);
    const photoSrc = formatImageUrl(ticket.photo);
    const evidenceSrc = formatImageUrl(ticket.troubleshootEvidence);
    const isResolved = ['Found', 'Found Partial', 'Not Found'].includes(ticket.statusTicket);
    const isAssignable = !isResolved;
    const isReassign = ticket.statusTicket !== 'Open' && isAssignable;

    const overlay = document.createElement('div');
    overlay.id = 'tsDetailModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:9999;';

    overlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 620px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
        <!-- Header -->
        <div class="form-modal-header" style="flex-shrink: 0; padding: 16px 20px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="material-icons-round" style="color: var(--primary-600); font-size: 20px;">confirmation_number</span>
            <span style="font-weight: 800; font-size: 16px; color: var(--text-primary);">${escapeHtml(ticket.id)}</span>
            <span class="ts-status-badge ${statusClass}">${escapeHtml(ticket.statusTicket)}</span>
          </div>
          <button class="form-modal-close-btn" id="tsDetailCloseBtn" title="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- Body -->
        <div class="form-modal-body" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; line-height: 1.4;">
          
          <!-- SO & Product Information Section -->
          <div style="background: var(--surface-body, #f8fafc); border-radius: 14px; padding: 16px; border: 1px solid var(--border-light, #e2e8f0); display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
              Product & Order Information
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">SO Number</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px; word-break: break-all;">${escapeHtml(ticket.soNumber || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">SKU Number</span>
                <span style="font-weight: 700; color: var(--primary-700); font-size: 13px; word-break: break-all;">${escapeHtml(ticket.skuNumber || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Request Quantity</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.requestQuantity || 1)}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Wave</span>
                <span style="font-weight: 700; color: var(--primary-700); font-size: 13px;">${escapeHtml(ticket.wave || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Origin Rack</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.originRackName || '-')}</span>
              </div>
              <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 2px; border-top: 1px dashed var(--border-light); padding-top: 6px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Product Name</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px; line-height: 1.4;">${escapeHtml(ticket.productName || '-')}</span>
              </div>
            </div>
          </div>

          <!-- Request & Ticket Logistics Section -->
          <div style="background: var(--surface-body, #f8fafc); border-radius: 14px; padding: 16px; border: 1px solid var(--border-light, #e2e8f0); display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
              Request Logistics
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Requested By</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.requestedBy || '-')} ${ticket.staffId ? `(${escapeHtml(ticket.staffId)})` : ''}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Checker Line</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.checkerLine || 'N/A')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Reason</span>
                <span style="color: #ea580c; font-weight: 800; font-size: 13px;">${escapeHtml(ticket.reason || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Picker Name</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.pickerName || 'N/A')}</span>
              </div>
              <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 2px; border-top: 1px dashed var(--border-light); padding-top: 6px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Request Time</span>
                <span style="font-weight: 600; color: var(--text-secondary); font-size: 12px;">${escapeHtml(ticket.requestTimestamp || '-')}</span>
              </div>
            </div>
          </div>

          <!-- Assignment & Resolution Status Section -->
          <div style="background: var(--surface-body, #f8fafc); border-radius: 14px; padding: 16px; border: 1px solid var(--border-light, #e2e8f0); display: flex; flex-direction: column; gap: 10px;">
            <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-light); padding-bottom: 6px;">
              Assignment & Resolution
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px;">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Assigned To</span>
                <span style="color: #7c3aed; font-weight: 800; font-size: 13px;">${escapeHtml(ticket.assignedTo || 'Unassigned')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Assigned By</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.assignedBy || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Found Qty</span>
                <span style="font-weight: 800; color: var(--text-primary); font-size: 13px;">${ticket.foundQty !== undefined && ticket.foundQty !== '' ? escapeHtml(ticket.foundQty) : '-'}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Found At</span>
                <span style="font-weight: 800; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.foundAt || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Delivered At</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.deliveredAt || '-')}</span>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Picked By</span>
                <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(ticket.pickedBy || '-')}</span>
              </div>
              <div style="grid-column: 1 / -1; display: flex; flex-direction: column; gap: 2px; border-top: 1px dashed var(--border-light); padding-top: 6px;">
                <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Last Updated</span>
                <span style="font-weight: 600; color: var(--text-secondary); font-size: 12px;">${escapeHtml(ticket.updateAt || '-')}</span>
              </div>
            </div>
          </div>

          <!-- Photos & Evidence Section -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <!-- Requester Photo -->
            <div style="border: 1.5px solid var(--border-light); border-radius: 14px; padding: 14px; background: #ffffff; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 160px; gap: 6px;">
              <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Requester Photo</div>
              ${photoSrc ? `
                <a href="${escapeHtml(ticket.photo)}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; text-align: center;">
                  <img src="${escapeHtml(photoSrc)}" alt="Requester Photo" referrerpolicy="no-referrer" crossorigin="anonymous" loading="lazy" style="max-width: 100%; max-height: 150px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-light);" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:var(--text-muted);font-size:11px;\\'>Preview not available.<br><a href=\\'${escapeHtml(ticket.photo)}\\' target=\\'_blank\\'>Open Image Link</a></span>'"/>
                </a>
                <a href="${escapeHtml(ticket.photo)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--primary-600); font-weight: 700; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                  <span class="material-icons-round" style="font-size: 14px;">open_in_new</span> View Original
                </a>
              ` : `
                <span class="material-icons-round" style="font-size: 36px; color: var(--text-muted); opacity: 0.35;">no_photography</span>
                <span style="font-size: 11px; color: var(--text-muted);">No photo attached</span>
              `}
            </div>

            <!-- Troubleshoot Evidence -->
            <div style="border: 1.5px solid var(--border-light); border-radius: 14px; padding: 14px; background: #ffffff; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 160px; gap: 6px;">
              <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Troubleshoot Evidence</div>
              ${evidenceSrc ? `
                <a href="${escapeHtml(ticket.troubleshootEvidence)}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; text-align: center;">
                  <img src="${escapeHtml(evidenceSrc)}" alt="Evidence Photo" referrerpolicy="no-referrer" crossorigin="anonymous" loading="lazy" style="max-width: 100%; max-height: 150px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-light);" onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'color:var(--text-muted);font-size:11px;\\'>Preview not available.<br><a href=\\'${escapeHtml(ticket.troubleshootEvidence)}\\' target=\\'_blank\\'>Open Image Link</a></span>'"/>
                </a>
                <a href="${escapeHtml(ticket.troubleshootEvidence)}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: var(--primary-600); font-weight: 700; display: inline-flex; align-items: center; gap: 4px; text-decoration: none;">
                  <span class="material-icons-round" style="font-size: 14px;">open_in_new</span> View Original
                </a>
              ` : `
                <span class="material-icons-round" style="font-size: 36px; color: var(--text-muted); opacity: 0.35;">image_not_supported</span>
                <span style="font-size: 11px; color: var(--text-muted);">No evidence yet</span>
              `}
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="form-modal-footer-actions" style="padding: 16px 20px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-light); flex-shrink: 0; background: #ffffff;">
          <button type="button" class="btn-secondary" id="tsDetailCloseBtnBottom">Close</button>
          ${isAssignable ? `
            <button type="button" class="btn-primary" id="tsDetailAssignBtn" style="display: flex; align-items: center; gap: 6px; ${isReassign ? 'background: #7c3aed; border-color: #6d28d9;' : ''}">
              <span class="material-icons-round" style="font-size: 16px;">${isReassign ? 'swap_horiz' : 'person_add'}</span>
              <span>${isReassign ? 'Reassign Ticket' : 'Assign Ticket'}</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeDetail = () => overlay.remove();
    overlay.querySelector('#tsDetailCloseBtn')?.addEventListener('click', closeDetail);
    overlay.querySelector('#tsDetailCloseBtnBottom')?.addEventListener('click', closeDetail);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetail(); });

    const assignBtn = overlay.querySelector('#tsDetailAssignBtn');
    if (assignBtn) {
      assignBtn.addEventListener('click', () => {
        closeDetail();
        openAssignModal(ticket.id);
      });
    }
  }

  function openAssignModal(ticketId) {
    const existing = document.getElementById('tsAssignModal');
    if (existing) existing.remove();

    const allTickets = db.getTroubleShootTickets();
    const ticket = allTickets.find(t => String(t.id).trim() === String(ticketId).trim());
    const isReassign = Boolean(ticket && ticket.statusTicket !== 'Open');

    // Get list of users with Troubleshooter role only
    const users = db.users || [];
    const assignableUsers = users.filter(u => (u.role || '').toLowerCase() === 'troubleshooter');

    const overlay = document.createElement('div');
    overlay.id = 'tsAssignModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:9999;';

    overlay.innerHTML = `
      <div class="modal-card" style="width: 90%; max-width: 440px; padding: 22px; border-radius: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.2); overflow: visible !important;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
            <span class="material-icons-round" style="color: ${isReassign ? '#7c3aed' : 'var(--primary-600)'}; font-size: 24px;">${isReassign ? 'swap_horiz' : 'person_add'}</span>
            <span>${isReassign ? 'Reassign' : 'Assign'} Ticket: <span style="color: var(--primary-600);">${escapeHtml(ticketId)}</span></span>
          </h3>
          <button type="button" id="tsAssignCloseIconBtn" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center;" title="Close">
            <span class="material-icons-round" style="font-size: 20px;">close</span>
          </button>
        </div>
        
        ${isReassign && ticket ? `
          <div style="margin-bottom: 16px; padding: 10px 14px; background: #fbfbfe; border: 1.5px dashed #ddd6fe; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 12px;">
            <div>
              <span style="color: var(--text-muted); font-size: 11px; font-weight: 600; display: block;">Currently Assigned To:</span>
              <strong style="color: #7c3aed; font-size: 13px;">${escapeHtml(ticket.assignedTo || 'None')}</strong>
            </div>
            <div style="text-align: right;">
              <span style="color: var(--text-muted); font-size: 11px; font-weight: 600; display: block;">Current Status:</span>
              <span class="ts-status-badge ${getStatusClass(ticket.statusTicket)}">${escapeHtml(ticket.statusTicket)}</span>
            </div>
          </div>
        ` : ''}

        <div style="margin-bottom: 22px;">
          <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; display: block;">Select Troubleshooter</label>
          <input type="hidden" id="tsAssignSelect" value="">
          
          <div class="custom-dropdown-container" id="dropdown-assign-troubleshooter" style="position: relative; width: 100%;">
            <div style="position: relative; width: 100%; display: flex; align-items: center;">
              <span class="material-icons-round" style="position: absolute; left: 12px; font-size: 18px; color: var(--text-muted); pointer-events: none; z-index: 5;">search</span>
              <input 
                type="text" 
                id="tsAssignSearchInput" 
                class="text-control" 
                placeholder="Search or select troubleshooter..." 
                autocomplete="off"
                style="height: 42px; border-radius: 12px; padding: 0 40px 0 38px; font-size: 13px; font-weight: 600; background: #ffffff; border: 1.5px solid var(--border-light); width: 100%; box-sizing: border-box; outline: none;"
              />
              <button 
                type="button" 
                id="tsAssignDropdownToggleBtn" 
                tabindex="-1"
                style="position: absolute; right: 8px; background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; padding: 0;"
                title="Toggle List"
              >
                <span class="material-icons-round trigger-icon" style="font-size: 20px; transition: transform 0.2s;">expand_more</span>
              </button>
            </div>

            <div class="custom-dropdown-menu" id="tsAssignDropdownMenu" style="position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 9999; max-height: 220px; overflow-y: auto !important; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; padding: 6px; border-radius: 12px; border: 1.5px solid var(--border-light); background: #ffffff; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);">
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="tsAssignCancelBtn" class="btn-secondary" style="padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700;">Cancel</button>
          <button id="tsAssignConfirmBtn" class="btn-primary" style="padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; ${isReassign ? 'background: #7c3aed; border-color: #6d28d9;' : ''}">
            <span class="material-icons-round" style="font-size: 18px;">${isReassign ? 'swap_horiz' : 'check'}</span>
            <span>${isReassign ? 'Confirm Reassign' : 'Assign Ticket'}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const assignInput = overlay.querySelector('#tsAssignSelect');
    const containerEl = overlay.querySelector('#dropdown-assign-troubleshooter');
    const searchInput = overlay.querySelector('#tsAssignSearchInput');
    const toggleBtn = overlay.querySelector('#tsAssignDropdownToggleBtn');
    const menuEl = overlay.querySelector('#tsAssignDropdownMenu');

    const renderDropdownOptions = (query = '') => {
      const q = query.toLowerCase().trim();
      const filtered = assignableUsers.filter(u => 
        (u.name || '').toLowerCase().includes(q) || 
        (u.staffId || '').toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        if (assignableUsers.length === 0) {
          menuEl.innerHTML = `
            <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
              No staff with Troubleshooter role found.<br><span style="font-size: 11px; color: var(--primary-600); font-weight: 600;">Please set Troubleshooter role in Admin panel.</span>
            </div>
          `;
        } else {
          menuEl.innerHTML = `
            <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
              No troubleshooter found matching "<strong>${escapeHtml(query)}</strong>"
            </div>
          `;
        }
        return;
      }

      menuEl.innerHTML = filtered.map(u => {
        const isSelected = assignInput.value === u.name;
        return `
          <div class="custom-dropdown-option ${isSelected ? 'active' : ''}" data-value="${escapeHtml(u.name)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; border-radius: 8px; margin-bottom: 2px;">
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <span style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${escapeHtml(u.name)}</span>
              ${u.staffId ? `<span style="font-size: 11px; color: var(--text-muted);">Staff ID: ${escapeHtml(u.staffId)}</span>` : ''}
            </div>
            ${isSelected ? '<span class="material-icons-round" style="color: var(--primary-600); font-size: 18px;">check</span>' : ''}
          </div>
        `;
      }).join('');

      menuEl.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = opt.dataset.value;
          assignInput.value = val;
          searchInput.value = val;
          closeDropdown();
        });
      });
    };

    const openDropdown = () => {
      containerEl.classList.add('open');
      renderDropdownOptions(searchInput.value);
    };

    const closeDropdown = () => {
      containerEl.classList.remove('open');
    };

    const toggleDropdown = () => {
      if (containerEl.classList.contains('open')) {
        closeDropdown();
      } else {
        openDropdown();
        searchInput.focus();
      }
    };

    searchInput.addEventListener('focus', () => {
      openDropdown();
    });

    searchInput.addEventListener('input', (e) => {
      const typed = e.target.value;
      const exactMatch = assignableUsers.find(u => u.name.toLowerCase() === typed.trim().toLowerCase());
      assignInput.value = exactMatch ? exactMatch.name : '';
      openDropdown();
      renderDropdownOptions(typed);
    });

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    const onDocClick = (e) => {
      if (!containerEl.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener('click', onDocClick);

    const closeModal = () => {
      document.removeEventListener('click', onDocClick);
      overlay.remove();
    };

    overlay.querySelector('#tsAssignCancelBtn').addEventListener('click', closeModal);
    overlay.querySelector('#tsAssignCloseIconBtn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    overlay.querySelector('#tsAssignConfirmBtn').addEventListener('click', async () => {
      let selectedName = assignInput.value.trim();
      if (!selectedName && searchInput.value.trim()) {
        const typed = searchInput.value.trim().toLowerCase();
        const match = assignableUsers.find(u => u.name.toLowerCase() === typed || (u.staffId || '').toLowerCase() === typed);
        if (match) selectedName = match.name;
      }

      if (!selectedName) {
        alert('Please select a troubleshooter from the list.');
        searchInput.focus();
        openDropdown();
        return;
      }

      const confirmBtn = overlay.querySelector('#tsAssignConfirmBtn');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `<span class="material-icons-round spin" style="font-size: 16px;">sync</span> ${isReassign ? 'Reassigning...' : 'Assigning...'}`;

      try {
        await db.assignTroubleShootTicket(ticketId, currentUser.name, selectedName);
        closeModal();
        renderList();
      } catch (err) {
        alert((isReassign ? 'Reassignment' : 'Assignment') + ' failed: ' + err.message);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `<span class="material-icons-round" style="font-size: 18px;">${isReassign ? 'swap_horiz' : 'check'}</span> ${isReassign ? 'Confirm Reassign' : 'Assign Ticket'}`;
      }
    });
  }

  renderList();
  const unsub = db.subscribe(() => renderList());
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatImageUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (trimmed.startsWith('data:image')) return trimmed;
  // Match Google Drive file ID across all share/open/uc/view formats
  const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    // Google User Content CDN endpoint avoids ORB (Opaque Response Blocking) and login redirects
    return `https://lh3.googleusercontent.com/d/${match[1]}=w800`;
  }
  return trimmed;
}

function getStatusClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'open') return 'ts-status-open';
  if (s === 'assigned') return 'ts-status-assigned';
  if (s === 'picked up') return 'ts-status-picked';
  if (s === 'found') return 'ts-status-found';
  if (s === 'found partial') return 'ts-status-partial';
  if (s === 'not found') return 'ts-status-notfound';
  return 'ts-status-open';
}
