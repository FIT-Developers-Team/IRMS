export function showBlockerLock(message = 'Processing... Please wait.') {
  let overlay = document.getElementById('globalBlockerLock');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'globalBlockerLock';
    overlay.className = 'global-blocker-lock';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="blocker-lock-card">
      <div class="spinner" style="width: 42px; height: 42px; border-width: 4px; border-top-color: var(--primary-600); margin: 0 auto 16px;"></div>
      <h3 style="font-size: 16px; font-weight: 800; color: var(--primary-900); margin-bottom: 6px;">Processing Backend Operation</h3>
      <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">${escapeHtml(message)}</p>
    </div>
  `;

  overlay.style.display = 'flex';
}

export function hideBlockerLock() {
  const overlay = document.getElementById('globalBlockerLock');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
