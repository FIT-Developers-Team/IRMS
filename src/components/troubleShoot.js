import { db } from '../data/db.js';

export function renderTroubleShoot(container, currentUser) {
  let searchQuery = '';
  let statusFilter = 'all';
  let activeSubTab = 'all';

  let kpiExpanded = false;

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

      <!-- Prominent Sub Tabs Bar -->
      <div class="ts-subtab-bar" style="margin-top: 14px; flex-shrink: 0;">
        <button class="ts-sub-tab active" data-tab="all">
          <span class="material-icons-round" style="font-size: 16px;">receipt_long</span>
          <span>All Tickets</span>
          <span class="subtab-count-badge" id="subtabCountAll">0</span>
        </button>
        <button class="ts-sub-tab" data-tab="unassigned">
          <span class="material-icons-round" style="font-size: 16px; color: #ef4444;">pending_actions</span>
          <span>Unassigned</span>
          <span class="subtab-count-badge" id="subtabCountUnassigned">0</span>
        </button>
        <button class="ts-sub-tab" data-tab="assigned">
          <span class="material-icons-round" style="font-size: 16px; color: #7c3aed;">assignment_ind</span>
          <span>Assigned</span>
          <span class="subtab-count-badge" id="subtabCountAssigned">0</span>
        </button>
      </div>

      <!-- Search Input -->
      <div style="margin-top: 10px; display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
        <div style="flex: 1; position: relative;">
          <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-muted);">search</span>
          <input type="text" id="tsAdminSearch" placeholder="Search by ticket ID, SO, SKU, product, troubleshooter..." style="width: 100%; padding: 8px 10px 8px 34px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 13px; background: #ffffff; color: var(--text-primary); box-sizing: border-box;">
        </div>
      </div>

      <!-- Scrollable Ticket List Area -->
      <div id="tsAdminScrollArea" style="flex: 1; min-height: 0; overflow-y: auto; margin-top: 12px; padding-right: 2px;">
        <div id="tsAdminList"></div>
      </div>
    </div>
  `;

  const searchInput = container.querySelector('#tsAdminSearch');
  const listContainer = container.querySelector('#tsAdminList');
  const countBadge = container.querySelector('#tsAdminCountBadge');
  const subTabs = container.querySelectorAll('.ts-sub-tab');

  // Subtab count badges
  const badgeAll = container.querySelector('#subtabCountAll');
  const badgeUnassigned = container.querySelector('#subtabCountUnassigned');
  const badgeAssigned = container.querySelector('#subtabCountAssigned');

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

  subTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      subTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSubTab = btn.dataset.tab;
      renderList();
    });
  });

  function updateKpis(allTickets) {
    const today = new Date().toDateString();
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
      new Date(t.updateAt).toDateString() === today
    ).length;
    if (elNotFound) elNotFound.textContent = allTickets.filter(t =>
      t.statusTicket === 'Not Found' && new Date(t.updateAt).toDateString() === today
    ).length;

    if (badgeAll) badgeAll.textContent = allTickets.length;
    if (badgeUnassigned) badgeUnassigned.textContent = openCount;
    if (badgeAssigned) badgeAssigned.textContent = assignedCount;
  }

  function renderList() {
    const allTickets = db.getTroubleShootTickets();
    updateKpis(allTickets);

    let filtered = allTickets;
    if (activeSubTab === 'unassigned') filtered = filtered.filter(t => t.statusTicket === 'Open');
    else if (activeSubTab === 'assigned') filtered = filtered.filter(t => t.statusTicket === 'Assigned');

    if (searchQuery) {
      filtered = filtered.filter(t => {
        const haystack = [t.id, t.soNumber, t.skuNumber, t.productName, t.requestedBy, t.assignedTo, t.originRackName, t.reason, t.wave].join(' ').toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    countBadge.textContent = `${filtered.length} Ticket${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <span class="material-icons-round" style="font-size: 48px; opacity: 0.3;">troubleshoot</span>
          <p style="margin-top: 8px; font-size: 13px;">No tickets match the current filter.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(t => {
      const statusClass = getStatusClass(t.statusTicket);
      const timeAgo = getTimeAgo(t.requestTimestamp);
      const showAssignBtn = t.statusTicket === 'Open';

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
            ${showAssignBtn ? `
              <button class="btn-primary ts-assign-btn" data-id="${escapeHtml(t.id)}" style="height: 28px; padding: 0 12px; font-size: 11px; font-weight: 700; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 15px;">person_add</span> Assign
              </button>
            ` : `
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
    const showAssignBtn = ticket.statusTicket === 'Open';

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
          ${showAssignBtn ? `
            <button type="button" class="btn-primary" id="tsDetailAssignBtn" style="display: flex; align-items: center; gap: 4px;">
              <span class="material-icons-round" style="font-size: 16px;">person_add</span> Assign Ticket
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

    // Get list of users with Troubleshooter role only
    const users = db.users || [];
    const assignableUsers = users.filter(u => (u.role || '').toLowerCase() === 'troubleshooter');

    const overlay = document.createElement('div');
    overlay.id = 'tsAssignModal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'display:flex; align-items:center; justify-content:center; z-index:9999;';

    overlay.innerHTML = `
      <div class="modal-card" style="width: 90%; max-width: 420px; padding: 20px; border-radius: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
        <h3 style="margin: 0 0 16px 0; font-size: 15px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">
          <span class="material-icons-round" style="color: #7c3aed; font-size: 22px;">person_add</span>
          Assign Ticket: <span style="color: var(--primary-600);">${escapeHtml(ticketId)}</span>
        </h3>
        
        <div style="margin-bottom: 20px;">
          <label style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">Select Troubleshooter</label>
          <input type="hidden" id="tsAssignSelect" value="">
          <div class="custom-dropdown-container" id="dropdown-assign-troubleshooter" style="width: 100%;">
            <button type="button" class="custom-dropdown-trigger text-control" style="height: 42px; border-radius: 10px; padding: 0 14px; display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; background: #ffffff; border: 1.5px solid var(--border-light); width: 100%; box-sizing: border-box;">
              <span class="trigger-label" style="color: var(--text-muted);">Choose a troubleshooter...</span>
              <span class="material-icons-round trigger-icon" style="font-size: 18px; color: var(--text-muted); transition: transform 0.2s;">expand_more</span>
            </button>
            <div class="custom-dropdown-menu" style="z-index: 3000; max-height: 220px; overflow-y: auto;">
              ${assignableUsers.length > 0 ? assignableUsers.map(u => `
                <div class="custom-dropdown-option" data-value="${escapeHtml(u.name)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;">
                  <span style="font-weight: 600; color: var(--text-primary);">${escapeHtml(u.name)}</span>
                  <span style="font-size: 11px; color: var(--text-muted);">${escapeHtml(u.staffId || '')}</span>
                </div>
              `).join('') : `
                <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
                  No staff with Troubleshooter role found.<br><span style="font-size: 11px; color: var(--primary-600);">Please set Troubleshooter role in Admin panel.</span>
                </div>
              `}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button id="tsAssignCancelBtn" class="btn-secondary" style="padding: 8px 16px; border-radius: 10px; font-size: 12px;">Cancel</button>
          <button id="tsAssignConfirmBtn" class="btn-primary" style="padding: 8px 16px; border-radius: 10px; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            <span class="material-icons-round" style="font-size: 16px;">check</span> Assign
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const assignInput = overlay.querySelector('#tsAssignSelect');
    const assignDropdownContainer = overlay.querySelector('#dropdown-assign-troubleshooter');
    const assignDropdownTrigger = assignDropdownContainer.querySelector('.custom-dropdown-trigger');

    const onAssignDocClick = (e) => {
      if (!assignDropdownContainer.contains(e.target)) {
        assignDropdownContainer.classList.remove('open');
        document.removeEventListener('click', onAssignDocClick);
      }
    };

    assignDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = assignDropdownContainer.classList.contains('open');
      if (isOpen) {
        assignDropdownContainer.classList.remove('open');
        document.removeEventListener('click', onAssignDocClick);
      } else {
        assignDropdownContainer.classList.add('open');
        document.addEventListener('click', onAssignDocClick);
      }
    });

    assignDropdownContainer.querySelectorAll('.custom-dropdown-option').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = opt.dataset.value;
        assignInput.value = val;
        const labelEl = assignDropdownTrigger.querySelector('.trigger-label');
        if (labelEl) {
          labelEl.textContent = val;
          labelEl.style.color = 'var(--text-primary)';
        }
        assignDropdownContainer.querySelectorAll('.custom-dropdown-option').forEach(o => {
          o.classList.toggle('active', o.dataset.value === val);
        });
        assignDropdownContainer.classList.remove('open');
        document.removeEventListener('click', onAssignDocClick);
      });
    });

    overlay.querySelector('#tsAssignCancelBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#tsAssignConfirmBtn').addEventListener('click', async () => {
      const selectedName = assignInput.value;
      if (!selectedName) return alert('Please select a troubleshooter');

      const confirmBtn = overlay.querySelector('#tsAssignConfirmBtn');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="material-icons-round spin" style="font-size: 16px;">sync</span> Assigning...';

      try {
        await db.assignTroubleShootTicket(ticketId, currentUser.name, selectedName);
        overlay.remove();
        renderList();
      } catch (err) {
        alert('Assignment failed: ' + err.message);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span class="material-icons-round" style="font-size: 16px;">check</span> Assign';
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
