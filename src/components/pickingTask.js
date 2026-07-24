import { db } from '../data/db.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';
import { showAlertModal } from '../utils/alert.js';

export function renderPickingTask(container, currentUser) {
  let activeFilter = 'all';
  let searchQuery = '';
  let selectedSource = 'Request_Checker'; // 'Request_Checker' or 'Lost_And_Found'

  container.innerHTML = `
    <div class="card-panel">
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px;">
        <div>
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">fact_check</span>
            Picking Task Dashboard
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">
            Private picking log for <strong>${escapeHtml(currentUser.name)}</strong> (Staff ID: ${currentUser.staffId})
          </span>
        </div>
      </div>

      <div class="filter-toolbar">
        <div class="filter-tabs-group">
          <button class="filter-tab active" data-filter="all">All Tasks</button>
          <button class="filter-tab" data-filter="Picking">In Progress</button>
          <button class="filter-tab" data-filter="Completed">Completed</button>
          <button class="filter-tab" data-filter="Cancelled">Cancelled</button>
          <button class="filter-tab" data-filter="Waiting">Waiting List</button>
        </div>

        <div class="search-box-wrapper" style="width: 100%; max-width: 300px; position: relative;">
          <input 
            type="text" 
            id="taskSearchInput" 
            class="text-control" 
            placeholder="Search Ticket ID, SKU, Picker..." 
            style="padding-left: 36px;"
          />
          <span class="material-icons-round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 18px;">search</span>
        </div>
      </div>

      <div id="bulkActionBarContainer" style="display: none; margin-top: 16px;"></div>

      <div class="data-table-wrapper" style="margin-top: 16px;">
        <table class="custom-table">
          <thead id="pickingTableHead">
            <tr>
              <th>Picking ID</th>
              <th>Ticket ID</th>
              <th>Picked By</th>
              <th>SKU / Item Details</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody id="pickingTableBody"></tbody>
        </table>
      </div>

      <!-- Mobile Card List View Container -->
      <div id="pickingMobileCardList" class="mobile-card-list"></div>
    </div>

    <!-- Mobile Floating Action Bar Container -->
    <div id="mobileFloatingActionBarContainer" style="display: none;"></div>

    <!-- Cancel Confirmation Modal -->
    <div id="cancelConfirmModalOverlay" class="modal-overlay" style="display: none;">
      <div class="modal-card" style="max-width: 420px; padding: 28px 24px; text-align: center; border-radius: 20px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #fee2e2; color: #ef4444; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span class="material-icons-round" style="font-size: 32px;">warning_amber</span>
        </div>
        <h3 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0 0 8px;">Cancel Picking Task?</h3>
        <p id="cancelModalTaskText" style="font-size: 13px; color: var(--text-secondary); margin: 0 0 24px; line-height: 1.5;">
          Are you sure you want to cancel this picking task? This action will update Google Sheets and cannot be undone.
        </p>
        <div class="form-modal-footer-actions" style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
          <button id="cancelModalCloseBtn" class="btn-secondary">
            No, Keep Task
          </button>
          <button id="cancelModalConfirmBtn" class="btn-danger">
            <span class="material-icons-round" style="font-size: 18px;">block</span>
            <span>Yes, Cancel Task</span>
          </button>
        </div>
      </div>
    </div>
  `;

  const taskSearchInput = container.querySelector('#taskSearchInput');
  const filterTabs = container.querySelectorAll('.filter-tab');
  const pickingTableHead = container.querySelector('#pickingTableHead');
  const pickingTableBody = container.querySelector('#pickingTableBody');
  const pickingMobileCardList = container.querySelector('#pickingMobileCardList');

  const cancelConfirmModalOverlay = container.querySelector('#cancelConfirmModalOverlay');
  const cancelModalCloseBtn = container.querySelector('#cancelModalCloseBtn');
  const cancelModalConfirmBtn = container.querySelector('#cancelModalConfirmBtn');
  const cancelModalTaskText = container.querySelector('#cancelModalTaskText');
  let taskToCancelId = null;

  cancelModalCloseBtn.addEventListener('click', () => {
    cancelConfirmModalOverlay.style.display = 'none';
    taskToCancelId = null;
  });

  cancelModalConfirmBtn.addEventListener('click', async () => {
    if (!taskToCancelId) return;
    const id = taskToCancelId;
    cancelConfirmModalOverlay.style.display = 'none';
    taskToCancelId = null;

    showBlockerLock('Cancelling picking task & updating Google Sheets...');
    try {
      await db.updatePickingTaskStatus(id, 'Cancelled');
      showToast(`Task ${id} has been Cancelled.`);
      renderTasks();
    } finally {
      hideBlockerLock();
    }
  });

  let selectedWaitingTicketIds = new Set();
  let pendingRequests = [];

  function renderTasks() {
    const bulkContainer = container.querySelector('#bulkActionBarContainer');
    if (bulkContainer) bulkContainer.style.display = 'none';
    const mobileActionBar = container.querySelector('#mobileFloatingActionBarContainer');
    if (mobileActionBar) mobileActionBar.style.display = 'none';

    if (activeFilter === 'Waiting') {
      renderWaitingList();
      return;
    }

    // Default headers
    pickingTableHead.innerHTML = `
      <tr>
        <th>Picking ID</th>
        <th>Ticket ID</th>
        <th>Picked By</th>
        <th>SKU / Item Details</th>
        <th>Qty</th>
        <th>Status</th>
        <th>Timestamp</th>
        <th style="text-align: right;">Action</th>
      </tr>
    `;

    let tasks = db.getPickingTasksForUser(currentUser);

    if (activeFilter !== 'all') {
      tasks = tasks.filter(t => t.status === activeFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tasks = tasks.filter(t => 
        (t.pickingId || '').toLowerCase().includes(q) ||
        (t.ticketId || '').toLowerCase().includes(q) ||
        (t.skuCode || '').toLowerCase().includes(q) ||
        (t.pickedBy || '').toLowerCase().includes(q)
      );
    }

    if (!tasks.length) {
      const emptyHtml = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <span class="material-icons-round">assignment_late</span>
              <p>No picking tasks found for filter <strong>${activeFilter}</strong>.</p>
            </div>
          </td>
        </tr>
      `;
      pickingTableBody.innerHTML = emptyHtml;
      pickingMobileCardList.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">assignment_late</span>
          <p>No picking tasks found.</p>
        </div>
      `;
      return;
    }

    // Render Desktop Table rows
    pickingTableBody.innerHTML = tasks.map(task => {
      const statusClass = (task.status || '').toLowerCase();
      const isPicking = task.status === 'Picking';
      const remainingQty = db.getPickingTaskRemainingQty(task.pickingId);
      return `
        <tr data-picking-id="${task.pickingId}" class="picking-task-row" style="cursor: pointer;">
          <td><strong style="color: var(--primary-700); font-family: monospace;">#${task.pickingId}</strong></td>
          <td><span style="font-family: monospace; font-weight: 600;">#${task.ticketId || 'N/A'}</span></td>
          <td><strong>${escapeHtml(task.pickedBy)}</strong></td>
          <td>
            <span style="font-weight: 700; color: var(--primary-600); font-size: 12px; display: block;">SKU: ${escapeHtml(task.skuCode)}</span>
            <span style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(task.productName)}</span>
          </td>
          <td><strong style="font-size: 14px;">${task.qty}</strong></td>
          <td><span class="status-badge ${statusClass}">${task.status}</span></td>
          <td style="font-size: 12px; color: var(--text-secondary);">${new Date(task.timestamp).toLocaleString()}</td>
          <td style="text-align: right;">
            ${(isPicking && remainingQty > 0) ? `
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn-action-sm action-putaway-btn" data-id="${task.pickingId}" data-sku="${escapeHtml(task.skuCode)}" data-product="${escapeHtml(task.productName)}" data-qty="${remainingQty}" style="background: var(--success-bg); color: var(--success); border: 1px solid #a7f3d0;" title="Confirm Putaway">
                  <span class="material-icons-round" style="font-size: 14px;">input</span>
                  <span>Putaway (${remainingQty})</span>
                </button>
                <button class="btn-action-sm cancel action-cancel-btn" data-id="${task.pickingId}" title="Cancel Task">
                  <span class="material-icons-round" style="font-size: 14px;">close</span>
                  <span>Cancel</span>
                </button>
              </div>
            ` : '<span style="color: var(--text-muted); font-size: 12px;">--</span>'}
          </td>
        </tr>
      `;
    }).join('');

    // Render Mobile Cards
    pickingMobileCardList.innerHTML = tasks.map(task => {
      const statusClass = (task.status || '').toLowerCase();
      const isPicking = task.status === 'Picking';
      const remainingQty = db.getPickingTaskRemainingQty(task.pickingId);
      
      return `
        <div class="mobile-task-card" data-picking-id="${task.pickingId}">
          <div class="card-header-row">
            <span class="picking-id-label">Picking: #${task.pickingId}</span>
            <span class="ticket-id-label">Ticket: #${task.ticketId || 'N/A'}</span>
            <span class="status-badge ${statusClass}">${task.status}</span>
          </div>
          
          <div class="card-body-content">
            <div class="product-sku">SKU: <strong>${escapeHtml(task.skuCode)}</strong></div>
            <div class="product-name">${escapeHtml(task.productName)}</div>
          </div>
          
          <div class="card-footer-row" style="margin-top: 8px; padding-bottom: ${isPicking && remainingQty > 0 ? '10px' : '0'}; border-bottom: ${isPicking && remainingQty > 0 ? '1px solid var(--border-light)' : 'none'};">
            <div class="footer-meta">
              <div>Picker: <strong>${escapeHtml(task.pickedBy)}</strong></div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${new Date(task.timestamp).toLocaleString()}</div>
            </div>
            <div class="qty-badge">Qty: <strong>${task.qty}</strong></div>
          </div>
          
          ${(isPicking && remainingQty > 0) ? `
            <div class="card-actions-row" style="display: flex; gap: 8px; padding-top: 10px;">
              <button class="btn-action-sm action-putaway-btn" data-id="${task.pickingId}" data-sku="${escapeHtml(task.skuCode)}" data-product="${escapeHtml(task.productName)}" data-qty="${remainingQty}" style="flex: 1; height: 36px; background: var(--success-bg); color: var(--success); border: 1px solid #a7f3d0; justify-content: center;">
                <span class="material-icons-round" style="font-size: 16px;">input</span>
                <span>Putaway (${remainingQty})</span>
              </button>
              <button class="btn-action-sm cancel action-cancel-btn" data-id="${task.pickingId}" style="flex: 0 0 100px; height: 36px; justify-content: center;">
                <span class="material-icons-round" style="font-size: 16px;">close</span>
                <span>Cancel</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Attach Action Listeners for Desktop and Mobile elements globally
    container.querySelectorAll('.action-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        taskToCancelId = id;
        cancelModalTaskText.textContent = `Are you sure you want to cancel picking task #${id}? This will update status on Google Sheets.`;
        cancelConfirmModalOverlay.style.display = 'flex';
      });
    });

    container.querySelectorAll('.action-putaway-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const sku = btn.dataset.sku;
        const productName = btn.dataset.product;
        const maxQty = parseInt(btn.dataset.qty, 10);
        openPutawayModal(id, sku, productName, maxQty);
      });
    });

    // Row / Card clicks for detailed task popup modal
    container.querySelectorAll('.picking-task-row, .mobile-task-card').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const pickingId = el.dataset.pickingId;
        if (pickingId) {
          openTaskDetailsModal(pickingId);
        }
      });
    });
  }

  function renderWaitingList() {
    const pendingRc = db.getPendingRequests();
    const pendingLf = db.getPendingLostAndFound();

    let waitingItems = [
      ...pendingRc.map(r => ({
        id: String(r.ticketId || r.uniqueid),
        sku: r.skuNumber || r.skuCode || '',
        productName: r.productName || '',
        qty: r.qty || 1,
        requestedBy: r.checkerName || 'N/A',
        sourceProcess: 'Request_Checker',
        timestamp: r.timestamp
      })),
      ...pendingLf.map(r => ({
        id: String(r.ticketId || r.uniqueid),
        sku: r.skuNumber || r.skuCode || '',
        productName: r.productName || (r.foundAt ? `Lost & Found (${r.foundAt})` : 'Lost & Found'),
        qty: r.qty || 1,
        requestedBy: r.btiStaff || 'N/A',
        sourceProcess: 'Lost_And_Found',
        timestamp: r.timestamp
      }))
    ];

    // Sort by timestamp desc
    waitingItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      waitingItems = waitingItems.filter(item => 
        item.id.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.productName.toLowerCase().includes(q) ||
        item.requestedBy.toLowerCase().includes(q)
      );
    }

    // Update table head
    pickingTableHead.innerHTML = `
      <tr>
        <th style="width: 48px; text-align: center;">
          <label class="custom-checkbox-label" style="display: inline-flex; align-items: center; justify-content: center; margin: 0; cursor: pointer;">
            <input type="checkbox" id="bulkSelectAllCheckbox" />
          </label>
        </th>
        <th>Ticket ID</th>
        <th>Source</th>
        <th>SKU / Item Details</th>
        <th>Qty</th>
        <th>Requested By</th>
        <th>Timestamp</th>
        <th style="text-align: right;">Action</th>
      </tr>
    `;

    if (!waitingItems.length) {
      pickingTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <span class="material-icons-round">task_alt</span>
              <p>No unpicked waiting tasks found.</p>
            </div>
          </td>
        </tr>
      `;
      pickingMobileCardList.innerHTML = `
        <div class="empty-state">
          <span class="material-icons-round">task_alt</span>
          <p>No unpicked waiting tasks found.</p>
        </div>
      `;
      updateBulkActionBar(waitingItems);
      updateMobileFloatingActionBar();
      return;
    }

    // Populate desktop table
    pickingTableBody.innerHTML = waitingItems.map(item => {
      const isSelected = selectedWaitingTicketIds.has(item.id);
      const sourceLabel = item.sourceProcess === 'Request_Checker' ? 'Request' : 'Lost & Found';
      const sourceClass = item.sourceProcess === 'Request_Checker' ? 'request' : 'lost-found';
      
      return `
        <tr class="waiting-item-row" data-id="${item.id}" style="cursor: pointer;">
          <td style="text-align: center;" onclick="event.stopPropagation();">
            <label class="custom-checkbox-label" style="display: inline-flex; align-items: center; justify-content: center; margin: 0; cursor: pointer;">
              <input type="checkbox" class="waiting-item-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''} />
            </label>
          </td>
          <td><strong style="font-family: monospace;">#${item.id}</strong></td>
          <td><span class="waiting-source-badge ${sourceClass}">${sourceLabel}</span></td>
          <td>
            <span style="font-weight: 700; color: var(--primary-600); font-size: 12px; display: block;">SKU: ${escapeHtml(item.sku)}</span>
            <span style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(item.productName)}</span>
          </td>
          <td><strong style="font-size: 14px;">${item.qty}</strong></td>
          <td><strong>${escapeHtml(item.requestedBy)}</strong></td>
          <td style="font-size: 12px; color: var(--text-secondary);">${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</td>
          <td style="text-align: right;" onclick="event.stopPropagation();">
            <button class="btn-action-sm action-assign-row-btn" data-id="${item.id}" data-source="${item.sourceProcess}" style="background: var(--primary-50); color: var(--primary-700); border: 1px solid var(--primary-200);">
              <span class="material-icons-round" style="font-size: 14px;">play_arrow</span>
              <span>Start Pick</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Populate mobile card list
    pickingMobileCardList.innerHTML = waitingItems.map(item => {
      const isSelected = selectedWaitingTicketIds.has(item.id);
      const sourceLabel = item.sourceProcess === 'Request_Checker' ? 'Request' : 'Lost & Found';
      const sourceClass = item.sourceProcess === 'Request_Checker' ? 'request' : 'lost-found';
      
      return `
        <div class="mobile-waiting-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <div class="card-header-row">
            <span class="waiting-source-badge ${sourceClass}">${sourceLabel}</span>
            <span class="ticket-id-label">#${item.id}</span>
            <div class="checkbox-indicator">
              <span class="material-icons-round check-icon">${isSelected ? 'check_circle' : 'radio_button_unchecked'}</span>
            </div>
          </div>
          
          <div class="card-body-content">
            <div class="product-sku">SKU: <strong>${escapeHtml(item.sku)}</strong></div>
            <div class="product-name">${escapeHtml(item.productName)}</div>
          </div>
          
          <div class="card-footer-row">
            <div class="footer-meta">
              <div>By: <strong>${escapeHtml(item.requestedBy)}</strong></div>
              <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}</div>
            </div>
            <div class="qty-badge">Qty: <strong>${item.qty}</strong></div>
          </div>
        </div>
      `;
    }).join('');

    // Select all checkbox event (desktop)
    const bulkSelectAllCheckbox = container.querySelector('#bulkSelectAllCheckbox');
    if (bulkSelectAllCheckbox) {
      bulkSelectAllCheckbox.checked = waitingItems.length > 0 && waitingItems.every(item => selectedWaitingTicketIds.has(item.id));
      bulkSelectAllCheckbox.addEventListener('change', () => {
        if (bulkSelectAllCheckbox.checked) {
          waitingItems.forEach(item => selectedWaitingTicketIds.add(item.id));
        } else {
          waitingItems.forEach(item => selectedWaitingTicketIds.delete(item.id));
        }
        renderTasks();
      });
    }

    // Row selection event (desktop click)
    pickingTableBody.querySelectorAll('.waiting-item-row').forEach(rowEl => {
      const id = rowEl.dataset.id;
      const checkbox = rowEl.querySelector('.waiting-item-checkbox');

      rowEl.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        if (checkbox.checked) {
          selectedWaitingTicketIds.add(id);
        } else {
          selectedWaitingTicketIds.delete(id);
        }
        rowEl.classList.toggle('selected-row', checkbox.checked);
        
        if (bulkSelectAllCheckbox) {
          bulkSelectAllCheckbox.checked = waitingItems.every(item => selectedWaitingTicketIds.has(item.id));
        }
        updateBulkActionBar(waitingItems);
        updateMobileFloatingActionBar();
      });
    });

    // Mobile card selection event (mobile click toggles selection)
    pickingMobileCardList.querySelectorAll('.mobile-waiting-card').forEach(cardEl => {
      const id = cardEl.dataset.id;
      
      cardEl.addEventListener('click', () => {
        const isSelected = selectedWaitingTicketIds.has(id);
        if (isSelected) {
          selectedWaitingTicketIds.delete(id);
        } else {
          selectedWaitingTicketIds.add(id);
        }
        
        cardEl.classList.toggle('selected', !isSelected);
        const iconEl = cardEl.querySelector('.check-icon');
        if (iconEl) {
          iconEl.textContent = !isSelected ? 'check_circle' : 'radio_button_unchecked';
        }
        
        // Sync desktop checkbox state
        if (bulkSelectAllCheckbox) {
          bulkSelectAllCheckbox.checked = waitingItems.every(item => selectedWaitingTicketIds.has(item.id));
        }
        
        updateBulkActionBar(waitingItems);
        updateMobileFloatingActionBar();
      });
    });

    // Desktop row-level assign buttons
    pickingTableBody.querySelectorAll('.action-assign-row-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const source = btn.dataset.source;

        const pendingList = source === 'Request_Checker' ? db.getPendingRequests() : db.getPendingLostAndFound();
        const req = pendingList.find(r => String(r.ticketId || r.uniqueid) === id);
        if (!req) return;

        showBlockerLock('Assigning picking task to you...');
        try {
          await db.createPickingTasks([req], currentUser.name, source);
          showToast(`Successfully assigned task #${id} to you!`);
          selectedWaitingTicketIds.delete(id);
          
          activeFilter = 'Picking';
          const tab = Array.from(filterTabs).find(t => t.dataset.filter === 'Picking');
          if (tab) {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
          }
          renderTasks();
        } catch (err) {
          console.error('Single assign failed:', err);
        } finally {
          hideBlockerLock();
        }
      });
    });

    updateBulkActionBar(waitingItems);
    updateMobileFloatingActionBar();
  }

  function updateBulkActionBar(waitingItems = []) {
    const barContainer = container.querySelector('#bulkActionBarContainer');
    if (!barContainer) return;

    if (activeFilter !== 'Waiting' || selectedWaitingTicketIds.size === 0) {
      barContainer.style.display = 'none';
      barContainer.innerHTML = '';
      return;
    }

    const count = selectedWaitingTicketIds.size;
    barContainer.style.display = 'block';
    barContainer.innerHTML = `
      <div class="bulk-action-bar">
        <div style="font-weight: 700; color: var(--primary-800); font-size: 13px; display: flex; align-items: center; gap: 6px;">
          <span class="material-icons-round" style="color: var(--primary-600); font-size: 18px;">playlist_add_check</span>
          <span><strong>${count}</strong> unpicked items selected</span>
        </div>
        <button id="bulkAssignBtn" class="btn-primary" style="height: 38px; padding: 0 16px; font-size: 13px; border-radius: 8px;">
          <span class="material-icons-round" style="font-size: 16px;">play_arrow</span>
          <span>Assign & Start Picking (${count})</span>
        </button>
      </div>
    `;

    // Bulk assign click listener
    barContainer.querySelector('#bulkAssignBtn').addEventListener('click', async () => {
      const pendingRc = db.getPendingRequests();
      const pendingLf = db.getPendingLostAndFound();
      
      const selectedReqsRc = pendingRc.filter(r => selectedWaitingTicketIds.has(String(r.ticketId || r.uniqueid)));
      const selectedReqsLf = pendingLf.filter(r => selectedWaitingTicketIds.has(String(r.ticketId || r.uniqueid)));

      if (selectedReqsRc.length === 0 && selectedReqsLf.length === 0) return;

      showBlockerLock(`Creating Picking Tasks for ${count} items...`);
      try {
        let totalCreated = 0;
        if (selectedReqsRc.length > 0) {
          const createdRc = await db.createPickingTasks(selectedReqsRc, currentUser.name, 'Request_Checker');
          totalCreated += createdRc.length;
        }
        if (selectedReqsLf.length > 0) {
          const createdLf = await db.createPickingTasks(selectedReqsLf, currentUser.name, 'Lost_And_Found');
          totalCreated += createdLf.length;
        }

        showToast(`Successfully assigned ${totalCreated} picking task(s) to you!`);
        selectedWaitingTicketIds.clear();
        
        activeFilter = 'Picking';
        const tab = Array.from(filterTabs).find(t => t.dataset.filter === 'Picking');
        if (tab) {
          filterTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        }
        renderTasks();
      } catch (err) {
        console.error('Failed bulk assignment:', err);
      } finally {
        hideBlockerLock();
      }
    });
  }

  function updateMobileFloatingActionBar() {
    const containerEl = container.querySelector('#mobileFloatingActionBarContainer');
    if (!containerEl) return;

    const count = selectedWaitingTicketIds.size;
    if (activeFilter !== 'Waiting' || count === 0) {
      containerEl.style.display = 'none';
      containerEl.innerHTML = '';
      return;
    }

    containerEl.style.display = 'block';
    containerEl.innerHTML = `
      <button class="mobile-floating-action-bar" id="mobileStartPickBtn">
        <span class="material-icons-round">play_arrow</span>
        <span>Start Picking (${count})</span>
      </button>
    `;

    containerEl.querySelector('#mobileStartPickBtn').addEventListener('click', () => {
      openMobileConfirmModal();
    });
  }

  function openMobileConfirmModal() {
    const existing = document.getElementById('mobileConfirmModalOverlay');
    if (existing) existing.remove();

    const pendingRc = db.getPendingRequests();
    const pendingLf = db.getPendingLostAndFound();
    
    const selectedReqsRc = pendingRc.filter(r => selectedWaitingTicketIds.has(String(r.ticketId || r.uniqueid)));
    const selectedReqsLf = pendingLf.filter(r => selectedWaitingTicketIds.has(String(r.ticketId || r.uniqueid)));
    const allSelected = [...selectedReqsRc, ...selectedReqsLf];

    const modal = document.createElement('div');
    modal.id = 'mobileConfirmModalOverlay';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '4000';

    modal.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 420px; border-radius: 20px;">
        <div class="form-modal-header">
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">playlist_add_check</span>
            Confirm Picking Tasks
          </h3>
          <button class="form-modal-close-btn" id="closeMobileConfirmBtn">&times;</button>
        </div>
        
        <div class="form-modal-body" style="padding: 20px;">
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; font-weight: 600;">
            You are about to start picking ${allSelected.length} task(s). Confirm task list:
          </p>
          
          <div style="max-height: 180px; overflow-y: auto; margin-bottom: 16px; border: 1px solid var(--border-light); border-radius: 12px; padding: 8px;">
            ${allSelected.map(r => {
              const name = r.productName || (r.foundAt ? `Lost & Found (${r.foundAt})` : 'Lost & Found');
              return `
                <div style="padding: 6px 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <span style="font-weight: 700; color: var(--primary-700); font-family: monospace; display: block;">#${r.ticketId || r.uniqueid}</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${escapeHtml(name)}</span>
                  </div>
                  <span style="font-weight: 700;">Qty: ${r.qty || 1}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Swipe Slider -->
          <div id="mobileSwipeSliderContainer" class="swipe-slider-container">
            <div class="swipe-track">
              <div class="swipe-fill" id="mobileSwipeFill"></div>
              <span class="swipe-text" id="mobileSwipeText">Swipe right to proceed</span>
              <div class="swipe-thumb" id="mobileSwipeThumb">
                <span class="material-icons-round">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#closeMobileConfirmBtn');
    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);

    // Swipe Slider Actions
    const swipeContainer = modal.querySelector('#mobileSwipeSliderContainer');
    const swipeThumb = modal.querySelector('#mobileSwipeThumb');
    const swipeFill = modal.querySelector('#mobileSwipeFill');
    const swipeText = modal.querySelector('#mobileSwipeText');

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
      maxDrag = trackWidth - thumbWidth - 4;
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
      swipeFill.style.width = `${delta + 20}px`;

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
      swipeText.textContent = 'Assigning tasks...';

      try {
        let totalCreated = 0;
        if (selectedReqsRc.length > 0) {
          const createdRc = await db.createPickingTasks(selectedReqsRc, currentUser.name, 'Request_Checker');
          totalCreated += createdRc.length;
        }
        if (selectedReqsLf.length > 0) {
          const createdLf = await db.createPickingTasks(selectedReqsLf, currentUser.name, 'Lost_And_Found');
          totalCreated += createdLf.length;
        }

        showToast(`Successfully assigned ${totalCreated} picking task(s) to you!`);
        selectedWaitingTicketIds.clear();
        closeModal();

        // Switch to Picking tab
        activeFilter = 'Picking';
        const tab = Array.from(filterTabs).find(t => t.dataset.filter === 'Picking');
        if (tab) {
          filterTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
        }
        renderTasks();
      } catch (err) {
        console.error('Mobile swipe assign failed:', err);
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

  function openPutawayModal(pickingId, sku, productName, maxQty) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'putawayFormModal';

    const ptTempId = 'PT-' + Math.floor(100000 + Math.random() * 900000);

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card">
        <div class="form-modal-header">
          <h3>
            <span class="material-icons-round" style="color: var(--success);">input</span>
            Confirm Putaway Task
          </h3>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="unique-id-chip">${ptTempId}</span>
            <button class="form-modal-close-btn" id="closePutawayModalBtn" title="Close">
              <span class="material-icons-round">close</span>
            </button>
          </div>
        </div>

        <div class="form-modal-body">
          <form id="putawayForm" autocomplete="off" onsubmit="return false;">
            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; border: 1.5px solid var(--border-light);">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Picking Task Details</div>
              <div style="font-size: 14px; font-weight: 800; color: var(--primary-800); margin-top: 4px;">Picking ID: #${pickingId}</div>
              <div style="font-size: 12px; color: var(--text-primary); margin-top: 2px;"><strong>SKU:</strong> ${sku}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;"><strong>Product Name:</strong> ${productName}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;"><strong>Remaining Qty to Putaway:</strong> ${maxQty}</div>
            </div>

            <div class="form-grid">
              <!-- Staff Name (Logged-in User) -->
              <div class="form-field-wrapper">
                <label class="form-label">Staff Name (System)</label>
                <input 
                  type="text" 
                  class="text-control read-only-control" 
                  value="${escapeHtml(currentUser.name)}" 
                  readonly 
                />
              </div>

              <!-- Qty to Put away -->
              <div class="form-field-wrapper">
                <label class="form-label">Qty to Putaway (Max ${maxQty})</label>
                <input 
                  type="number" 
                  id="putawayQtyInput" 
                  class="text-control" 
                  min="1" 
                  max="${maxQty}" 
                  value="${maxQty}" 
                  required 
                />
              </div>

              <!-- Location -->
              <div class="form-field-wrapper span-full">
                <label class="form-label">Storage Location (Exactly 20 chars)</label>
                <input 
                  type="text" 
                  id="putawayLocationInput" 
                  class="text-control" 
                  placeholder="e.g. CBT-MZF3-35-03-L1-04" 
                  maxlength="20"
                  required
                />
                <span class="input-helper-text" id="putawayLocationHelper">Should contain exactly 20 characters. Current length: 0</span>
              </div>
            </div>

            <div class="form-modal-footer-actions" style="margin-top: 24px; display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
              <button type="button" class="btn-secondary" id="cancelPutawayModalBtn">Cancel</button>
              <button type="submit" id="submitPutawayBtn" class="btn-primary" style="background: linear-gradient(135deg, var(--success), #059669); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.28);">
                <span class="material-icons-round">check_circle</span>
                <span>Confirm Putaway</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeBtn = modalOverlay.querySelector('#closePutawayModalBtn');
    const cancelBtn = modalOverlay.querySelector('#cancelPutawayModalBtn');
    const putawayForm = modalOverlay.querySelector('#putawayForm');
    const putawayQtyInput = modalOverlay.querySelector('#putawayQtyInput');
    const putawayLocationInput = modalOverlay.querySelector('#putawayLocationInput');
    const putawayLocationHelper = modalOverlay.querySelector('#putawayLocationHelper');

    const closeModal = () => modalOverlay.remove();
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    putawayLocationInput.addEventListener('input', () => {
      const len = putawayLocationInput.value.length;
      putawayLocationHelper.textContent = `Should contain exactly 20 characters. Current length: ${len}`;
      if (len === 20) {
        putawayLocationHelper.style.color = 'var(--success)';
      } else {
        putawayLocationHelper.style.color = '';
      }
    });

    putawayForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const qty = parseInt(putawayQtyInput.value, 10);
      const location = putawayLocationInput.value.trim();

      if (isNaN(qty) || qty < 1 || qty > maxQty) {
        showAlertModal(`Invalid Quantity. Must be between 1 and ${maxQty}.`);
        return;
      }

      if (location.length !== 20) {
        showAlertModal(`Location must be exactly 20 characters long (e.g. CBT-MZF3-35-03-L1-04). Current length is ${location.length} characters.`);
        return;
      }

      closeModal();
      
      const task = db.pickingTasks.find(t => String(t.pickingId).trim() === String(pickingId).trim());
      const ticketId = task ? task.ticketId : '';
      const payload = {
        pickingId: pickingId,
        ticketId: ticketId,
        skuCode: sku,
        productName: productName,
        qtyPut: qty,
        location: location,
        staffName: currentUser.name
      };
      
      // Submit asynchronously in the background (Optimistic UI)
      db.savePutawayEntry(payload);
      
      showToast(`Logged putaway of ${qty} unit(s) to ${location} (Syncing in background...)`);
      renderTasks();
    });
  }

  function openTaskDetailsModal(pickingId) {
    const task = db.pickingTasks.find(t => String(t.pickingId).trim() === String(pickingId).trim());
    if (!task) {
      showAlertModal(`Picking Task #${pickingId} details could not be found.`);
      return;
    }

    const isLostAndFound = task.ticketId && task.ticketId.startsWith('LF-');
    const sourceProcess = isLostAndFound ? 'Lost & Found' : 'Request Checker';
    const sourceBadgeColor = isLostAndFound ? 'background: #fef3c7; color: #d97706;' : 'background: #dbeafe; color: #1e40af;';

    // Build matching ticket info
    let sourceDetailsHtml = '';
    if (isLostAndFound) {
      const entry = db.lostAndFound.find(e => String(e.ticketId).trim() === String(task.ticketId).trim());
      if (entry) {
        sourceDetailsHtml = `
          <div style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid var(--border-light); margin-top: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
              <span class="material-icons-round" style="font-size: 14px; color: var(--primary-600);">travel_explore</span>
              <span>Lost & Found Ticket Info</span>
            </div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>BTI Staff:</strong> ${escapeHtml(entry.btiStaff)}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Found At Location:</strong> <span class="location-badge" style="font-family: monospace; font-size: 11px; padding: 2px 6px; font-weight: 700; color: var(--primary-800); background: var(--primary-50); border-radius: 6px;">${escapeHtml(entry.foundAt)}</span></div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Reason:</strong> ${escapeHtml(entry.reason || '-')}</div>
            <div style="font-size: 13px;"><strong>Ticket Qty:</strong> ${entry.qty}</div>
          </div>
        `;
      } else {
        sourceDetailsHtml = `
          <div style="background: #fff5f5; padding: 12px 14px; border-radius: 12px; border: 1.5px dashed #fca5a5; margin-top: 12px; color: #c53030; font-size: 12px; font-weight: 600;">
            Source Lost & Found entry details not found locally.
          </div>
        `;
      }
    } else {
      const entry = db.requests.find(r => String(r.ticketId || r.uniqueid).trim() === String(task.ticketId).trim());
      if (entry) {
        sourceDetailsHtml = `
          <div style="background: #f8fafc; padding: 14px; border-radius: 12px; border: 1px solid var(--border-light); margin-top: 12px;">
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
              <span class="material-icons-round" style="font-size: 14px; color: var(--primary-600);">outbox</span>
              <span>Request Checker Ticket Info</span>
            </div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Checker Line:</strong> ${escapeHtml(entry.checkerLine)}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>Checker Name:</strong> ${escapeHtml(entry.checkerName)}</div>
            <div style="font-size: 13px; margin-bottom: 4px;"><strong>SO Number:</strong> ${escapeHtml(entry.soNumber)}</div>
            <div style="font-size: 13px;"><strong>Ticket Qty:</strong> ${entry.qty}</div>
          </div>
        `;
      } else {
        sourceDetailsHtml = `
          <div style="background: #fff5f5; padding: 12px 14px; border-radius: 12px; border: 1.5px dashed #fca5a5; margin-top: 12px; color: #c53030; font-size: 12px; font-weight: 600;">
            Source pickup request details not found locally.
          </div>
        `;
      }
    }

    // Build putaway list
    const putaways = db.putawayRecords.filter(p => String(p.pickingId).trim() === String(task.pickingId).trim());
    let putawaysHtml = '';
    if (putaways.length > 0) {
      putawaysHtml = `
        <div style="margin-top: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
            <span class="material-icons-round" style="font-size: 14px; color: var(--success);">input</span>
            <span>Associated Putaway Records</span>
          </div>
          <div class="data-table-wrapper" style="border: 1px solid var(--border-light); border-radius: 8px;">
            <table class="custom-table" style="font-size: 12px;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 8px 12px; font-size: 10px;">Putaway ID</th>
                  <th style="padding: 8px 12px; font-size: 10px;">Qty Put</th>
                  <th style="padding: 8px 12px; font-size: 10px;">Location</th>
                  <th style="padding: 8px 12px; font-size: 10px;">Operator</th>
                  <th style="padding: 8px 12px; font-size: 10px;">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                ${putaways.map(p => {
                  let syncBadge = '';
                  if (p.syncState === 'pending') {
                    syncBadge = `<span style="font-size: 9px; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; margin-left: 6px;"><span class="material-icons-round" style="font-size: 10px; animation: spin 1s linear infinite;">sync</span>Pending</span>`;
                  } else if (p.syncState === 'failed') {
                    syncBadge = `<span style="font-size: 9px; background: #fee2e2; color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; margin-left: 6px;"><span class="material-icons-round" style="font-size: 10px;">warning</span>Retry Queued</span>`;
                  }
                  
                  return `
                    <tr>
                      <td style="padding: 8px 12px; font-weight: 700; font-family: monospace; display: flex; align-items: center; gap: 4px;">#${p.putawayId} ${syncBadge}</td>
                      <td style="padding: 8px 12px; font-weight: 700;">${p.qtyPut}</td>
                      <td style="padding: 8px 12px;"><span class="location-badge" style="font-family: monospace; font-size: 11px; padding: 2px 6px; font-weight: 700; color: var(--primary-800); background: var(--primary-50); border-radius: 6px;">${escapeHtml(p.location)}</span></td>
                      <td style="padding: 8px 12px;">${escapeHtml(p.staffName)}</td>
                      <td style="padding: 8px 12px; font-size: 11px; color: var(--text-secondary);">${new Date(p.timestamp).toLocaleString()}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      putawaysHtml = `
        <div style="margin-top: 16px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
            <span class="material-icons-round" style="font-size: 14px; color: var(--text-muted);">input</span>
            <span>Associated Putaway Records</span>
          </div>
          <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1.5px dashed var(--border-light); color: var(--text-muted); font-size: 12px; font-weight: 600;">
            No putaway logs found for this picking task yet.
          </div>
        </div>
      `;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'taskDetailsModal';

    const statusClass = (task.status || '').toLowerCase();
    
    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 600px;">
        <div class="form-modal-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">visibility</span>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Picking Task Details</h3>
          </div>
          <button class="form-modal-close-btn" id="closeDetailsModalBtn" title="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <div class="form-modal-body" style="padding-top: 14px; max-height: calc(90vh - 80px); overflow-y: auto;">
          <!-- Header stats -->
          <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap;">
            <span style="font-size: 12px; font-weight: 700; font-family: monospace; background: var(--primary-50); color: var(--primary-800); padding: 4px 10px; border-radius: 8px;">Picking ID: #${task.pickingId}</span>
            <span style="font-size: 12px; font-weight: 700; font-family: monospace; background: var(--primary-50); color: var(--primary-800); padding: 4px 10px; border-radius: 8px;">Ticket ID: #${task.ticketId}</span>
            <span class="status-badge ${statusClass}">${task.status}</span>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 8px; ${sourceBadgeColor}">${sourceProcess}</span>
          </div>

          <!-- Main Info Grid -->
          <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
            <div style="background: #ffffff; padding: 12px 14px; border: 1px solid var(--border-light); border-radius: 12px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">SKU Code</div>
              <div style="font-size: 13px; font-weight: 800; color: var(--primary-800); margin-top: 4px; font-family: monospace;">${escapeHtml(task.skuCode)}</div>
            </div>
            
            <div style="background: #ffffff; padding: 12px 14px; border: 1px solid var(--border-light); border-radius: 12px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Task Qty</div>
              <div style="font-size: 13px; font-weight: 800; color: var(--primary-800); margin-top: 4px;">${task.qty} unit(s)</div>
            </div>

            <div style="background: #ffffff; padding: 12px 14px; border: 1px solid var(--border-light); border-radius: 12px; grid-column: 1 / -1;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Product Name</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${escapeHtml(task.productName)}</div>
            </div>

            <div style="background: #ffffff; padding: 12px 14px; border: 1px solid var(--border-light); border-radius: 12px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Picked By</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${escapeHtml(task.pickedBy)}</div>
            </div>

            <div style="background: #ffffff; padding: 12px 14px; border: 1px solid var(--border-light); border-radius: 12px;">
              <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Timestamp</div>
              <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); margin-top: 4px;">${new Date(task.timestamp).toLocaleString()}</div>
            </div>
          </div>

          <!-- Related Source Ticket details -->
          ${sourceDetailsHtml}

          <!-- Putaway history logs -->
          ${putawaysHtml}

          <div class="form-modal-footer-actions" style="margin-top: 24px; display: flex; align-items: center; justify-content: flex-end;">
            <button type="button" class="btn-secondary" id="closeDetailsFooterBtn" style="width: 100%; max-width: 120px;">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeBtn = modalOverlay.querySelector('#closeDetailsModalBtn');
    const closeFooterBtn = modalOverlay.querySelector('#closeDetailsFooterBtn');
    
    const closeModal = () => modalOverlay.remove();
    closeBtn.addEventListener('click', closeModal);
    if (closeFooterBtn) closeFooterBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Filter Tabs Event
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderTasks();
    });
  });

  // Search Input Event
  taskSearchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTasks();
  });

  // Capture the root element this component just rendered
  const ownRoot = container.firstElementChild;

  // Subscribe to DB updates - unsubscribe when this component is no longer active
  const unsubscribe = db.subscribe(() => {
    if (!container.isConnected || container.firstElementChild !== ownRoot) {
      unsubscribe();
      return;
    }
    renderTasks();
  });

  // Initial Render
  renderTasks();
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


