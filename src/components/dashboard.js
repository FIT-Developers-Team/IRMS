import { renderRequestPickup } from './requestPickup.js';
import { renderPickingTask } from './pickingTask.js';
import { renderLostAndFound } from './lostAndFound.js';
import { renderSoh } from './soh.js';
import { renderHome } from './home.js';
import { renderAdmin } from './admin.js';
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
        
        <div style="display: flex; align-items: center; gap: 10px;">
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
          <button class="nav-tab-item active" data-tab="home" title="Home">
            <span class="material-icons-round">home</span>
            <span class="nav-label">Home</span>
          </button>

          <button class="nav-tab-item" data-tab="requestPickup" title="Request Pickup">
            <span class="material-icons-round">outbox</span>
            <span class="nav-label">Request Pickup</span>
          </button>

          <button class="nav-tab-item" data-tab="pickingTask" title="Picking Task">
            <span class="material-icons-round">fact_check</span>
            <span class="nav-label">Picking</span>
          </button>

          <button class="nav-tab-item" data-tab="lostAndFound" title="Lost & Found">
            <span class="material-icons-round">travel_explore</span>
            <span class="nav-label">Lost & Found</span>
          </button>

          <button class="nav-tab-item" data-tab="soh" title="Stock On Hand">
            <span class="material-icons-round">inventory_2</span>
            <span class="nav-label">Stock On Hand</span>
          </button>

          ${currentUser.role === 'Super' ? `
          <div class="sidebar-divider"></div>
          <button class="nav-tab-item nav-tab-admin" data-tab="admin" title="Admin Panel">
            <span class="material-icons-round">admin_panel_settings</span>
            <span class="nav-label">Admin</span>
          </button>` : ''}
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

      <!-- Main Content Wrapper (status bar + tab content) -->
      <div class="main-content-wrapper">

        <!-- Connection / Sync Status Bar -->
        <div id="syncStatusBar" class="sync-status-bar sync-status-hidden">
          <div class="sync-status-inner">
            <span id="syncStatusIcon" class="sync-status-icon material-icons-round">sync</span>
            <span id="syncStatusText" class="sync-status-text">Syncing data...</span>
          </div>
        </div>

        <!-- Main Module Body Container -->
        <main class="page-content-container" id="tabContentArea"></main>
      </div>

    </div>
  `;

  const sidebarNav = container.querySelector('#sidebarNav');
  const toggleSidebarBtn = container.querySelector('#toggleSidebarBtn');
  const logoutBtn = container.querySelector('#logoutBtn');
  const mobileLogoutBtn = container.querySelector('#mobileLogoutBtn');
  const tabContentArea = container.querySelector('#tabContentArea');
  const navTabs = container.querySelectorAll('.nav-tab-item');
  const syncStatusBar = container.querySelector('#syncStatusBar');
  const syncStatusIcon = container.querySelector('#syncStatusIcon');
  const syncStatusText = container.querySelector('#syncStatusText');

  // ── Sync Status Bar ────────────────────────────────────────────────────────

  let syncHideTimer = null;

  function updateSyncStatusBar() {
    if (!syncStatusBar) return;

    clearTimeout(syncHideTimer);

    if (db.isSyncing) {
      // Actively fetching — show syncing state
      syncStatusBar.className = 'sync-status-bar sync-status-syncing';
      syncStatusIcon.textContent = 'sync';
      syncStatusText.textContent = 'Syncing data from Google Sheets…';
    } else if (db.syncError) {
      // Failed — show error state and keep it visible
      syncStatusBar.className = 'sync-status-bar sync-status-error';
      syncStatusIcon.textContent = 'cloud_off';
      syncStatusText.textContent = 'Sync failed — check your network connection';
    } else if (db.isLoaded) {
      // Success — show synced confirmation, then fade out after 3s
      syncStatusBar.className = 'sync-status-bar sync-status-synced';
      syncStatusIcon.textContent = 'cloud_done';
      const lastSync = db.lastSyncTime
        ? new Date(db.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';
      syncStatusText.textContent = lastSync
        ? `All data up to date · Last synced at ${lastSync}`
        : 'All data up to date';

      syncHideTimer = setTimeout(() => {
        syncStatusBar.className = 'sync-status-bar sync-status-hidden';
      }, 3000);
    } else {
      syncStatusBar.className = 'sync-status-bar sync-status-hidden';
    }
  }

  // Subscribe to DB changes to update the status bar in real-time
  const unsubscribeSyncBar = db.subscribe(() => {
    if (!syncStatusBar || !syncStatusBar.isConnected) {
      unsubscribeSyncBar();
      return;
    }
    updateSyncStatusBar();
  });

  // Show immediately if already syncing on mount (e.g. post-login reference sync)
  updateSyncStatusBar();

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

  // ── Tab Routing ────────────────────────────────────────────────────────────

  function switchTab(tabId) {
    try {
      activeTab = tabId;
      window.irmsActiveTab = tabId;
      db.checkAndRefreshIfExpired();
      
      navTabs.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });

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
      } else if (tabId === 'admin') {
        renderAdmin(targetArea, currentUser);
      } else {
        renderHome(targetArea, currentUser);
      }

      // Lazy-load section data in background — only if TTL has expired for this section.
      // The sync button bypasses this guard by calling syncSectionData directly.
      if (tabId !== 'home' && db.isSectionDataExpired(tabId)) {
        db.syncSectionData(tabId).catch(err => {
          console.warn('[Lazy section sync failed]', tabId, err);
        });
      }
    } catch (err) {
      console.error('[switchTab Navigation Error]', err);
    }
  }

  navTabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Default view
  switchTab('home');
}
