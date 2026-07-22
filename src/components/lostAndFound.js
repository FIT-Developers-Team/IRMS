import { db } from '../data/db.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';
import { showAlertModal } from '../utils/alert.js';

export function renderLostAndFound(container, currentUser) {
  let searchQuery = '';
  const zonesList = db.getZones();

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">travel_explore</span>
            My Lost & Found Entries
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">
            Private log for <strong>${escapeHtml(currentUser.name)}</strong> (Staff ID: ${currentUser.staffId})
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);" id="lfCountBadge">0 entries</span>
          <button id="openNewLfModalBtn" class="btn-primary">
            <span class="material-icons-round">add</span>
            <span>New Lost & Found Entry</span>
          </button>
        </div>
      </div>

      <div class="filter-toolbar" style="margin-top: 16px;">
        <div class="search-box-wrapper" style="width: 100%; position: relative;">
          <input 
            type="text" 
            id="lfSearchInput" 
            class="text-control" 
            placeholder="Search Ticket ID, SKU Code, or Rack Location..." 
            style="padding-left: 36px;"
          />
          <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
        </div>
      </div>

      <div class="data-table-wrapper" style="margin-top: 12px;">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Timestamp</th>
              <th>BTI Staff</th>
              <th>SKU / Item Details</th>
              <th>Qty</th>
              <th>Found At</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="lfTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const lfCountBadge = container.querySelector('#lfCountBadge');
  const lfSearchInput = container.querySelector('#lfSearchInput');
  const lfTableBody = container.querySelector('#lfTableBody');
  const openNewLfModalBtn = container.querySelector('#openNewLfModalBtn');

  // Table rendering
  function renderTable() {
    let entries = db.getLostAndFoundForUser(currentUser);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      entries = entries.filter(e => 
        (e.ticketId || '').toLowerCase().includes(q) ||
        (e.skuCode || '').toLowerCase().includes(q) ||
        (e.foundAt || '').toLowerCase().includes(q)
      );
    }

    lfCountBadge.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;

    if (!entries.length) {
      lfTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <span class="material-icons-round">travel_explore</span>
              <p>No Lost & Found entries submitted by <strong>${escapeHtml(currentUser.name)}</strong> yet.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    lfTableBody.innerHTML = entries.map(entry => `
      <tr>
        <td><strong style="color: var(--primary-700); font-family: monospace;">#${entry.ticketId}</strong></td>
        <td style="font-size: 12px; color: var(--text-secondary);">${new Date(entry.timestamp).toLocaleString()}</td>
        <td><strong>${escapeHtml(entry.btiStaff)}</strong></td>
        <td>
          <span style="font-weight: 700; color: var(--primary-600); font-family: monospace; font-size: 13px; display: block;">SKU: ${escapeHtml(entry.skuCode)}</span>
          <span style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(entry.productName || 'N/A')}</span>
        </td>
        <td><strong style="font-size: 14px;">${entry.qty}</strong></td>
        <td><span class="location-badge" style="font-weight: 700; font-family: monospace; font-size: 12px; color: var(--primary-800); background: var(--primary-50); padding: 4px 8px; border-radius: 6px;">${escapeHtml(entry.foundAt)}</span></td>
        <td><span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">${escapeHtml(entry.reason || '-')}</span></td>
        <td><span class="status-badge pending">${entry.status}</span></td>
      </tr>
    `).join('');
  }

  lfSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  // Open Modal Handler
  function openLostAndFoundModal() {
    let selectedZone = '';
    let selectedReason = '';

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'lostAndFoundFormModal';

    const nextId = '#LF-' + Math.floor(100000 + Math.random() * 900000);

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card">
        <div class="form-modal-header">
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">travel_explore</span>
            Create Lost & Found Entry
          </h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="unique-id-chip">${nextId}</span>
            <button class="form-modal-close-btn" id="closeLfModalBtn" title="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        </div>

        <div class="form-modal-body">
          <form id="lostAndFoundForm" autocomplete="off" onsubmit="return false;">
            <div class="form-grid">
              <!-- BTI Staff (Logged-in User) -->
              <div class="form-field-wrapper">
                <label class="form-label">BTI Staff (System)</label>
                <input 
                  type="text" 
                  class="text-control read-only-control" 
                  value="${escapeHtml(currentUser.name)}" 
                  readonly 
                />
              </div>

              <!-- SKU Code -->
              <div class="form-field-wrapper">
                <label class="form-label">SKU Code (User Input)</label>
                <input 
                  type="text" 
                  id="lfSkuInput" 
                  class="text-control" 
                  placeholder="Enter SKU Code (e.g. 10000000004093)..." 
                  required
                />
                <span id="lfSkuPreview" style="font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-top: 4px; display: block; min-height: 16px;"></span>
              </div>

              <!-- Quantity Input -->
              <div class="form-field-wrapper">
                <label class="form-label">Quantity</label>
                <input 
                  type="number" 
                  id="lfQtyInput" 
                  class="text-control" 
                  min="1" 
                  value="1" 
                  required 
                />
              </div>

              <!-- Zone Selection (Hybrid Dropdown + Chip Selection Modal) -->
              <div class="form-field-wrapper span-full">
                <label class="form-label">Zone (Select Zone)</label>
                <input type="hidden" id="lfZoneInput" required />
                <div class="hybrid-select-trigger" id="zoneTrigger">
                  <span id="zoneTriggerText" class="hybrid-select-placeholder">Select Zone...</span>
                  <span class="material-icons-round" style="color: var(--text-muted); font-size: 20px;">open_in_new</span>
                </div>
              </div>

              <!-- Reason Selection (Inline Segmented Button Chips) -->
              <div class="form-field-wrapper span-full">
                <label class="form-label">Reason (Select One)</label>
                <input type="hidden" id="lfReasonInput" required />
                <div class="button-chip-grid" id="reasonChipGrid">
                  <button type="button" class="button-chip" data-reason="Sloc Mismatch">
                    <span class="material-icons-round">sync_alt</span>
                    <span>Sloc Mismatch</span>
                  </button>
                  <button type="button" class="button-chip" data-reason="Damaged Item">
                    <span class="material-icons-round">inventory_2</span>
                    <span>Damaged Item</span>
                  </button>
                  <button type="button" class="button-chip" data-reason="Unknown Location">
                    <span class="material-icons-round">location_off</span>
                    <span>Unknown Location</span>
                  </button>
                  <button type="button" class="button-chip" data-reason="Excess Item">
                    <span class="material-icons-round">add_circle_outline</span>
                    <span>Excess Item</span>
                  </button>
                </div>
              </div>

              <!-- Found At -->
              <div class="form-field-wrapper span-full" id="foundAtWrapper">
                <label class="form-label">Found At (Location Code - Must contain selected Zone)</label>
                <input 
                  type="text" 
                  id="lfFoundAtInput" 
                  class="text-control" 
                  placeholder="Enter location code (e.g. CBT-MZF3-35-03)..." 
                />
              </div>
            </div>

            <div class="form-modal-footer-actions" style="margin-top: 24px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn-secondary" id="cancelLfModalBtn">Cancel</button>
              <button type="submit" id="submitLfBtn" class="btn-primary">
                <span class="material-icons-round">post_add</span>
                <span>Submit Entry</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeBtn = modalOverlay.querySelector('#closeLfModalBtn');
    const cancelBtn = modalOverlay.querySelector('#cancelLfModalBtn');
    const lostAndFoundForm = modalOverlay.querySelector('#lostAndFoundForm');
    const submitLfBtn = modalOverlay.querySelector('#submitLfBtn');

    const lfSkuInput = modalOverlay.querySelector('#lfSkuInput');
    const lfSkuPreview = modalOverlay.querySelector('#lfSkuPreview');
    const lfQtyInput = modalOverlay.querySelector('#lfQtyInput');
    const lfZoneInput = modalOverlay.querySelector('#lfZoneInput');
    const zoneTrigger = modalOverlay.querySelector('#zoneTrigger');
    const zoneTriggerText = modalOverlay.querySelector('#zoneTriggerText');

    const lfReasonInput = modalOverlay.querySelector('#lfReasonInput');
    const reasonChips = modalOverlay.querySelectorAll('#reasonChipGrid .button-chip');
    const foundAtWrapper = modalOverlay.querySelector('#foundAtWrapper');
    const lfFoundAtInput = modalOverlay.querySelector('#lfFoundAtInput');

    const closeModal = () => modalOverlay.remove();
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    lfSkuInput.addEventListener('input', () => {
      const skuVal = lfSkuInput.value.trim();
      if (skuVal) {
        const name = db.lookupProductName(skuVal);
        if (name) {
          lfSkuPreview.textContent = `Product Name: ${name}`;
          lfSkuPreview.style.color = 'var(--success)';
        } else {
          lfSkuPreview.textContent = 'SKU not found in database';
          lfSkuPreview.style.color = 'var(--warning)';
        }
      } else {
        lfSkuPreview.textContent = '';
      }
    });

    // Zone Hybrid Chip Modal Handler
    function openZoneChipModal() {
      const chipModal = document.createElement('div');
      chipModal.className = 'modal-overlay hybrid-chip-modal-overlay';
      chipModal.style.zIndex = '3500';

      chipModal.innerHTML = `
        <div class="modal-card hybrid-chip-modal-card">
          <div class="form-modal-header">
            <h3>
              <span class="material-icons-round" style="color: var(--primary-600);">grid_view</span>
              Select Zone
            </h3>
            <button class="form-modal-close-btn" id="closeZoneModalBtn">
              <span class="material-icons-round">close</span>
            </button>
          </div>

          <div class="hybrid-chip-search-bar">
            <div style="position: relative;">
              <input 
                type="text" 
                id="zoneSearchInput" 
                class="text-control" 
                placeholder="Search Zone..." 
                style="padding-left: 36px;"
              />
              <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
            </div>
          </div>

          <div class="hybrid-chip-container">
            <div class="button-chip-grid" id="modalZoneGrid"></div>
          </div>
        </div>
      `;

      document.body.appendChild(chipModal);

      const searchInput = chipModal.querySelector('#zoneSearchInput');
      const grid = chipModal.querySelector('#modalZoneGrid');
      const closeChipModalBtn = chipModal.querySelector('#closeZoneModalBtn');

      const closeChipModal = () => chipModal.remove();
      closeChipModalBtn.addEventListener('click', closeChipModal);
      chipModal.addEventListener('click', (e) => {
        if (e.target === chipModal) closeChipModal();
      });

      function renderChips(query) {
        const filtered = zonesList.filter(z => 
          !query || z.zoneName.toLowerCase().includes(query.toLowerCase())
        );

        if (!filtered.length) {
          grid.innerHTML = `<div style="color: var(--text-muted); font-size: 13px;">No matching zone found</div>`;
          return;
        }

        grid.innerHTML = filtered.map(z => {
          const isSelected = z.zoneName === selectedZone;
          return `
            <button type="button" class="button-chip ${isSelected ? 'active' : ''}" data-zone="${escapeHtml(z.zoneName)}">
              <span class="material-icons-round">${isSelected ? 'check_circle' : 'grid_view'}</span>
              <span>${escapeHtml(z.zoneName)}</span>
            </button>
          `;
        }).join('');

        grid.querySelectorAll('.button-chip').forEach(btn => {
          btn.addEventListener('click', () => {
            selectedZone = btn.dataset.zone;
            lfZoneInput.value = selectedZone;

            zoneTriggerText.className = 'hybrid-select-value';
            zoneTriggerText.innerHTML = `<span class="material-icons-round" style="font-size: 16px;">grid_view</span>${escapeHtml(selectedZone)}`;

            closeChipModal();
          });
        });
      }

      renderChips('');
      searchInput.addEventListener('input', (e) => renderChips(e.target.value.trim()));
      searchInput.focus();
    }

    zoneTrigger.addEventListener('click', openZoneChipModal);

    reasonChips.forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.classList.contains('active')) {
          chip.classList.remove('active');
          selectedReason = '';
          lfReasonInput.value = '';
          foundAtWrapper.style.display = 'block';
        } else {
          reasonChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          selectedReason = chip.dataset.reason;
          lfReasonInput.value = selectedReason;

          const isUnknown = selectedReason.toLowerCase().includes('unkown') || selectedReason.toLowerCase().includes('unknown');
          if (isUnknown) {
            foundAtWrapper.style.display = 'none';
            lfFoundAtInput.value = '';
          } else {
            foundAtWrapper.style.display = 'block';
          }
        }
      });
    });

    lostAndFoundForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const zoneVal = lfZoneInput ? lfZoneInput.value.trim() : '';
      const skuVal = lfSkuInput.value.trim();
      const qtyVal = parseInt(lfQtyInput.value, 10);
      const reasonVal = lfReasonInput ? lfReasonInput.value.trim() : '';

      if (!zoneVal) {
        showAlertModal('Please select a Zone.', 'Zone Required');
        return;
      }

      if (!skuVal) {
        showAlertModal('Please enter a valid SKU Code.', 'SKU Required');
        lfSkuInput.focus();
        return;
      }

      if (isNaN(qtyVal) || qtyVal <= 0) {
        showAlertModal('Please enter a valid positive quantity.', 'Invalid Quantity');
        lfQtyInput.focus();
        return;
      }

      if (!reasonVal) {
        showAlertModal('Please select a Reason.', 'Reason Required');
        return;
      }

      const isUnknown = reasonVal.toLowerCase().includes('unkown') || reasonVal.toLowerCase().includes('unknown');
      let finalFoundAt = '';

      if (isUnknown) {
        finalFoundAt = `${zoneVal}-null`;
      } else {
        const foundAtText = lfFoundAtInput ? lfFoundAtInput.value.trim() : '';
        if (!foundAtText) {
          showAlertModal('Please enter a Found At location code.', 'Location Required');
          if (lfFoundAtInput) lfFoundAtInput.focus();
          return;
        }

        if (!foundAtText.toLowerCase().includes(zoneVal.toLowerCase())) {
          showAlertModal(`Found At location must contain the selected Zone ("${zoneVal}").`, 'Location Validation');
          if (lfFoundAtInput) lfFoundAtInput.focus();
          return;
        }

        finalFoundAt = foundAtText;
      }

      submitLfBtn.disabled = true;
      showBlockerLock('Submitting Lost & Found Entry to Google Sheets...');
      try {
        const newEntry = await db.saveLostAndFoundEntry({
          btiStaff: currentUser.name,
          skuCode: skuVal,
          qty: qtyVal,
          foundAt: finalFoundAt,
          reason: reasonVal
        });

        closeModal();
        renderTable();
        showToast(`Lost & Found entry #${newEntry.ticketId} submitted successfully!`);
      } finally {
        hideBlockerLock();
        submitLfBtn.disabled = false;
      }
    });
  }

  openNewLfModalBtn.addEventListener('click', openLostAndFoundModal);

  // Initial render
  renderTable();

  // Subscribe to DB updates
  const unsubscribe = db.subscribe(() => {
    renderTable();
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


