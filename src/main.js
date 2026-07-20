import { db } from './data/db.js';
import { renderLogin } from './components/login.js';
import { renderDashboard } from './components/dashboard.js';

class IRMSApp {
  constructor() {
    this.appRoot = document.getElementById('app');
    this.currentViewMode = 'desktop'; // 'desktop' or 'ios'
    this.currentUser = this.loadUserSession();
    this.init();
  }

  loadUserSession() {
    try {
      const saved = localStorage.getItem('irms_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  saveUserSession(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('irms_user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('irms_user_session');
    }
  }

  async init() {
    this.renderShell();
    this.renderLoadingState();
    
    // Wait for Google Sheets CSV sync to complete on app start
    await db.initPromise;
    
    this.renderShell();
    this.renderCurrentView();
  }

  renderLoadingState() {
    const viewContainer = document.getElementById('viewContainer');
    if (!viewContainer) return;

    viewContainer.innerHTML = `
      <div class="login-page-bg">
        <div class="login-card" style="text-align: center; padding: 40px 20px;">
          <div class="spinner" style="width: 40px; height: 40px; border-width: 4px; margin: 0 auto 16px; border-top-color: var(--primary-600);"></div>
          <h2 style="font-size: 18px; font-weight: 800; color: var(--primary-900);">Syncing Google Sheets...</h2>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 6px;">Fetching live User_DB & SO_DATA tabs</p>
        </div>
      </div>
    `;
  }

  renderShell() {
    const isLive = db.isLoaded && !db.syncError;
    const dotClass = isLive ? 'green' : (db.syncError ? 'red' : 'gray');
    const statusText = isLive ? 'Google Sheet Sync' : (db.syncError ? 'Sync Error' : 'Loading Sheet...');

    document.body.innerHTML = `
      <div class="app-mode-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 700;">
            <span class="material-icons-round" style="font-size: 18px; color: var(--primary-500);">dashboard</span>
            <span>IRMS Web App</span>
          </div>

          <button id="refetchGsheetBtn" class="gsheet-status-btn" title="Click to refetch live data from Google Sheets">
            <span class="status-dot ${dotClass}"></span>
            <span>${statusText}</span>
            <span class="material-icons-round" style="font-size: 14px;">sync</span>
          </button>
        </div>

        <div class="mode-toggle-group">
          <button class="mode-btn ${this.currentViewMode === 'desktop' ? 'active' : ''}" id="desktopModeBtn">
            <span class="material-icons-round" style="font-size: 16px;">desktop_windows</span>
            <span>Desktop View</span>
          </button>
          <button class="mode-btn ${this.currentViewMode === 'ios' ? 'active' : ''}" id="iosModeBtn">
            <span class="material-icons-round" style="font-size: 16px;">phone_iphone</span>
            <span>iOS Mobile View</span>
          </button>
        </div>
      </div>

      <div id="app"></div>
    `;

    this.appRoot = document.getElementById('app');

    const desktopBtn = document.getElementById('desktopModeBtn');
    const iosBtn = document.getElementById('iosModeBtn');
    const refetchBtn = document.getElementById('refetchGsheetBtn');

    desktopBtn.addEventListener('click', () => {
      this.currentViewMode = 'desktop';
      desktopBtn.classList.add('active');
      iosBtn.classList.remove('active');
      this.renderCurrentView();
    });

    iosBtn.addEventListener('click', () => {
      this.currentViewMode = 'ios';
      iosBtn.classList.add('active');
      desktopBtn.classList.remove('active');
      this.renderCurrentView();
    });

    refetchBtn.addEventListener('click', async () => {
      refetchBtn.disabled = true;
      refetchBtn.querySelector('span:nth-child(2)').textContent = 'Syncing...';
      await db.syncGoogleSheets();
      this.renderShell();
      this.renderCurrentView();
    });
  }

  renderCurrentView() {
    const isIos = this.currentViewMode === 'ios';

    this.appRoot.innerHTML = `
      <div class="layout-wrapper ${isIos ? 'ios-frame-mode' : 'desktop-mode'}">
        ${isIos ? `
          <div class="ios-device">
            <div class="ios-dynamic-island"></div>
            <div class="ios-screen" id="viewContainer"></div>
          </div>
        ` : `
          <div style="width: 100%; min-height: 100%; display: flex; flex-direction: column;" id="viewContainer"></div>
        `}
      </div>
    `;

    const viewContainer = document.getElementById('viewContainer');

    if (!this.currentUser) {
      renderLogin(viewContainer, async (userSession) => {
        this.saveUserSession(userSession);
        
        // Trigger live Google Sheets sync every time login happens
        await db.syncGoogleSheets();
        
        this.renderCurrentView();
      });
    } else {
      renderDashboard(viewContainer, this.currentUser, () => {
        this.saveUserSession(null);
        this.renderCurrentView();
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IRMSApp();
});
