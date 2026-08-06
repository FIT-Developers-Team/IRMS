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
    // Wait for Google Sheets sync to complete, browser fonts to be ready, and ensure splash is visible for a minimum transition duration
    await Promise.all([
      db.initPromise,
      document.fonts.ready,
      new Promise(resolve => setTimeout(resolve, 800))
    ]);
    
    this.renderShell();
    this.renderCurrentView();
    this.fadeAndRemoveSplashScreen();

    if (this.currentUser) {
      this.startSessionExpiryCheck();
    }
  }

  fadeAndRemoveSplashScreen() {
    const splash = document.getElementById('app-splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      // Remove from DOM after transition completes (matching 0.5s CSS transition duration)
      setTimeout(() => {
        splash.remove();
      }, 500);
    }
  }

  renderLoadingState() {
    this.appRoot.innerHTML = `
      <div id="app-splash-screen" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, #0a2d6c 0%, #0d47a1 50%, #1565c0 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 999999; font-family: 'Plus Jakarta Sans', sans-serif; color: #ffffff; transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.5s; overflow: hidden;">
        
        <!-- Option 2 Parallax Starfield Background -->
        <div class="starfield">
          <div class="star" style="top: 10%; width: 2px; height: 2px; opacity: 0.7; animation-duration: 3s; animation-delay: 0.1s;"></div>
          <div class="star" style="top: 25%; width: 3px; height: 3px; opacity: 0.9; animation-duration: 2s; animation-delay: 0.5s;"></div>
          <div class="star" style="top: 40%; width: 1.5px; height: 1.5px; opacity: 0.5; animation-duration: 4.5s; animation-delay: 1.2s;"></div>
          <div class="star" style="top: 55%; width: 2.5px; height: 2.5px; opacity: 0.8; animation-duration: 2.8s; animation-delay: 0s;"></div>
          <div class="star" style="top: 70%; width: 2px; height: 2px; opacity: 0.6; animation-duration: 3.5s; animation-delay: 0.7s;"></div>
          <div class="star" style="top: 85%; width: 3.5px; height: 3.5px; opacity: 0.9; animation-duration: 1.8s; animation-delay: 0.3s;"></div>
          <div class="star" style="top: 15%; width: 1.5px; height: 1.5px; opacity: 0.4; animation-duration: 5s; animation-delay: 1.5s;"></div>
          <div class="star" style="top: 30%; width: 2px; height: 2px; opacity: 0.7; animation-duration: 3.2s; animation-delay: 0.8s;"></div>
          <div class="star" style="top: 50%; width: 3px; height: 3px; opacity: 0.9; animation-duration: 2.2s; animation-delay: 1.1s;"></div>
          <div class="star" style="top: 65%; width: 1.5px; height: 1.5px; opacity: 0.5; animation-duration: 4.2s; animation-delay: 0.2s;"></div>
          <div class="star" style="top: 80%; width: 2.5px; height: 2.5px; opacity: 0.8; animation-duration: 2.6s; animation-delay: 0.6s;"></div>
          <div class="star" style="top: 95%; width: 2px; height: 2px; opacity: 0.6; animation-duration: 3.8s; animation-delay: 1.4s;"></div>
        </div>

        <!-- Combined Flight & Hovering Container -->
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 24px; position: relative; z-index: 10;">
          
          <!-- Option 1 Orbiting & Hovering Astronaut Rocket -->
          <div class="rocket-orbit-wrapper" style="width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <img src="/Assets/Loading Image.png" class="rocket-hover-image" alt="Loading Astronaut" style="width: 130px; height: auto;" />
          </div>
          
          <!-- App Title and Label -->
          <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(10, 45, 108, 0.4); padding: 16px 28px; border-radius: 16px; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 12px 32px rgba(0,0,0,0.15);">
            <h1 style="font-size: 24px; font-weight: 800; letter-spacing: 2px; margin: 0; color: #ffffff; text-transform: uppercase;">IRMS</h1>
            <span style="font-size: 11px; font-weight: 700; color: #38bdf8; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px;">Syncing live Google Sheets...</span>
          </div>

          <!-- Custom animated typing dots -->
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <div style="width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; animation: splashDot 1.4s infinite both;"></div>
            <div style="width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; animation: splashDot 1.4s infinite both; animation-delay: 0.2s;"></div>
            <div style="width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; animation: splashDot 1.4s infinite both; animation-delay: 0.4s;"></div>
          </div>
        </div>

        <style>
          .starfield {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: 1;
            pointer-events: none;
          }
          
          .star {
            position: absolute;
            background: #ffffff;
            border-radius: 50%;
            animation: starFly linear infinite;
          }

          .rocket-orbit-wrapper {
            animation: rocketOrbit 8s ease-in-out infinite;
          }

          .rocket-hover-image {
            animation: rocketHover 2.5s ease-in-out infinite;
          }

          @keyframes starFly {
            from { transform: translateX(100vw); }
            to { transform: translateX(-10vw); }
          }

          @keyframes rocketOrbit {
            0% { transform: translate(-140px, -40px) rotate(15deg); }
            25% { transform: translate(140px, -60px) rotate(30deg); }
            50% { transform: translate(110px, 60px) rotate(-15deg); }
            75% { transform: translate(-140px, 40px) rotate(-35deg); }
            100% { transform: translate(-140px, -40px) rotate(15deg); }
          }

          @keyframes rocketHover {
            0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
            50% { transform: translateY(-10px) rotate(6deg) scale(1.03); }
          }

          @keyframes splashDot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
        </style>
      </div>
    `;
  }

  renderShell() {
    // Clear app container instead of resetting document.body, to preserve splash screen container outside #app
    this.appRoot.innerHTML = '';
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
        
        // After login: sync reference data needed app-wide.
        // userDb is already loaded (fetched on startup for credentials check).
        // Section data is synced lazily when the user navigates to each section.
        await db.syncGoogleSheets(['skusDb', 'zones', 'checkerLines']);
        
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
    // Sync status is managed directly inside the top page content header in dashboard.js
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
