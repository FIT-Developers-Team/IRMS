import { db } from '../data/db.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';

export function renderRequestPickup(container, currentUser) {
  let selectedSoNumber = '';
  let selectedPickerName = '';
  let selectedSku = null;

  const soList = db.getUniqueSoNumbers();

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group">
        <h3>
          <span class="material-icons-round" style="color: var(--primary-600);">local_shipping</span>
          Request Pickup Form
        </h3>
        <div style="display: flex; gap: 10px; align-items: center;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);">Next ID:</span>
          <span class="unique-id-chip" id="autoIdPreview">AUTO-GEN</span>
        </div>
      </div>

      <form id="requestForm" autocomplete="off" onsubmit="return false;">
        <div class="form-grid">
          <!-- Checker Name (Logged-in User) -->
          <div class="form-field-wrapper">
            <label class="form-label">Checker Name (System)</label>
            <input 
              type="text" 
              class="text-control read-only-control" 
              value="${currentUser.name}" 
              readonly 
            />
          </div>

          <!-- SO Number (User Input + Custom 10-row Scrollable Dropdown) -->
          <div class="form-field-wrapper">
            <label class="form-label">SO Number (User Input / Select)</label>
            <div class="sku-dropdown-container">
              <input 
                type="text" 
                id="soInput" 
                class="sku-search-input" 
                placeholder="Type or select SO number..." 
                required
              />
              <div class="sku-dropdown-menu" id="soMenu"></div>
            </div>
          </div>

          <!-- Picker Name (Auto-filled or User Input) -->
          <div class="form-field-wrapper">
            <label class="form-label">Picker Name</label>
            <input 
              type="text" 
              id="pickerNameInput" 
              class="text-control" 
              placeholder="Auto-filled or type picker name..." 
            />
          </div>

          <!-- Product Detail Searchable Dropdown (Disabled when SO Number is blank) -->
          <div class="form-field-wrapper" style="grid-column: span 2;">
            <label class="form-label">Product Detail (Searchable SKU + Name)</label>
            <div class="sku-dropdown-container">
              <input 
                type="text" 
                id="skuSearchInput" 
                class="sku-search-input" 
                placeholder="Please enter or select SO Number first..." 
                disabled
                required
              />
              <div class="sku-dropdown-menu" id="skuMenu"></div>
            </div>
            <div id="selectedSkuDisplay" style="margin-top: 6px;"></div>
          </div>

          <!-- Quantity Input -->
          <div class="form-field-wrapper">
            <label class="form-label">Quantity</label>
            <input 
              type="number" 
              id="qtyInput" 
              class="text-control" 
              min="1" 
              value="1" 
              required 
            />
          </div>
        </div>

        <button type="submit" id="submitRequestBtn" class="btn-primary" style="margin-top: 24px; max-width: 240px;">
          <span class="material-icons-round">post_add</span>
          <span>Submit Request</span>
        </button>
      </form>
    </div>

    <!-- Recent Requests Table (Private to Logged-in User) -->
    <div class="card-panel">
      <div class="card-title-group">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">lock</span>
            My Pickup Requests
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">Private log for <strong>${currentUser.name}</strong> (Staff ID: ${currentUser.staffId})</span>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);" id="requestCountBadge">0 requests</span>
        </div>
      </div>
      <div class="data-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Unique ID</th>
              <th>Timestamp</th>
              <th>SO Number</th>
              <th>Picker Name</th>
              <th>Checker</th>
              <th>SKU / Product</th>
              <th>Qty</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="requestTableBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const soInput = container.querySelector('#soInput');
  const soMenu = container.querySelector('#soMenu');
  const pickerNameInput = container.querySelector('#pickerNameInput');
  const skuSearchInput = container.querySelector('#skuSearchInput');
  const skuMenu = container.querySelector('#skuMenu');
  const selectedSkuDisplay = container.querySelector('#selectedSkuDisplay');
  const qtyInput = container.querySelector('#qtyInput');
  const requestForm = container.querySelector('#requestForm');
  const submitRequestBtn = container.querySelector('#submitRequestBtn');
  const requestTableBody = container.querySelector('#requestTableBody');
  const requestCountBadge = container.querySelector('#requestCountBadge');
  const autoIdPreview = container.querySelector('#autoIdPreview');

  // Preview initial auto-id
  autoIdPreview.textContent = '#RC-' + Math.floor(100000 + Math.random() * 900000);

  // Update SKU input enablement state based on SO number value
  function updateSkuEnablement() {
    const hasSo = !!soInput.value.trim();
    if (hasSo) {
      skuSearchInput.disabled = false;
      skuSearchInput.placeholder = "Search SKU number or Product name...";
    } else {
      skuSearchInput.disabled = true;
      skuSearchInput.placeholder = "Please enter or select SO Number first...";
      skuSearchInput.value = '';
      selectedSku = null;
      selectedSkuDisplay.innerHTML = '';
      skuMenu.classList.remove('open');
    }
  }

  // Render SO Dropdown (Max 10 rows visible, scrollable)
  function renderSoMenu(query) {
    const filtered = soList.filter(item => 
      !query || item.soNumber.toLowerCase().includes(query.toLowerCase())
    );

    if (!filtered.length) {
      soMenu.innerHTML = `<div class="sku-option-item" style="color: var(--text-muted);">No matching SO numbers</div>`;
      return;
    }

    soMenu.innerHTML = filtered.map(item => `
      <div class="sku-option-item" data-so="${item.soNumber}" data-picker="${escapeHtml(item.pickerName || '')}">
        <span class="sku-code-text">${item.soNumber}</span>
        <span class="sku-name-text">Picker: ${item.pickerName || 'N/A'}</span>
      </div>
    `).join('');

    soMenu.querySelectorAll('.sku-option-item').forEach(el => {
      el.addEventListener('click', () => {
        const so = el.dataset.so;
        const picker = el.dataset.picker;

        selectedSoNumber = so;
        soInput.value = so;

        if (picker) {
          selectedPickerName = picker;
          pickerNameInput.value = picker;
        }

        soMenu.classList.remove('open');
        updateSkuEnablement();
        renderSkuMenu(skuSearchInput.value);
      });
    });
  }

  soInput.addEventListener('focus', () => {
    renderSoMenu(soInput.value);
    soMenu.classList.add('open');
  });

  soInput.addEventListener('input', () => {
    selectedSoNumber = soInput.value.trim();
    renderSoMenu(selectedSoNumber);
    soMenu.classList.add('open');
    updateSkuEnablement();

    // Auto-fill picker if exact match
    const match = soList.find(item => item.soNumber.toLowerCase() === selectedSoNumber.toLowerCase());
    if (match && match.pickerName) {
      pickerNameInput.value = match.pickerName;
    }
  });

  pickerNameInput.addEventListener('input', () => {
    selectedPickerName = pickerNameInput.value.trim();
  });

  // SKU Search Dropdown Logic (Max 10 rows visible, scrollable)
  function renderSkuMenu(query) {
    if (!soInput.value.trim()) return;

    const products = db.searchProducts(query, selectedSoNumber);
    if (!products.length) {
      skuMenu.innerHTML = `<div class="sku-option-item" style="color: var(--text-muted);">No matching products found</div>`;
      return;
    }

    skuMenu.innerHTML = products.map(item => `
      <div class="sku-option-item" data-sku="${item.skuNumber}" data-name="${escapeHtml(item.productName)}">
        <span class="sku-code-text">SKU: ${item.skuNumber}</span>
        <span class="sku-name-text">${item.productName}</span>
      </div>
    `).join('');

    skuMenu.querySelectorAll('.sku-option-item').forEach(el => {
      el.addEventListener('click', () => {
        const skuNumber = el.dataset.sku;
        const productName = el.dataset.name;
        selectedSku = { skuNumber, productName };

        skuSearchInput.value = `${skuNumber} - ${productName}`;
        skuMenu.classList.remove('open');

        selectedSkuDisplay.innerHTML = `
          <div class="autofill-badge success">
            <span class="material-icons-round" style="font-size: 16px;">check_circle</span>
            <span>Selected: <strong>SKU ${skuNumber}</strong> (${productName})</span>
          </div>
        `;
      });
    });
  }

  skuSearchInput.addEventListener('focus', () => {
    if (!skuSearchInput.disabled) {
      renderSkuMenu(skuSearchInput.value);
      skuMenu.classList.add('open');
    }
  });

  skuSearchInput.addEventListener('input', () => {
    if (!skuSearchInput.disabled) {
      renderSkuMenu(skuSearchInput.value);
      skuMenu.classList.add('open');
    }
  });

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#soInput') && !e.target.closest('#soMenu')) {
      soMenu.classList.remove('open');
    }
    if (!e.target.closest('#skuSearchInput') && !e.target.closest('#skuMenu')) {
      skuMenu.classList.remove('open');
    }
  });

  // Render requests table PRIVATELY for logged-in user
  function refreshTable() {
    const userRequests = db.getPickupRequestsForUser(currentUser);
    requestCountBadge.textContent = `${userRequests.length} request(s)`;

    if (!userRequests.length) {
      requestTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <span class="material-icons-round">lock_clock</span>
              <p>No pickup requests submitted by <strong>${currentUser.name}</strong> yet.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    requestTableBody.innerHTML = userRequests.map(req => `
      <tr>
        <td><strong style="color: var(--primary-700); font-family: monospace;">#${req.ticketId || req.uniqueid}</strong></td>
        <td style="font-size: 12px; color: var(--text-secondary);">${new Date(req.timestamp).toLocaleString()}</td>
        <td style="font-size: 12px; font-weight: 600;">${req.soNumber}</td>
        <td>${req.pickerName || 'N/A'}</td>
        <td><strong>${req.checkerName}</strong></td>
        <td>
          <span style="font-weight: 700; color: var(--primary-600); font-size: 12px; display: block;">SKU: ${req.skuNumber}</span>
          <span style="font-size: 12px; color: var(--text-secondary);">${req.productName}</span>
        </td>
        <td><strong style="font-size: 14px;">${req.qty}</strong></td>
        <td><span class="status-badge pending">${req.status}</span></td>
      </tr>
    `).join('');
  }

  // Initial table refresh & SKU enablement check
  refreshTable();
  updateSkuEnablement();

  // Subscribe to DB updates so table automatically refreshes on sync or form submit
  const unsubscribe = db.subscribe(() => {
    refreshTable();
  });

  // Submit request handler
  requestForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentSoVal = soInput.value.trim();
    if (!currentSoVal) {
      alert('Please enter or select an SO Number.');
      soInput.focus();
      return;
    }

    if (!selectedSku) {
      alert('Please select a valid product from the SKU search dropdown.');
      skuSearchInput.focus();
      return;
    }

    const qty = parseInt(qtyInput.value, 10);
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid positive quantity.');
      qtyInput.focus();
      return;
    }

    submitRequestBtn.disabled = true;
    showBlockerLock('Submitting Pickup Request to Google Sheets...');
    try {
      const newReq = await db.savePickupRequest({
        checkerName: currentUser.name,
        pickerName: pickerNameInput.value.trim() || 'N/A',
        soNumber: currentSoVal,
        skuNumber: selectedSku.skuNumber,
        productName: selectedSku.productName,
        qty: qty
      });

      // Reset Form
      soInput.value = '';
      pickerNameInput.value = '';
      skuSearchInput.value = '';
      selectedSkuDisplay.innerHTML = '';
      qtyInput.value = '1';
      selectedSoNumber = '';
      selectedPickerName = '';
      selectedSku = null;
      autoIdPreview.textContent = '#RC-' + Math.floor(100000 + Math.random() * 900000);

      updateSkuEnablement();
      refreshTable();
      showToast(`Pickup request #${newReq.ticketId || newReq.uniqueid} submitted successfully!`);
    } finally {
      hideBlockerLock();
      submitRequestBtn.disabled = false;
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    toast.remove();
  }, 4000);
}
