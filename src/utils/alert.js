export function showAlertModal(message, title = 'Attention Required', type = 'warning') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay custom-alert-overlay';
    overlay.style.zIndex = '4000';

    const iconMap = {
      warning: { icon: 'warning_amber', bg: '#fff7ed', color: '#ea580c' },
      error: { icon: 'error_outline', bg: '#fef2f2', color: '#dc2626' },
      info: { icon: 'info_outline', bg: '#eff6ff', color: '#2563eb' }
    };

    const cfg = iconMap[type] || iconMap.warning;

    overlay.innerHTML = `
      <div class="modal-card custom-alert-card" style="max-width: 400px; padding: 24px; text-align: center; border-radius: 20px; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35);">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: ${cfg.bg}; color: ${cfg.color}; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
          <span class="material-icons-round" style="font-size: 28px;">${cfg.icon}</span>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 6px;">${escapeHtml(title)}</h3>
        <p style="font-size: 13px; color: #475569; margin: 0 0 20px; line-height: 1.5;">${escapeHtml(message)}</p>
        <button id="alertConfirmBtn" class="btn-primary" style="width: 100%; height: 42px; font-size: 14px; margin-top: 0;">OK</button>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#alertConfirmBtn');
    const close = () => {
      overlay.remove();
      resolve(true);
    };

    btn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    btn.focus();
  });
}

function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
