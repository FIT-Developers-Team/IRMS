import { db } from '../data/db.js';
import { openCameraScanner } from '../utils/scanner.js';

export function renderTsTask(container, currentUser) {
  let searchQuery = '';
  let activeSubTab = 'myTasks';
  let waveFilter = 'all';
  let sortBy = 'newest';

  container.innerHTML = `
    <div class="card-panel ts-task-panel" style="display: flex; flex-direction: column; height: 100%; min-height: 0; box-sizing: border-box; overflow-y: auto;">
      <!-- Panel Header -->
      <div class="card-title-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 8px; padding-bottom: 12px; border-bottom: 1px solid var(--border-light); margin-bottom: 0; width: 100%; box-sizing: border-box; flex-shrink: 0;">
        <div style="flex: 1 1 0; min-width: 0; overflow: hidden;">
          <h3 style="display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px;">
            <span class="material-icons-round" style="color: var(--primary-600); flex-shrink: 0; font-size: 22px;">task_alt</span>
            <span>TS Task Queue</span>
          </h3>
        </div>
        <span class="count-badge" id="tsTaskCountBadge">0 Tasks</span>
      </div>

      <!-- Sub Tabs Bar -->
      <div class="ts-subtab-bar" style="margin-top: 12px; flex-shrink: 0;">
        <button class="ts-sub-tab active" data-tab="myTasks">
          <span class="material-icons-round" style="font-size: 16px;">assignment</span>
          <span>My Tasks</span>
          <span class="subtab-count-badge" id="subtabCountMyTasks">0</span>
        </button>
        <button class="ts-sub-tab" data-tab="inProgress">
          <span class="material-icons-round" style="font-size: 16px;">pending_actions</span>
          <span>In Progress</span>
          <span class="subtab-count-badge" id="subtabCountInProgress">0</span>
        </button>
        <button class="ts-sub-tab" data-tab="completed">
          <span class="material-icons-round" style="font-size: 16px;">check_circle</span>
          <span>Completed</span>
          <span class="subtab-count-badge" id="subtabCountCompleted">0</span>
        </button>
      </div>

      <!-- Search & Filters Toolbar -->
      <div style="margin-top: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;">
        <div class="search-box" style="position: relative; width: 100%;">
          <span class="material-icons-round search-icon" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 20px; pointer-events: none;">search</span>
          <input type="text" id="tsTaskSearch" class="text-control" placeholder="Search by SO, SKU, product, rack, wave..." style="padding-left: 40px; width: 100%; border-radius: 12px; box-sizing: border-box;">
        </div>

        <!-- Filter & Sort Bar -->
        <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; flex: 1;">
            
            <!-- Wave Filter Custom Dropdown -->
            <div class="custom-dropdown-container" id="dropdown-ts-wave-filter" style="width: 160px;">
              <button type="button" class="custom-dropdown-trigger" style="height: 34px; padding: 0 10px; font-size: 12px; border-radius: 10px;">
                <span style="display: flex; align-items: center; gap: 6px; overflow: hidden; min-width: 0;">
                  <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600); flex-shrink: 0;">waves</span>
                  <span class="trigger-label" style="font-weight: 700;">All Waves</span>
                </span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" style="z-index: 2500; max-height: 220px; overflow-y: auto;">
                <div class="custom-dropdown-option active" data-value="all">All Waves</div>
              </div>
            </div>

            <!-- Sort By Custom Dropdown -->
            <div class="custom-dropdown-container" id="dropdown-ts-sort" style="width: 160px;">
              <button type="button" class="custom-dropdown-trigger" style="height: 34px; padding: 0 10px; font-size: 12px; border-radius: 10px;">
                <span style="display: flex; align-items: center; gap: 6px; overflow: hidden; min-width: 0;">
                  <span class="material-icons-round" style="font-size: 16px; color: var(--primary-600); flex-shrink: 0;">sort</span>
                  <span class="trigger-label" style="font-weight: 700;">Newest First</span>
                </span>
                <span class="material-icons-round trigger-icon">expand_more</span>
              </button>
              <div class="custom-dropdown-menu" style="z-index: 2500; max-height: 220px; overflow-y: auto;">
                <div class="custom-dropdown-option active" data-value="newest">Newest First</div>
                <div class="custom-dropdown-option" data-value="oldest">Oldest First</div>
                <div class="custom-dropdown-option" data-value="waveAsc">Wave (A → Z)</div>
                <div class="custom-dropdown-option" data-value="waveDesc">Wave (Z → A)</div>
                <div class="custom-dropdown-option" data-value="soNumber">SO Number</div>
                <div class="custom-dropdown-option" data-value="rack">Rack Location</div>
              </div>
            </div>

            <!-- Clear Filters Button -->
            <button id="tsTaskClearFilterBtn" style="display: none; background: none; border: none; color: #ef4444; font-size: 11px; font-weight: 700; cursor: pointer; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 8px;">
              <span class="material-icons-round" style="font-size: 14px;">close</span> Clear Filters
            </button>
          </div>
        </div>
      </div>

      <!-- Scrollable Task List -->
      <div id="tsTaskScrollArea" style="flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;">
        <div id="tsTaskList"></div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#tsTaskSearch');
  const waveDropdownEl = container.querySelector('#dropdown-ts-wave-filter');
  const sortDropdownEl = container.querySelector('#dropdown-ts-sort');
  const clearFilterBtn = container.querySelector('#tsTaskClearFilterBtn');
  const listContainer = container.querySelector('#tsTaskList');
  const countBadge = container.querySelector('#tsTaskCountBadge');
  const subTabs = container.querySelectorAll('.ts-sub-tab');

  const badgeMyTasks = container.querySelector('#subtabCountMyTasks');
  const badgeInProgress = container.querySelector('#subtabCountInProgress');
  const badgeCompleted = container.querySelector('#subtabCountCompleted');

  // Custom Dropdown Helper Function
  function setupDropdown(containerEl, initialVal, options, onChange) {
    if (!containerEl) return { getValue: () => initialVal, setValue: () => {}, updateOptions: () => {} };
    const triggerBtn = containerEl.querySelector('.custom-dropdown-trigger');
    const menuEl = containerEl.querySelector('.custom-dropdown-menu');
    if (!triggerBtn || !menuEl) return { getValue: () => initialVal, setValue: () => {}, updateOptions: () => {} };

    let currentVal = initialVal;

    function renderMenu() {
      menuEl.innerHTML = options.map(opt => `
        <div class="custom-dropdown-option ${opt.value === currentVal ? 'active' : ''}" data-value="${escapeHtml(opt.value)}">
          ${escapeHtml(opt.label || opt.value)}
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
        let spaceBelow = window.innerHeight - rect.bottom;
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
      setValue: (val) => {
        currentVal = val;
        renderMenu();
      },
      updateOptions: (newOpts, newVal) => {
        options = newOpts;
        if (newVal !== undefined) currentVal = newVal;
        renderMenu();
      }
    };
  }

  // Setup Sort Custom Dropdown
  const sortDropdown = setupDropdown(sortDropdownEl, 'newest', [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'waveAsc', label: 'Wave (A → Z)' },
    { value: 'waveDesc', label: 'Wave (Z → A)' },
    { value: 'soNumber', label: 'SO Number' },
    { value: 'rack', label: 'Rack Location' }
  ], (val) => {
    sortBy = val;
    renderList();
  });

  // Setup Wave Custom Dropdown
  const waveDropdown = setupDropdown(waveDropdownEl, 'all', [
    { value: 'all', label: 'All Waves' }
  ], (val) => {
    waveFilter = val;
    renderList();
  });

  // Document click listener to close open dropdowns
  const onDocClick = (e) => {
    if (!e.target.closest('.custom-dropdown-container')) {
      container.querySelectorAll('.custom-dropdown-container.open').forEach(el => el.classList.remove('open', 'open-up'));
    }
  };
  document.addEventListener('click', onDocClick);

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderList();
  });

  if (clearFilterBtn) {
    clearFilterBtn.addEventListener('click', () => {
      searchQuery = '';
      waveFilter = 'all';
      sortBy = 'newest';
      if (searchInput) searchInput.value = '';
      waveDropdown.setValue('all');
      sortDropdown.setValue('newest');
      renderList();
    });
  }

  subTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      subTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSubTab = btn.dataset.tab;
      renderList();
      db.syncSectionData('tsTask', { background: true });
    });
  });

  function populateWaveOptions(allTasks) {
    const wavesSet = new Set();
    allTasks.forEach(t => {
      if (t.wave && String(t.wave).trim()) {
        wavesSet.add(String(t.wave).trim());
      }
    });

    const sortedWaves = Array.from(wavesSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const waveOpts = [
      { value: 'all', label: `All Waves (${allTasks.length})` },
      ...sortedWaves.map(w => {
        const count = allTasks.filter(t => String(t.wave || '').trim() === w).length;
        return { value: w, label: `${w} (${count})` };
      })
    ];

    if (allTasks.some(t => !t.wave || !String(t.wave).trim())) {
      const countNoWave = allTasks.filter(t => !t.wave || !String(t.wave).trim()).length;
      waveOpts.push({ value: '_none', label: `No Wave (${countNoWave})` });
    }

    const currentVal = waveDropdown.getValue();
    const isValidVal = waveOpts.some(o => o.value === currentVal);
    const targetVal = isValidVal ? currentVal : 'all';
    waveFilter = targetVal;
    waveDropdown.updateOptions(waveOpts, targetVal);
  }

  function renderList() {
    const allTasks = db.getTroubleShootTasksForUser(currentUser);
    populateWaveOptions(allTasks);

    // Update subtab counts
    const myTasksCount = allTasks.filter(t => t.statusTicket === 'Assigned').length;
    const inProgressCount = allTasks.filter(t => t.statusTicket === 'Picked Up').length;
    const completedCount = allTasks.filter(t => ['Found', 'Found Partial', 'Not Found'].includes(t.statusTicket)).length;

    if (badgeMyTasks) badgeMyTasks.textContent = myTasksCount;
    if (badgeInProgress) badgeInProgress.textContent = inProgressCount;
    if (badgeCompleted) badgeCompleted.textContent = completedCount;

    let filtered = allTasks;
    if (activeSubTab === 'myTasks') filtered = filtered.filter(t => t.statusTicket === 'Assigned');
    else if (activeSubTab === 'inProgress') filtered = filtered.filter(t => t.statusTicket === 'Picked Up');
    else if (activeSubTab === 'completed') filtered = filtered.filter(t => ['Found', 'Found Partial', 'Not Found'].includes(t.statusTicket));

    // Wave filter
    if (waveFilter !== 'all') {
      if (waveFilter === '_none') {
        filtered = filtered.filter(t => !t.wave || !String(t.wave).trim());
      } else {
        filtered = filtered.filter(t => String(t.wave || '').trim().toLowerCase() === waveFilter.toLowerCase());
      }
    }

    // Search query
    if (searchQuery) {
      filtered = filtered.filter(t => {
        const haystack = [t.id, t.soNumber, t.skuNumber, t.productName, t.originRackName, t.reason, t.wave].join(' ').toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.requestTimestamp || 0) - new Date(a.requestTimestamp || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.requestTimestamp || 0) - new Date(b.requestTimestamp || 0);
      } else if (sortBy === 'waveAsc') {
        return String(a.wave || '').localeCompare(String(b.wave || ''), undefined, { numeric: true });
      } else if (sortBy === 'waveDesc') {
        return String(b.wave || '').localeCompare(String(a.wave || ''), undefined, { numeric: true });
      } else if (sortBy === 'soNumber') {
        return String(a.soNumber || '').localeCompare(String(b.soNumber || ''), undefined, { numeric: true });
      } else if (sortBy === 'rack') {
        return String(a.originRackName || '').localeCompare(String(b.originRackName || ''), undefined, { numeric: true });
      }
      return 0;
    });

    // Clear filters button visibility
    const isFiltered = searchQuery !== '' || waveFilter !== 'all' || sortBy !== 'newest';
    if (clearFilterBtn) {
      clearFilterBtn.style.display = isFiltered ? 'inline-flex' : 'none';
    }

    countBadge.textContent = `${filtered.length} Task${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <span class="material-icons-round" style="font-size: 48px; opacity: 0.3;">task_alt</span>
          <p style="margin-top: 8px; font-size: 13px;">No tasks match the current filter.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(t => {
      const statusClass = getStatusClass(t.statusTicket);
      const timeAgo = getTimeAgo(t.requestTimestamp);
      const showPickBtn = t.statusTicket === 'Assigned';
      const showResolveBtn = t.statusTicket === 'Picked Up';

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
            <span><strong>Reason:</strong> <span style="color: #ea580c; font-weight: 700;">${escapeHtml(t.reason)}</span></span>
            <span style="grid-column: 1 / -1;"><strong>Requested:</strong> ${timeAgo}</span>
          </div>
          ${t.foundAt ? `<div style="margin-top: 6px; font-size: 11px; color: #10b981; font-weight: 600;"><strong>Found at:</strong> ${escapeHtml(t.foundAt)} (Qty: ${escapeHtml(t.foundQty)})</div>` : ''}
          <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-light); padding-top: 8px;">
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
              ${t.photo ? '<span style="color: var(--primary-600); display: flex; align-items: center; gap: 2px;"><span class="material-icons-round" style="font-size: 14px;">photo_camera</span> Photo</span>' : ''}
              ${t.troubleshootEvidence ? '<span style="color: #10b981; display: flex; align-items: center; gap: 2px;"><span class="material-icons-round" style="font-size: 14px;">verified</span> Evidence</span>' : ''}
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              ${showPickBtn ? `
                <button class="btn-primary ts-pickup-btn" data-id="${escapeHtml(t.id)}" style="height: 30px; padding: 0 14px; font-size: 11px; font-weight: 700; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
                  <span class="material-icons-round" style="font-size: 16px;">assignment_turned_in</span> Pick Up
                </button>
              ` : ''}
              ${showResolveBtn ? `
                <button class="btn-primary ts-resolve-btn" data-id="${escapeHtml(t.id)}" style="height: 30px; padding: 0 14px; font-size: 11px; font-weight: 700; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; background: #ea580c;">
                  <span class="material-icons-round" style="font-size: 16px;">search</span> Resolve
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers for details popup
    listContainer.querySelectorAll('.ts-ticket-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.ts-pickup-btn') || e.target.closest('.ts-resolve-btn')) return;
        const ticketId = card.dataset.id;
        const ticket = allTasks.find(t => t.id === ticketId);
        if (ticket) openDetailModal(ticket);
      });
    });

    // Attach action handlers
    listContainer.querySelectorAll('.ts-pickup-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ticketId = btn.dataset.id;
        const ticket = allTasks.find(t => t.id === ticketId);
        if (ticket) openPickupSwipeModal(ticket);
      });
    });

    listContainer.querySelectorAll('.ts-resolve-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openResolveFlow(btn.dataset.id);
      });
    });
  }

  function openDetailModal(ticket) {
    const existing = document.getElementById('tsTaskDetailModal');
    if (existing) existing.remove();

    const statusClass = getStatusClass(ticket.statusTicket);
    const photoSrc = formatImageUrl(ticket.photo);
    const evidenceSrc = formatImageUrl(ticket.troubleshootEvidence);
    const showPickBtn = ticket.statusTicket === 'Assigned';
    const showResolveBtn = ticket.statusTicket === 'Picked Up';

    const overlay = document.createElement('div');
    overlay.id = 'tsTaskDetailModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:9999; padding: 16px; box-sizing: border-box;';

    overlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 620px; width: 100%; max-height: 88vh; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
        <!-- Header -->
        <div class="form-modal-header" style="flex-shrink: 0; padding: 16px 22px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span class="material-icons-round" style="color: var(--primary-600); font-size: 20px;">confirmation_number</span>
            <span style="font-weight: 800; font-size: 16px; color: var(--text-primary);">${escapeHtml(ticket.id)}</span>
            <span class="ts-status-badge ${statusClass}">${escapeHtml(ticket.statusTicket)}</span>
          </div>
          <button class="form-modal-close-btn" id="tsTaskDetailCloseBtn" title="Close">
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
          <button type="button" class="btn-secondary" id="tsTaskDetailCloseBtnBottom">Close</button>
          ${showPickBtn ? `
            <button type="button" class="btn-primary" id="tsTaskDetailPickBtn" style="display: flex; align-items: center; gap: 4px;">
              <span class="material-icons-round" style="font-size: 16px;">assignment_turned_in</span> Pick Up Task
            </button>
          ` : ''}
          ${showResolveBtn ? `
            <button type="button" class="btn-primary" id="tsTaskDetailResolveBtn" style="display: flex; align-items: center; gap: 4px; background: #ea580c;">
              <span class="material-icons-round" style="font-size: 16px;">search</span> Resolve Task
            </button>
          ` : ''}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeDetail = () => overlay.remove();
    overlay.querySelector('#tsTaskDetailCloseBtn')?.addEventListener('click', closeDetail);
    overlay.querySelector('#tsTaskDetailCloseBtnBottom')?.addEventListener('click', closeDetail);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetail(); });

    const pickBtn = overlay.querySelector('#tsTaskDetailPickBtn');
    if (pickBtn) {
      pickBtn.addEventListener('click', () => {
        closeDetail();
        openPickupSwipeModal(ticket);
      });
    }

    const resolveBtn = overlay.querySelector('#tsTaskDetailResolveBtn');
    if (resolveBtn) {
      resolveBtn.addEventListener('click', () => {
        closeDetail();
        openResolveFlow(ticket.id);
      });
    }
  }

  function openPickupSwipeModal(ticket) {
    const existing = document.getElementById('tsPickupSwipeModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tsPickupSwipeModal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:9999; padding: 16px; box-sizing: border-box;';

    modal.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 480px; width: 100%; margin: 0 auto; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); box-sizing: border-box;">
        <div class="form-modal-header" style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;">
          <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
            <span class="material-icons-round" style="color: var(--primary-600);">assignment_turned_in</span>
            Pick Up Task
          </h3>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="unique-id-chip">${escapeHtml(ticket.id)}</span>
            <button class="form-modal-close-btn" id="closePickupSwipeModalBtn" title="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        </div>

        <div class="form-modal-body" style="display: flex; flex-direction: column; gap: 14px; padding: 0;">
          <div style="background: var(--surface-body, #f8fafc); border-radius: 12px; padding: 14px; border: 1px solid var(--border-light, #e2e8f0); font-size: 13px;">
            <div style="font-weight: 700; color: var(--text-primary); font-size: 14px; margin-bottom: 4px;">${escapeHtml(ticket.productName)}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
              <span><strong>SKU:</strong> ${escapeHtml(ticket.skuNumber)}</span>
              <span><strong>Qty:</strong> ${escapeHtml(ticket.requestQuantity)}</span>
              <span><strong>Wave:</strong> <span style="color: var(--primary-700); font-weight: 700;">${escapeHtml(ticket.wave || '-')}</span></span>
              <span><strong>Origin Rack:</strong> ${escapeHtml(ticket.originRackName)}</span>
              <span style="grid-column: 1 / -1;"><strong>Reason:</strong> <span style="color: #ea580c; font-weight: 700;">${escapeHtml(ticket.reason)}</span></span>
            </div>
          </div>

          <p style="font-size: 12px; color: var(--text-muted); margin: 0; text-align: center;">
            Swipe right to accept and start troubleshooting this ticket.
          </p>

          <!-- Swipe Slider -->
          <div id="tsSwipeSliderContainer" class="swipe-slider-container" style="margin-top: 6px;">
            <div class="swipe-track">
              <div class="swipe-fill" id="tsSwipeFill"></div>
              <span class="swipe-text" id="tsSwipeText">Swipe right to proceed</span>
              <div class="swipe-thumb" id="tsSwipeThumb">
                <span class="material-icons-round">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    modal.querySelector('#closePickupSwipeModalBtn').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // Swipe Slider Actions
    const swipeContainer = modal.querySelector('#tsSwipeSliderContainer');
    const swipeThumb = modal.querySelector('#tsSwipeThumb');
    const swipeFill = modal.querySelector('#tsSwipeFill');
    const swipeText = modal.querySelector('#tsSwipeText');

    let isDragging = false;
    let isCompleting = false;
    let startX = 0;
    let currentX = 0;
    let maxDrag = 0;

    function getClientX(e) {
      return e.touches ? e.touches[0].clientX : e.clientX;
    }

    function startDrag(e) {
      if (isCompleting) return;
      isDragging = true;
      startX = getClientX(e);
      const trackWidth = swipeContainer.querySelector('.swipe-track').offsetWidth;
      const thumbWidth = swipeThumb.offsetWidth;
      maxDrag = trackWidth - thumbWidth - 8;
      swipeThumb.style.transition = 'none';
      swipeFill.style.transition = 'none';
    }

    function onDrag(e) {
      if (!isDragging || isCompleting) return;
      const clientX = getClientX(e);
      let delta = clientX - startX;
      if (delta < 0) delta = 0;
      if (delta > maxDrag) delta = maxDrag;

      currentX = delta;
      swipeThumb.style.transform = `translateX(${delta}px)`;
      swipeFill.style.width = `${delta + 22}px`;

      const progress = maxDrag > 0 ? delta / maxDrag : 0;
      if (progress > 0.85) {
        completeSwipe();
      }
    }

    function endDrag() {
      if (!isDragging || isCompleting) return;
      isDragging = false;
      if ((maxDrag > 0 ? currentX / maxDrag : 0) < 0.85) {
        currentX = 0;
        swipeThumb.style.transform = `translateX(0px)`;
        swipeFill.style.width = `0px`;
        swipeThumb.style.transition = 'transform 0.2s ease';
        swipeFill.style.transition = 'width 0.2s ease';
      }
    }

    async function completeSwipe() {
      if (isCompleting) return;
      isCompleting = true;
      isDragging = false;

      swipeThumb.style.transform = `translateX(${maxDrag}px)`;
      swipeFill.style.width = '100%';
      swipeText.textContent = 'Picking up task...';

      try {
        await db.pickTroubleShootTicket(ticket.id, currentUser);
        closeModal();
        // Switch to inProgress tab automatically
        activeSubTab = 'inProgress';
        subTabs.forEach(b => b.classList.toggle('active', b.dataset.tab === 'inProgress'));
        renderList();
      } catch (err) {
        alert('Pickup failed: ' + err.message);
        isCompleting = false;
        currentX = 0;
        swipeThumb.style.transform = `translateX(0px)`;
        swipeFill.style.width = `0px`;
        swipeText.textContent = 'Swipe right to proceed';
      }
    }

    swipeThumb.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', endDrag);

    swipeThumb.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', onDrag, { passive: true });
    window.addEventListener('touchend', endDrag);
  }

  function openResolveFlow(ticketId) {
    const ticket = db.troubleShootTickets.find(t => t.id === ticketId);
    if (!ticket) return alert('Ticket not found');

    const existing = document.getElementById('tsResolveModal');
    if (existing) existing.remove();

    // STG suggestions will be populated fresh from backend when Origin rack is not found
    const targetSku = String(ticket.skuNumber || '').replace(/^'/, '').trim().toLowerCase();
    let stgSuggestions = (db.soh || []).filter(s => {
      const sku = String(s.skuCode || s.skuNumber || s.sku_number || s.sku || '').replace(/^'/, '').trim().toLowerCase();
      const loc = String(s.rackLocation || s.rack_location || s.location || '').trim().toUpperCase();
      const qty = Number(s.qtySoh || s.qty_soh || s.qty || 0);
      return sku === targetSku && loc.includes('STG') && (isNaN(qty) || qty >= 0);
    });

    // SOHWH suggestions will be loaded on demand in Step 3
    let sohwhSuggestions = (db.sohwh || []).filter(s => {
      const sku = String(s.skuNumber || s.skuCode || s.sku_number || s.sku || '').replace(/^'/, '').trim().toLowerCase();
      const qty = Number(s.qtyStock || s.qty_stock || s.qty || 0);
      return sku === targetSku && (isNaN(qty) || qty >= 0);
    });

    const overlay = document.createElement('div');
    overlay.id = 'tsResolveModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:9999; padding: 16px; box-sizing: border-box;';

    overlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 620px; width: 100%; max-height: 88vh; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.25);">
        <!-- Header -->
        <div class="form-modal-header" style="flex-shrink: 0; padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light);">
          <h3 style="margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: #ea580c;">search</span>
            <span>Resolve: ${escapeHtml(ticket.id)}</span>
          </h3>
          <button class="form-modal-close-btn" id="tsResolveCloseBtn" title="Close (No changes saved)">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body" style="flex: 1; overflow-y: auto; padding: 20px 22px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Ticket Summary -->
          <div style="padding: 10px; background: var(--surface-body); border-radius: 10px; margin-bottom: 14px; font-size: 12px; color: var(--text-secondary);">
            <strong>${ticket.skuNumber}</strong> — ${ticket.productName}<br>
            Qty requested: <strong>${ticket.requestQuantity}</strong> · Wave: <strong>${ticket.wave || '-'}</strong> · Reason: <strong>${ticket.reason}</strong>
          </div>

          <!-- Step 1: Origin Rack -->
          <div class="ts-step-card" id="tsStep1" style="border: 1.5px solid var(--border-light); border-radius: 14px; padding: 14px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: var(--primary-600); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">1</span>
              <span style="font-size: 13px; font-weight: 700;">Origin Rack: <span style="color: var(--primary-600);">${ticket.originRackName}</span></span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 10px 0;">Go to the origin rack and scan to validate your location.</p>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 10px;">
              <input type="text" id="tsStep1ScanInput" placeholder="Scan rack barcode..." readonly style="flex: 1; padding: 8px 10px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 12px; background: var(--bg-secondary); color: var(--text-primary); box-sizing: border-box;">
              <button id="tsStep1ScanBtn" class="btn-secondary" style="height: 36px; width: 36px; padding: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
              </button>
            </div>
            <div id="tsStep1Status" style="display: none; font-size: 12px; margin-bottom: 8px;"></div>
            <div id="tsStep1Actions" style="display: none; gap: 6px; flex-wrap: wrap;">
              <button class="btn-primary ts-found-btn" data-step="origin" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; background: #10b981;">
                <span class="material-icons-round" style="font-size: 14px;">check_circle</span> Found
              </button>
              <button class="btn-secondary ts-nothere-btn" data-step="1" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 14px;">cancel</span> Not Here
              </button>
            </div>
          </div>

          <!-- Step 2: STG Racks -->
          <div class="ts-step-card" id="tsStep2" style="border: 1.5px solid var(--border-light); border-radius: 14px; padding: 14px; margin-bottom: 10px; display: none; opacity: 0.5;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: #ea580c; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">2</span>
              <span style="font-size: 13px; font-weight: 700;">SOH STG Racks</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 8px 0;">Suggested STG locations from SOH:</p>
            <div id="tsStgSuggestions" style="margin-bottom: 10px;">
              ${stgSuggestions.length > 0 ? stgSuggestions.map(s => {
                const loc = String(s.rackLocation || s.rack_location || s.location || '').trim();
                const qty = s.qtySoh || s.qty_soh || s.qty || 0;
                return `<div style="font-size: 12px; padding: 6px 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>📍 ${loc}</span><span>Qty: ${qty}</span></div>`;
              }).join('') : '<div style="font-size: 12px; color: var(--text-muted); padding: 6px;">No STG locations found for this SKU.</div>'}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 10px;">
              <input type="text" id="tsStep2ScanInput" placeholder="Scan STG rack..." readonly style="flex: 1; padding: 8px 10px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 12px; background: var(--bg-secondary); color: var(--text-primary); box-sizing: border-box;">
              <button id="tsStep2ScanBtn" class="btn-secondary" style="height: 36px; width: 36px; padding: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
              </button>
            </div>
            <div id="tsStep2Status" style="display: none; font-size: 12px; margin-bottom: 8px;"></div>
            <div id="tsStep2Actions" style="display: none; gap: 6px; flex-wrap: wrap;">
              <button class="btn-primary ts-found-btn" data-step="stg" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; background: #10b981;">
                <span class="material-icons-round" style="font-size: 14px;">check_circle</span> Found
              </button>
              <button class="btn-secondary ts-nothere-btn" data-step="2" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 14px;">cancel</span> Not Here
              </button>
            </div>
          </div>

          <!-- Step 3: SOHWH Racks -->
          <div class="ts-step-card" id="tsStep3" style="border: 1.5px solid var(--border-light); border-radius: 14px; padding: 14px; margin-bottom: 10px; display: none; opacity: 0.5;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
              <span style="width: 24px; height: 24px; border-radius: 50%; background: #7c3aed; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">3</span>
              <span style="font-size: 13px; font-weight: 700;">SOHWH Racks</span>
            </div>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 8px 0;">Suggested WH locations from SOHWH:</p>
            <div id="tsSohwhSuggestions" style="margin-bottom: 10px;">
              ${sohwhSuggestions.length > 0 ? sohwhSuggestions.map(s => {
                return `<div style="font-size: 12px; padding: 6px 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>📍 ${s.rackName}</span><span>Qty: ${s.qtyStock}</span></div>`;
              }).join('') : '<div style="font-size: 12px; color: var(--text-muted); padding: 6px;">No SOHWH locations found for this SKU.</div>'}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 10px;">
              <input type="text" id="tsStep3ScanInput" placeholder="Scan WH rack..." readonly style="flex: 1; padding: 8px 10px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 12px; background: var(--bg-secondary); color: var(--text-primary); box-sizing: border-box;">
              <button id="tsStep3ScanBtn" class="btn-secondary" style="height: 36px; width: 36px; padding: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
              </button>
            </div>
            <div id="tsStep3Status" style="display: none; font-size: 12px; margin-bottom: 8px;"></div>
            <div id="tsStep3Actions" style="display: none; gap: 6px; flex-wrap: wrap;">
              <button class="btn-primary ts-found-btn" data-step="sohwh" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; background: #10b981;">
                <span class="material-icons-round" style="font-size: 14px;">check_circle</span> Found
              </button>
              <button class="btn-secondary ts-notfound-final-btn" style="height: 30px; padding: 0 12px; font-size: 11px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px; color: #ef4444;">
                <span class="material-icons-round" style="font-size: 14px;">cancel</span> Not Found (Final)
              </button>
            </div>
          </div>

          <!-- Resolution Form (hidden until found or not found final) -->
          <div id="tsResolutionForm" style="display: none; border: 2px solid #10b981; border-radius: 14px; padding: 14px; margin-bottom: 10px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; display: flex; align-items: center; gap: 6px;">
              <span class="material-icons-round" style="color: #10b981;">fact_check</span>
              <span id="tsResolutionTitle">Complete Ticket</span>
            </h4>
            <div style="margin-bottom: 12px;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span>Found Qty</span>
                <span style="font-size: 11px; font-weight: 700; color: var(--primary-700); background: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 6px;">
                  Qty Requested: <strong>${escapeHtml(ticket.requestQuantity || 1)}</strong>
                </span>
              </label>
              <input type="number" id="tsFoundQty" min="0" max="${ticket.requestQuantity}" value="0" style="width: 100%; padding: 8px 10px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 13px; background: var(--bg-secondary); color: var(--text-primary); box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 10px;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Evidence Photo *</label>
              <div id="tsEvidencePreviewArea" style="display: none; margin-bottom: 8px; text-align: center;">
                <img id="tsEvidencePreview" style="max-width: 100%; max-height: 150px; border-radius: 10px; border: 1px solid var(--border-light);" />
              </div>
              <label for="tsEvidenceInput" class="btn-secondary" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 600;">
                <span class="material-icons-round" style="font-size: 18px;">photo_camera</span>
                <span id="tsEvidenceLabel">Upload Evidence</span>
              </label>
              <input type="file" id="tsEvidenceInput" accept="image/*" capture="environment" style="display: none;">
            </div>
            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; display: block;">Delivered At</label>
              <div style="display: flex; gap: 6px;">
                <input type="text" id="tsDeliveredAt" placeholder="Enter location or scan..." style="flex: 1; padding: 8px 10px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 12px; background: var(--bg-secondary); color: var(--text-primary); box-sizing: border-box;">
                <button id="tsDeliveredScanBtn" class="btn-secondary" style="height: 36px; width: 36px; padding: 0; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
                </button>
              </div>
            </div>
                      <button id="tsCompleteBtn" class="btn-primary" style="width: 100%; padding: 12px; font-size: 14px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons-round" style="font-size: 18px;">check_circle</span>
              Complete Ticket
            </button>
          </div>
        </div>

        <!-- Footer Cancel Button -->
        <div class="form-modal-footer-actions" style="padding: 14px 22px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--border-light); flex-shrink: 0; background: #ffffff;">
          <button type="button" class="btn-secondary" id="tsResolveCancelBtn" style="height: 38px; padding: 0 18px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; gap: 6px;">
            <span class="material-icons-round" style="font-size: 16px;">close</span> Cancel & Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // State
    let resolvedAt = '';
    let resolvedStep = '';
    let evidenceBase64 = '';

    // Cancel / Close Handlers (discards any unsaved action)
    const closeResolveFlow = () => overlay.remove();
    overlay.querySelector('#tsResolveCloseBtn').addEventListener('click', closeResolveFlow);
    overlay.querySelector('#tsResolveCancelBtn')?.addEventListener('click', closeResolveFlow);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeResolveFlow(); });

    // Helper to open match confirmation popup
    function showMatchConfirmationModal({ rackLocation, onFound, onNotHere }) {
      const existingConfirm = document.getElementById('tsRackMatchModal');
      if (existingConfirm) existingConfirm.remove();

      const confirmModal = document.createElement('div');
      confirmModal.id = 'tsRackMatchModal';
      confirmModal.className = 'modal-overlay';
      confirmModal.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:10001; padding: 16px; box-sizing: border-box;';

      confirmModal.innerHTML = `
        <div class="modal-card form-modal-card" style="max-width: 440px; width: 100%; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); text-align: center; position: relative; box-sizing: border-box;">
          <!-- Close (X) button -->
          <button class="form-modal-close-btn" id="tsRackMatchCloseBtn" title="Close (No action saved)" style="position: absolute; right: 14px; top: 14px;">
            <span class="material-icons-round">close</span>
          </button>

          <div style="width: 52px; height: 52px; border-radius: 50%; background: #dcfce7; color: #16a34a; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span class="material-icons-round" style="font-size: 32px;">verified</span>
          </div>
          <h3 style="margin: 0 0 6px 0; font-size: 17px; color: var(--text-primary); font-weight: 800;">
            Rack Validated!
          </h3>
          <div style="display: inline-block; background: var(--primary-50); color: var(--primary-800); padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 13px; margin-bottom: 14px; border: 1px solid var(--primary-200);">
            📍 ${escapeHtml(rackLocation)}
          </div>

          <div style="background: var(--surface-body, #f8fafc); border-radius: 12px; padding: 12px; border: 1px solid var(--border-light, #e2e8f0); margin-bottom: 16px; text-align: left; font-size: 12px;">
            <div style="font-weight: 700; color: var(--text-primary); font-size: 13px; margin-bottom: 4px;">${escapeHtml(ticket.productName)}</div>
            <div style="color: var(--text-secondary); display: flex; justify-content: space-between;">
              <span><strong>SKU:</strong> ${escapeHtml(ticket.skuNumber)}</span>
              <span><strong>Req Qty:</strong> ${escapeHtml(ticket.requestQuantity)}</span>
            </div>
          </div>

          <p style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin: 0 0 18px 0;">
            Did you find the item at this rack location?
          </p>

          <div style="display: flex; gap: 10px; justify-content: center;">
            <button type="button" id="tsMatchNotHereBtn" class="btn-secondary" style="flex: 1; padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons-round" style="font-size: 18px; color: #ea580c;">close</span>
              Not Here
            </button>
            <button type="button" id="tsMatchFoundBtn" class="btn-primary" style="flex: 1; padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; background: #10b981; border-color: #10b981; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span class="material-icons-round" style="font-size: 18px;">check_circle</span>
              Yes, Found
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(confirmModal);

      const closeMatchModal = () => confirmModal.remove();
      confirmModal.querySelector('#tsRackMatchCloseBtn')?.addEventListener('click', closeMatchModal);

      confirmModal.querySelector('#tsMatchFoundBtn').addEventListener('click', () => {
        confirmModal.remove();
        onFound();
      });

      confirmModal.querySelector('#tsMatchNotHereBtn').addEventListener('click', () => {
        confirmModal.remove();
        onNotHere();
      });
    }

    function triggerFoundForm(step, locationName) {
      resolvedStep = step;
      resolvedAt = locationName;
      const form = document.getElementById('tsResolutionForm');
      form.style.display = 'block';
      form.style.borderColor = '#10b981';
      document.getElementById('tsResolutionTitle').textContent = `Item Found at ${locationName} — Complete Ticket`;
      document.getElementById('tsFoundQty').value = ticket.requestQuantity;
      form.scrollIntoView({ behavior: 'smooth' });
    }

    // Helper to open skip/prompt dialog when stock is not found in a step
    function showSkipPromptModal({ title, icon, iconColor, iconBg, message, nextButtonText, onProceed }) {
      const existingSkip = document.getElementById('tsSkipPromptModal');
      if (existingSkip) existingSkip.remove();

      const promptModal = document.createElement('div');
      promptModal.id = 'tsSkipPromptModal';
      promptModal.className = 'modal-overlay';
      promptModal.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:10002; padding: 16px; box-sizing: border-box;';

      promptModal.innerHTML = `
        <div class="modal-card form-modal-card" style="max-width: 440px; width: 100%; border-radius: 20px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); text-align: center; position: relative; box-sizing: border-box;">
          <!-- Close (X) button -->
          <button class="form-modal-close-btn" id="tsSkipCloseBtn" title="Close (No action saved)" style="position: absolute; right: 14px; top: 14px;">
            <span class="material-icons-round">close</span>
          </button>

          <div style="width: 54px; height: 54px; border-radius: 50%; background: ${iconBg || '#fef3c7'}; color: ${iconColor || '#f59e0b'}; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
            <span class="material-icons-round" style="font-size: 32px;">${icon || 'info'}</span>
          </div>
          <h3 style="margin: 0 0 10px 0; font-size: 17px; color: var(--text-primary); font-weight: 800;">
            ${title}
          </h3>
          <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; margin: 0 0 20px 0;">
            ${message}
          </p>
          <button type="button" id="tsSkipProceedBtn" class="btn-primary" style="width: 100%; padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <span>${nextButtonText || 'Proceed to SOHWH'}</span>
            <span class="material-icons-round" style="font-size: 18px;">arrow_forward</span>
          </button>
        </div>
      `;

      document.body.appendChild(promptModal);

      promptModal.querySelector('#tsSkipCloseBtn')?.addEventListener('click', () => promptModal.remove());

      promptModal.querySelector('#tsSkipProceedBtn').addEventListener('click', () => {
        promptModal.remove();
        if (onProceed) onProceed();
      });
    }

    // Step transition helpers with automated skip prompts and on-demand fresh syncing
    async function advanceFromOrigin() {
      const step2El = document.getElementById('tsStep2');
      const stgSugArea = document.getElementById('tsStgSuggestions');

      // Reveal Step 2 with active loading feedback
      if (step2El) {
        step2El.style.display = 'block';
        step2El.style.opacity = '1';
        step2El.scrollIntoView({ behavior: 'smooth' });
      }
      document.getElementById('tsStep1').style.opacity = '0.4';

      if (stgSugArea) {
        stgSugArea.innerHTML = `
          <div style="font-size: 12px; color: var(--primary-600); padding: 12px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg-secondary); border-radius: 8px;">
            <span class="material-icons-round spin" style="font-size: 18px;">sync</span>
            <span>Fetching fresh SOH STG stock...</span>
          </div>
        `;
      }

      // Fetch fresh SOH data from backend
      try {
        await db.syncGoogleSheets(['soh']);
      } catch (err) {
        console.warn('Failed to fetch fresh SOH on demand:', err);
      }

      // Re-calculate STG suggestions with fresh SOH
      stgSuggestions = (db.soh || []).filter(s => {
        const sku = String(s.skuCode || s.skuNumber || s.sku_number || s.sku || '').replace(/^'/, '').trim().toLowerCase();
        const loc = String(s.rackLocation || s.rack_location || s.location || '').trim().toUpperCase();
        const qty = Number(s.qtySoh || s.qty_soh || s.qty || 0);
        return sku === targetSku && loc.includes('STG') && (isNaN(qty) || qty >= 0);
      });

      // Update STG suggestions list in UI
      if (stgSugArea) {
        stgSugArea.innerHTML = stgSuggestions.length > 0 ? stgSuggestions.map(s => {
          const loc = String(s.rackLocation || s.rack_location || s.location || '').trim();
          const qty = s.qtySoh || s.qty_soh || s.qty || 0;
          return `<div style="font-size: 12px; padding: 6px 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>📍 ${escapeHtml(loc)}</span><span>Qty: ${qty}</span></div>`;
        }).join('') : '<div style="font-size: 12px; color: var(--text-muted); padding: 6px;">No STG locations found for this SKU.</div>';
      }

      if (stgSuggestions.length > 0) {
        step2El.scrollIntoView({ behavior: 'smooth' });
      } else {
        // No matching STG stock -> Show prompt and skip directly to Step 3
        showSkipPromptModal({
          title: 'No SOH STG Stock Found',
          icon: 'inventory_2',
          iconColor: '#ea580c',
          iconBg: '#ffedd5',
          message: `No matching stock found on SOH STG racks for SKU: <strong>${escapeHtml(ticket.skuNumber)}</strong>.<br><br>Skipping to <strong>Step 3: Warehouse Backup Racks (SOHWH)</strong>.`,
          nextButtonText: 'Proceed to SOHWH',
          onProceed: () => {
            advanceToSohwh(true);
          }
        });
      }
    }

    async function advanceToSohwh(isSkippedFromStg = false) {
      const step3El = document.getElementById('tsStep3');
      const suggestionsContainer = document.getElementById('tsSohwhSuggestions');

      // Reveal step 3 immediately with loading status
      if (step3El) {
        step3El.style.display = 'block';
        step3El.style.opacity = '1';
        step3El.scrollIntoView({ behavior: 'smooth' });
      }
      document.getElementById('tsStep1').style.opacity = '0.4';

      if (isSkippedFromStg) {
        document.getElementById('tsStep2').style.display = 'block';
        document.getElementById('tsStep2').style.opacity = '0.4';
        const stgSugArea = document.getElementById('tsStgSuggestions');
        if (stgSugArea) {
          stgSugArea.innerHTML = '<div style="font-size: 11px; color: #ea580c; background: #fff7ed; padding: 8px 12px; border-radius: 8px; font-weight: 700; border: 1px dashed #fdba74;">⏩ Step Skipped: No matching STG stock in SOH</div>';
        }
      } else {
        document.getElementById('tsStep2').style.opacity = '0.4';
      }

      // On-demand fetch SOHWH if not loaded yet
      if (!db.sohwh || db.sohwh.length === 0) {
        if (suggestionsContainer) {
          suggestionsContainer.innerHTML = `
            <div style="font-size: 12px; color: var(--primary-600); padding: 12px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg-secondary); border-radius: 8px;">
              <span class="material-icons-round spin" style="font-size: 18px;">sync</span>
              <span>Loading warehouse backup stock (SOHWH)...</span>
            </div>
          `;
        }
        try {
          await db.syncGoogleSheets(['sohwh']);
        } catch (err) {
          console.warn('Failed to fetch SOHWH on demand:', err);
        }
      }

      // Re-calculate suggestions with fresh SOHWH
      sohwhSuggestions = (db.sohwh || []).filter(s => {
        const sku = String(s.skuNumber || s.skuCode || s.sku_number || s.sku || '').replace(/^'/, '').trim().toLowerCase();
        const qty = Number(s.qtyStock || s.qty_stock || s.qty || 0);
        return sku === targetSku && (isNaN(qty) || qty >= 0);
      });

      // Update SOHWH suggestion container
      if (suggestionsContainer) {
        suggestionsContainer.innerHTML = sohwhSuggestions.length > 0 ? sohwhSuggestions.map(s => {
          return `<div style="font-size: 12px; padding: 6px 10px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 4px; display: flex; justify-content: space-between;"><span>📍 ${escapeHtml(s.rackName)}</span><span>Qty: ${s.qtyStock}</span></div>`;
        }).join('') : '<div style="font-size: 12px; color: var(--text-muted); padding: 6px;">No SOHWH locations found for this SKU.</div>';
      }

      if (sohwhSuggestions.length === 0) {
        // No SOHWH stock either
        showSkipPromptModal({
          title: 'No Warehouse Stock Available',
          icon: 'warning',
          iconColor: '#ef4444',
          iconBg: '#fee2e2',
          message: `No matching backup stock found on warehouse racks (SOHWH) for SKU: <strong>${escapeHtml(ticket.skuNumber)}</strong>.<br><br>Moving directly to <strong>Final Resolution (Not Found)</strong>.`,
          nextButtonText: 'Complete as Not Found',
          onProceed: () => {
            resolvedStep = 'none';
            resolvedAt = '';
            const form = document.getElementById('tsResolutionForm');
            form.style.display = 'block';
            form.style.borderColor = '#ef4444';
            document.getElementById('tsResolutionTitle').textContent = 'Item Not Found — Complete Ticket';
            document.getElementById('tsFoundQty').value = '0';
            form.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    }

    // Step 1 Scanner
    overlay.querySelector('#tsStep1ScanBtn').addEventListener('click', () => {
      openCameraScanner((scanned) => {
        overlay.querySelector('#tsStep1ScanInput').value = scanned;
        const expected = ticket.originRackName.trim().toLowerCase();
        const scannedLower = scanned.trim().toLowerCase();
        const statusEl = document.getElementById('tsStep1Status');
        const actionsEl = document.getElementById('tsStep1Actions');

        if (scannedLower === expected) {
          statusEl.innerHTML = '<span style="color: #10b981; font-weight: 700;">✅ Origin Rack validated!</span>';
          statusEl.style.display = 'block';
          actionsEl.style.display = 'flex';

          // Pop up confirmation modal asking whether item is found or not
          showMatchConfirmationModal({
            rackLocation: ticket.originRackName,
            onFound: () => triggerFoundForm('origin', ticket.originRackName),
            onNotHere: () => advanceFromOrigin()
          });
        } else {
          statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;">❌ Rack mismatch. Expected: ${ticket.originRackName}, Scanned: ${scanned}</span>`;
          statusEl.style.display = 'block';
          actionsEl.style.display = 'none';
        }
      });
    });

    // Step 2 Scanner
    overlay.querySelector('#tsStep2ScanBtn')?.addEventListener('click', () => {
      openCameraScanner((scanned) => {
        overlay.querySelector('#tsStep2ScanInput').value = scanned;
        const scannedLower = scanned.trim().toLowerCase();
        const matchedStg = stgSuggestions.find(s => {
          const loc = String(s.rackLocation || s.rack_location || s.location || '').trim().toLowerCase();
          return loc === scannedLower;
        });
        const statusEl = document.getElementById('tsStep2Status');
        const actionsEl = document.getElementById('tsStep2Actions');

        if (matchedStg) {
          const matchedLoc = String(matchedStg.rackLocation || matchedStg.rack_location || matchedStg.location || scanned).trim();
          statusEl.innerHTML = `<span style="color: #10b981; font-weight: 700;">✅ STG rack validated: ${matchedLoc}!</span>`;
          statusEl.style.display = 'block';
          actionsEl.style.display = 'flex';

          // Pop up confirmation modal asking whether item is found or not
          showMatchConfirmationModal({
            rackLocation: matchedLoc,
            onFound: () => triggerFoundForm('stg', matchedLoc),
            onNotHere: () => advanceToSohwh(false)
          });
        } else {
          statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;">❌ Scanned rack "${scanned}" is not in the suggested STG list.</span>`;
          statusEl.style.display = 'block';
          actionsEl.style.display = 'none';
        }
      });
    });

    // Step 3 Scanner
    overlay.querySelector('#tsStep3ScanBtn')?.addEventListener('click', () => {
      openCameraScanner((scanned) => {
        overlay.querySelector('#tsStep3ScanInput').value = scanned;
        const scannedLower = scanned.trim().toLowerCase();
        const matchedWh = sohwhSuggestions.find(s => String(s.rackName).trim().toLowerCase() === scannedLower);
        const statusEl = document.getElementById('tsStep3Status');
        const actionsEl = document.getElementById('tsStep3Actions');

        if (matchedWh) {
          const matchedLoc = String(matchedWh.rackName || scanned).trim();
          statusEl.innerHTML = `<span style="color: #10b981; font-weight: 700;">✅ WH rack validated: ${matchedLoc}!</span>`;
          statusEl.style.display = 'block';
          actionsEl.style.display = 'flex';

          // Pop up confirmation modal asking whether item is found or not
          showMatchConfirmationModal({
            rackLocation: matchedLoc,
            onFound: () => triggerFoundForm('sohwh', matchedLoc),
            onNotHere: () => {
              resolvedStep = 'none';
              resolvedAt = '';
              const form = document.getElementById('tsResolutionForm');
              form.style.display = 'block';
              form.style.borderColor = '#ef4444';
              document.getElementById('tsResolutionTitle').textContent = 'Item Not Found — Complete Ticket';
              document.getElementById('tsFoundQty').value = '0';
              form.scrollIntoView({ behavior: 'smooth' });
            }
          });
        } else {
          statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;">❌ Scanned rack "${scanned}" is not in the SOHWH list.</span>`;
          statusEl.style.display = 'block';
          actionsEl.style.display = 'none';
        }
      });
    });

    // Not Here buttons (advance to next step manually)
    overlay.querySelectorAll('.ts-nothere-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.step;
        if (step === '1') {
          advanceFromOrigin();
        } else if (step === '2') {
          advanceToSohwh(false);
        }
      });
    });

    // Found buttons
    overlay.querySelectorAll('.ts-found-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.step;
        if (step === 'origin') {
          triggerFoundForm('origin', ticket.originRackName);
        } else if (step === 'stg') {
          const loc = overlay.querySelector('#tsStep2ScanInput').value.trim() || 'STG';
          triggerFoundForm('stg', loc);
        } else if (step === 'sohwh') {
          const loc = overlay.querySelector('#tsStep3ScanInput').value.trim() || 'SOHWH';
          triggerFoundForm('sohwh', loc);
        }
      });
    });

    // Not Found Final
    overlay.querySelector('.ts-notfound-final-btn')?.addEventListener('click', () => {
      resolvedStep = 'none';
      resolvedAt = '';
      const form = document.getElementById('tsResolutionForm');
      form.style.display = 'block';
      form.style.borderColor = '#ef4444';
      document.getElementById('tsResolutionTitle').textContent = 'Item Not Found — Complete Ticket';
      document.getElementById('tsFoundQty').value = '0';
      form.scrollIntoView({ behavior: 'smooth' });
    });

    // Evidence photo
    overlay.querySelector('#tsEvidenceInput')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          evidenceBase64 = ev.target.result;
          const preview = document.getElementById('tsEvidencePreview');
          const previewArea = document.getElementById('tsEvidencePreviewArea');
          preview.src = evidenceBase64;
          previewArea.style.display = 'block';
          document.getElementById('tsEvidenceLabel').textContent = 'Change Photo';
        };
        reader.readAsDataURL(file);
      }
    });

    // Delivered At scanner
    overlay.querySelector('#tsDeliveredScanBtn')?.addEventListener('click', () => {
      openCameraScanner((scanned) => {
        overlay.querySelector('#tsDeliveredAt').value = scanned;
      });
    });

    // Complete
    overlay.querySelector('#tsCompleteBtn')?.addEventListener('click', async () => {
      const foundQty = parseInt(document.getElementById('tsFoundQty').value || '0', 10);
      const deliveredAt = document.getElementById('tsDeliveredAt').value.trim();

      // Validation
      if (foundQty > ticket.requestQuantity) {
        return alert(`Found Qty cannot exceed Request Qty (${ticket.requestQuantity})`);
      }

      const completeBtn = overlay.querySelector('#tsCompleteBtn');
      completeBtn.disabled = true;
      completeBtn.innerHTML = '<span class="material-icons-round spin" style="font-size: 18px;">sync</span> Completing...';

      try {
        let statusTicket;
        if (resolvedStep === 'none') {
          statusTicket = 'Not Found';
        } else if (foundQty >= ticket.requestQuantity) {
          statusTicket = 'Found';
        } else {
          statusTicket = 'Found Partial';
        }

        await db.completeTroubleShootTicket(ticketId, {
          statusTicket,
          foundQty,
          foundAt: resolvedAt,
          deliveredAt,
          troubleshootEvidence: ''
        });

        // Upload evidence
        if (evidenceBase64) {
          try {
            await db.uploadTroubleShootPhoto(evidenceBase64, `${ticketId}_evidence.jpg`, ticketId, 'troubleshootEvidence');
          } catch (photoErr) {
            console.error('Evidence upload failed:', photoErr);
          }
        }

        overlay.remove();
        renderList();
      } catch (err) {
        alert('Failed to complete ticket: ' + err.message);
        completeBtn.disabled = false;
        completeBtn.innerHTML = '<span class="material-icons-round" style="font-size: 18px;">check_circle</span> Complete Ticket';
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

function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
