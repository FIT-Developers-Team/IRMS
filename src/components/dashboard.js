import { renderRequestPickup } from './requestPickup.js';
import { renderPickingTask } from './pickingTask.js';
import { renderLostAndFound } from './lostAndFound.js';
import { renderSoh } from './soh.js';
import { renderHome } from './home.js';
import { renderAdmin } from './admin.js';
import { renderStockMovement } from './stockMovement.js';
import { db } from '../data/db.js';

export function renderDashboard(container, currentUser, onLogout) {
  let activeTab = 'home';
  let isCollapsed = localStorage.getItem('irms_sidebar_collapsed') === 'true';

  container.innerHTML = `
    <div class="app-layout-root">
      <!-- Mobile Top Bar (Visible on mobile viewports & iOS frame mode) -->
      <div class="mobile-header-bar">
        <div class="brand-mini">
          <div class="brand-mini-icon">I</div>
          <div class="brand-mini-text">
            <h2>IRMS</h2>
            <span>Inventory System</span>
          </div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Unified Refresh & Sync Status Button (Mobile Top Bar) -->
          <button class="inline-sync-status-badge synced headerSyncBtn" title="Click to refresh live data from Google Sheets">
            <span class="material-icons-round badge-icon headerSyncIcon" style="font-size: 14px;">cloud_done</span>
            <span class="badge-label headerSyncText">All synced</span>
          </button>

          <div class="user-avatar" style="width: 30px; height: 30px; font-size: 13px;">${currentUser.name.charAt(0).toUpperCase()}</div>
          <button id="mobileLogoutBtn" class="logout-btn" title="Sign Out">
            <span class="material-icons-round" style="font-size: 20px;">logout</span>
          </button>
        </div>
      </div>

      <!-- Collapsible Left Sidebar (Desktop) / Fixed Bottom Navigation Bar (Mobile) -->
      <aside class="sidebar-nav ${isCollapsed ? 'collapsed' : ''}" id="sidebarNav">
        <div class="sidebar-header">
          <div class="brand-mini">
            <div class="brand-mini-icon">I</div>
            <div class="brand-mini-text">
              <h2>IRMS</h2>
              <span>Inventory System</span>
            </div>
          </div>
          
          <button id="toggleSidebarBtn" class="sidebar-toggle-btn" title="Toggle Sidebar">
            <span class="material-icons-round">chevron_left</span>
          </button>
        </div>

        <div class="sidebar-menu">
          <!-- 4 Primary Mobile Nav Items -->
          <button class="nav-tab-item active" data-tab="home" title="Home">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">home</span>
            </div>
            <span class="nav-label">Home</span>
          </button>

          <button class="nav-tab-item" data-tab="requestPickup" title="Request Pickup">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">outbox</span>
              <span class="nav-badge-count" data-badge="requestPickup" style="display: none;">0</span>
            </div>
            <span class="nav-label">Pickup</span>
          </button>

          <button class="nav-tab-item" data-tab="pickingTask" title="Picking Task">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">fact_check</span>
              <span class="nav-badge-count" data-badge="pickingTask" style="display: none;">0</span>
            </div>
            <span class="nav-label">Picking</span>
          </button>

          <button class="nav-tab-item" data-tab="soh" title="Stock On Hand">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">inventory_2</span>
            </div>
            <span class="nav-label">SOH</span>
          </button>

          <!-- Extended Modules (Desktop Only in Sidebar) -->
          <button class="nav-tab-item desktop-only-nav-item" data-tab="lostAndFound" title="Lost & Found">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">travel_explore</span>
            </div>
            <span class="nav-label">Lost & Found</span>
          </button>

          <button class="nav-tab-item desktop-only-nav-item" data-tab="stockMovement" title="Stock Movement">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">swap_horiz</span>
              <span class="nav-badge-count" data-badge="stockMovement" style="display: none;">0</span>
            </div>
            <span class="nav-label">Stock Movement</span>
          </button>

          ${currentUser.role === 'Super' ? `
          <div class="sidebar-divider desktop-only-nav-item"></div>
          <button class="nav-tab-item nav-tab-admin desktop-only-nav-item" data-tab="admin" title="Admin Panel">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">admin_panel_settings</span>
            </div>
            <span class="nav-label">Admin</span>
          </button>` : ''}

          <!-- 5th Mobile Bottom Nav Item (View More Modal Trigger) -->
          <button class="nav-tab-item mobile-only-nav-item" id="mobileMoreNavBtn" title="More Modules">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">grid_view</span>
              <span class="nav-badge-count" data-badge="moreNavBtn" style="display: none;">0</span>
            </div>
            <span class="nav-label">More</span>
          </button>
        </div>

        <div class="sidebar-footer">
          <div class="user-profile-chip">
            <div class="user-avatar">${currentUser.name.charAt(0).toUpperCase()}</div>
            <div class="user-info">
              <span class="user-name">${currentUser.name}</span>
              <span class="user-role-badge">ID: ${currentUser.staffId} • ${currentUser.role}</span>
            </div>
            <button id="logoutBtn" class="logout-btn" title="Sign Out">
              <span class="material-icons-round">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content Wrapper (Top Page Header Bar + Content) -->
      <div class="main-content-wrapper" style="display: flex; flex-direction: column; height: 100%; flex: 1; min-width: 0;">

        <!-- Top Page Content Header Bar (Desktop Only) -->
        <div class="top-page-header-bar" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: #ffffff; border-bottom: 1px solid var(--border-light); flex-shrink: 0; flex-wrap: wrap; gap: 10px;">
          <!-- Unified Refresh & Sync Status Button -->
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <button class="inline-sync-status-badge synced headerSyncBtn" title="Click to refresh live data from Google Sheets">
              <span class="material-icons-round badge-icon headerSyncIcon" style="font-size: 15px;">cloud_done</span>
              <span class="badge-label headerSyncText">All synced</span>
            </button>
          </div>

          <!-- User Profile & Action Info (Desktop Only) -->
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-profile-header-chip desktop-only-nav-item" style="display: flex; align-items: center; gap: 8px;">
              <div class="user-avatar" style="width: 32px; height: 32px; font-size: 13px; background: var(--primary-600); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                ${currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div style="display: flex; flex-direction: column;">
                <span style="font-size: 12px; font-weight: 700; color: var(--text-primary);">${currentUser.name}</span>
                <span style="font-size: 10px; color: var(--text-muted); font-weight: 600;">${currentUser.role} • ID: ${currentUser.staffId}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Module Body Container -->
        <main class="page-content-container" id="tabContentArea" style="flex: 1; overflow-y: auto; min-height: 0;"></main>
      </div>

    </div>
  `;

  const sidebarNav = container.querySelector('#sidebarNav');
  const toggleSidebarBtn = container.querySelector('#toggleSidebarBtn');
  const logoutBtn = container.querySelector('#logoutBtn');
  const mobileLogoutBtn = container.querySelector('#mobileLogoutBtn');
  const tabContentArea = container.querySelector('#tabContentArea');
  const navTabs = container.querySelectorAll('.nav-tab-item');
  const mobileMoreNavBtn = container.querySelector('#mobileMoreNavBtn');
  const headerSyncBtns = container.querySelectorAll('.headerSyncBtn');
  const headerSyncIcons = container.querySelectorAll('.headerSyncIcon');
  const headerSyncTexts = container.querySelectorAll('.headerSyncText');

  // ── Unified Refresh & Sync Status Logic ────────────────────────────────────

  async function triggerManualRefresh() {
    headerSyncBtns.forEach(btn => { btn.disabled = true; });
    headerSyncIcons.forEach(icon => { icon.style.animation = 'spin 1s linear infinite'; });
    try {
      await db.syncSectionData(activeTab);
    } catch (err) {
      console.warn('[Manual Refresh Error]', err);
    } finally {
      if (!db.isSyncing) {
        headerSyncIcons.forEach(icon => { icon.style.animation = 'none'; });
      }
      headerSyncBtns.forEach(btn => { btn.disabled = false; });
    }
  }

  headerSyncBtns.forEach(btn => {
    btn.addEventListener('click', triggerManualRefresh);
  });

  function updateInlineSyncStatus() {
    if (!headerSyncBtns.length) return;

    const pendingCount = db.putawayRecords ? db.putawayRecords.filter(p => p.syncState === 'pending').length : 0;
    const failedCount = db.putawayRecords ? db.putawayRecords.filter(p => p.syncState === 'failed').length : 0;

    let className = 'inline-sync-status-badge synced';
    let iconText = 'cloud_done';
    let labelText = 'All synced';
    let isSpinning = false;

    if (db.isSyncing) {
      className = 'inline-sync-status-badge syncing';
      iconText = 'sync';
      labelText = 'Syncing...';
      isSpinning = true;
    } else if (db.syncError || failedCount > 0) {
      className = 'inline-sync-status-badge failed';
      iconText = 'cloud_off';
      labelText = failedCount > 0 ? `${failedCount} unsynced (Retry)` : 'Sync failed (Retry)';
    } else if (pendingCount > 0) {
      className = 'inline-sync-status-badge syncing';
      iconText = 'sync';
      labelText = `${pendingCount} queueing...`;
      isSpinning = true;
    } else {
      const lastSync = db.lastSyncTime
        ? new Date(db.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      labelText = lastSync ? `All synced (${lastSync})` : 'All synced';
    }

    headerSyncBtns.forEach(btn => { btn.className = className; });
    headerSyncIcons.forEach(icon => {
      icon.textContent = iconText;
      icon.style.animation = isSpinning ? 'spin 1.2s linear infinite' : 'none';
    });
    headerSyncTexts.forEach(txt => { txt.textContent = labelText; });
  }

  // ── Reactive Tab Badge Counter Indicators ────────────────────────────────────

  function updateNavBadgeCounts() {
    // 1. Request Pickup: count tasks where status is NOT Done / Completed / Cancelled
    const pickups = db.getPickupRequests ? db.getPickupRequests() : (db.pickupRequests || []);
    const activePickupCount = pickups.filter(p => {
      const st = String(p.status || '').toLowerCase();
      return st !== 'done' && st !== 'completed' && st !== 'cancelled' && st !== 'canceled';
    }).length;

    // 2. Picking Task: count tasks where status is NOT Done / Completed / Cancelled
    const pickings = db.getPickingTasks ? db.getPickingTasks() : (db.pickingTasks || []);
    const activePickingCount = pickings.filter(p => {
      const st = String(p.status || '').toLowerCase();
      return st !== 'completed' && st !== 'done' && st !== 'cancelled' && st !== 'canceled';
    }).length;

    // 3. Stock Movement: count tasks where status is NOT Done / Completed / Cancelled (e.g. 'Pending')
    const movements = db.getStockMovements ? db.getStockMovements() : (db.stockMovements || []);
    const activeMovementCount = movements.filter(m => {
      const st = String(m.status || '').toLowerCase();
      return st !== 'done' && st !== 'completed' && st !== 'cancelled' && st !== 'canceled';
    }).length;

    // Update DOM badges
    updateBadgeElement('requestPickup', activePickupCount);
    updateBadgeElement('pickingTask', activePickingCount);
    updateBadgeElement('stockMovement', activeMovementCount);
    updateBadgeElement('moreNavBtn', activeMovementCount);
  }

  function updateBadgeElement(tabId, count) {
    const badgeElements = container.querySelectorAll(`.nav-badge-count[data-badge="${tabId}"]`);
    badgeElements.forEach(badge => {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = 'inline-flex';
        badge.setAttribute('data-count', String(count));
      } else {
        badge.style.display = 'none';
        badge.setAttribute('data-count', '0');
      }
    });
  }

  // Subscribe to DB changes to update status elements & tab badges in real-time
  const unsubscribeSyncBar = db.subscribe(() => {
    if (!container.isConnected) {
      unsubscribeSyncBar();
      return;
    }
    updateInlineSyncStatus();
    updateNavBadgeCounts();
  });

  // Initial calls
  updateInlineSyncStatus();
  updateNavBadgeCounts();

  // ── Sidebar Toggle ─────────────────────────────────────────────────────────

  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      sidebarNav.classList.toggle('collapsed', isCollapsed);
      localStorage.setItem('irms_sidebar_collapsed', isCollapsed);
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', onLogout);

  // ── Tab Routing & Mobile Navigation Drawer ──────────────────────────────────
  const secondaryTabs = ['lostAndFound', 'stockMovement', 'admin'];

  function switchTab(tabId) {
    try {
      activeTab = tabId;
      window.irmsActiveTab = tabId;
      db.checkAndRefreshIfExpired();
      
      navTabs.forEach(btn => {
        if (btn.dataset.tab) {
          btn.classList.toggle('active', btn.dataset.tab === tabId);
        }
      });

      if (mobileMoreNavBtn) {
        mobileMoreNavBtn.classList.toggle('active', secondaryTabs.includes(tabId));
      }

      const targetArea = tabContentArea || container.querySelector('#tabContentArea');
      if (!targetArea) {
        throw new Error('tabContentArea container (#tabContentArea) is missing in DOM');
      }

      // Render section immediately with cached data
      if (tabId === 'home') {
        renderHome(targetArea, currentUser);
      } else if (tabId === 'pickingTask') {
        renderPickingTask(targetArea, currentUser);
      } else if (tabId === 'lostAndFound') {
        renderLostAndFound(targetArea, currentUser);
      } else if (tabId === 'soh') {
        renderSoh(targetArea, currentUser);
      } else if (tabId === 'requestPickup') {
        renderRequestPickup(targetArea, currentUser);
      } else if (tabId === 'stockMovement') {
        renderStockMovement(targetArea, currentUser);
      } else if (tabId === 'admin') {
        renderAdmin(targetArea, currentUser);
      } else {
        renderHome(targetArea, currentUser);
      }

      // Lazy-load section data in background — only if TTL has expired for this section.
      if (tabId !== 'home' && db.isSectionDataExpired(tabId)) {
        db.syncSectionData(tabId).catch(err => {
          console.warn(`[Section Data Sync Error for ${tabId}]`, err);
        });
      }
    } catch (err) {
      console.error(`[SwitchTab Error for "${tabId}"]`, err);
    }
  }

  // Attach tab click handlers
  navTabs.forEach(btn => {
    if (btn.dataset.tab) {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    }
  });

  // Attach Mobile More Menu button listener
  if (mobileMoreNavBtn) {
    mobileMoreNavBtn.addEventListener('click', () => {
      openMobileMoreNavigationModal();
    });
  }

  // Mobile More Navigation Bottom Sheet Drawer
  function openMobileMoreNavigationModal() {
    const existing = document.getElementById('mobileMoreNavModal');
    if (existing) existing.remove();

    const movements = db.getStockMovements ? db.getStockMovements() : (db.stockMovements || []);
    const activeMovementCount = movements.filter(m => {
      const st = String(m.status || '').toLowerCase();
      return st !== 'done' && st !== 'completed' && st !== 'cancelled' && st !== 'canceled';
    }).length;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'mobileMoreNavModal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'z-index: 3800; align-items: flex-end; padding: 0; animation: fadeIn 0.2s ease;';

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="width: 100%; max-width: 500px; border-radius: 24px 24px 0 0; padding: 20px 18px 28px; box-sizing: border-box; background: #ffffff; animation: slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
        <!-- Top Drag Handle Indicator -->
        <div style="width: 40px; height: 4px; background: #cbd5e1; border-radius: 4px; margin: 0 auto 16px auto;"></div>

        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600); font-size: 22px;">grid_view</span>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary);">Navigation Menu</h3>
          </div>
          <button id="closeMoreNavBtn" style="border: none; background: #f1f5f9; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span class="material-icons-round" style="color: var(--text-secondary); font-size: 18px;">close</span>
          </button>
        </div>

        <!-- Extended Menu Options Grid -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">All Modules</div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button class="more-nav-card ${activeTab === 'lostAndFound' ? 'active' : ''}" data-tab="lostAndFound" style="display: flex; align-items: center; gap: 10px; padding: 14px 12px; border-radius: 14px; border: 1.5px solid ${activeTab === 'lostAndFound' ? 'var(--primary-600)' : 'var(--border-light)'}; background: ${activeTab === 'lostAndFound' ? 'var(--primary-50)' : '#ffffff'}; text-align: left; cursor: pointer;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: #f0f9ff; color: #0284c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <span class="material-icons-round" style="font-size: 20px;">travel_explore</span>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Lost & Found</div>
                <div style="font-size: 10px; color: var(--text-muted);">Untracked items</div>
              </div>
            </button>

            <button class="more-nav-card ${activeTab === 'stockMovement' ? 'active' : ''}" data-tab="stockMovement" style="display: flex; align-items: center; gap: 10px; padding: 14px 12px; border-radius: 14px; border: 1.5px solid ${activeTab === 'stockMovement' ? 'var(--primary-600)' : 'var(--border-light)'}; background: ${activeTab === 'stockMovement' ? 'var(--primary-50)' : '#ffffff'}; text-align: left; cursor: pointer;">
              <div style="width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative;">
                <span class="material-icons-round" style="font-size: 20px;">swap_horiz</span>
                ${activeMovementCount > 0 ? `<span class="nav-badge-count" style="top: -4px; right: -4px;">${activeMovementCount}</span>` : ''}
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Stock Movement</div>
                <div style="font-size: 10px; color: var(--text-muted);">Rack transfers & deduction</div>
              </div>
            </button>

            ${currentUser.role === 'Super' ? `
              <button class="more-nav-card ${activeTab === 'admin' ? 'active' : ''}" data-tab="admin" style="display: flex; align-items: center; gap: 10px; padding: 14px 12px; border-radius: 14px; border: 1.5px solid ${activeTab === 'admin' ? 'var(--primary-600)' : 'var(--border-light)'}; background: ${activeTab === 'admin' ? 'var(--primary-50)' : '#ffffff'}; text-align: left; cursor: pointer; grid-column: span 2;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: #fdf4ff; color: #c026d3; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span class="material-icons-round" style="font-size: 20px;">admin_panel_settings</span>
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">Admin Panel</div>
                  <div style="font-size: 10px; color: var(--text-muted);">Users & permissions</div>
                </div>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('#closeMoreNavBtn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    modalOverlay.querySelectorAll('.more-nav-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        closeModal();
        switchTab(tab);
      });
    });
  }

  // Initialize with 'home' tab
  switchTab(activeTab);
}
