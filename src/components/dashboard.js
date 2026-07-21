import { renderRequestPickup } from './requestPickup.js';
import { renderPickingTask } from './pickingTask.js';
import { renderLostAndFound } from './lostAndFound.js';
import { db } from '../data/db.js';

export function renderDashboard(container, currentUser, onLogout) {
  let activeTab = 'requestPickup';
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
          <button class="nav-tab-item active" data-tab="requestPickup" title="Request Pickup">
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

      <!-- Main Module Body Container -->
      <main class="page-content-container" id="tabContentArea"></main>
    </div>
  `;

  const sidebarNav = container.querySelector('#sidebarNav');
  const toggleSidebarBtn = container.querySelector('#toggleSidebarBtn');
  const logoutBtn = container.querySelector('#logoutBtn');
  const mobileLogoutBtn = container.querySelector('#mobileLogoutBtn');
  const tabContentArea = container.querySelector('#tabContentArea');
  const navTabs = container.querySelectorAll('.nav-tab-item');

  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      sidebarNav.classList.toggle('collapsed', isCollapsed);
      localStorage.setItem('irms_sidebar_collapsed', isCollapsed);
    });
  }

  if (logoutBtn) logoutBtn.addEventListener('click', onLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', onLogout);

  function switchTab(tabId) {
    activeTab = tabId;
    window.irmsActiveTab = tabId;
    db.checkAndRefreshIfExpired();
    navTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    if (tabId === 'pickingTask') {
      renderPickingTask(tabContentArea, currentUser);
    } else if (tabId === 'lostAndFound') {
      renderLostAndFound(tabContentArea, currentUser);
    } else {
      renderRequestPickup(tabContentArea, currentUser);
    }
  }

  navTabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Default view
  switchTab('requestPickup');
}
