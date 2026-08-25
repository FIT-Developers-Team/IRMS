import { renderRequestPickup } from './requestPickup.js';
import { renderPickingTask } from './pickingTask.js';
import { renderLostAndFound } from './lostAndFound.js';
import { renderSoh } from './soh.js';
import { renderSohwh } from './sohwh.js';
import { renderHome } from './home.js';
import { renderAdmin } from './admin.js';
import { renderStockMovement } from './stockMovement.js';
import { renderTsRequest } from './tsRequest.js';
import { renderTroubleShoot } from './troubleShoot.js';
import { renderTsTask } from './tsTask.js';
import { db } from '../data/db.js';
import { hasUserAccess, getUserAccessiblePages, ALL_PAGES } from '../utils/security.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';

export function renderDashboard(container, currentUser, onLogout) {
  let activeTab = 'home';
  let isCollapsed = localStorage.getItem('irms_sidebar_collapsed') === 'true';

  // Evaluate accessible tabs for user
  const accessiblePages = getUserAccessiblePages(currentUser);
  const showMoreButton = accessiblePages.length > 4;

  const primaryTabs = showMoreButton ? accessiblePages.slice(0, 4) : accessiblePages;
  const extendedTabs = showMoreButton ? accessiblePages.slice(4) : [];

  const canPickup = hasUserAccess(currentUser, 'requestPickup');
  const canPicking = hasUserAccess(currentUser, 'pickingTask');
  const canSoh = hasUserAccess(currentUser, 'soh');
  const canLostFound = hasUserAccess(currentUser, 'lostAndFound');
  const canMovement = hasUserAccess(currentUser, 'stockMovement');
  const canAdmin = hasUserAccess(currentUser, 'admin');

  // 1. Primary mobile tabs (up to 4) - rendered for both desktop & mobile
  const primaryTabsHtml = primaryTabs.map(page => {
    let badgeHtml = '';
    if (page.key === 'requestPickup' || page.key === 'pickingTask' || page.key === 'stockMovement') {
      badgeHtml = `<span class="nav-badge-count" data-badge="${page.key}" style="display: none;">0</span>`;
    }
    return `
      <button class="nav-tab-item ${page.key === 'home' ? 'active' : ''}" data-tab="${page.key}" title="${page.label}">
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
          <span class="material-icons-round">${page.icon}</span>
          ${badgeHtml}
        </div>
        <span class="nav-label">${page.label}</span>
      </button>
    `;
  }).join('');

  // 2. Extended tabs (5th+ items) - visible on desktop sidebar only, opened via "More" modal on mobile
  const extendedTabsHtml = extendedTabs.map(page => {
    const isDivider = page.key === 'admin';
    let badgeHtml = '';
    if (page.key === 'requestPickup' || page.key === 'pickingTask' || page.key === 'stockMovement') {
      badgeHtml = `<span class="nav-badge-count" data-badge="${page.key}" style="display: none;">0</span>`;
    }

    return `
      ${isDivider ? '<div class="sidebar-divider desktop-only-nav-item"></div>' : ''}
      <button class="nav-tab-item desktop-only-nav-item ${page.key === 'admin' ? 'nav-tab-admin' : ''}" data-tab="${page.key}" title="${page.label}">
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
          <span class="material-icons-round">${page.icon}</span>
          ${badgeHtml}
        </div>
        <span class="nav-label">${page.label}</span>
      </button>
    `;
  }).join('');

  // 3. More button (5th item on mobile if showMoreButton is true)
  const mobileMoreBtnHtml = showMoreButton ? `
    <button class="nav-tab-item mobile-only-nav-item" id="mobileMoreNavBtn" title="More Modules">
      <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
        <span class="material-icons-round">grid_view</span>
        <span class="nav-badge-count" data-badge="moreNavBtn" style="display: none;">0</span>
      </div>
      <span class="nav-label">More</span>
    </button>
  ` : '';

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
          ${primaryTabsHtml}
          ${extendedTabsHtml}
          ${mobileMoreBtnHtml}
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
        <div class="top-page-header-bar" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: #ffffff; border-bottom: 1.5px solid var(--border-light); z-index: 50; box-sizing: border-box;">
          
          <!-- Sync Status Indicator Pill (Top Bar) -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="inline-sync-status-badge synced headerSyncBtn" title="Click to refresh live data from Google Sheets" style="cursor: pointer; border: 1.5px solid var(--border-light); border-radius: 20px; padding: 4px 10px;">
              <span class="material-icons-round badge-icon headerSyncIcon" style="font-size: 14px;">cloud_done</span>
              <span class="badge-label headerSyncText" style="font-weight: 700; font-size: 12px;">All synced</span>
            </button>
          </div>

          <!-- Logged In User Profile Chip (Desktop Only) -->
          <div class="user-profile-header-chip" style="display: flex; align-items: center; gap: 10px; background: var(--surface-body); padding: 4px 12px 4px 4px; border-radius: 20px; border: 1px solid var(--border-light);">
            <div class="user-avatar" style="width: 28px; height: 28px; font-size: 12px; font-weight: 800; background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%); color: #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              ${currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 12px; font-weight: 700; color: var(--text-primary); line-height: 1.2;">${currentUser.name}</span>
              <span style="font-size: 10px; font-weight: 600; color: var(--text-muted); line-height: 1;">${currentUser.role} • ID: ${currentUser.staffId}</span>
            </div>
          </div>
        </div>

        <!-- Main Tab Content Area -->
        <main class="page-content-container" id="tabContentArea" style="flex: 1; overflow: hidden; position: relative;">
          <!-- Dynamically loaded tabs -->
        </main>
      </div>
    </div>
  `;

  // DOM references
  const sidebarNav = container.querySelector('#sidebarNav');
  const toggleSidebarBtn = container.querySelector('#toggleSidebarBtn');
  const navTabs = container.querySelectorAll('.nav-tab-item');
  const tabContentArea = container.querySelector('#tabContentArea');
  const logoutBtn = container.querySelector('#logoutBtn');
  const mobileLogoutBtn = container.querySelector('#mobileLogoutBtn');

  // Wire Top Header Sync Buttons
  container.querySelectorAll('.headerSyncBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (db.isSyncing) return;
      btn.style.opacity = '0.6';
      btn.style.pointerEvents = 'none';
      
      const icons = container.querySelectorAll('.headerSyncIcon');
      const texts = container.querySelectorAll('.headerSyncText');
      
      icons.forEach(ic => { ic.textContent = 'sync'; ic.style.animation = 'spinIcon 1s linear infinite'; });
      texts.forEach(tx => tx.textContent = 'Syncing...');

      try {
        const ok = (activeTab === 'home') ? await db.syncGoogleSheets(null) : await db.syncSectionData(activeTab);
        if (ok) {
          icons.forEach(ic => { ic.textContent = 'cloud_done'; ic.style.animation = 'none'; });
          texts.forEach(tx => tx.textContent = 'All synced');
        } else {
          icons.forEach(ic => { ic.textContent = 'sync_problem'; ic.style.animation = 'none'; });
          texts.forEach(tx => tx.textContent = 'Sync failed (Retry)');
        }
      } catch (err) {
        icons.forEach(ic => { ic.textContent = 'sync_problem'; ic.style.animation = 'none'; });
        texts.forEach(tx => tx.textContent = 'Sync failed (Retry)');
      } finally {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
  });

  // ── Reactive Top Header Sync Status Indicator ────────────────────────────
  function updateTopSyncStatusUI() {
    const icons = container.querySelectorAll('.headerSyncIcon');
    const texts = container.querySelectorAll('.headerSyncText');
    const badges = container.querySelectorAll('.inline-sync-status-badge');

    if (db.isSyncing) {
      badges.forEach(b => {
        b.classList.remove('synced', 'error');
        b.classList.add('syncing');
      });
      icons.forEach(ic => {
        ic.textContent = 'sync';
        ic.style.animation = 'spinIcon 1s linear infinite';
      });
      texts.forEach(tx => tx.textContent = 'Syncing data...');
    } else if (db.syncError) {
      badges.forEach(b => {
        b.classList.remove('synced', 'syncing');
        b.classList.add('error');
      });
      icons.forEach(ic => {
        ic.textContent = 'sync_problem';
        ic.style.animation = 'none';
      });
      texts.forEach(tx => tx.textContent = 'Sync failed (Click)');
    } else {
      badges.forEach(b => {
        b.classList.remove('syncing', 'error');
        b.classList.add('synced');
      });
      icons.forEach(ic => {
        ic.textContent = 'cloud_done';
        ic.style.animation = 'none';
      });
      texts.forEach(tx => tx.textContent = 'All synced');
    }
  }

  // ── Reactive Badge Counters Update Function ──────────────────────────────
  function updateNavBadgeCounters() {
    const isSuper = (currentUser.role || '').toLowerCase() === 'super';
    const myName = (currentUser.name || '').trim().toLowerCase();
    const myId = (currentUser.staffId || '').trim().toLowerCase();

    // 1. Pickup Requests Active Count (Private per user unless elevated role)
    const userPickupRequests = db.getPickupRequestsForUser ? db.getPickupRequestsForUser(currentUser) : (db.requests || []);
    const activePickupCount = userPickupRequests.filter(r => {
      const st = String(r.status || '').toLowerCase().trim();
      return st === 'pending';
    }).length;

    // 2. Picking Tasks Active Count (Private per user unless elevated role)
    const rawPickingTasks = db.getPickingTasksForUser ? db.getPickingTasksForUser(currentUser) : (db.pickingTasks || []);
    const activePickingCount = rawPickingTasks.filter(pt => {
      const st = String(pt.status || '').toLowerCase().trim();
      return st === 'picking' || st === 'in progress';
    }).length;

    // 3. Stock Movements Active Count (Private per user unless elevated role)
    const userMovements = db.getStockMovementsForUser ? db.getStockMovementsForUser(currentUser) : (db.stockMovements || []);
    const activeMovementCount = userMovements.filter(m => {
      const st = String(m.status || '').toLowerCase().trim();
      return st === 'pending';
    }).length;

    // Total count for Mobile More Button Badge
    const totalMoreActiveCount = (canMovement ? activeMovementCount : 0);

    // Apply to badge elements in DOM
    container.querySelectorAll('.nav-badge-count[data-badge="requestPickup"]').forEach(el => {
      if (canPickup && activePickupCount > 0) {
        el.textContent = activePickupCount > 99 ? '99+' : activePickupCount;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });

    container.querySelectorAll('.nav-badge-count[data-badge="pickingTask"]').forEach(el => {
      if (canPicking && activePickingCount > 0) {
        el.textContent = activePickingCount > 99 ? '99+' : activePickingCount;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });

    container.querySelectorAll('.nav-badge-count[data-badge="stockMovement"]').forEach(el => {
      if (canMovement && activeMovementCount > 0) {
        el.textContent = activeMovementCount > 99 ? '99+' : activeMovementCount;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });

    container.querySelectorAll('.nav-badge-count[data-badge="moreNavBtn"]').forEach(el => {
      if (totalMoreActiveCount > 0) {
        el.textContent = totalMoreActiveCount > 99 ? '99+' : totalMoreActiveCount;
        el.style.display = 'inline-flex';
      } else {
        el.style.display = 'none';
      }
    });
  }

  // Initial calculation & subscription for live updates
  updateNavBadgeCounters();
  updateTopSyncStatusUI();

  const unsubscribeBadges = db.subscribe(() => {
    if (container.isConnected) {
      updateNavBadgeCounters();
      updateTopSyncStatusUI();
    } else {
      unsubscribeBadges();
    }
  });

  // Toggle Sidebar Collapse (Desktop)
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      sidebarNav.classList.toggle('collapsed', isCollapsed);
      localStorage.setItem('irms_sidebar_collapsed', isCollapsed);
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', onLogout);

  // ── Refresh Options Modal (Regular Refresh vs Flush Cache & Full Resync) ──
  function openRefreshOptionsModal() {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'z-index: 9999 !important;';

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 420px; width: 90%; border-radius: 24px; text-align: center; padding: 24px; box-sizing: border-box;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #eff6ff; color: var(--primary-600); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span class="material-icons-round" style="font-size: 28px;">sync</span>
        </div>
        
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: var(--text-primary);">Data Refresh Options</h3>
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.4;">
          Choose how you would like to synchronize application data:
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box;">
          <button id="modalRegularRefreshBtn" class="btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; border-radius: 12px; background: linear-gradient(135deg, #1565c0, #0d47a1) !important; color: #ffffff !important; border: none; cursor: pointer;">
            <span class="material-icons-round" style="font-size: 20px !important; color: #ffffff !important; display: inline-block !important; visibility: visible !important;">autorenew</span>
            <span style="color: #ffffff !important; font-weight: 700 !important; font-size: 13px !important; display: inline-block !important; visibility: visible !important;">Regular Refresh (Fetch Updates)</span>
          </button>

          <button id="modalFlushCacheBtn" class="btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; height: 46px; border-radius: 12px; color: #dc2626 !important; border: 1.5px solid #fecaca; background: #fff5f5 !important; cursor: pointer;">
            <span class="material-icons-round" style="font-size: 20px !important; color: #dc2626 !important; display: inline-block !important; visibility: visible !important;">delete_sweep</span>
            <span style="color: #dc2626 !important; font-weight: 700 !important; font-size: 13px !important; display: inline-block !important; visibility: visible !important;">Flush Cache & Full Resync</span>
          </button>

          <button id="modalCancelRefreshBtn" class="btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; height: 40px; margin-top: 4px; font-weight: 600; font-size: 13px; border-radius: 10px; color: #475569 !important;">
            Cancel
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);
    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('#modalCancelRefreshBtn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    modalOverlay.querySelector('#modalRegularRefreshBtn').addEventListener('click', async () => {
      closeModal();
      showBlockerLock('Fetching latest updates...');
      try {
        if (activeTab === 'sohwh') {
          await db.syncSectionData('sohwh');
        } else {
          await db.syncGoogleSheets(null);
        }
        showToast('Application data refreshed successfully!');
      } catch (err) {
        showToast('Refresh error: ' + (err.message || err));
      } finally {
        setTimeout(() => hideBlockerLock(), 300);
      }
    });

    modalOverlay.querySelector('#modalFlushCacheBtn').addEventListener('click', async () => {
      closeModal();
      showBlockerLock('Flushing local cache & resyncing all data...');
      try {
        await db.clearCacheAndResync();
        showToast('Local cache flushed & full resync completed!');
        switchTab(activeTab);
      } catch (err) {
        showToast('Flush cache error: ' + (err.message || err));
      } finally {
        setTimeout(() => hideBlockerLock(), 300);
      }
    });
  }

  // Wire Refresh Modal to Header Sync buttons and Floating Refresh buttons
  container.querySelectorAll('.headerSyncBtn, .floating-refresh-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRefreshOptionsModal();
    });
  });

  // ── Security Filtered Route Guard & Navigation ─────────────────────────────
  function showAccessDeniedToast(msg) {
    let toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#c92a2a;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.25);';
    toast.innerHTML = `<span class="material-icons-round" style="font-size:16px;">lock</span>${msg}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  async function switchTab(tabId) {
    const tabObj = ALL_PAGES.find(p => p.key === tabId) || { label: tabId };
    
    // Security Guard: Check user permission
    if (!hasUserAccess(currentUser, tabId)) {
      showAccessDeniedToast(`Access Denied: You do not have permission to access "${tabId}".`);
      tabId = 'home';
    }

    activeTab = tabId;
    window.irmsActiveTab = tabId;
    
    navTabs.forEach(btn => {
      if (btn.dataset.tab) {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      }
    });

    const moreBtn = container.querySelector('#mobileMoreNavBtn');
    if (moreBtn) {
      const isExtendedActive = extendedTabs.some(t => t.key === tabId);
      moreBtn.classList.toggle('active', isExtendedActive);
    }

    const targetArea = tabContentArea || container.querySelector('#tabContentArea');
    if (!targetArea) {
      console.error('tabContentArea container (#tabContentArea) is missing in DOM');
      return;
    }

    // Render section immediately from in-memory/IndexedDB cache (0ms instant response)
    if (tabId === 'home') renderHome(targetArea, currentUser);
    else if (tabId === 'pickingTask') renderPickingTask(targetArea, currentUser);
    else if (tabId === 'lostAndFound') renderLostAndFound(targetArea, currentUser);
    else if (tabId === 'soh') renderSoh(targetArea, currentUser);
    else if (tabId === 'sohwh') renderSohwh(targetArea, currentUser);
    else if (tabId === 'requestPickup') renderRequestPickup(targetArea, currentUser);
    else if (tabId === 'stockMovement') renderStockMovement(targetArea, currentUser);
    else if (tabId === 'tsRequest') renderTsRequest(targetArea, currentUser);
    else if (tabId === 'troubleShoot') renderTroubleShoot(targetArea, currentUser);
    else if (tabId === 'tsTask') renderTsTask(targetArea, currentUser);
    else if (tabId === 'admin') renderAdmin(targetArea, currentUser);
    else renderHome(targetArea, currentUser);

    // Real-Time & Background sync on tab switch
    const REALTIME_SECTIONS = ['tsRequest', 'tsTask', 'troubleShoot', 'pickingTask', 'requestPickup', 'lostAndFound', 'stockMovement'];
    if (REALTIME_SECTIONS.includes(tabId)) {
      // Always trigger a fast background refresh for operational queues so new tasks reflect immediately
      db.syncSectionData(tabId, { background: true });
    } else if (db.isSectionDataExpired(tabId) && !db.isSyncing) {
      db.syncSectionData(tabId, { background: true });
    }
  }

  // Attach tab click handlers
  navTabs.forEach(btn => {
    if (btn.dataset.tab) {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    }
  });

  // Attach Mobile More Menu button listener dynamically
  const mobileMoreBtn = container.querySelector('#mobileMoreNavBtn');
  if (mobileMoreBtn) {
    mobileMoreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMobileMoreNavigationModal();
    });
  }

  // Mobile More Navigation Bottom Sheet Drawer
  function openMobileMoreNavigationModal() {
    const existing = document.getElementById('mobileMoreNavModal');
    if (existing) existing.remove();

    if (!extendedTabs || extendedTabs.length === 0) return;

    const isSuper = (currentUser.role || '').toLowerCase() === 'super';
    const myName = (currentUser.name || '').trim().toLowerCase();
    const myId = (currentUser.staffId || '').trim().toLowerCase();

    const movements = db.getStockMovements ? db.getStockMovements() : (db.stockMovements || []);
    const activeMovementCount = movements.filter(m => {
      const st = String(m.status || '').toLowerCase();
      if (st === 'completed' || st === 'done' || st === 'cancelled' || st === 'canceled') {
        return false;
      }
      if (isSuper) return true;
      const sName = (m.staffName || '').trim().toLowerCase();
      const aBy = (m.assignedBy || '').trim().toLowerCase();
      return sName === myName || sName === myId || aBy === myName || aBy === myId;
    }).length;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'mobileMoreNavModal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = 'z-index: 5000; align-items: flex-end; justify-content: center; padding: 12px; animation: fadeIn 0.2s ease;';

    const cardsHtml = extendedTabs.map(t => {
      const isActive = activeTab === t.key;
      let badgeHtml = '';
      if (t.key === 'stockMovement' && activeMovementCount > 0) {
        badgeHtml = `<span class="nav-badge-count" style="top: -4px; right: -4px;">${activeMovementCount}</span>`;
      }
      return `
        <button class="more-nav-card ${isActive ? 'active' : ''}" data-tab="${t.key}" style="display: flex; align-items: center; gap: 10px; padding: 14px 12px; border-radius: 14px; border: 1.5px solid ${isActive ? 'var(--primary-600)' : 'var(--border-light)'}; background: ${isActive ? 'var(--primary-50)' : '#ffffff'}; text-align: left; cursor: pointer;">
          <div style="width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: var(--primary-600); display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative;">
            <span class="material-icons-round" style="font-size: 20px;">${t.icon}</span>
            ${badgeHtml}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${t.label}</div>
            <div style="font-size: 10px; color: var(--text-muted);">Access module</div>
          </div>
        </button>
      `;
    }).join('');

    modalOverlay.innerHTML = `
      <div class="modal-card form-modal-card" style="width: calc(100% - 24px); max-width: 440px; margin: 0 auto calc(80px + env(safe-area-inset-bottom, 0px)) auto; border-radius: 24px; padding: 20px 18px 24px; box-sizing: border-box; background: #ffffff; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25); animation: slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
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
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Permitted Modules</div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${cardsHtml}
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
