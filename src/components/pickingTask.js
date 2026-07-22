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

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="openCreateModalBtn" class="btn-primary">
            <span class="material-icons-round">add</span>
            <span>Create Picking Task</span>
          </button>
        </div>
      </div>

      <div class="filter-toolbar">
        <div class="filter-tabs-group">
          <button class="filter-tab active" data-filter="all">All Tasks</button>
          <button class="filter-tab" data-filter="Picking">In Progress</button>
          <button class="filter-tab" data-filter="Completed">Completed</button>
          <button class="filter-tab" data-filter="Cancelled">Cancelled</button>
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

      <div class="data-table-wrapper" style="margin-top: 16px;">
        <table class="custom-table">
          <thead>
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
    </div>

    <!-- Create Picking Task Modal -->
    <div id="pickingModalOverlay" class="modal-overlay" style="display: none;">
      <div class="modal-card">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">post_add</span>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">Create Picking Task</h3>
          </div>
          <button id="closeModalBtn" class="modal-close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <!-- Process Source Selector (Request Checker vs Lost & Found) -->
          <div class="modal-source-tabs" style="display: flex; gap: 8px; margin-bottom: 14px; background: #f1f5f9; padding: 4px; border-radius: 12px;">
            <button type="button" class="source-tab-btn active" data-source="Request_Checker" style="flex: 1; padding: 10px 12px; border-radius: 8px; border: none; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: #ffffff; color: var(--primary-700); box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
              <span class="material-icons-round" style="font-size: 16px;">local_shipping</span>
              <span>Request Checker</span>
              <span class="badge" id="sourceRcBadge" style="background: var(--primary-100); color: var(--primary-800); font-size: 10px; padding: 2px 6px; border-radius: 10px;">0</span>
            </button>
            <button type="button" class="source-tab-btn" data-source="Lost_And_Found" style="flex: 1; padding: 10px 12px; border-radius: 8px; border: none; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; background: transparent; color: var(--text-secondary);">
              <span class="material-icons-round" style="font-size: 16px;">travel_explore</span>
              <span>Lost & Found</span>
              <span class="badge" id="sourceLfBadge" style="background: rgba(0,0,0,0.06); color: var(--text-secondary); font-size: 10px; padding: 2px 6px; border-radius: 10px;">0</span>
            </button>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light);">
            <span style="font-size: 12px; font-weight: 600; color: var(--text-secondary);" id="modalListHeaderLabel">
              Select Pending Requests from Request Checker
            </span>
            <label class="custom-checkbox-label" style="font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="selectAllCheckbox" />
              <span>Select All</span>
            </label>
          </div>

          <div id="pendingRequestListContainer" class="modal-request-list"></div>

          <!-- Swipe Right to Confirm Slider -->
          <div id="swipeSliderContainer" class="swipe-slider-container">
            <div class="swipe-track">
              <div class="swipe-fill" id="swipeFill"></div>
              <span class="swipe-text" id="swipeText">Swipe right to proceed</span>
              <div class="swipe-thumb" id="swipeThumb">
                <span class="material-icons-round">chevron_right</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
  const pickingTableBody = container.querySelector('#pickingTableBody');
  const openCreateModalBtn = container.querySelector('#openCreateModalBtn');
  const pickingModalOverlay = container.querySelector('#pickingModalOverlay');
  const closeModalBtn = container.querySelector('#closeModalBtn');
  const selectAllCheckbox = container.querySelector('#selectAllCheckbox');
  const pendingRequestListContainer = container.querySelector('#pendingRequestListContainer');
  const swipeSliderContainer = container.querySelector('#swipeSliderContainer');
  const swipeThumb = container.querySelector('#swipeThumb');
  const swipeFill = container.querySelector('#swipeFill');
  const swipeText = container.querySelector('#swipeText');
  const modalListHeaderLabel = container.querySelector('#modalListHeaderLabel');
  const sourceTabBtns = container.querySelectorAll('.source-tab-btn');
  const sourceRcBadge = container.querySelector('#sourceRcBadge');
  const sourceLfBadge = container.querySelector('#sourceLfBadge');

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

  let selectedTicketIds = new Set();
  let pendingRequests = [];

  function renderTasks() {
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
      pickingTableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              <span class="material-icons-round">assignment_late</span>
              <p>No picking tasks found for filter <strong>${activeFilter}</strong>.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

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

    // Attach Action Listeners
    pickingTableBody.querySelectorAll('.action-cancel-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        taskToCancelId = id;
        cancelModalTaskText.textContent = `Are you sure you want to cancel picking task #${id}? This will update status on Google Sheets.`;
        cancelConfirmModalOverlay.style.display = 'flex';
      });
    });

    pickingTableBody.querySelectorAll('.action-putaway-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const sku = btn.dataset.sku;
        const productName = btn.dataset.product;
        const maxQty = parseInt(btn.dataset.qty, 10);
        openPutawayModal(id, sku, productName, maxQty);
      });
    });

    // Row clicks for detailed task popup modal
    pickingTableBody.querySelectorAll('.picking-task-row').forEach(rowEl => {
      rowEl.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const pickingId = rowEl.dataset.pickingId;
        if (pickingId) {
          openTaskDetailsModal(pickingId);
        }
      });
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

  // Modal Functions
  function updateModalSourceView() {
    sourceTabBtns.forEach(btn => {
      const isCurrent = btn.dataset.source === selectedSource;
      btn.classList.toggle('active', isCurrent);
      btn.style.background = isCurrent ? '#ffffff' : 'transparent';
      btn.style.color = isCurrent ? 'var(--primary-700)' : 'var(--text-secondary)';
      btn.style.boxShadow = isCurrent ? '0 2px 6px rgba(0,0,0,0.06)' : 'none';
    });

    const pendingRc = db.getPendingRequests();
    const pendingLf = db.getPendingLostAndFound();
    sourceRcBadge.textContent = pendingRc.length;
    sourceLfBadge.textContent = pendingLf.length;

    if (selectedSource === 'Request_Checker') {
      modalListHeaderLabel.textContent = 'Select Pending Requests from Request Checker';
      pendingRequests = pendingRc;
    } else {
      modalListHeaderLabel.textContent = 'Select Pending Entries from Lost & Found';
      pendingRequests = pendingLf;
    }

    selectedTicketIds.clear();
    selectAllCheckbox.checked = false;
    renderPendingRequestItems();
  }

  async function syncAndRefreshModalSource(source) {
    selectedSource = source;
    updateModalSourceView();

    pendingRequestListContainer.innerHTML = `
      <div style="text-align: center; padding: 30px 10px; color: var(--text-secondary);">
        <div class="spinner" style="width: 28px; height: 28px; border-width: 3px; margin: 0 auto 10px; border-top-color: var(--primary-600);"></div>
        <p style="font-size: 13px; font-weight: 600; margin: 0;">Refreshing ${source === 'Request_Checker' ? 'Request Checker' : 'Lost & Found'} data from Google Sheets...</p>
      </div>
    `;

    const tabsToSync = source === 'Request_Checker' ? ['requestChecker', 'soData'] : ['lostAndFound', 'racks'];
    try {
      await db.syncGoogleSheets(tabsToSync);
    } catch (err) {
      console.error('Failed to sync modal source tab:', err);
    } finally {
      updateModalSourceView();
    }
  }

  sourceTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSource = btn.dataset.source;
      syncAndRefreshModalSource(targetSource);
    });
  });

  async function openModal() {
    pickingModalOverlay.style.display = 'flex';
    await syncAndRefreshModalSource('Request_Checker');
  }

  function closeModal() {
    pickingModalOverlay.style.display = 'none';
    resetSwipeSlider();
  }

  function renderPendingRequestItems() {
    if (!pendingRequests.length) {
      const sourceTitle = selectedSource === 'Request_Checker' ? 'Request Checker' : 'Lost & Found';
      pendingRequestListContainer.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted);">
          <span class="material-icons-round" style="font-size: 36px; color: #cbd5e1; margin-bottom: 6px; display: block;">task_alt</span>
          <p style="font-size: 13px; font-weight: 600; margin: 0;">No pending ${sourceTitle} items available.</p>
        </div>
      `;
      updateSwipeSliderLabel();
      return;
    }

    pendingRequestListContainer.innerHTML = pendingRequests.map(req => {
      const reqIdStr = String(req.ticketId || req.uniqueid);
      const isSelected = selectedTicketIds.has(reqIdStr);
      const isLf = selectedSource === 'Lost_And_Found';
      
      const itemTitle = isLf ? `Found At: ${escapeHtml(req.foundAt)}` : escapeHtml(req.productName);
      const itemSub = isLf ? `SKU: ${escapeHtml(req.skuCode)} | Qty: ${req.qty} | BTI Staff: ${escapeHtml(req.btiStaff || 'N/A')}` : `SKU: ${escapeHtml(req.skuNumber)} | Qty: ${req.qty} | Checker: ${escapeHtml(req.checkerName || 'N/A')}`;

      return `
        <div class="modal-request-item ${isSelected ? 'selected' : ''}" data-id="${reqIdStr}">
          <input type="checkbox" class="req-item-checkbox" data-id="${reqIdStr}" ${isSelected ? 'checked' : ''} />
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; font-weight: 700; color: var(--primary-700); font-family: monospace;">#${reqIdStr}</span>
              <span class="status-badge pending" style="font-size: 10px; padding: 2px 6px;">${req.status}</span>
            </div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-top: 2px;">
              ${itemTitle}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              ${itemSub}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Toggle item checkboxes
    pendingRequestListContainer.querySelectorAll('.modal-request-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        const id = String(itemEl.dataset.id);
        const checkbox = itemEl.querySelector('.req-item-checkbox');
        
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }

        if (checkbox.checked) {
          selectedTicketIds.add(id);
        } else {
          selectedTicketIds.delete(id);
        }

        itemEl.classList.toggle('selected', checkbox.checked);
        selectAllCheckbox.checked = selectedTicketIds.size === pendingRequests.length && pendingRequests.length > 0;
        updateSwipeSliderLabel();
      });
    });

    updateSwipeSliderLabel();
  }

  selectAllCheckbox.addEventListener('change', () => {
    if (selectAllCheckbox.checked) {
      pendingRequests.forEach(r => selectedTicketIds.add(String(r.ticketId || r.uniqueid)));
    } else {
      selectedTicketIds.clear();
    }
    renderPendingRequestItems();
  });

  openCreateModalBtn.addEventListener('click', openModal);
  closeModalBtn.addEventListener('click', closeModal);
  pickingModalOverlay.addEventListener('click', (e) => {
    if (e.target === pickingModalOverlay) closeModal();
  });

  // Swipe Right Slider Logic
  let isDragging = false;
  let isCompleting = false;
  let startX = 0;
  let currentX = 0;
  let maxDrag = 0;

  function updateSwipeSliderLabel() {
    const count = selectedTicketIds.size;
    if (count === 0) {
      swipeText.textContent = 'Select items to swipe';
      swipeSliderContainer.style.pointerEvents = 'none';
      swipeSliderContainer.style.opacity = '0.5';
    } else {
      swipeText.textContent = `Swipe right to proceed (${count} selected)`;
      swipeSliderContainer.style.pointerEvents = 'auto';
      swipeSliderContainer.style.opacity = '1';
    }
  }

  function resetSwipeSlider() {
    isDragging = false;
    isCompleting = false;
    currentX = 0;
    swipeThumb.style.transform = `translateX(0px)`;
    swipeFill.style.width = `0px`;
    swipeThumb.style.transition = 'transform 0.2s ease';
    swipeFill.style.transition = 'width 0.2s ease';
    updateSwipeSliderLabel();
  }

  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function startDrag(e) {
    if (selectedTicketIds.size === 0 || isCompleting) return;
    isDragging = true;
    startX = getClientX(e);
    const trackWidth = swipeSliderContainer.querySelector('.swipe-track').offsetWidth;
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
      resetSwipeSlider();
    }
  }

  async function completeSwipe() {
    if (isCompleting) return;
    isCompleting = true;
    isDragging = false;

    swipeThumb.style.transform = `translateX(${maxDrag}px)`;
    swipeFill.style.width = '100%';
    
    // Process selected items
    const selectedReqs = pendingRequests.filter(r => selectedTicketIds.has(String(r.ticketId || r.uniqueid)));
    if (selectedReqs.length > 0) {
      swipeText.textContent = 'Processing tasks...';
      showBlockerLock('Creating Picking Tasks & Uploading to Google Sheets...');
      try {
        const created = await db.createPickingTasks(selectedReqs, currentUser.name, selectedSource);

        showToast(`Successfully created ${created.length} picking task(s) from ${selectedSource === 'Request_Checker' ? 'Request Checker' : 'Lost & Found'}!`);
        closeModal();
        renderTasks();
      } finally {
        hideBlockerLock();
      }
    } else {
      resetSwipeSlider();
    }
  }

  // Touch and Mouse Events for Slider
  swipeThumb.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', endDrag);

  swipeThumb.addEventListener('touchstart', startDrag, { passive: true });
  window.addEventListener('touchmove', onDrag, { passive: true });
  window.addEventListener('touchend', endDrag);

  // Subscribe to DB updates
  const unsubscribe = db.subscribe(() => {
    renderTasks();
  });

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

  // Initial Render
  renderTasks();
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


