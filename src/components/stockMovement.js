import { db } from '../data/db.js';
import { openCameraScanner } from '../utils/scanner.js';

export function renderStockMovement(container, currentUser) {
  let activeSubTab = 'tasks'; // 'tasks' | 'activities'
  let searchQuery = '';
  let typeFilter = 'all';
  let statusFilter = 'all';

  container.innerHTML = `
    <div class="card-panel stock-movement-panel" style="padding: 24px; display: flex; flex-direction: column; gap: 20px; min-height: 0; height: 100%; box-sizing: border-box;">
      
      <!-- Sticky Header Area -->
      <div class="sm-sticky-header" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Panel Header -->
        <div class="card-title-group" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); margin-bottom: 0; width: 100%; box-sizing: border-box;">
          <div style="min-width: 0;">
            <h3 style="display: flex; align-items: center; gap: 6px; margin: 0; white-space: nowrap; font-size: 15px;">
              <span class="material-icons-round" style="color: var(--primary-600); flex-shrink: 0; font-size: 20px;">swap_horiz</span>
              <span>Stock Movement & Deduction</span>
            </h3>
          </div>

          <button id="toggleKpiBtn" class="btn-secondary" title="Toggle KPI cards visibility" style="height: 28px; padding: 0 10px; font-size: 11px; font-weight: 700; gap: 4px; border-radius: 20px; flex-shrink: 0; white-space: nowrap;">
            <span class="material-icons-round" id="toggleKpiIcon" style="font-size: 15px;">${localStorage.getItem('irms_hide_kpis') === 'true' ? 'expand_more' : 'expand_less'}</span>
            <span id="toggleKpiText">${localStorage.getItem('irms_hide_kpis') === 'true' ? 'Show KPIs' : 'Hide KPIs'}</span>
          </button>
        </div>

        <!-- KPI Summary Cards -->
        <div class="kpi-grid" id="smKpiGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
          <!-- Dynamically rendered -->
        </div>

        <!-- Sub-tab Bar & Search Filter Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 2px solid var(--border-light); padding-bottom: 8px;">
          <div style="display: flex; gap: 8px;">
            <button class="admin-subtab active" id="subtabTasksBtn" data-subtab="tasks">
              <span class="material-icons-round" style="font-size: 18px;">task</span>
              <span>Movement Tasks</span>
            </button>
            <button class="admin-subtab" id="subtabActivitiesBtn" data-subtab="activities">
              <span class="material-icons-round" style="font-size: 18px;">history</span>
              <span>Stock Activity Log</span>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;" id="smFilterToolbar">
            <div style="position: relative;">
              <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: var(--text-muted);">search</span>
              <input type="text" id="smSearchInput" class="text-control" placeholder="Search ID, SKU, Staff, Rack..." style="padding-left: 32px; height: 34px; font-size: 12px; width: 220px;" />
            </div>

            <!-- Type Filter Custom Dropdown -->
            <div class="custom-dropdown-container" id="dropdown-sm-filter-type" style="width: 160px;">
              <button type="button" class="custom-dropdown-trigger" style="height: 34px; padding: 0 10px; font-size: 12px;">
                <span class="trigger-label">All Types</span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" style="z-index: 2500;">
                <div class="custom-dropdown-option active" data-value="all">All Types</div>
                <div class="custom-dropdown-option" data-value="Transfer location">Transfer location</div>
                <div class="custom-dropdown-option" data-value="Stock deduction">Stock deduction</div>
              </div>
            </div>

            <!-- Status Filter Custom Dropdown -->
            <div class="custom-dropdown-container" id="dropdown-sm-filter-status" style="width: 160px;">
              <button type="button" class="custom-dropdown-trigger" style="height: 34px; padding: 0 10px; font-size: 12px;">
                <span class="trigger-label">All Statuses</span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" style="z-index: 2500;">
                <div class="custom-dropdown-option active" data-value="all">All Statuses</div>
                <div class="custom-dropdown-option" data-value="Pending">Pending</div>
                <div class="custom-dropdown-option" data-value="Done">Completed (Done)</div>
                <div class="custom-dropdown-option" data-value="Cancelled">Cancelled</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dynamic Scrollable Content Area -->
      <div id="smMainContentArea" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0;">
        <!-- Dynamically rendered -->
      </div>

    </div>
  `;

  // DOM Handles
  const subtabTasksBtn = container.querySelector('#subtabTasksBtn');
  const subtabActivitiesBtn = container.querySelector('#subtabActivitiesBtn');
  const filterToolbar = container.querySelector('#smFilterToolbar');
  const searchInput = container.querySelector('#smSearchInput');
  const kpiGrid = container.querySelector('#smKpiGrid');
  const mainContentArea = container.querySelector('#smMainContentArea');

  // Custom Dropdown Helper Function
  function setupDropdown(containerEl, initialVal, options, onChange) {
    if (!containerEl) return { getValue: () => initialVal, updateOptions: () => {} };
    const triggerBtn = containerEl.querySelector('.custom-dropdown-trigger');
    const menuEl = containerEl.querySelector('.custom-dropdown-menu');
    if (!triggerBtn || !menuEl) return { getValue: () => initialVal, updateOptions: () => {} };

    let currentVal = initialVal;

    function renderMenu() {
      menuEl.innerHTML = options.map(opt => `
        <div class="custom-dropdown-option ${opt.value === currentVal ? 'active' : ''}" data-value="${esc(opt.value)}">
          ${esc(opt.label || opt.value)}
        </div>
      `).join('');

      const found = options.find(o => o.value === currentVal) || options[0];
      if (found) {
        const labelSpan = triggerBtn.querySelector('.trigger-label');
        if (labelSpan) labelSpan.textContent = found.label || found.value;
      }
    }

    renderMenu();

    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-dropdown-container.open').forEach(el => {
        if (el !== containerEl) el.classList.remove('open', 'open-up');
      });

      const isOpen = containerEl.classList.contains('open');
      if (isOpen) {
        containerEl.classList.remove('open', 'open-up');
      } else {
        const rect = triggerBtn.getBoundingClientRect();
        const modalBody = triggerBtn.closest('.form-modal-body') || triggerBtn.closest('.modal-card');
        let spaceBelow = window.innerHeight - rect.bottom;
        if (modalBody) {
          const bodyRect = modalBody.getBoundingClientRect();
          spaceBelow = Math.min(spaceBelow, bodyRect.bottom - rect.bottom);
        }

        if (spaceBelow < 210) {
          containerEl.classList.add('open-up');
        } else {
          containerEl.classList.remove('open-up');
        }
        containerEl.classList.add('open');
      }
    });

    menuEl.addEventListener('click', (e) => {
      const optEl = e.target.closest('.custom-dropdown-option');
      if (!optEl) return;
      currentVal = optEl.dataset.value;
      const found = options.find(o => o.value === currentVal);
      const labelSpan = triggerBtn.querySelector('.trigger-label');
      if (labelSpan) labelSpan.textContent = found ? (found.label || found.value) : optEl.textContent.trim();
      containerEl.classList.remove('open', 'open-up');
      renderMenu();
      if (typeof onChange === 'function') onChange(currentVal);
    });

    return {
      getValue: () => currentVal,
      updateOptions: (newOpts, newVal) => {
        options = newOpts;
        if (newVal !== undefined) currentVal = newVal;
        renderMenu();
      }
    };
  }

  // Global document click listener for dropdowns
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown-container')) {
      container.querySelectorAll('.custom-dropdown-container.open').forEach(el => el.classList.remove('open', 'open-up'));
    }
  });

  // Setup Toolbar Custom Dropdowns
  setupDropdown(
    container.querySelector('#dropdown-sm-filter-type'),
    'all',
    [
      { value: 'all', label: 'All Types' },
      { value: 'Transfer location', label: 'Transfer location' },
      { value: 'Stock deduction', label: 'Stock deduction' }
    ],
    (val) => {
      typeFilter = val;
      renderView();
    }
  );

  setupDropdown(
    container.querySelector('#dropdown-sm-filter-status'),
    'all',
    [
      { value: 'all', label: 'All Statuses' },
      { value: 'Pending', label: 'Pending' },
      { value: 'Done', label: 'Completed (Done)' },
      { value: 'Cancelled', label: 'Cancelled' }
    ],
    (val) => {
      statusFilter = val;
      renderView();
    }
  );

  // Sub-tab Navigation
  function setSubTab(tabId) {
    activeSubTab = tabId;
    subtabTasksBtn.classList.toggle('active', tabId === 'tasks');
    subtabActivitiesBtn.classList.toggle('active', tabId === 'activities');
    
    if (tabId === 'activities') {
      filterToolbar.style.display = 'none';
    } else {
      filterToolbar.style.display = 'flex';
    }
    renderView();
  }

  subtabTasksBtn.addEventListener('click', () => {
    setSubTab('tasks');
    db.syncSectionData('stockMovement', { background: true });
  });
  subtabActivitiesBtn.addEventListener('click', () => {
    setSubTab('activities');
    db.syncSectionData('stockMovement', { background: true });
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderView();
  });

  // KPI Toggle Handler
  const toggleKpiBtn = container.querySelector('#toggleKpiBtn');
  if (toggleKpiBtn) {
    toggleKpiBtn.addEventListener('click', () => {
      const isHidden = localStorage.getItem('irms_hide_kpis') === 'true';
      const newHidden = !isHidden;
      localStorage.setItem('irms_hide_kpis', newHidden);
      
      const icon = container.querySelector('#toggleKpiIcon');
      const text = container.querySelector('#toggleKpiText');
      if (icon) icon.textContent = newHidden ? 'expand_more' : 'expand_less';
      if (text) text.textContent = newHidden ? 'Show KPIs' : 'Hide KPIs';
      
      renderKpis();
    });
  }

  // Render Function
  function renderView() {
    renderKpis();

    if (activeSubTab === 'tasks') {
      renderTasksTab();
    } else {
      renderActivitiesTab();
    }
  }

  // Helper: Private user-level data filtering (Super sees all; others see assigned/created tasks only)
  function getPermittedMovements() {
    const allMovements = db.getStockMovements();
    const isSuper = (currentUser.role || '').toLowerCase() === 'super';
    if (isSuper) return allMovements;

    const myName = (currentUser.name || '').trim().toLowerCase();
    const myId = (currentUser.staffId || '').trim().toLowerCase();

    return allMovements.filter(m => {
      const sName = (m.staffName || '').trim().toLowerCase();
      const aBy = (m.assignedBy || '').trim().toLowerCase();
      return sName === myName || sName === myId || aBy === myName || aBy === myId;
    });
  }

  function getPermittedActivities() {
    const allActivities = db.getStockActivities();
    const isSuper = (currentUser.role || '').toLowerCase() === 'super';
    if (isSuper) return allActivities;

    const myName = (currentUser.name || '').trim().toLowerCase();
    const myId = (currentUser.staffId || '').trim().toLowerCase();

    return allActivities.filter(a => {
      const exBy = (a.executedBy || '').trim().toLowerCase();
      const asBy = (a.assignedBy || '').trim().toLowerCase();
      return exBy === myName || exBy === myId || asBy === myName || asBy === myId;
    });
  }

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  function renderKpis() {
    const isHidden = localStorage.getItem('irms_hide_kpis') === 'true';
    if (isHidden) {
      kpiGrid.classList.add('kpi-grid-hidden');
      kpiGrid.style.display = 'none';
      return;
    }
    kpiGrid.classList.remove('kpi-grid-hidden');
    kpiGrid.style.display = '';

    const movements = getPermittedMovements();
    const total = movements.length;
    const pending = movements.filter(m => m.status === 'Pending').length;
    const done = movements.filter(m => m.status === 'Done').length;
    const transfers = movements.filter(m => m.type === 'Transfer location').length;
    const deductions = movements.filter(m => m.type === 'Stock deduction').length;

    kpiGrid.innerHTML = `
      <div style="background: #f8fafc; border: 1.5px solid var(--border-light); padding: 12px 14px; border-radius: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Total Tasks</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--primary-700); margin-top: 2px;">${total}</div>
      </div>
      <div style="background: #fffbeb; border: 1.5px solid #fde68a; padding: 12px 14px; border-radius: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase;">Pending</div>
        <div style="font-size: 20px; font-weight: 800; color: #d97706; margin-top: 2px;">${pending}</div>
      </div>
      <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; padding: 12px 14px; border-radius: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Completed</div>
        <div style="font-size: 20px; font-weight: 800; color: #16a34a; margin-top: 2px;">${done}</div>
      </div>
      <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 12px 14px; border-radius: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Transfers</div>
        <div style="font-size: 20px; font-weight: 800; color: #2563eb; margin-top: 2px;">${transfers}</div>
      </div>
      <div style="background: #fef2f2; border: 1.5px solid #fecaca; padding: 12px 14px; border-radius: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Deductions</div>
        <div style="font-size: 20px; font-weight: 800; color: #dc2626; margin-top: 2px;">${deductions}</div>
      </div>
    `;
  }

  // ── Render Movement Tasks Tab ──────────────────────────────────────────────
  function renderTasksTab() {
    let movements = getPermittedMovements();

    // Filters
    if (typeFilter !== 'all') {
      movements = movements.filter(m => m.type === typeFilter);
    }
    if (statusFilter !== 'all') {
      movements = movements.filter(m => m.status === statusFilter);
    }
    if (searchQuery) {
      movements = movements.filter(m => 
        (m.movementId || '').toLowerCase().includes(searchQuery) ||
        (m.skuCode || '').toLowerCase().includes(searchQuery) ||
        (m.productName || '').toLowerCase().includes(searchQuery) ||
        (m.staffName || '').toLowerCase().includes(searchQuery) ||
        (m.fromLocation || '').toLowerCase().includes(searchQuery) ||
        (m.toLocation || '').toLowerCase().includes(searchQuery)
      );
    }

    if (movements.length === 0) {
      mainContentArea.innerHTML = `
        <div class="empty-state" style="margin: auto;">
          <span class="material-icons-round" style="font-size: 48px; color: var(--text-muted);">swap_horiz</span>
          <p style="font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-top: 8px;">No stock movement tasks found.</p>
          <span style="font-size: 12px; color: var(--text-muted);">Create new tasks by clicking "Assign" in the SOH Detail modal.</span>
        </div>
      `;
      return;
    }

    mainContentArea.innerHTML = `
      <div class="data-table-wrapper" style="flex: 1; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 12px;">
        <table class="custom-table" style="font-size: 12px; width: 100%;">
          <thead>
            <tr style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
              <th style="min-width: 100px;">Task ID</th>
              <th style="min-width: 130px;">Timestamp</th>
              <th style="min-width: 120px;">Type</th>
              <th style="min-width: 150px;">SKU & Product</th>
              <th style="width: 70px; text-align: center;">Qty</th>
              <th style="min-width: 150px;">From → To</th>
              <th style="min-width: 140px;">Reason</th>
              <th style="min-width: 120px;">Assigned To</th>
              <th style="width: 90px; text-align: center;">Status</th>
              <th style="min-width: 140px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${movements.map(m => renderTaskRow(m)).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Card List View -->
      <div class="mobile-card-list">
        ${movements.map(m => renderTaskCard(m)).join('')}
      </div>
    `;

    // Wire Desktop Table Actions
    mainContentArea.querySelectorAll('.complete-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const task = db.getStockMovements().find(m => m.movementId === id);
        if (!task) return;
        openCompleteVerificationModal(task, currentUser);
      });
    });

    mainContentArea.querySelectorAll('.edit-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const task = db.getStockMovements().find(m => m.movementId === id);
        if (task) openEditTaskModal(task);
      });
    });

    mainContentArea.querySelectorAll('.cancel-task-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (!confirm(`Cancel stock movement task ${id}?`)) return;
        try {
          await db.cancelStockMovement(id);
          showToast(`Task ${id} cancelled.`);
          renderView();
        } catch (err) {
          alert(`Error: ${err.message}`);
        }
      });
    });

    // Wire Mobile Card Click to open Popup Details & Actions
    mainContentArea.querySelectorAll('.mobile-task-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const task = db.getStockMovements().find(m => m.movementId === id);
        if (task) openTaskActionPopup(task, currentUser);
      });
    });
  }

  function renderTaskRow(m) {
    const isPending = m.status === 'Pending';
    const typeStyle = m.type === 'Stock deduction'
      ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
      : 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;';

    const statusStyle = isPending
      ? 'background: #fffbeb; color: #d97706; border: 1px solid #fde68a;'
      : m.status === 'Done'
        ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'
        : 'background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;';

    return `
      <tr>
        <td><strong style="font-family: monospace; font-size: 12px; color: var(--primary-800);">${esc(m.movementId)}</strong></td>
        <td style="font-size: 11px; color: var(--text-muted);">${m.timestamp ? new Date(m.timestamp).toLocaleString() : 'N/A'}</td>
        <td>
          <span style="display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; ${typeStyle}">
            ${esc(m.type)}
          </span>
        </td>
        <td>
          <div style="font-weight: 700; font-family: monospace; font-size: 11px; color: var(--primary-700);">${esc(m.skuCode)}</div>
          <div style="font-weight: 600; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 180px;">${esc(m.productName)}</div>
        </td>
        <td style="text-align: center;"><strong style="font-size: 14px; color: var(--primary-800);">${m.qty}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
            <span class="location-badge" style="font-family: monospace; font-size: 11px; padding: 2px 6px;">${esc(m.fromLocation)}</span>
            <span class="material-icons-round" style="font-size: 12px; color: var(--text-muted);">arrow_forward</span>
            <span class="location-badge" style="font-family: monospace; font-size: 11px; padding: 2px 6px; ${m.toLocation === 'Deduction' || m.toLocation.startsWith('Deduction') ? 'background: #fef2f2; color: #dc2626;' : ''}">${esc(m.toLocation)}</span>
          </div>
        </td>
        <td><span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${esc(m.reason)}</span></td>
        <td>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${esc(m.staffName)}</div>
          <div style="font-size: 10px; color: var(--text-muted);">By: ${esc(m.assignedBy)}</div>
        </td>
        <td style="text-align: center;">
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; ${statusStyle}">
            ${isPending ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #d97706; animation: splashDot 1.4s infinite;"></span>' : ''}
            ${esc(m.status)}
          </span>
        </td>
        <td style="text-align: center;">
          ${isPending ? `
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button class="btn-primary complete-task-btn" data-id="${esc(m.movementId)}" title="Complete Task" style="padding: 4px 10px; font-size: 11px; height: 28px; gap: 4px; border-radius: 6px;">
                <span class="material-icons-round" style="font-size: 13px;">check_circle</span>
                <span>Done</span>
              </button>
              <button class="icon-action-btn edit-task-btn" data-id="${esc(m.movementId)}" title="Edit Task">
                <span class="material-icons-round">edit</span>
              </button>
              <button class="icon-action-btn icon-action-btn-danger cancel-task-btn" data-id="${esc(m.movementId)}" title="Cancel Task">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          ` : `
            <span style="font-size: 11px; color: var(--text-muted); font-weight: 600;">${esc(m.status)}</span>
          `}
        </td>
      </tr>
    `;
  }

  function renderTaskCard(m) {
    const isPending = m.status === 'Pending';
    const typeStyle = m.type === 'Stock deduction'
      ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
      : 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;';

    const statusStyle = isPending
      ? 'background: #fffbeb; color: #d97706; border: 1px solid #fde68a;'
      : m.status === 'Done'
        ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'
        : 'background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;';

    return `
      <div class="mobile-task-card" data-id="${esc(m.movementId)}" style="border: 1.5px solid var(--border-light); padding: 14px; border-radius: 16px; background: #ffffff; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); box-sizing: border-box; width: 100%; overflow: hidden; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;">
        <!-- Top Row: Task ID & Status -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-light); padding-bottom: 10px; flex-wrap: wrap; gap: 6px;">
          <div>
            <span style="font-family: monospace; font-size: 14px; font-weight: 800; color: var(--primary-800); display: block;">${esc(m.movementId)}</span>
            <span style="font-size: 11px; color: var(--text-muted); display: block; margin-top: 2px;">${m.timestamp ? new Date(m.timestamp).toLocaleString() : 'N/A'}</span>
          </div>
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 800; ${statusStyle}">
            ${isPending ? '<span style="width: 7px; height: 7px; border-radius: 50%; background: #d97706; animation: splashDot 1.4s infinite;"></span>' : ''}
            ${esc(m.status)}
          </span>
        </div>

        <!-- Product & SKU Info -->
        <div style="margin-top: 10px;">
          <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); line-height: 1.35; word-break: break-word;">${esc(m.productName)}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap;">
            <span class="location-badge" style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--primary-800); background: var(--primary-50); padding: 3px 8px; border-radius: 6px;">
              SKU: ${esc(m.skuCode)}
            </span>
            <span style="display: inline-block; padding: 3px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; ${typeStyle}">
              ${esc(m.type)}
            </span>
          </div>
        </div>
        
        <!-- Specs Body Box -->
        <div style="background: #f8fafc; padding: 10px; border-radius: 12px; margin-top: 10px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; width: 100%;">
          <!-- Location Route -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: #ffffff; padding: 6px 8px; border-radius: 8px; border: 1px solid var(--border-light); box-sizing: border-box; width: 100%;">
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--primary-800); word-break: break-all; flex: 1; min-width: 0; text-align: center;">
              ${esc(m.fromLocation)}
            </span>
            <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600); flex-shrink: 0;">east</span>
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: ${m.toLocation.startsWith('Deduction') ? '#dc2626' : 'var(--primary-800)'}; word-break: break-all; flex: 1; min-width: 0; text-align: center;">
              ${esc(m.toLocation)}
            </span>
          </div>

          <!-- Qty & Staff -->
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; padding: 2px 4px;">
            <div>Qty: <strong style="font-size: 13px; color: var(--primary-700); font-weight: 800;">${m.qty} units</strong></div>
            <div style="color: var(--text-secondary); font-weight: 600;">Assigned: <strong style="color: var(--text-primary);">${esc(m.staffName)}</strong></div>
          </div>
        </div>

        <!-- Tap to view actions footer -->
        <div style="margin-top: 8px; text-align: right; font-size: 11px; font-weight: 700; color: var(--primary-600); display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
          <span>Tap for details & actions</span>
          <span class="material-icons-round" style="font-size: 14px;">chevron_right</span>
        </div>
      </div>
    `;
  }

  // ── Render Task Action Popup Modal ──────────────────────────────────────────
  function openTaskActionPopup(task, currentUser) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.zIndex = '3600';

    const isPending = task.status === 'Pending';
    const isDone = task.status === 'Done';

    const typeStyle = task.type === 'Stock deduction'
      ? 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;'
      : 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;';

    const statusStyle = isPending
      ? 'background: #fffbeb; color: #d97706; border: 1px solid #fde68a;'
      : isDone
        ? 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;'
        : 'background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1;';

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 480px; border-radius: 20px;">
        <div class="form-modal-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">inventory_2</span>
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 700;">Task Details & Actions</h3>
              <span style="font-family: monospace; font-size: 12px; font-weight: 800; color: var(--primary-800);">${esc(task.movementId)}</span>
            </div>
          </div>
          <button class="form-modal-close-btn" id="closeActionModalBtn" title="Close" style="border: none; background: transparent; cursor: pointer;">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body" style="padding-top: 14px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Status Banner -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border-light);">
            <span style="font-size: 12px; font-weight: 700; color: var(--text-muted);">Current Task Status</span>
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 800; ${statusStyle}">
              ${isPending ? '<span style="width: 7px; height: 7px; border-radius: 50%; background: #d97706; animation: splashDot 1.4s infinite;"></span>' : ''}
              ${esc(task.status)}
            </span>
          </div>

          <!-- Product info card -->
          <div style="background: #ffffff; padding: 12px; border-radius: 12px; border: 1px solid var(--border-light);">
            <div style="font-size: 15px; font-weight: 800; color: var(--text-primary); line-height: 1.35;">${esc(task.productName)}</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap;">
              <span style="font-family: monospace; font-size: 12px; font-weight: 700; color: var(--primary-800); background: var(--primary-50); padding: 3px 8px; border-radius: 6px;">
                SKU: ${esc(task.skuCode)}
              </span>
              <span style="padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; ${typeStyle}">
                ${esc(task.type)}
              </span>
            </div>
          </div>

          <!-- Route & Details Grid -->
          <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 10px;">
            <div style="background: #ffffff; padding: 10px; border-radius: 10px; border: 1px solid var(--border-light);">
              <div style="font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;">Location Route</div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: #f8fafc; padding: 6px 8px; border-radius: 8px;">
                <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--primary-800); background: #ffffff; padding: 4px 6px; border-radius: 4px; border: 1px solid var(--border-light); word-break: break-all; flex: 1; text-align: center;">
                  ${esc(task.fromLocation)}
                </span>
                <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600); flex-shrink: 0;">east</span>
                <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: ${task.toLocation.startsWith('Deduction') ? '#dc2626' : 'var(--primary-800)'}; background: ${task.toLocation.startsWith('Deduction') ? '#fef2f2' : '#ffffff'}; padding: 4px 6px; border-radius: 4px; border: 1px solid ${task.toLocation.startsWith('Deduction') ? '#fecaca' : 'var(--border-light)'}; word-break: break-all; flex: 1; text-align: center;">
                  ${esc(task.toLocation)}
                </span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div style="background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light);">
                <span style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; display: block;">Quantity</span>
                <strong style="font-size: 14px; color: var(--primary-700); font-weight: 800;">${task.qty} units</strong>
              </div>
              <div style="background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--border-light);">
                <span style="font-size: 10px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; display: block;">Reason</span>
                <strong style="font-size: 11px; color: var(--text-primary); font-weight: 700; word-break: break-word; display: block;">${esc(task.reason)}</strong>
              </div>
            </div>

            <div style="border-top: 1px dashed #e2e8f0; padding-top: 8px; font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Assigned Staff:</span>
                <strong style="color: var(--text-primary);">${esc(task.staffName)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Assigned By:</span>
                <span style="color: var(--text-primary); font-weight: 600;">${esc(task.assignedBy)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Created:</span>
                <span style="color: var(--text-muted); font-size: 11px;">${task.timestamp ? new Date(task.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- Modal Action Buttons Footer -->
          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">
            ${isPending ? `
              <button type="button" class="btn-primary" id="popupCompleteBtn" style="height: 42px; font-size: 13px; font-weight: 700; justify-content: center; gap: 6px; background: linear-gradient(135deg, var(--success), #059669); border-radius: 12px;">
                <span class="material-icons-round" style="font-size: 18px;">check_circle</span>
                <span>Complete Task</span>
              </button>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn-secondary" id="popupEditBtn" style="flex: 1; height: 38px; font-size: 12px; font-weight: 700; justify-content: center; border-radius: 10px;">
                  <span class="material-icons-round" style="font-size: 16px;">edit</span>
                  <span>Edit</span>
                </button>
                <button type="button" class="btn-secondary" id="popupCancelBtn" style="flex: 1; height: 38px; font-size: 12px; font-weight: 700; color: #dc2626; border-color: #fecaca; justify-content: center; border-radius: 10px;">
                  <span class="material-icons-round" style="font-size: 16px;">close</span>
                  <span>Cancel Task</span>
                </button>
              </div>
            ` : `
              <button type="button" class="btn-secondary" id="popupCloseBtn" style="height: 40px; font-size: 13px; font-weight: 700; justify-content: center; border-radius: 12px;">
                Close Details
              </button>
            `}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('#closeActionModalBtn').addEventListener('click', closeModal);
    if (modalOverlay.querySelector('#popupCloseBtn')) {
      modalOverlay.querySelector('#popupCloseBtn').addEventListener('click', closeModal);
    }
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    if (isPending) {
      modalOverlay.querySelector('#popupCompleteBtn').addEventListener('click', () => {
        closeModal();
        openCompleteVerificationModal(task, currentUser);
      });

      modalOverlay.querySelector('#popupEditBtn').addEventListener('click', () => {
        closeModal();
        openEditTaskModal(task);
      });

      modalOverlay.querySelector('#popupCancelBtn').addEventListener('click', async () => {
        if (!confirm(`Cancel stock movement task ${task.movementId}?`)) return;
        try {
          await db.cancelStockMovement(task.movementId);
          closeModal();
          showToast(`Task ${task.movementId} cancelled.`);
          renderView();
        } catch (err) {
          alert(`Error: ${err.message}`);
        }
      });
    }
  }

  // ── Render Completion Verification Modal ──────────────────────────────────────
  function openCompleteVerificationModal(task, currentUser) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.zIndex = '3700';

    const isDeduction = task.type === 'Stock deduction' || (task.toLocation && task.toLocation.startsWith('Deduction'));
    const expectedLocation = task.toLocation;

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 480px; border-radius: 20px;">
        <div class="form-modal-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">verified</span>
            <div>
              <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Task Completion Verification</h3>
              <span style="font-family: monospace; font-size: 12px; font-weight: 800; color: var(--primary-800);">${esc(task.movementId)}</span>
            </div>
          </div>
          <button class="form-modal-close-btn" id="closeVerifyModalBtn" title="Close" style="border: none; background: transparent; cursor: pointer;">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body" style="padding-top: 14px;">
          <!-- Verification Notice Banner -->
          <div style="background: #eff6ff; border: 1.5px solid #bfdbfe; padding: 12px; border-radius: 12px; margin-bottom: 16px; font-size: 12px; color: #1e40af; line-height: 1.4;">
            <strong style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <span class="material-icons-round" style="font-size: 16px;">security</span>
              Staff Operation Verification Required
            </strong>
            ${isDeduction
              ? 'To complete this stock deduction, verify the physical <strong>SKU Code</strong> and enter the <strong>Destination Location / Bin</strong>.'
              : 'To confirm this task is executed properly, please scan or enter the physical <strong>SKU Code</strong> and target <strong>Location</strong>.'}
          </div>

          <form id="verifyCompletionForm" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- 1. SKU Code Verification -->
            <div class="form-group" style="position: relative;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">
                1. Verify SKU Code <span style="color: var(--danger);">*</span>
              </label>
              <input 
                type="text" 
                id="verifySkuInput" 
                class="text-control" 
                placeholder="Scan or enter SKU Code..." 
                style="width: 100%; height: 40px; font-family: monospace; font-size: 13px; font-weight: 700; text-transform: uppercase; padding-right: 36px;"
                required 
                autocomplete="off"
              />
              <button id="verifySkuScannerBtn" type="button" style="position: absolute; right: 10px; bottom: 22px; background: none; border: none; padding: 0; margin: 0; color: var(--primary-600); cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; z-index: 50;" title="Scan SKU Barcode">
                <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
              </button>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Expected SKU: <strong style="font-family: monospace; color: var(--primary-800);">${esc(task.skuCode)}</strong></div>
            </div>

            <!-- 2. Location Input / Verification -->
            <div class="form-group" style="position: relative;">
              <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">
                ${isDeduction ? '2. Enter Destination Location / Bin' : '2. Verify Location'} <span style="color: var(--danger);">*</span>
              </label>
              <input 
                type="text" 
                id="verifyLocationInput" 
                class="text-control" 
                placeholder="${isDeduction ? 'Enter physical location or bin (outside system)...' : 'Scan or enter Location...'}" 
                style="width: 100%; height: 40px; font-family: monospace; font-size: 13px; font-weight: 700; text-transform: uppercase; padding-right: 36px;"
                required 
                autocomplete="off"
              />
              <button id="verifyLocationScannerBtn" type="button" style="position: absolute; right: 10px; bottom: 22px; background: none; border: none; padding: 0; margin: 0; color: var(--primary-600); cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; z-index: 50;" title="Scan Location Barcode">
                <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
              </button>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                ${isDeduction
                  ? 'Free-text location entry (destination is outside system e.g. disposal bin, damaged rack).'
                  : `Expected Location: <strong style="font-family: monospace; color: var(--primary-800);">${esc(expectedLocation)}</strong>`}
              </div>
            </div>

            <!-- Error Alert -->
            <div id="verifyModalError" style="display: none; background: #fee2e2; color: #991b1b; padding: 10px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; line-height: 1.4;"></div>

            <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-secondary" id="cancelVerifyBtn" style="height: 40px; padding: 0 16px;">Cancel</button>
              <button type="submit" class="btn-primary" id="submitVerifyBtn" style="height: 40px; padding: 0 20px; gap: 6px; background: linear-gradient(135deg, var(--success), #059669);">
                <span class="material-icons-round" style="font-size: 18px;">verified_user</span>
                <span>Verify & Complete</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('#closeVerifyModalBtn').addEventListener('click', closeModal);
    modalOverlay.querySelector('#cancelVerifyBtn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    const verifyForm = modalOverlay.querySelector('#verifyCompletionForm');
    const verifySkuInput = modalOverlay.querySelector('#verifySkuInput');
    const verifyLocationInput = modalOverlay.querySelector('#verifyLocationInput');
    const errorEl = modalOverlay.querySelector('#verifyModalError');
    const submitBtn = modalOverlay.querySelector('#submitVerifyBtn');

    const skuScannerBtn = modalOverlay.querySelector('#verifySkuScannerBtn');
    if (skuScannerBtn) {
      skuScannerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCameraScanner((scannedValue) => {
          verifySkuInput.value = String(scannedValue).trim().toUpperCase();
        });
      });
    }

    const locScannerBtn = modalOverlay.querySelector('#verifyLocationScannerBtn');
    if (locScannerBtn) {
      locScannerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCameraScanner((scannedValue) => {
          verifyLocationInput.value = String(scannedValue).trim().toUpperCase();
        });
      });
    }

    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.style.display = 'none';

      const enteredSku = verifySkuInput.value.trim().toUpperCase();
      const enteredLoc = verifyLocationInput.value.trim().toUpperCase();

      const expSku = String(task.skuCode || '').trim().toUpperCase();
      const expLoc = String(expectedLocation || '').trim().toUpperCase();

      if (enteredSku !== expSku) {
        errorEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><span class="material-icons-round" style="font-size:18px;">error</span><span>SKU Verification Failed! Entered "${enteredSku}", but task expects "${expSku}".</span></div>`;
        errorEl.style.display = 'block';
        verifySkuInput.focus();
        return;
      }

      if (isDeduction) {
        if (!enteredLoc) {
          errorEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><span class="material-icons-round" style="font-size:18px;">error</span><span>Please enter destination location / bin.</span></div>`;
          errorEl.style.display = 'block';
          verifyLocationInput.focus();
          return;
        }
      } else {
        if (enteredLoc !== expLoc) {
          errorEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px;"><span class="material-icons-round" style="font-size:18px;">error</span><span>Location Verification Failed! Entered "${enteredLoc}", but task expects "${expLoc}".</span></div>`;
          errorEl.style.display = 'block';
          verifyLocationInput.focus();
          return;
        }
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-round" style="font-size:16px; animation:spinIcon 1s linear infinite;">sync</span> Completing...';

      try {
        await db.completeStockMovement(task.movementId, currentUser, isDeduction ? enteredLoc : null);
        closeModal();
        showToast(`Stock movement ${task.movementId} verified & completed successfully!`);
        renderView();
      } catch (err) {
        errorEl.textContent = err.message || 'Error completing task.';
        errorEl.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-icons-round" style="font-size:18px;">verified_user</span><span>Verify & Complete</span>';
      }
    });
  }

  // ── Render Stock Activity Log Tab ──────────────────────────────────────────
  function renderActivitiesTab() {
    const activities = getPermittedActivities();

    if (activities.length === 0) {
      mainContentArea.innerHTML = `
        <div class="empty-state" style="margin: auto;">
          <span class="material-icons-round" style="font-size: 48px; color: var(--text-muted);">history</span>
          <p style="font-size: 14px; font-weight: 600; color: var(--text-secondary); margin-top: 8px;">No stock trailing activity recorded yet.</p>
          <span style="font-size: 12px; color: var(--text-muted);">Stock activities are automatically populated when movement or deduction tasks are marked Done.</span>
        </div>
      `;
      return;
    }

    mainContentArea.innerHTML = `
      <div class="data-table-wrapper" style="flex: 1; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 12px;">
        <table class="custom-table" style="font-size: 12px; width: 100%;">
          <thead>
            <tr style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
              <th style="min-width: 100px;">Activity ID</th>
              <th style="min-width: 130px;">Timestamp</th>
              <th style="min-width: 90px;">Ticket ID</th>
              <th style="min-width: 150px;">SKU & Product</th>
              <th style="width: 80px; text-align: center;">Operator</th>
              <th style="min-width: 150px;">From → To</th>
              <th style="min-width: 140px;">Reason</th>
              <th style="min-width: 120px;">Executed By</th>
            </tr>
          </thead>
          <tbody>
            ${activities.map(a => `
              <tr>
                <td><strong style="font-family: monospace; font-size: 12px; color: var(--primary-700);">${esc(a.activityId)}</strong></td>
                <td style="font-size: 11px; color: var(--text-muted);">${a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}</td>
                <td><span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--text-secondary);">${esc(a.ticketId)}</span></td>
                <td>
                  <div style="font-weight: 700; font-family: monospace; font-size: 11px; color: var(--primary-700);">${esc(a.skuCode)}</div>
                  <div style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${esc(a.productName)}</div>
                </td>
                <td style="text-align: center;">
                  <span style="font-size: 14px; font-weight: 800; color: ${a.operator === '+' ? '#16a34a' : '#dc2626'}; font-family: monospace;">
                    ${a.operator}${a.qty}
                  </span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; gap: 4px; font-size: 11px;">
                    <span class="location-badge" style="font-family: monospace; font-size: 11px; padding: 2px 6px;">${esc(a.fromLocation)}</span>
                    <span class="material-icons-round" style="font-size: 12px; color: var(--text-muted);">arrow_forward</span>
                    <span class="location-badge" style="font-family: monospace; font-size: 11px; padding: 2px 6px; ${a.toLocation.startsWith('Deduction') ? 'background: #fef2f2; color: #dc2626;' : ''}">${esc(a.toLocation)}</span>
                  </div>
                </td>
                <td><span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${esc(a.reason)}</span></td>
                <td>
                  <div style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${esc(a.executedBy)}</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Assigned: ${esc(a.assignedBy)}</div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Card List View for Activity Log -->
      <div class="mobile-card-list">
        ${activities.map(a => `
          <div class="mobile-task-card" style="border: 1.5px solid var(--border-light); padding: 14px; border-radius: 14px; background: #ffffff; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03); box-sizing: border-box; width: 100%; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-light); padding-bottom: 8px;">
              <div>
                <span style="font-family: monospace; font-size: 13px; font-weight: 800; color: var(--primary-700);">${esc(a.activityId)}</span>
                <span style="font-size: 10px; color: var(--text-muted); display: block;">${a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}</span>
              </div>
              <span style="font-size: 14px; font-weight: 800; color: ${a.operator === '+' ? '#16a34a' : '#dc2626'}; font-family: monospace; background: ${a.operator === '+' ? '#f0fdf4' : '#fef2f2'}; padding: 3px 8px; border-radius: 8px;">
                ${a.operator}${a.qty} units
              </span>
            </div>
            <div style="margin-top: 8px;">
              <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); word-break: break-word;">${esc(a.productName)}</div>
              <div style="font-size: 11px; font-family: monospace; color: var(--primary-700); margin-top: 2px;">SKU: ${esc(a.skuCode)}</div>
            </div>
            <div style="background: #f8fafc; padding: 10px; border-radius: 10px; margin-top: 8px; font-size: 12px; border: 1px solid var(--border-light); display: flex; flex-direction: column; gap: 6px; box-sizing: border-box; width: 100%;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted); font-weight: 600;">Ticket ID:</span>
                <span style="font-family: monospace; font-weight: 700;">${esc(a.ticketId)}</span>
              </div>
              
              <!-- Location Route Pills for Activity -->
              <div style="background: #ffffff; padding: 6px 8px; border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; gap: 6px;">
                <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--primary-800); word-break: break-all; flex: 1; min-width: 0; text-align: center;">${esc(a.fromLocation)}</span>
                <span class="material-icons-round" style="font-size: 14px; color: var(--primary-600); flex-shrink: 0;">east</span>
                <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: ${a.toLocation.startsWith('Deduction') ? '#dc2626' : 'var(--primary-800)'}; word-break: break-all; flex: 1; min-width: 0; text-align: center;">${esc(a.toLocation)}</span>
              </div>

              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted); font-weight: 600;">Reason:</span>
                <span style="font-weight: 700; word-break: break-word;">${esc(a.reason)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1px dashed #e2e8f0; padding-top: 6px;">
                <span style="color: var(--text-muted);">Executed By:</span>
                <span style="font-weight: 700;">${esc(a.executedBy)} (By: ${esc(a.assignedBy)})</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Edit Task Modal ────────────────────────────────────────────────────────
  function openEditTaskModal(task) {
    const users = db.getUsers();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.zIndex = '3600';

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 500px; border-radius: 20px;">
        <div class="form-modal-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">edit</span>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Edit Stock Movement (${esc(task.movementId)})</h3>
          </div>
          <button class="form-modal-close-btn" id="closeEditModalBtn" style="border: none; background: transparent; cursor: pointer;">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body" style="padding-top: 14px;">
          <form id="editTaskForm" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Movement Type Custom Dropdown -->
            <div class="form-group">
              <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Movement Type</label>
              <div class="custom-dropdown-container" id="dropdown-edit-type">
                <button type="button" class="custom-dropdown-trigger" style="height: 38px; padding: 0 12px; font-size: 13px; font-weight: 600; width: 100%;">
                  <span class="trigger-label">${esc(task.type)}</span>
                  <span class="material-icons-round trigger-icon">expand_more</span>
                </button>
                <div class="custom-dropdown-menu" style="width: 100%; z-index: 4000;">
                  <div class="custom-dropdown-option ${task.type === 'Transfer location' ? 'active' : ''}" data-value="Transfer location">Transfer location</div>
                  <div class="custom-dropdown-option ${task.type === 'Stock deduction' ? 'active' : ''}" data-value="Stock deduction">Stock deduction</div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Quantity</label>
              <input type="number" id="editQtyInput" class="text-control" value="${task.qty}" min="1" max="${task.sourceQty || 9999}" style="width: 100%; height: 38px; font-weight: 700;" />
            </div>

            <!-- Storage Location -->
            <div class="form-group" id="editToLocGroup">
              <label id="editToLocLabel" style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">
                ${task.type === 'Stock deduction' ? 'To Location (Deduction Parameter / Bin)' : 'Storage Location (10–30 chars)'}
              </label>
              <input 
                type="text" 
                id="editToLocInput" 
                class="text-control" 
                value="${esc(task.toLocation)}" 
                list="smRacksDatalist"
                ${task.type === 'Transfer location' ? 'minlength="10" maxlength="30"' : ''}
                placeholder="${task.type === 'Stock deduction' ? 'e.g. Deduction - Recovery LDP' : 'e.g. CBT-MZF3-35-03-L1-04'}" 
                style="width: 100%; height: 38px; font-family: monospace; font-weight: 700; font-size: 13px;" 
              />
              <datalist id="smRacksDatalist">
                ${(db.getRacks ? db.getRacks() : []).map(r => `<option value="${esc(r.locationName || r.rackName)}">${esc(r.locationName || r.rackName)}${r.zone ? ` (${esc(r.zone)})` : ''}</option>`).join('')}
              </datalist>
              <span class="input-helper-text" id="editToLocHelper" style="font-size: 11px; margin-top: 4px; display: block; color: var(--text-muted);">
                ${task.type === 'Transfer location' ? `Should contain 10 to 30 characters. Current length: ${task.toLocation.length}` : 'Enter target deduction location parameter or bin.'}
              </span>
            </div>

            <!-- Staff Custom Dropdown -->
            <div class="form-group">
              <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">Assign Staff Member</label>
              <div class="custom-dropdown-container" id="dropdown-edit-staff">
                <button type="button" class="custom-dropdown-trigger" style="height: 38px; padding: 0 12px; font-size: 13px; font-weight: 600; width: 100%;">
                  <span class="trigger-label">${esc(task.staffName)}</span>
                  <span class="material-icons-round trigger-icon">expand_more</span>
                </button>
                <div class="custom-dropdown-menu" style="width: 100%; z-index: 4000;">
                  ${users.map(u => `
                    <div class="custom-dropdown-option ${u.name === task.staffName ? 'active' : ''}" data-value="${esc(u.name)}">
                      ${esc(u.name)} (${esc(u.staffId)})
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <div id="editModalError" style="display: none; background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600;"></div>

            <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-secondary" id="cancelEditBtn" style="height: 38px; padding: 0 16px;">Cancel</button>
              <button type="submit" class="btn-primary" style="height: 38px; padding: 0 20px;">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const editToLocLabel = modalOverlay.querySelector('#editToLocLabel');
    const editToLocGroup = modalOverlay.querySelector('#editToLocGroup');
    const editToLocInput = modalOverlay.querySelector('#editToLocInput');
    const editToLocHelper = modalOverlay.querySelector('#editToLocHelper');

    // Setup Edit Dropdowns
    setupDropdown(
      modalOverlay.querySelector('#dropdown-edit-type'),
      task.type,
      [
        { value: 'Transfer location', label: 'Transfer location' },
        { value: 'Stock deduction', label: 'Stock deduction' }
      ],
      (newType) => {
        if (newType === 'Stock deduction') {
          editToLocLabel.textContent = 'To Location (Deduction Parameter / Bin)';
          editToLocInput.removeAttribute('minlength');
          editToLocInput.removeAttribute('maxlength');
          if (!editToLocInput.value || !editToLocInput.value.startsWith('Deduction')) {
            editToLocInput.value = 'Deduction';
          }
          editToLocHelper.textContent = 'Enter target deduction location parameter or bin.';
          editToLocHelper.style.color = 'var(--text-muted)';
        } else {
          editToLocLabel.textContent = 'Storage Location (10–30 chars)';
          editToLocInput.setAttribute('minlength', '10');
          editToLocInput.setAttribute('maxlength', '30');
          if (editToLocInput.value.startsWith('Deduction')) {
            editToLocInput.value = '';
          }
          const len = editToLocInput.value.length;
          editToLocHelper.textContent = `Should contain 10 to 30 characters. Current length: ${len}`;
          editToLocHelper.style.color = 'var(--text-muted)';
        }
      }
    );

    const staffDropdown = setupDropdown(
      modalOverlay.querySelector('#dropdown-edit-staff'),
      task.staffName,
      users.map(u => ({ value: u.name, label: `${u.name} (${u.staffId})` })),
      null
    );

    editToLocInput.addEventListener('input', () => {
      const type = modalOverlay.querySelector('#dropdown-edit-type .trigger-label').textContent.trim().includes('Stock deduction')
        ? 'Stock deduction'
        : 'Transfer location';
      if (type === 'Transfer location') {
        const len = editToLocInput.value.length;
        editToLocHelper.textContent = `Should contain 10 to 30 characters. Current length: ${len}`;
        if (len >= 10 && len <= 30) {
          editToLocHelper.style.color = 'var(--success)';
        } else {
          editToLocHelper.style.color = '';
        }
      }
    });

    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('#closeEditModalBtn').addEventListener('click', closeModal);
    modalOverlay.querySelector('#cancelEditBtn').addEventListener('click', closeModal);

    modalOverlay.querySelector('#editTaskForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const type = modalOverlay.querySelector('#dropdown-edit-type .trigger-label').textContent.trim().includes('Stock deduction')
        ? 'Stock deduction'
        : 'Transfer location';
      const qty = parseInt(modalOverlay.querySelector('#editQtyInput').value, 10);
      const toLocation = editToLocInput.value.trim();
      const staffName = staffDropdown.getValue();
      const errorEl = modalOverlay.querySelector('#editModalError');

      if (!qty || qty <= 0) {
        errorEl.textContent = 'Invalid quantity.';
        errorEl.style.display = 'block';
        return;
      }
      if (!toLocation) {
        errorEl.textContent = 'To Location parameter is required.';
        errorEl.style.display = 'block';
        return;
      }
      if (type === 'Transfer location' && (toLocation.length < 10 || toLocation.length > 30)) {
        errorEl.textContent = `Storage Location must contain 10 to 30 characters (current length: ${toLocation.length}).`;
        errorEl.style.display = 'block';
        return;
      }

      try {
        await db.updateStockMovement(task.movementId, { type, qty, toLocation, staffName });
        closeModal();
        showToast(`Task ${task.movementId} updated.`);
        renderView();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
    });
  }

  // Subscribe to DB updates with self-unsubscription when component unmounts
  const ownRoot = container.firstElementChild;
  const unsubscribe = db.subscribe(() => {
    if (!container.isConnected || container.firstElementChild !== ownRoot) {
      unsubscribe();
      return;
    }
    renderView();
  });

  // Init
  renderView();
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(message) {
  let toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#087f5b;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);';
  toast.innerHTML = `<span class="material-icons-round" style="font-size:16px;">check_circle</span>${esc(message)}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
