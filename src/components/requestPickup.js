import { db } from '../data/db.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';
import { showAlertModal } from '../utils/alert.js';

export function renderRequestPickup(container, currentUser) {
  const storageKey = `irms_selected_checker_line_${currentUser.staffId}`;
  let savedCheckerLine = localStorage.getItem(storageKey) || '';

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">outbox</span>
            My Pickup Requests
          </h3>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-size: 13px; font-weight: 600; color: var(--text-muted);" id="requestCountBadge">0 requests</span>
          <button id="openNewRequestModalBtn" class="btn-primary">
            <span class="material-icons-round">add</span>
            <span>New Pickup Request</span>
          </button>
        </div>
      </div>

      <div class="data-table-wrapper" style="margin-top: 16px;">
        <table class="custom-table">
          <thead>
            <tr>
              <th>Unique ID</th>
              <th>Checker Line</th>
              <th>Timestamp</th>
              <th>SO Number</th>
              <th>Picker Name</th>
              <th>Checker</th>
              <th>SKU / Product</th>
              <th>Qty</th>
              <th>SO Status</th>
              <th>SUM(Qty)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="requestTableBody"></tbody>
        </table>
      </div>

      <!-- Mobile Card List View Container -->
      <div id="requestMobileCardList" class="mobile-card-list"></div>
    </div>
  `;

  const requestTableBody = container.querySelector('#requestTableBody');
  const requestMobileCardList = container.querySelector('#requestMobileCardList');
  const requestCountBadge = container.querySelector('#requestCountBadge');
  const openNewRequestModalBtn = container.querySelector('#openNewRequestModalBtn');

  // Render requests table PRIVATELY for logged-in user
  function refreshTable() {
    const userRequests = db.getPickupRequestsForUser(currentUser);
    requestCountBadge.textContent = `${userRequests.length} request(s)`;

    if (!userRequests.length) {
      const emptyHtml = `
        <div class="empty-state">
          <span class="material-icons-round">lock_clock</span>
          <p>No pickup requests submitted by <strong>${currentUser.name}</strong> yet.</p>
        </div>
      `;
      requestTableBody.innerHTML = `
        <tr>
          <td colspan="11">
            ${emptyHtml}
          </td>
        </tr>
      `;
      requestMobileCardList.innerHTML = emptyHtml;
      return;
    }

    // Render Desktop Table
    requestTableBody.innerHTML = userRequests.map(req => {
      const soDetails = db.getSoDetails(req.soNumber, req.skuNumber);
      const soStatus = soDetails ? soDetails.status : 'N/A';
      const soOrigQty = soDetails ? soDetails.requestQty : 'N/A';

      return `
        <tr>
          <td><strong style="color: var(--primary-700); font-family: monospace;">#${req.ticketId || req.uniqueid}</strong></td>
          <td><span style="font-weight: 600; color: var(--primary-800);">${escapeHtml(req.checkerLine || '-')}</span></td>
          <td style="font-size: 12px; color: var(--text-secondary);">${new Date(req.timestamp).toLocaleString()}</td>
          <td style="font-size: 12px; font-weight: 600;">${req.soNumber}</td>
          <td>${req.pickerName || 'N/A'}</td>
          <td><strong>${req.checkerName}</strong></td>
          <td>
            <span style="font-weight: 700; color: var(--primary-600); font-size: 12px; display: block;">SKU: ${req.skuNumber}</span>
            <span style="font-size: 12px; color: var(--text-secondary);">${req.productName}</span>
          </td>
          <td><strong style="font-size: 14px;">${req.qty}</strong></td>
          <td><span class="status-badge" style="font-size: 11px; padding: 2px 8px; background: #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase;">${soStatus}</span></td>
          <td><strong style="font-size: 14px;">${soOrigQty}</strong></td>
          <td><span class="status-badge pending">${req.status}</span></td>
        </tr>
      `;
    }).join('');

    // Render Mobile Cards
    requestMobileCardList.innerHTML = userRequests.map(req => {
      const soDetails = db.getSoDetails(req.soNumber, req.skuNumber);
      const soStatus = soDetails ? soDetails.status : 'N/A';
      const soOrigQty = soDetails ? soDetails.requestQty : 'N/A';

      return `
        <div class="mobile-task-card">
          <div class="card-header-row">
            <span class="picking-id-label">#${req.ticketId || req.uniqueid}</span>
            <span class="status-badge pending">${req.status}</span>
          </div>
          
          <div class="card-body-content">
            <div class="product-sku">SKU: <strong>${escapeHtml(req.skuNumber)}</strong></div>
            <div class="product-name">${escapeHtml(req.productName)}</div>
          </div>
          
          <div class="card-footer-row" style="margin-top: 8px;">
            <div class="footer-meta">
              <div>Line: <strong>${escapeHtml(req.checkerLine || '-')}</strong> • SO: <strong>${escapeHtml(req.soNumber)}</strong></div>
              <div style="margin-top: 2px;">SO Status: <span class="status-badge" style="font-size: 10px; padding: 1px 6px; background: #e2e8f0; color: #475569; font-weight: 700;">${soStatus}</span> • SUM(Qty): <strong>${soOrigQty}</strong></div>
              <div style="margin-top: 2px;">Picker: ${escapeHtml(req.pickerName || 'N/A')} • Checker: <strong>${escapeHtml(req.checkerName)}</strong></div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${new Date(req.timestamp).toLocaleString()}</div>
            </div>
            <div class="qty-badge">Qty: <strong>${req.qty}</strong></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Open Form Modal Handler
  function openRequestModal() {
    const soList = db.getUniqueSoNumbers();
    const checkerLinesList = db.getCheckerLines();

    let selectedSoNumber = '';
    let selectedPickerName = '';
    let selectedSku = null;
    let selectedCheckerLine = savedCheckerLine;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'requestFormModal';

    const nextId = '#RC-' + Math.floor(100000 + Math.random() * 900000);

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card">
        <div class="form-modal-header">
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">outbox</span>
            Create Pickup Request
          </h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="unique-id-chip">${nextId}</span>
            <button class="form-modal-close-btn" id="closeRequestModalBtn" title="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        </div>

        <div class="form-modal-body">
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

              <!-- Checker Line (Hybrid Dropdown + Chip Selection Modal) -->
              <div class="form-field-wrapper">
                <label class="form-label">Checker Line (Select Line)</label>
                <input type="hidden" id="checkerLineInput" value="${escapeHtml(savedCheckerLine)}" />
                <div class="hybrid-select-trigger" id="checkerLineTrigger">
                  <span id="checkerLineTriggerText" class="${savedCheckerLine ? 'hybrid-select-value' : 'hybrid-select-placeholder'}">
                    ${savedCheckerLine ? `<span class="material-icons-round" style="font-size: 16px;">view_timeline</span>${escapeHtml(savedCheckerLine)}` : 'Select Checker Line...'}
                  </span>
                  <span class="material-icons-round" style="color: var(--text-muted); font-size: 20px;">open_in_new</span>
                </div>
              </div>

              <!-- SO Number -->
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

              <!-- Picker Name -->
              <div class="form-field-wrapper">
                <label class="form-label">Picker Name</label>
                <input 
                  type="text" 
                  id="pickerNameInput" 
                  class="text-control" 
                  placeholder="Auto-filled or type picker name..." 
                />
              </div>

              <!-- Product Detail -->
              <div class="form-field-wrapper span-full">
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

            <div class="form-modal-footer-actions" style="margin-top: 24px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn-secondary" id="cancelRequestModalBtn">Cancel</button>
              <button type="submit" id="submitRequestBtn" class="btn-primary">
                <span class="material-icons-round">post_add</span>
                <span>Submit Request</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeBtn = modalOverlay.querySelector('#closeRequestModalBtn');
    const cancelBtn = modalOverlay.querySelector('#cancelRequestModalBtn');
    const requestForm = modalOverlay.querySelector('#requestForm');
    const submitRequestBtn = modalOverlay.querySelector('#submitRequestBtn');

    const checkerLineInput = modalOverlay.querySelector('#checkerLineInput');
    const checkerLineTrigger = modalOverlay.querySelector('#checkerLineTrigger');
    const checkerLineTriggerText = modalOverlay.querySelector('#checkerLineTriggerText');

    const soInput = modalOverlay.querySelector('#soInput');
    const soMenu = modalOverlay.querySelector('#soMenu');
    const pickerNameInput = modalOverlay.querySelector('#pickerNameInput');
    const skuSearchInput = modalOverlay.querySelector('#skuSearchInput');
    const skuMenu = modalOverlay.querySelector('#skuMenu');
    const selectedSkuDisplay = modalOverlay.querySelector('#selectedSkuDisplay');
    const qtyInput = modalOverlay.querySelector('#qtyInput');

    const closeModal = () => modalOverlay.remove();
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Checker Line Hybrid Chip Modal Handler
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
            checkerLineInput.value = selectedCheckerLine;
            localStorage.setItem(storageKey, selectedCheckerLine);

            checkerLineTriggerText.className = 'hybrid-select-value';
            checkerLineTriggerText.innerHTML = `<span class="material-icons-round" style="font-size: 16px;">view_timeline</span>${escapeHtml(selectedCheckerLine)}`;

            closeChipModal();
          });
        });
      }

      renderChips('');
      searchInput.addEventListener('input', (e) => renderChips(e.target.value.trim()));
      searchInput.focus();
    }

    checkerLineTrigger.addEventListener('click', openCheckerLineChipModal);

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

      const match = soList.find(item => item.soNumber.toLowerCase() === selectedSoNumber.toLowerCase());
      if (match && match.pickerName) {
        pickerNameInput.value = match.pickerName;
      }
    });

    pickerNameInput.addEventListener('input', () => {
      selectedPickerName = pickerNameInput.value.trim();
    });

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

          const soDetails = db.getSoDetails(selectedSoNumber, skuNumber);
          const soStatus = soDetails ? soDetails.status : 'N/A';
          const soOrigQty = soDetails ? soDetails.requestQty : 'N/A';

          selectedSkuDisplay.innerHTML = `
            <div class="autofill-badge success" style="margin-bottom: 8px;">
              <span class="material-icons-round" style="font-size: 16px;">check_circle</span>
              <span>Selected: <strong>SKU ${skuNumber}</strong> (${productName})</span>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <div class="autofill-badge info" style="background: var(--primary-50); color: var(--primary-700); border: 1px solid var(--primary-200); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 16px;">info</span>
                <span>SO Status: <strong style="text-transform: uppercase;">${soStatus}</strong></span>
              </div>
              <div class="autofill-badge info" style="background: var(--primary-50); color: var(--primary-700); border: 1px solid var(--primary-200); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 16px;">layers</span>
                <span>SO SUM(Qty): <strong>${soOrigQty}</strong></span>
              </div>
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

    modalOverlay.addEventListener('click', (e) => {
      if (!e.target.closest('#soInput') && !e.target.closest('#soMenu')) {
        soMenu.classList.remove('open');
      }
      if (!e.target.closest('#skuSearchInput') && !e.target.closest('#skuMenu')) {
        skuMenu.classList.remove('open');
      }
    });

    requestForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentSoVal = soInput.value.trim();
      if (!currentSoVal) {
        showAlertModal('Please enter or select an SO Number.', 'Missing SO Number');
        soInput.focus();
        return;
      }

      if (!selectedSku) {
        showAlertModal('Please select a valid product from the SKU search dropdown.', 'Product Required');
        skuSearchInput.focus();
        return;
      }

      const qty = parseInt(qtyInput.value, 10);
      if (isNaN(qty) || qty <= 0) {
        showAlertModal('Please enter a valid positive quantity.', 'Invalid Quantity');
        qtyInput.focus();
        return;
      }

      submitRequestBtn.disabled = true;
      showBlockerLock('Submitting Pickup Request to Google Sheets...');
      try {
        const newReq = await db.savePickupRequest({
          checkerLine: checkerLineInput ? checkerLineInput.value : '',
          checkerName: currentUser.name,
          pickerName: pickerNameInput.value.trim() || 'N/A',
          soNumber: currentSoVal,
          skuNumber: selectedSku.skuNumber,
          productName: selectedSku.productName,
          qty: qty
        });

        closeModal();
        refreshTable();
        showToast(`Pickup request #${newReq.ticketId || newReq.uniqueid} submitted successfully!`);
      } finally {
        hideBlockerLock();
        submitRequestBtn.disabled = false;
      }
    });
  }

  openNewRequestModalBtn.addEventListener('click', openRequestModal);

  // Initial table refresh
  refreshTable();

  // Capture the root element this component just rendered
  const ownRoot = container.firstElementChild;

  // Subscribe to DB updates - unsubscribe when this component is no longer active
  const unsubscribe = db.subscribe(() => {
    if (!container.isConnected || container.firstElementChild !== ownRoot) {
      unsubscribe();
      return;
    }
    refreshTable();
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


