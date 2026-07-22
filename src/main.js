import { db } from './data/db.js';
import { renderLogin } from './components/login.js';
import { renderDashboard } from './components/dashboard.js';
import { showBlockerLock, hideBlockerLock } from './utils/blocker.js';

class IRMSApp {
  constructor() {
    this.appRoot = document.getElementById('app');
    this.sessionCheckInterval = null;
    this.currentUser = this.loadUserSession();
    
    // Subscribe to DB changes to update sync status UI in real-time
    db.subscribe(() => {
      this.updateSyncStatusUI();
    });

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

      <div id="floatingSyncStatusBtn" class="floating-sync-status-btn synced" title="All changes synced with Google Sheets" style="display: none;">
        <span class="material-icons-round font-icon">cloud_done</span>
        <span class="status-label">All synced</span>
      </div>
    `;

    this.appRoot = document.getElementById('app');
    const floatingSyncStatusBtn = document.getElementById('floatingSyncStatusBtn');

    if (floatingSyncStatusBtn) {
      floatingSyncStatusBtn.addEventListener('click', async () => {
        const pendingCount = db.putawayRecords.filter(p => p.syncState === 'pending').length;
        const failedCount = db.putawayRecords.filter(p => p.syncState === 'failed').length;
        const isSyncActive = db.isSyncing || pendingCount > 0 || failedCount > 0;

        if (isSyncActive) {
          // Show the detailed sync progress popup modal
          this.showSyncProgressModal();
        } else {
          // Perform live data refresh only
          showToast('Refreshing live data from Google Sheets...');
          const activeTab = window.irmsActiveTab || 'requestPickup';
          let tabsToSync = [];
          let syncLabel = 'Syncing data from Google Sheets...';

          if (activeTab === 'requestPickup') {
            tabsToSync = ['requestChecker', 'soData'];
            syncLabel = 'Syncing Pickup Requests from Google Sheets...';
          } else if (activeTab === 'pickingTask') {
            tabsToSync = ['pickingTask', 'requestChecker', 'putaway', 'soh', 'skusDb'];
            syncLabel = 'Syncing Picking Tasks, Putaway & SOH...';
          } else if (activeTab === 'lostAndFound') {
            tabsToSync = ['lostAndFound', 'racks', 'skusDb'];
            syncLabel = 'Syncing Lost & Found & SKU Reference...';
          }

          try {
            await db.syncGoogleSheets(tabsToSync);
            this.renderCurrentView();
            showToast('Refreshed data successfully!');
          } catch(e) {
            showToast('Refresh failed. Please check network.');
          }
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
    const floatingSyncStatusBtn = document.getElementById('floatingSyncStatusBtn');

    if (!this.currentUser) {
      if (floatingSyncStatusBtn) floatingSyncStatusBtn.style.display = 'none';
      renderLogin(viewContainer, async (userSession) => {
        this.saveUserSession(userSession);
        
        // Trigger live Google Sheets sync every time login happens
        await db.syncGoogleSheets();
        
        this.renderCurrentView();
      });
    } else {
      this.updateSyncStatusUI();
      renderDashboard(viewContainer, this.currentUser, () => {
        this.saveUserSession(null);
        this.renderCurrentView();
      });
    }
  }

  showSyncProgressModal() {
    const existing = document.getElementById('syncProgressModal');
    if (existing) existing.remove();

    const pending = db.putawayRecords.filter(p => p.syncState === 'pending');
    const failed = db.putawayRecords.filter(p => p.syncState === 'failed');
    
    let activeTasksHtml = '';
    
    if (db.isSyncing) {
      activeTasksHtml += `
        <div style="display: flex; align-items: center; gap: 12px; background: #eff6ff; padding: 12px; border-radius: 12px; border: 1px solid #bfdbfe; margin-bottom: 10px;">
          <div class="spinner" style="border-top-color: var(--primary-600); width: 16px; height: 16px;"></div>
          <span style="font-size: 13px; font-weight: 700; color: var(--primary-800);">Fetch Sync: Pulling live sheets data...</span>
        </div>
      `;
    }

    if (pending.length > 0) {
      activeTasksHtml += `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Syncing in Progress (${pending.length})</div>
          ${pending.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 12px; border: 1px solid var(--border-light); border-radius: 10px; margin-bottom: 6px; font-size: 12px;">
              <span style="font-weight: 700; font-family: monospace;">Putaway #${p.putawayId}</span>
              <span style="color: #64748b; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 14px; animation: spin 1s linear infinite;">sync</span>
                Sending...
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (failed.length > 0) {
      activeTasksHtml += `
        <div style="margin-bottom: 12px;">
          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Unsynced Queue (${failed.length})</div>
          ${failed.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: #fff5f5; padding: 10px 12px; border: 1px solid #fed7d7; border-radius: 10px; margin-bottom: 6px; font-size: 12px;">
              <span style="font-weight: 700; font-family: monospace; color: #c53030;">Putaway #${p.putawayId}</span>
              <span style="color: #e53e3e; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <span class="material-icons-round" style="font-size: 14px;">sync_problem</span>
                Retry Queued
              </span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (activeTasksHtml === '') {
      activeTasksHtml = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; font-weight: 600;">
          <span class="material-icons-round" style="font-size: 36px; display: block; margin-bottom: 8px; color: var(--success);">cloud_done</span>
          All data synced! No active pipeline processes.
        </div>
      `;
    }

    const modal = document.createElement('div');
    modal.id = 'syncProgressModal';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '4000';
    
    modal.innerHTML = `
      <div class="modal-card form-modal-card" style="max-width: 440px;">
        <div class="form-modal-header">
          <h3>
            <span class="material-icons-round" style="color: var(--primary-600);">sync_alt</span>
            Sync Pipeline Status
          </h3>
          <button class="form-modal-close-btn" id="closeSyncModalBtn">&times;</button>
        </div>
        <div class="form-modal-body" style="padding: 20px;">
          ${activeTasksHtml}
          
          <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            ${failed.length > 0 ? `
              <button class="btn-primary" id="forceRetryBtn" style="padding: 0 16px; height: 38px; font-size: 13px;">
                <span class="material-icons-round" style="font-size: 16px;">sync</span>
                <span>Retry Sync</span>
              </button>
            ` : ''}
            <button class="btn-secondary" id="closeSyncFooterBtn" style="padding: 0 16px; height: 38px; font-size: 13px;">Close</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('#closeSyncModalBtn');
    const closeFooterBtn = modal.querySelector('#closeSyncFooterBtn');
    const forceRetryBtn = modal.querySelector('#forceRetryBtn');

    const closeModal = () => modal.remove();
    closeBtn.addEventListener('click', closeModal);
    closeFooterBtn.addEventListener('click', closeModal);
    if (forceRetryBtn) {
      forceRetryBtn.addEventListener('click', () => {
        db.retryPendingSyncs();
        closeModal();
        showToast('Sync retries triggered...');
      });
    }
  }

  updateSyncStatusUI() {
    const btn = document.getElementById('floatingSyncStatusBtn');
    if (!btn) return;
    if (!this.currentUser) {
      btn.style.display = 'none';
      return;
    }
    btn.style.display = 'flex';

    const pendingCount = db.putawayRecords.filter(p => p.syncState === 'pending').length;
    const failedCount = db.putawayRecords.filter(p => p.syncState === 'failed').length;

    if (db.isSyncing) {
      btn.className = 'floating-sync-status-btn syncing';
      btn.innerHTML = `
        <span class="material-icons-round font-icon">sync</span>
        <span class="status-label">Syncing...</span>
      `;
      btn.title = 'Synchronizing with Google Sheets...';
    } else if (failedCount > 0) {
      btn.className = 'floating-sync-status-btn failed';
      btn.innerHTML = `
        <span class="material-icons-round font-icon">sync_problem</span>
        <span class="status-label">${failedCount} unsynced (Retry)</span>
      `;
      btn.title = `${failedCount} transactions failed to sync. Click to retry syncing now.`;
    } else if (pendingCount > 0) {
      btn.className = 'floating-sync-status-btn syncing';
      btn.innerHTML = `
        <span class="material-icons-round font-icon">sync</span>
        <span class="status-label">${pendingCount} queueing...</span>
      `;
      btn.title = `${pendingCount} transactions sync in progress...`;
    } else {
      btn.className = 'floating-sync-status-btn synced';
      btn.innerHTML = `
        <span class="material-icons-round font-icon">cloud_done</span>
        <span class="status-label">All synced</span>
      `;
      btn.title = 'All changes synced successfully with Google Sheets';
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new IRMSApp();
});

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
    <span class="material-icons-round" style="color: var(--success, #10b981); font-size: 18px;">check_circle</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Expose toast globally to replace local duplicates
window.showToast = showToast;
