import { db } from '../data/db.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';

export function renderLostAndFound(container, currentUser) {
  let selectedRack = '';
  let searchQuery = '';

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">travel_explore</span>
            Lost & Found Entry
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">
            Create a new entry for items found in warehouse racks
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="unique-id-chip" id="autoLfIdPreview">AUTO-GEN</span>
        </div>
      </div>

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

          <!-- SKU Code (User Input) -->
          <div class="form-field-wrapper">
            <label class="form-label">SKU Code (User Input)</label>
            <input 
              type="text" 
              id="lfSkuInput" 
              class="text-control" 
              placeholder="Enter SKU Code (e.g. 10000000004093)..." 
              required
            />
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

          <!-- Found At (Interactive Rack Location Searchable Dropdown) -->
          <div class="form-field-wrapper span-full">
            <label class="form-label">Found At (Rack Location - Search / Select)</label>
            <div class="sku-dropdown-container">
              <input 
                type="text" 
                id="lfRackInput" 
                class="sku-search-input" 
                placeholder="Search or select Rack location (e.g. CBT-MZF3-35-03)..." 
                required
              />
              <span class="material-icons-round" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; font-size: 20px;">expand_more</span>
              <div class="sku-dropdown-menu" id="lfRackMenu" style="max-height: 240px; overflow-y: auto;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
          <button type="submit" id="submitLfBtn" class="btn-primary">
            <span class="material-icons-round">post_add</span>
            <span>Submit Entry</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Data Table Card -->
    <div class="card-panel" style="margin-top: 20px;">
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">list_alt</span>
            My Lost & Found Entries
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">
            Private log for <strong>${escapeHtml(currentUser.name)}</strong> (Staff ID: ${currentUser.staffId})
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);" id="lfCountBadge">0 entries</span>
        </div>
      </div>

      <div class="filter-toolbar" style="margin-top: 12px;">
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
              <th>SKU Code</th>
              <th>Qty</th>
              <th>Found At</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="lfTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const autoLfIdPreview = container.querySelector('#autoLfIdPreview');
  const lostAndFoundForm = container.querySelector('#lostAndFoundForm');
  const lfSkuInput = container.querySelector('#lfSkuInput');
  const lfRackInput = container.querySelector('#lfRackInput');
  const lfRackMenu = container.querySelector('#lfRackMenu');
  const lfQtyInput = container.querySelector('#lfQtyInput');
  const submitLfBtn = container.querySelector('#submitLfBtn');
  const lfCountBadge = container.querySelector('#lfCountBadge');
  const lfSearchInput = container.querySelector('#lfSearchInput');
  const lfTableBody = container.querySelector('#lfTableBody');

  // Preview initial auto-id
  function updateAutoIdPreview() {
    autoLfIdPreview.textContent = '#LF-' + Math.floor(100000 + Math.random() * 900000);
  }
  updateAutoIdPreview();

  // Render Rack Location dropdown menu
  function renderRackMenu(query) {
    const racks = db.searchRacks(query);
    if (!racks.length) {
      if (query.trim()) {
        lfRackMenu.innerHTML = `
          <div class="sku-item text-muted" style="padding: 10px 14px; font-size: 12px;">
            No matching rack. Use custom input: <strong>"${escapeHtml(query)}"</strong>
          </div>
        `;
      } else {
        lfRackMenu.innerHTML = `
          <div class="sku-item text-muted" style="padding: 10px 14px; font-size: 12px;">
            No racks loaded. You can type custom Rack Location.
          </div>
        `;
      }
      lfRackMenu.classList.add('open');
      return;
    }

    lfRackMenu.innerHTML = racks.map(r => {
      const isSelected = r.rackName === selectedRack;
      return `
        <div class="sku-item ${isSelected ? 'selected' : ''}" data-rack="${escapeHtml(r.rackName)}" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer;">
          <span class="material-icons-round" style="font-size: 18px; color: var(--primary-600);">grid_view</span>
          <div style="flex: 1;">
            <span style="font-weight: 700; font-family: monospace; font-size: 13px; color: var(--primary-900); display: block;">${escapeHtml(r.rackName)}</span>
            <span style="font-size: 11px; color: var(--text-secondary);">Rack ID: ${escapeHtml(r.id || 'N/A')}</span>
          </div>
          ${isSelected ? '<span class="material-icons-round" style="color: var(--success); font-size: 18px;">check</span>' : ''}
        </div>
      `;
    }).join('');

    lfRackMenu.classList.add('open');

    lfRackMenu.querySelectorAll('.sku-item').forEach(el => {
      el.addEventListener('click', () => {
        if (!el.dataset.rack) return;
        selectedRack = el.dataset.rack;
        lfRackInput.value = selectedRack;
        lfRackMenu.classList.remove('open');
      });
    });
  }

  lfRackInput.addEventListener('focus', () => renderRackMenu(lfRackInput.value));
  lfRackInput.addEventListener('input', (e) => {
    selectedRack = e.target.value.trim();
    renderRackMenu(e.target.value);
  });

  document.addEventListener('click', (e) => {
    if (!lfRackInput.contains(e.target) && !lfRackMenu.contains(e.target)) {
      lfRackMenu.classList.remove('open');
    }
  });

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

    lfCountBadge.textContent = `${entries.length} entry${entries.length === 1 ? '' : 'ies'}`;

    if (!entries.length) {
      lfTableBody.innerHTML = `
        <tr>
          <td colspan="7">
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
        <td><span style="font-weight: 700; color: var(--primary-600); font-family: monospace; font-size: 13px;">${escapeHtml(entry.skuCode)}</span></td>
        <td><strong style="font-size: 14px;">${entry.qty}</strong></td>
        <td><span class="location-badge" style="font-weight: 700; font-family: monospace; font-size: 12px; color: var(--primary-800); background: var(--primary-50); padding: 4px 8px; border-radius: 6px;">${escapeHtml(entry.foundAt)}</span></td>
        <td><span class="status-badge pending">${entry.status}</span></td>
      </tr>
    `).join('');
  }

  lfSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  // Submit Handler
  lostAndFoundForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const skuVal = lfSkuInput.value.trim();
    const rackVal = lfRackInput.value.trim();
    const qtyVal = parseInt(lfQtyInput.value, 10);

    if (!skuVal) {
      alert('Please enter a valid SKU Code.');
      lfSkuInput.focus();
      return;
    }

    if (!rackVal) {
      alert('Please select or enter a Rack location.');
      lfRackInput.focus();
      return;
    }

    if (isNaN(qtyVal) || qtyVal <= 0) {
      alert('Please enter a valid positive quantity.');
      lfQtyInput.focus();
      return;
    }

    submitLfBtn.disabled = true;
    showBlockerLock('Submitting Lost & Found Entry to Google Sheets...');
    try {
      const newEntry = await db.saveLostAndFoundEntry({
        btiStaff: currentUser.name,
        skuCode: skuVal,
        qty: qtyVal,
        foundAt: rackVal
      });

      // Reset form
      lfSkuInput.value = '';
      lfRackInput.value = '';
      lfQtyInput.value = '1';
      selectedRack = '';
      updateAutoIdPreview();

      renderTable();
      showToast(`Lost & Found entry #${newEntry.ticketId} submitted successfully!`);
    } finally {
      hideBlockerLock();
      submitLfBtn.disabled = false;
    }
  });

  // Subscribe to DB updates
  const unsubscribe = db.subscribe(() => {
    renderTable();
  });

  // Initial render
  renderTable();
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="material-icons-round" style="color: var(--success);">check_circle</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
