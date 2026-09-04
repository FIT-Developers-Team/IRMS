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
import { hasUserAccess, getUserAccessiblePages, getUserAccessibleMenu, ALL_PAGES } from '../utils/security.js';
import { showBlockerLock, hideBlockerLock } from '../utils/blocker.js';

export function renderDashboard(container, currentUser, onLogout) {
  let activeTab = 'home';
  let isCollapsed = localStorage.getItem('irms_sidebar_collapsed') === 'true';

  // Evaluate RBAC-filtered hierarchical menu
  const accessibleMenu = getUserAccessibleMenu(currentUser);

  const canPickup = hasUserAccess(currentUser, 'requestPickup');
  const canPicking = hasUserAccess(currentUser, 'pickingTask');
  const canSoh = hasUserAccess(currentUser, 'soh');
  const canLostFound = hasUserAccess(currentUser, 'lostAndFound');
  const canMovement = hasUserAccess(currentUser, 'stockMovement');
  const canTroubleShoot = hasUserAccess(currentUser, 'troubleShoot');
  const canTsRequest = hasUserAccess(currentUser, 'tsRequest');
  const canTsTask = hasUserAccess(currentUser, 'tsTask');
  const canAdmin = hasUserAccess(currentUser, 'admin');

  // Helper descriptions for mobile submenu modal
  const itemDescriptions = {
    requestPickup: 'Create & track pickup requests',
    pickingTask: 'Warehouse picking execution',
    lostAndFound: 'Investigate missing or misplaced items',
    soh: 'Store inventory levels & locations',
    sohwh: 'Warehouse stock lookup & inquiry',
    stockMovement: 'Stock movements & deductions',
    troubleShoot: 'Manage troubleshooting tickets',
    tsRequest: 'Submit new troubleshoot request',
    tsTask: 'Execute assigned troubleshoot tasks',
    admin: 'Manage system settings & users'
  };

  // Build the hierarchical menu HTML
  const menuHtml = accessibleMenu.map(entry => {
    if (entry.type === 'item') {
      const isDivider = entry.key === 'admin';
      return `
        ${isDivider ? '<div class="sidebar-divider desktop-only-nav-item"></div>' : ''}
        <button class="nav-tab-item ${entry.key === 'home' ? 'active' : ''} ${entry.key === 'admin' ? 'nav-tab-admin' : ''}" data-tab="${entry.key}" title="${entry.label}">
          <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
            <span class="material-icons-round">${entry.icon}</span>
          </div>
          <span class="nav-label">${entry.label}</span>
        </button>
      `;
    }

    if (entry.type === 'group') {
      const subItemsHtml = entry.children.map(child => {
        return `
          <button class="nav-tab-item nav-sub-item" data-tab="${child.key}" data-parent-group="${entry.key}" title="${child.label}">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round" style="font-size: 18px;">${child.icon}</span>
              <span class="nav-badge-count" data-badge="${child.key}" style="display: none;">0</span>
            </div>
            <span class="nav-label">${child.label}</span>
          </button>
        `;
      }).join('');

      return `
        <div class="nav-group" data-group="${entry.key}">
          <button class="nav-tab-item nav-group-header" data-group-header="${entry.key}" title="${entry.label}">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <span class="material-icons-round">${entry.icon}</span>
              <span class="nav-badge-count group-badge" data-group-badge="${entry.key}" style="display: none;">0</span>
            </div>
            <span class="nav-label">${entry.label}</span>
            <span class="material-icons-round nav-group-chevron">expand_more</span>
          </button>
          <div class="nav-group-submenu">
            ${subItemsHtml}
          </div>
        </div>
      `;
    }
    return '';
  }).join('');

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
          ${menuHtml}
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
  function getBadgeCounts() {
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

    // 4. Troubleshoot tickets (open/assigned)
    const tsTickets = db.getTroubleShootTicketsForUser ? db.getTroubleShootTicketsForUser(currentUser) : (db.troubleShootTickets || []);
    const activeTsTicketsCount = tsTickets.filter(t => {
      const st = String(t.statusTicket || '').toLowerCase().trim();
      return st === 'open' || st === 'assigned';
    }).length;

    // 5. TS Tasks (assigned to user / picked up)
    const tsTasks = db.getTroubleShootTasksForUser ? db.getTroubleShootTasksForUser(currentUser) : (db.troubleShootTickets || []);
    const activeTsTasksCount = tsTasks.filter(t => {
      const st = String(t.statusTicket || '').toLowerCase().trim();
      return st === 'assigned' || st === 'picked up';
    }).length;

    return {
      requestPickup: canPickup ? activePickupCount : 0,
      pickingTask: canPicking ? activePickingCount : 0,
      stockMovement: canMovement ? activeMovementCount : 0,
      troubleShoot: canTroubleShoot ? activeTsTicketsCount : 0,
      tsTask: canTsTask ? activeTsTasksCount : 0,
      tsRequest: 0,
      lostAndFound: 0,
      soh: 0,
      sohwh: 0,
      home: 0,
      admin: 0
    };
  }

  function updateNavBadgeCounters() {
    const counts = getBadgeCounts();

    // 1. Update individual sub-item badges
    Object.keys(counts).forEach(key => {
      const count = counts[key];
      container.querySelectorAll(`.nav-badge-count[data-badge="${key}"]`).forEach(el => {
        if (count > 0) {
          el.textContent = count > 99 ? '99+' : count;
          el.style.display = 'inline-flex';
        } else {
          el.style.display = 'none';
        }
      });
    });

    // 2. Update group badges (sum of permitted children in each group)
    accessibleMenu.forEach(entry => {
      if (entry.type === 'group' && entry.children) {
        const groupTotal = entry.children.reduce((acc, child) => acc + (counts[child.key] || 0), 0);
        container.querySelectorAll(`.nav-badge-count[data-group-badge="${entry.key}"]`).forEach(el => {
          if (groupTotal > 0) {
            el.textContent = groupTotal > 99 ? '99+' : groupTotal;
            el.style.display = 'inline-flex';
          } else {
            el.style.display = 'none';
          }
        });
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

  function isMobileView() {
    return window.innerWidth <= 768 || !!document.querySelector('.ios-screen');
  }

  // ── Mobile Submenu Modal (Positioned on top of bottom navigation bar) ──────
  function openMobileSubmenuModal(groupKey) {
    const existing = document.getElementById('mobileSubmenuModal');
    if (existing) existing.remove();

    const groupEntry = accessibleMenu.find(m => m.type === 'group' && m.key === groupKey);
    if (!groupEntry || !groupEntry.children || groupEntry.children.length === 0) return;

    const counts = getBadgeCounts();

    const itemsHtml = groupEntry.children.map(child => {
      const isActive = activeTab === child.key;
      const count = counts[child.key] || 0;
      const badgeHtml = count > 0 
        ? `<span class="nav-badge-count" style="position: static; margin-left: 6px; display: inline-flex;">${count > 99 ? '99+' : count}</span>` 
        : '';
      const desc = itemDescriptions[child.key] || 'Access module';

      return `
        <button class="mobile-sub-card ${isActive ? 'active' : ''}" data-tab="${child.key}">
          <div class="mobile-sub-icon-wrap">
            <span class="material-icons-round">${child.icon}</span>
          </div>
          <div class="mobile-sub-content">
            <div class="mobile-sub-title-row">
              <span class="mobile-sub-title">${child.label}</span>
              ${badgeHtml}
            </div>
            <span class="mobile-sub-desc">${desc}</span>
          </div>
          <span class="material-icons-round mobile-sub-arrow">chevron_right</span>
        </button>
      `;
    }).join('');

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'mobileSubmenuModal';
    modalOverlay.className = 'mobile-submenu-overlay';

    modalOverlay.innerHTML = `
      <div class="mobile-submenu-card">
        <!-- Drag indicator pill -->
        <div class="mobile-submenu-pill"></div>

        <!-- Header -->
        <div class="mobile-submenu-header">
          <div class="mobile-submenu-header-title">
            <div class="mobile-submenu-header-icon">
              <span class="material-icons-round">${groupEntry.icon}</span>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: var(--text-primary);">${groupEntry.label} Modules</h3>
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Select an action or module</span>
            </div>
          </div>
          <button id="closeMobileSubmenuBtn" class="mobile-submenu-close-btn" title="Close">
            <span class="material-icons-round">close</span>
          </button>
        </div>

        <!-- List of permitted sub-items -->
        <div class="mobile-submenu-list">
          ${itemsHtml}
        </div>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const closeModal = () => modalOverlay.remove();
    modalOverlay.querySelector('#closeMobileSubmenuBtn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    modalOverlay.querySelectorAll('.mobile-sub-card').forEach(cardBtn => {
      cardBtn.addEventListener('click', () => {
        const tab = cardBtn.dataset.tab;
        closeModal();
        switchTab(tab);
      });
    });
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
    
    // Find parent group (if any)
    let parentGroupKey = null;
    accessibleMenu.forEach(entry => {
      if (entry.type === 'group' && entry.children && entry.children.some(c => c.key === tabId)) {
        parentGroupKey = entry.key;
      }
    });

    // Update active tab buttons (standalone items + sub-items)
    container.querySelectorAll('.nav-tab-item[data-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update group headers (for mobile bottom bar and desktop sidebar)
    container.querySelectorAll('.nav-group-header').forEach(header => {
      const isParentActive = header.dataset.groupHeader === parentGroupKey;
      header.classList.toggle('active-parent', isParentActive);
      header.classList.toggle('active', isParentActive);
    });

    // On desktop, auto-expand parent group if tab belongs to it
    if (parentGroupKey && !isMobileView()) {
      const parentGroupEl = container.querySelector(`.nav-group[data-group="${parentGroupKey}"]`);
      if (parentGroupEl && !parentGroupEl.classList.contains('expanded')) {
        parentGroupEl.classList.add('expanded');
      }
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

    // If section data is expired, run a non-blocking background sync with live indicator
    if (db.isSectionDataExpired(tabId) && !db.isSyncing) {
      db.syncSectionData(tabId);
    }
  }

  // Attach tab click handlers for all items with [data-tab]
  container.querySelectorAll('.nav-tab-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Attach group header click handlers (toggle on desktop, modal on mobile)
  container.querySelectorAll('.nav-group-header').forEach(headerBtn => {
    headerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const groupKey = headerBtn.dataset.groupHeader;

      if (isMobileView()) {
        openMobileSubmenuModal(groupKey);
      } else {
        // Desktop: toggle submenu expansion
        if (isCollapsed) {
          isCollapsed = false;
          sidebarNav.classList.remove('collapsed');
          localStorage.setItem('irms_sidebar_collapsed', 'false');
        }
        const navGroup = headerBtn.closest('.nav-group');
        if (navGroup) {
          navGroup.classList.toggle('expanded');
        }
      }
    });
  });

  // Initialize with 'home' tab
  switchTab(activeTab);
}
