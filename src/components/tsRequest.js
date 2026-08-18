import { db } from '../data/db.js';
import { openCameraScanner } from '../utils/scanner.js';

export function renderTsRequest(container, currentUser) {
  const storageKey = `irms_selected_checker_line_${currentUser.staffId}`;
  let savedCheckerLine = localStorage.getItem(storageKey) || currentUser.checkerLine || currentUser.line || '';
  let searchQuery = '';
  let activeSubTab = 'myRequests';
  let lastTickets = [];

  const userRole = (currentUser.role || '').trim().toLowerCase();
  const isPicker = userRole === 'picker';

  container.innerHTML = `
    <div class="card-panel ts-request-panel">
      <div class="card-title-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); margin-bottom: 0; width: 100%; box-sizing: border-box; flex-wrap: nowrap;">
        <div style="flex: 1 1 0; min-width: 0; overflow: hidden;">
          <h3 style="display: flex; align-items: center; gap: 6px; margin: 0; flex-wrap: wrap; word-break: break-word; font-size: 15px;">
            <span class="material-icons-round" style="color: var(--primary-600); flex-shrink: 0; font-size: 20px;">confirmation_number</span>
            <span>TS Request</span>
          </h3>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); white-space: nowrap;" id="tsRequestCountBadge">0 Tickets</span>
          <button id="tsCreateTicketBtn" class="btn-primary" style="height: 28px; padding: 0 12px; font-size: 11px; font-weight: 700; gap: 4px; border-radius: 20px; white-space: nowrap; display: flex; align-items: center;">
            <span class="material-icons-round" style="font-size: 16px;">add</span>
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

      <!-- Search -->
      <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
        <div style="flex: 1; position: relative;">
          <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--text-muted);">search</span>
          <input type="text" id="tsRequestSearch" placeholder="Search by ticket ID, SO, SKU, product..." style="width: 100%; padding: 8px 10px 8px 34px; border: 1.5px solid var(--border-light); border-radius: 10px; font-size: 13px; background: var(--bg-primary); color: var(--text-primary); box-sizing: border-box;">
        </div>
      </div>

      <!-- Ticket List -->
      <div id="tsRequestList" style="margin-top: 12px;"></div>
    </div>
  `;

  const searchInput = container.querySelector('#tsRequestSearch');
  const createBtn = container.querySelector('#tsCreateTicketBtn');
  const listContainer = container.querySelector('#tsRequestList');
  const countBadge = container.querySelector('#tsRequestCountBadge');

  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderList();
  });

  createBtn.addEventListener('click', () => openCreateModal());

  function renderList() {
    const allTickets = db.getTroubleShootTicketsForUser(currentUser);
    let filtered = allTickets;

    if (searchQuery) {
      filtered = filtered.filter(t => {
        const haystack = [t.id, t.soNumber, t.skuNumber, t.productName, t.reason, t.statusTicket, t.originRackName].join(' ').toLowerCase();
        return haystack.includes(searchQuery);
      });
    }

    lastTickets = filtered;
    countBadge.textContent = `${filtered.length} Ticket${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <span class="material-icons-round" style="font-size: 48px; opacity: 0.3;">confirmation_number</span>
          <p style="margin-top: 8px; font-size: 13px;">No tickets found. Click "Create Ticket" to submit a new request.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(t => {
      const statusClass = getStatusClass(t.statusTicket);
      const timeAgo = getTimeAgo(t.requestTimestamp);
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
          ${t.assignedTo ? `<div style="margin-top: 6px; font-size: 11px; color: #7c3aed; font-weight: 600;"><strong>Assigned:</strong> ${escapeHtml(t.assignedTo)}</div>` : ''}
          ${t.foundAt ? `<div style="margin-top: 4px; font-size: 11px; color: #10b981; font-weight: 600;"><strong>Found at:</strong> ${escapeHtml(t.foundAt)} (Qty: ${escapeHtml(t.foundQty)})</div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px dashed var(--border-light); padding-top: 8px;">
            <div style="font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
              ${t.photo ? '<span style="color: var(--primary-600); display: flex; align-items: center; gap: 2px;"><span class="material-icons-round" style="font-size: 14px;">photo_camera</span> Photo</span>' : ''}
              ${t.troubleshootEvidence ? '<span style="color: #10b981; display: flex; align-items: center; gap: 2px;"><span class="material-icons-round" style="font-size: 14px;">verified</span> Evidence</span>' : ''}
            </div>
            <span style="font-size: 11px; color: var(--primary-600); font-weight: 600; display: flex; align-items: center; gap: 2px;">View Details <span class="material-icons-round" style="font-size: 14px;">chevron_right</span></span>
          </div>
        </div>
      `;
    }).join('');

    // Attach card click handlers for details popup
    listContainer.querySelectorAll('.ts-ticket-card').forEach(card => {
      card.addEventListener('click', () => {
        const ticketId = card.dataset.id;
        const ticket = allTickets.find(t => t.id === ticketId);
        if (ticket) openDetailModal(ticket);
      });
    });
  }

  function openDetailModal(ticket) {
    const existing = document.getElementById('tsRequestDetailModal');
    if (existing) existing.remove();

    const statusClass = getStatusClass(ticket.statusTicket);
    const photoSrc = formatImageUrl(ticket.photo);
    const evidenceSrc = formatImageUrl(ticket.troubleshootEvidence);

    const overlay = document.createElement('div');
    overlay.id = 'tsRequestDetailModal';
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
          <button class="form-modal-close-btn" id="tsRequestDetailCloseBtn" title="Close">
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
          <button type="button" class="btn-secondary" id="tsRequestDetailCloseBtnBottom">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeDetail = () => overlay.remove();
    overlay.querySelector('#tsRequestDetailCloseBtn')?.addEventListener('click', closeDetail);
    overlay.querySelector('#tsRequestDetailCloseBtnBottom')?.addEventListener('click', closeDetail);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDetail(); });
  }

  function openCreateModal() {
    const existing = document.getElementById('tsCreateModal');
    if (existing) existing.remove();

    const checkerLinesList = db.getCheckerLines ? db.getCheckerLines() : [];
    let selectedCheckerLine = savedCheckerLine;
    let selectedReason = '';

    const overlay = document.createElement('div');
    overlay.id = 'tsCreateModal';
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-card form-modal-card">
        <div class="form-modal-header">
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">confirmation_number</span>
            Create Troubleshoot Ticket
          </h3>
          <button class="form-modal-close-btn" id="tsCreateCloseBtn" title="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body">
          <form id="tsCreateForm" autocomplete="off" onsubmit="return false;">
            <div class="form-grid">
              
              <!-- SO Number (Searchable Custom Dropdown with Scanner) -->
              <div class="form-field-wrapper span-full">
                <label class="form-label">SO Number *</label>
                <div class="custom-dropdown-container" id="tsSoDropdownContainer" style="position: relative; width: 100%;">
                  <div style="position: relative; width: 100%; display: flex; align-items: center;">
                    <input 
                      type="text" 
                      id="tsCreateSoNumber" 
                      class="sku-search-input" 
                      placeholder="Type or select SO number..." 
                      required 
                      autocomplete="off"
                      style="width: 100%; padding-right: 68px; font-weight: 600;"
                    />
                    <div style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 2px; z-index: 20;">
                      <button id="tsSoDropdownToggleBtn" type="button" style="background: none; border: none; padding: 4px; margin: 0; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; border-radius: 6px;" title="Toggle SO Dropdown">
                        <span class="material-icons-round trigger-icon" style="font-size: 20px; transition: transform 0.2s;">expand_more</span>
                      </button>
                      <button id="tsCreateScanSoBtn" type="button" style="background: none; border: none; padding: 4px; margin: 0; color: var(--primary-600); cursor: pointer; display: flex; align-items: center; justify-content: center; outline: none; border-radius: 6px;" title="Scan SO Barcode">
                        <span class="material-icons-round" style="font-size: 20px;">qr_code_scanner</span>
                      </button>
                    </div>
                  </div>
                  <div class="custom-dropdown-menu" id="tsSoDropdownMenu" style="width: 100%; z-index: 5200; max-height: 230px; overflow-y: auto;">
                  </div>
                </div>
              </div>

              <!-- Product Selection (Hybrid Dropdown shown when SO has items) -->
              <div class="form-field-wrapper span-full" id="tsProductFieldWrapper" style="display: none;">
                <label class="form-label">Product Name / SKU (Select Item) *</label>
                <input type="hidden" id="tsSelectedSku" value="" />
                <div class="hybrid-select-trigger" id="tsProductTrigger">
                  <span id="tsProductTriggerText" class="hybrid-select-placeholder">Select Product...</span>
                  <span class="material-icons-round" style="color: var(--text-muted); font-size: 20px;">open_in_new</span>
                </div>
              </div>

              <!-- Auto-populated fields -->
              <div id="tsCreateAutoFields" style="display: none; margin-bottom: 12px; padding: 12px; background: var(--surface-body); border-radius: 12px; border: 1px solid var(--border-light); grid-column: 1 / -1;">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">Auto-populated from SO_DATA</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                  <div><strong>SKU:</strong> <span id="tsAutoSku">-</span></div>
                  <div><strong>Qty:</strong> <span id="tsAutoQty">-</span></div>
                  <div><strong>Wave:</strong> <span id="tsAutoWave">-</span></div>
                  <div><strong>Rack:</strong> <span id="tsAutoRack">-</span></div>
                  <div style="grid-column: 1 / -1;"><strong>Product:</strong> <span id="tsAutoProduct">-</span></div>
                  <div><strong>Picker:</strong> <span id="tsAutoPicker">-</span></div>
                </div>
              </div>

              <!-- Checker Line (hidden for picker) -->
              ${!isPicker ? `
              <div class="form-field-wrapper">
                <label class="form-label">Checker Line *</label>
                <input type="hidden" id="tsCreateCheckerLine" value="${escapeHtml(selectedCheckerLine)}" />
                <div class="hybrid-select-trigger" id="tsCheckerLineTrigger">
                  <span id="tsCheckerLineTriggerText" class="${selectedCheckerLine ? 'hybrid-select-value' : 'hybrid-select-placeholder'}">
                    ${selectedCheckerLine ? `<span class="material-icons-round" style="font-size: 16px;">view_timeline</span>${escapeHtml(selectedCheckerLine)}` : 'Select Checker Line...'}
                  </span>
                  <span class="material-icons-round" style="color: var(--text-muted); font-size: 20px;">open_in_new</span>
                </div>
              </div>
              ` : ''}

              <!-- Reason -->
              <div class="form-field-wrapper">
                <label class="form-label">Reason *</label>
                <input type="hidden" id="tsCreateReason" value="" />
                <div class="hybrid-select-trigger" id="tsReasonTrigger">
                  <span id="tsReasonTriggerText" class="hybrid-select-placeholder">Select Reason...</span>
                  <span class="material-icons-round" style="color: var(--text-muted); font-size: 20px;">open_in_new</span>
                </div>
              </div>

              <!-- Photo -->
              <div class="form-field-wrapper span-full" style="margin-top: 6px;">
                <label class="form-label">Photo ${isPicker ? '*' : '(Optional)'}</label>
                <div id="tsPhotoPreviewArea" style="display: none; margin-bottom: 8px; text-align: center;">
                  <img id="tsPhotoPreview" style="max-width: 100%; max-height: 200px; border-radius: 10px; border: 1px solid var(--border-light);" />
                </div>
                <label for="tsCreatePhotoInput" class="btn-secondary" style="display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 600;">
                  <span class="material-icons-round" style="font-size: 18px;">photo_camera</span>
                  <span id="tsPhotoLabel">Take / Upload Photo</span>
                </label>
                <input type="file" id="tsCreatePhotoInput" accept="image/*" capture="environment" style="display: none;">
              </div>
            </div>

            <div class="form-modal-footer-actions" style="margin-top: 24px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn-secondary" id="tsCreateCancelBtn">Cancel</button>
              <button type="button" id="tsCreateSubmitBtn" class="btn-primary" style="display: flex; align-items: center; gap: 6px;">
                <span class="material-icons-round" style="font-size: 18px;">send</span>
                <span>Submit Ticket</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Inputs
    const productFieldWrapper = overlay.querySelector('#tsProductFieldWrapper');
    const selectedSkuInput = overlay.querySelector('#tsSelectedSku');
    const productTrigger = overlay.querySelector('#tsProductTrigger');
    const productTriggerText = overlay.querySelector('#tsProductTriggerText');

    const checkerLineInput = overlay.querySelector('#tsCreateCheckerLine');
    const checkerLineTrigger = overlay.querySelector('#tsCheckerLineTrigger');
    const checkerLineTriggerText = overlay.querySelector('#tsCheckerLineTriggerText');

    const reasonInput = overlay.querySelector('#tsCreateReason');
    const reasonTrigger = overlay.querySelector('#tsReasonTrigger');
    const reasonTriggerText = overlay.querySelector('#tsReasonTriggerText');

    // State
    let soData = null;
    let currentSoMatchingItems = [];
    let photoBase64 = '';

    // Close
    overlay.querySelector('#tsCreateCloseBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#tsCreateCancelBtn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Product selection trigger
    if (productTrigger) {
      productTrigger.addEventListener('click', () => {
        openProductChipModal();
      });
    }

    // Checker Line selection modal
    if (checkerLineTrigger) {
      checkerLineTrigger.addEventListener('click', () => {
        openCheckerLineChipModal();
      });
    }

    // Reason selection modal
    if (reasonTrigger) {
      reasonTrigger.addEventListener('click', () => {
        openReasonChipModal();
      });
    }

    function selectProduct(item) {
      soData = item;
      selectedSkuInput.value = item.skuNumber;
      productTriggerText.className = 'hybrid-select-value';
      productTriggerText.innerHTML = `<span class="material-icons-round" style="font-size: 16px;">inventory_2</span><strong>${escapeHtml(item.skuNumber)}</strong> - ${escapeHtml(item.productName)}`;

      document.getElementById('tsAutoSku').textContent = item.skuNumber || '-';
      document.getElementById('tsAutoProduct').textContent = item.productName || '-';
      document.getElementById('tsAutoRack').textContent = item.originRackName || '-';
      document.getElementById('tsAutoQty').textContent = item.requestQty || '-';
      document.getElementById('tsAutoWave').textContent = item.wave || '-';
      document.getElementById('tsAutoPicker').textContent = item.pickerName || '-';
      document.getElementById('tsCreateAutoFields').style.display = 'block';
    }

    function openProductChipModal() {
      if (!currentSoMatchingItems || currentSoMatchingItems.length === 0) {
        return alert('Please enter or scan a valid SO Number first.');
      }

      const chipModal = document.createElement('div');
      chipModal.className = 'modal-overlay hybrid-chip-modal-overlay';
      chipModal.style.cssText = 'z-index: 6000 !important;';

      chipModal.innerHTML = `
        <div class="modal-card hybrid-chip-modal-card" style="max-width: 500px;">
          <div class="form-modal-header">
            <h3>
              <span class="material-icons-round" style="color: var(--primary-600);">inventory_2</span>
              Select Product (${currentSoMatchingItems.length} item${currentSoMatchingItems.length > 1 ? 's' : ''} on SO)
            </h3>
            <button class="form-modal-close-btn" id="closeProductModalBtn">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="hybrid-chip-search-bar">
            <div style="position: relative;">
              <input 
                type="text" 
                id="productSearchInput" 
                class="text-control" 
                placeholder="Search SKU or Product name..." 
                style="padding-left: 36px;"
              />
              <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
            </div>
          </div>

          <div class="hybrid-chip-container" style="display: flex; flex-direction: column; gap: 8px;">
            <div id="modalProductList"></div>
          </div>
        </div>
      `;

      document.body.appendChild(chipModal);

      const searchInput = chipModal.querySelector('#productSearchInput');
      const listEl = chipModal.querySelector('#modalProductList');
      const closeChipModalBtn = chipModal.querySelector('#closeProductModalBtn');

      const closeChipModal = () => chipModal.remove();
      closeChipModalBtn.addEventListener('click', closeChipModal);
      chipModal.addEventListener('click', (e) => {
        if (e.target === chipModal) closeChipModal();
      });

      function renderProductOptions(query) {
        const q = (query || '').toLowerCase();
        const filtered = currentSoMatchingItems.filter(item => 
          !q || item.skuNumber.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q)
        );

        if (!filtered.length) {
          listEl.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No matching products found on this SO</div>`;
          return;
        }

        listEl.innerHTML = filtered.map(item => {
          const isSelected = soData && soData.skuNumber === item.skuNumber;
          return `
            <div class="ts-product-select-card" data-sku="${escapeHtml(item.skuNumber)}" style="border: 1.5px solid ${isSelected ? 'var(--primary-600)' : 'var(--border-light)'}; background: ${isSelected ? 'var(--primary-50)' : '#ffffff'}; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: var(--primary-700); font-size: 13px;">SKU: ${escapeHtml(item.skuNumber)}</span>
                <span style="font-size: 11px; font-weight: 700; background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 6px;">Qty: ${escapeHtml(item.requestQty || 1)}</span>
              </div>
              <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${escapeHtml(item.productName)}</div>
              <div style="font-size: 11px; color: var(--text-secondary); display: flex; justify-content: space-between; margin-top: 2px;">
                <span>Rack: <strong>${escapeHtml(item.originRackName || '-')}</strong></span>
                <span>Picker: <strong>${escapeHtml(item.pickerName || 'N/A')}</strong></span>
              </div>
            </div>
          `;
        }).join('');

        listEl.querySelectorAll('.ts-product-select-card').forEach(card => {
          card.addEventListener('click', () => {
            const sku = card.dataset.sku;
            const chosen = currentSoMatchingItems.find(it => it.skuNumber === sku);
            if (chosen) {
              selectProduct(chosen);
            }
            closeChipModal();
          });
        });
      }

      searchInput.addEventListener('input', (e) => {
        renderProductOptions(e.target.value.trim());
      });

      renderProductOptions('');
    }

    function openCheckerLineChipModal() {
      const chipModal = document.createElement('div');
      chipModal.className = 'modal-overlay hybrid-chip-modal-overlay';
      chipModal.style.cssText = 'z-index: 6000 !important;';

      chipModal.innerHTML = `
        <div class="modal-card hybrid-chip-modal-card">
          <div class="form-modal-header">
            <h3>
              <span class="material-icons-round" style="color: var(--primary-600);">view_timeline</span>
              Select Checker Line
            </h3>
            <button class="form-modal-close-btn" id="closeCheckerLineModalBtn">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="hybrid-chip-search-bar">
            <div style="position: relative;">
              <input 
                type="text" 
                id="checkerLineSearchInput" 
                class="text-control" 
                placeholder="Search Checker Line..." 
                style="padding-left: 36px;"
              />
              <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
            </div>
          </div>

          <div class="hybrid-chip-container">
            <div class="button-chip-grid" id="modalCheckerLineGrid"></div>
          </div>
        </div>
      `;

      document.body.appendChild(chipModal);

      const searchInput = chipModal.querySelector('#checkerLineSearchInput');
      const grid = chipModal.querySelector('#modalCheckerLineGrid');
      const closeChipModalBtn = chipModal.querySelector('#closeCheckerLineModalBtn');

      const closeChipModal = () => chipModal.remove();
      closeChipModalBtn.addEventListener('click', closeChipModal);
      chipModal.addEventListener('click', (e) => {
        if (e.target === chipModal) closeChipModal();
      });

      function renderChips(query) {
        const filtered = checkerLinesList.filter(l => 
          !query || l.lineName.toLowerCase().includes(query.toLowerCase())
        );

        if (!filtered.length) {
          grid.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No matching line found</div>`;
          return;
        }

        grid.innerHTML = filtered.map(l => {
          const isSelected = l.lineName === selectedCheckerLine;
          return `
            <button type="button" class="button-chip ${isSelected ? 'active' : ''}" data-line="${escapeHtml(l.lineName)}">
              <span class="material-icons-round">${isSelected ? 'check_circle' : 'view_timeline'}</span>
              <span>${escapeHtml(l.lineName)}</span>
            </button>
          `;
        }).join('');

        grid.querySelectorAll('.button-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedCheckerLine = btn.dataset.line;
            savedCheckerLine = selectedCheckerLine;
            if (checkerLineInput) checkerLineInput.value = selectedCheckerLine;
            localStorage.setItem(storageKey, selectedCheckerLine);

            if (checkerLineTriggerText) {
              checkerLineTriggerText.className = 'hybrid-select-value';
              checkerLineTriggerText.innerHTML = `<span class="material-icons-round" style="font-size: 16px;">view_timeline</span>${escapeHtml(selectedCheckerLine)}`;
            }

            closeChipModal();
          });
        });
      }

      searchInput.addEventListener('input', (e) => {
        renderChips(e.target.value.trim());
      });

      renderChips('');
    }

    function openReasonChipModal() {
      const reasonsList = ["Bad Item", "Wrong Picking", "Missing Item"];
      const chipModal = document.createElement('div');
      chipModal.className = 'modal-overlay hybrid-chip-modal-overlay';
      chipModal.style.cssText = 'z-index: 6000 !important;';

      chipModal.innerHTML = `
        <div class="modal-card hybrid-chip-modal-card">
          <div class="form-modal-header">
            <h3>
              <span class="material-icons-round" style="color: var(--primary-600);">confirmation_number</span>
              Select Reason
            </h3>
            <button class="form-modal-close-btn" id="closeReasonModalBtn">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="hybrid-chip-container">
            <div class="button-chip-grid" id="modalReasonGrid"></div>
          </div>
        </div>
      `;

      document.body.appendChild(chipModal);

      const grid = chipModal.querySelector('#modalReasonGrid');
      const closeChipModalBtn = chipModal.querySelector('#closeReasonModalBtn');

      const closeChipModal = () => chipModal.remove();
      closeChipModalBtn.addEventListener('click', closeChipModal);
      chipModal.addEventListener('click', (e) => {
        if (e.target === chipModal) closeChipModal();
      });

      function renderChips() {
        grid.innerHTML = reasonsList.map(r => {
          const isSelected = r === selectedReason;
          return `
            <button type="button" class="button-chip ${isSelected ? 'active' : ''}" data-reason="${escapeHtml(r)}">
              <span class="material-icons-round">${isSelected ? 'check_circle' : 'help_outline'}</span>
              <span>${escapeHtml(r)}</span>
            </button>
          `;
        }).join('');

        grid.querySelectorAll('.button-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedReason = btn.dataset.reason;
            if (reasonInput) reasonInput.value = selectedReason;

            if (reasonTriggerText) {
              reasonTriggerText.className = 'hybrid-select-value';
              reasonTriggerText.innerHTML = `<span class="material-icons-round" style="font-size: 16px;">help_outline</span>${escapeHtml(selectedReason)}`;
            }

            closeChipModal();
          });
        });
      }

      renderChips();
    }

    // SO Custom Dropdown Elements
    const soDropdownContainer = overlay.querySelector('#tsSoDropdownContainer');
    const soInput = overlay.querySelector('#tsCreateSoNumber');
    const soToggleBtn = overlay.querySelector('#tsSoDropdownToggleBtn');
    const soMenu = overlay.querySelector('#tsSoDropdownMenu');
    const scanSoBtn = overlay.querySelector('#tsCreateScanSoBtn');

    function getUniqueSoList() {
      const map = new Map();
      const list = [];
      (db.soList || []).forEach(item => {
        if (!item || !item.soNumber) return;
        const key = item.soNumber.toLowerCase().trim();
        if (!map.has(key)) {
          const entry = {
            soNumber: item.soNumber.trim(),
            pickerName: item.pickerName || '',
            wave: item.wave || '',
            firstProduct: item.productName || '',
            itemCount: 1,
            items: [item]
          };
          map.set(key, entry);
          list.push(entry);
        } else {
          const entry = map.get(key);
          entry.itemCount++;
          entry.items.push(item);
          if (!entry.pickerName && item.pickerName) entry.pickerName = item.pickerName;
          if (!entry.wave && item.wave) entry.wave = item.wave;
        }
      });
      return list;
    }

    function renderSoDropdown(query = '') {
      const uniqueSos = getUniqueSoList();
      const q = (query || '').toLowerCase().trim();
      const filtered = uniqueSos.filter(so => {
        if (!q) return true;
        return (
          so.soNumber.toLowerCase().includes(q) ||
          so.pickerName.toLowerCase().includes(q) ||
          so.wave.toLowerCase().includes(q) ||
          (so.firstProduct && so.firstProduct.toLowerCase().includes(q))
        );
      });

      if (!filtered.length) {
        soMenu.innerHTML = `
          <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 12px;">
            No matching SO numbers found
          </div>
        `;
        return;
      }

      soMenu.innerHTML = filtered.map(item => {
        const isSelected = soInput.value.trim().toLowerCase() === item.soNumber.toLowerCase();
        return `
          <div class="custom-dropdown-option ${isSelected ? 'active' : ''}" data-so="${escapeHtml(item.soNumber)}" style="display: flex; flex-direction: column; gap: 3px; padding: 8px 12px; cursor: pointer; border-radius: 8px; margin-bottom: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; color: var(--primary-700); font-size: 13px;">${escapeHtml(item.soNumber)}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                ${item.wave ? `<span style="font-size: 10px; font-weight: 700; background: var(--primary-50); color: var(--primary-700); padding: 1px 6px; border-radius: 4px; border: 1px solid var(--primary-200);">Wave: ${escapeHtml(item.wave)}</span>` : ''}
                <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px;">${item.itemCount} item${item.itemCount > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
              <span>Picker: <strong style="color: var(--text-primary);">${escapeHtml(item.pickerName || 'N/A')}</strong></span>
              ${item.firstProduct ? `<span style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; color: var(--text-muted);">${escapeHtml(item.firstProduct)}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      soMenu.querySelectorAll('.custom-dropdown-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const chosenSo = opt.dataset.so;
          soInput.value = chosenSo;
          closeSoDropdown();
          lookupSo(chosenSo);
        });
      });
    }

    function openSoDropdown() {
      renderSoDropdown(soInput.value);
      soDropdownContainer.classList.add('open');
    }

    function closeSoDropdown() {
      soDropdownContainer.classList.remove('open');
    }

    function toggleSoDropdown() {
      if (soDropdownContainer.classList.contains('open')) {
        closeSoDropdown();
      } else {
        openSoDropdown();
      }
    }

    // Toggle dropdown button
    if (soToggleBtn) {
      soToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSoDropdown();
        if (soDropdownContainer.classList.contains('open')) {
          soInput.focus();
        }
      });
    }

    // Scan SO
    if (scanSoBtn) {
      scanSoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeSoDropdown();
        openCameraScanner((scannedText) => {
          soInput.value = scannedText;
          closeSoDropdown();
          lookupSo(scannedText);
        });
      });
    }

    // Focus & Click handlers
    soInput.addEventListener('focus', () => {
      openSoDropdown();
    });

    soInput.addEventListener('click', (e) => {
      e.stopPropagation();
      openSoDropdown();
    });

    // Keyboard support
    soInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        closeSoDropdown();
        lookupSo(soInput.value.trim());
      } else if (e.key === 'Escape') {
        closeSoDropdown();
      }
    });

    // SO Number manual entry & real-time search
    let soDebounce = null;
    soInput.addEventListener('input', () => {
      renderSoDropdown(soInput.value);
      if (!soDropdownContainer.classList.contains('open')) {
        soDropdownContainer.classList.add('open');
      }
      clearTimeout(soDebounce);
      soDebounce = setTimeout(() => lookupSo(soInput.value.trim()), 400);
    });

    // Close dropdown on click outside
    overlay.addEventListener('click', (e) => {
      if (soDropdownContainer && !soDropdownContainer.contains(e.target)) {
        closeSoDropdown();
      }
    });

    function lookupSo(soNumber) {
      if (!soNumber) {
        productFieldWrapper.style.display = 'none';
        document.getElementById('tsCreateAutoFields').style.display = 'none';
        soData = null;
        currentSoMatchingItems = [];
        return;
      }

      currentSoMatchingItems = db.soList.filter(s => s.soNumber.toLowerCase() === soNumber.toLowerCase());

      if (currentSoMatchingItems.length === 0) {
        productFieldWrapper.style.display = 'none';
        document.getElementById('tsCreateAutoFields').style.display = 'none';
        soData = null;
        return;
      }

      productFieldWrapper.style.display = 'block';

      if (currentSoMatchingItems.length === 1) {
        selectProduct(currentSoMatchingItems[0]);
      } else {
        // Multiple products on SO: reset selection and open modal
        soData = null;
        selectedSkuInput.value = '';
        productTriggerText.className = 'hybrid-select-placeholder';
        productTriggerText.textContent = `Select from ${currentSoMatchingItems.length} Products on SO...`;
        document.getElementById('tsCreateAutoFields').style.display = 'none';
        openProductChipModal();
      }
    }

    // Photo capture
    overlay.querySelector('#tsCreatePhotoInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          photoBase64 = ev.target.result;
          const preview = document.getElementById('tsPhotoPreview');
          const previewArea = document.getElementById('tsPhotoPreviewArea');
          preview.src = photoBase64;
          previewArea.style.display = 'block';
          document.getElementById('tsPhotoLabel').textContent = 'Change Photo';
        };
        reader.readAsDataURL(file);
      }
    });

    // Submit
    overlay.querySelector('#tsCreateSubmitBtn').addEventListener('click', async () => {
      const soNumber = soInput.value.trim();
      const reason = reasonInput.value;

      // Validation
      if (!soNumber) return alert('SO Number is required');
      if (!soData) return alert('Please select a product from the SO Number.');
      if (!reason) return alert('Reason is required');
      if (isPicker && !photoBase64) return alert('Photo is required for Picker role');

      const submitBtn = overlay.querySelector('#tsCreateSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-round spin" style="font-size: 18px;">sync</span> Submitting...';

      try {
        const checkerLine = !isPicker ? (checkerLineInput?.value || '') : '';

        const ticketData = {
          soNumber,
          skuNumber: soData.skuNumber,
          productName: soData.productName,
          originRackName: soData.originRackName,
          requestQuantity: soData.requestQty,
          pickerName: soData.pickerName,
          wave: soData.wave || '',
          reason,
          checkerLine,
          photo: '' // Will be uploaded separately
        };

        const ticket = await db.createTroubleShootTicket(ticketData, currentUser);

        // Upload photo if provided
        if (photoBase64) {
          try {
            await db.uploadTroubleShootPhoto(photoBase64, `${ticket.id}_request.jpg`, ticket.id, 'photo');
          } catch (photoErr) {
            console.error('Photo upload failed:', photoErr);
          }
        }

        overlay.remove();
        renderList();
      } catch (err) {
        alert('Failed to create ticket: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="material-icons-round" style="font-size: 18px;">send</span> Submit Ticket';
      }
    });
  }

  // Initial render
  renderList();

  // Listen for data updates
  const unsub = db.subscribe(() => renderList());
}

// ── Helpers ──

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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

