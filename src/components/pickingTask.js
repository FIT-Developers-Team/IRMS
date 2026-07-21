import { db } from '../data/db.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';

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
      return `
        <tr>
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
            ${isPicking ? `
              <button class="btn-action-sm cancel action-cancel-btn" data-id="${task.pickingId}" title="Cancel Task">
                <span class="material-icons-round" style="font-size: 14px;">close</span>
                <span>Cancel</span>
              </button>
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

  // Initial Render
  renderTasks();
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
