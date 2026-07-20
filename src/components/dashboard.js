import { renderRequestPickup } from './requestPickup.js';

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
            <span class="material-icons-round">local_shipping</span>
            <span class="nav-label">Pickup</span>
          </button>

          <button class="nav-tab-item" data-tab="registerInbound" title="Register / Inbound">
            <span class="material-icons-round">add_box</span>
            <span class="nav-label">Inbound</span>
          </button>

          <button class="nav-tab-item" data-tab="keepStock" title="Keep / Stock">
            <span class="material-icons-round">inventory_2</span>
            <span class="nav-label">Stock</span>
          </button>

          <button class="nav-tab-item" data-tab="stockMovement" title="Stock Movement">
            <span class="material-icons-round">swap_horiz</span>
            <span class="nav-label">Movement</span>
          </button>

          <button class="nav-tab-item" data-tab="staging" title="Staging / Outbound">
            <span class="material-icons-round">layers</span>
            <span class="nav-label">Staging</span>
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
    navTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    if (tabId === 'requestPickup') {
      renderRequestPickup(tabContentArea, currentUser);
    } else {
      renderModulePlaceholder(tabContentArea, tabId);
    }
  }

  navTabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Default view
  switchTab('requestPickup');
}

function renderModulePlaceholder(container, tabId) {
  const titles = {
    registerInbound: { title: 'Register / Inbound / GRN', icon: 'add_box', desc: 'Data entry for warehouse excess items from Vendor, Inventory, or Outbound processes.' },
    keepStock: { title: 'Keep / Stock Management', icon: 'inventory_2', desc: 'Core SOH excess management, SKU Aging, Source Ratio, and Location lookup.' },
    stockMovement: { title: 'Stock Movement', icon: 'swap_horiz', desc: 'Relocate excess items within IRMS warehouse zones.' },
    staging: { title: 'Staging / Replenishment', icon: 'layers', desc: 'Pick face process for staging items matched with SO today.' }
  };

  const info = titles[tabId] || { title: 'Module', icon: 'apps', desc: '' };

  container.innerHTML = `
    <div class="card-panel" style="text-align: center; padding: 60px 20px;">
      <div class="brand-logo-icon" style="margin-bottom: 16px;">
        <span class="material-icons-round" style="font-size: 40px; color: var(--primary-600);">${info.icon}</span>
      </div>
      <h2 style="font-size: 22px; font-weight: 800; color: var(--primary-900); margin-bottom: 8px;">${info.title}</h2>
      <p style="font-size: 14px; color: var(--text-secondary); max-width: 500px; margin: 0 auto 24px;">${info.desc}</p>
      <div class="autofill-badge success" style="display: inline-flex;">
        <span class="material-icons-round">info</span>
        <span>Module scheduled in Executive Roadmap</span>
      </div>
    </div>
  `;
}
