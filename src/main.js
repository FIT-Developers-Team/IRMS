import { db } from './data/db.js';
import { renderLogin } from './components/login.js';
import { renderDashboard } from './components/dashboard.js';
import { showBlockerLock, hideBlockerLock } from './utils/blocker.js';

class IRMSApp {
  constructor() {
    this.appRoot = document.getElementById('app');
    this.sessionCheckInterval = null;
    this.currentUser = this.loadUserSession();
    this.init();

    // Helper for debugging/testing session expiration directly from console
    window.irmsExpireSessionNow = () => {
      this.promptSessionExpired();
    };
  }

  loadUserSession() {
    try {
      const saved = localStorage.getItem('irms_user_session');
      if (!saved) return null;
      const data = JSON.parse(saved);

      if (data && data.expiresAt) {
        if (Date.now() > data.expiresAt) {
          localStorage.removeItem('irms_user_session');
          return null;
        }
        return data.user;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  saveUserSession(user, durationMs = 4 * 60 * 60 * 1000) {
    this.currentUser = user;
    if (user) {
      const sessionData = {
        user: user,
        loggedInAt: Date.now(),
        expiresAt: Date.now() + durationMs
      };
      localStorage.setItem('irms_user_session', JSON.stringify(sessionData));
      this.startSessionExpiryCheck();
    } else {
      localStorage.removeItem('irms_user_session');
      this.stopSessionExpiryCheck();
    }
  }

  startSessionExpiryCheck() {
    this.stopSessionExpiryCheck();
    if (!this.currentUser) return;

    this.sessionCheckInterval = setInterval(() => {
      const activeUser = this.loadUserSession();
      if (!activeUser && this.currentUser) {
        this.stopSessionExpiryCheck();
        this.promptSessionExpired();
      }
    }, 15000);
  }

  stopSessionExpiryCheck() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  promptSessionExpired() {
    this.saveUserSession(null);

    const existingModal = document.getElementById('sessionExpiredModal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'sessionExpiredModal';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
      <div class="modal-card" style="max-width: 420px; text-align: center; padding: 32px 24px; align-items: center;">
        <div style="width: 64px; height: 64px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
          <span class="material-icons-round" style="font-size: 36px; color: var(--danger-500, #ef4444);">timer_off</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: var(--primary-900);">Session Expired</h2>
        <p style="font-size: 14px; color: var(--text-secondary); margin-top: 8px; line-height: 1.5;">
          Your login session has timed out. Please log in again to continue accessing the IRMS portal.
        </p>
        <button id="reloginConfirmBtn" class="btn-primary" style="margin-top: 24px; width: 100%; justify-content: center;">
          <span>Log In Again</span>
          <span class="material-icons-round">login</span>
        </button>
      </div>
    `;

    document.body.appendChild(modalOverlay);

    const reloginBtn = modalOverlay.querySelector('#reloginConfirmBtn');
    if (reloginBtn) {
      reloginBtn.addEventListener('click', () => {
        modalOverlay.remove();
        this.renderCurrentView();
      });
    }
  }

  async init() {
    this.renderShell();
    this.renderLoadingState();
    
    // Wait for Google Sheets CSV sync to complete on app start
    await db.initPromise;
    
    this.renderShell();
    this.renderCurrentView();

    if (this.currentUser) {
      this.startSessionExpiryCheck();
    }
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
    document.body.innerHTML = `
      <div id="app"></div>

      <button id="floatingRefreshBtn" class="floating-refresh-btn" title="Click to refresh live data for current menu">
        <span class="material-icons-round">refresh</span>
        <span>Refresh Data</span>
      </button>
    `;

    this.appRoot = document.getElementById('app');
    const floatingRefreshBtn = document.getElementById('floatingRefreshBtn');

    if (floatingRefreshBtn) {
      floatingRefreshBtn.addEventListener('click', async () => {
        floatingRefreshBtn.disabled = true;
        const activeTab = window.irmsActiveTab || 'requestPickup';
        let tabsToSync = [];
        let syncLabel = 'Syncing data from Google Sheets...';

        if (activeTab === 'requestPickup') {
          tabsToSync = ['requestChecker', 'soData'];
          syncLabel = 'Syncing Pickup Requests from Google Sheets...';
        } else if (activeTab === 'pickingTask') {
          tabsToSync = ['pickingTask', 'requestChecker'];
          syncLabel = 'Syncing Picking Tasks from Google Sheets...';
        } else if (activeTab === 'lostAndFound') {
          tabsToSync = ['lostAndFound', 'racks'];
          syncLabel = 'Syncing Lost & Found from Google Sheets...';
        }

        showBlockerLock(syncLabel);
        try {
          await db.syncGoogleSheets(tabsToSync);
          this.renderCurrentView();
        } finally {
          hideBlockerLock();
          floatingRefreshBtn.disabled = false;
        }
      });
    }
  }

  renderCurrentView() {
    this.appRoot.innerHTML = `
      <div class="layout-wrapper desktop-mode">
        <div style="width: 100%; min-height: 100%; display: flex; flex-direction: column;" id="viewContainer"></div>
      </div>
    `;

    const viewContainer = document.getElementById('viewContainer');
    const floatingRefreshBtn = document.getElementById('floatingRefreshBtn');

    if (!this.currentUser) {
      if (floatingRefreshBtn) floatingRefreshBtn.style.display = 'none';
      renderLogin(viewContainer, async (userSession) => {
        this.saveUserSession(userSession);
        
        // Trigger live Google Sheets sync every time login happens
        await db.syncGoogleSheets();
        
        this.renderCurrentView();
      });
    } else {
      if (floatingRefreshBtn) floatingRefreshBtn.style.display = 'flex';
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
