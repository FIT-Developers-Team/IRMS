import { db } from '../data/db.js';

const AVAILABLE_MENUS = ['requestPickup', 'pickingTask', 'lostAndFound', 'soh', 'stockMovement', 'admin'];
const MENU_LABELS = {
  requestPickup: 'Request Pickup',
  pickingTask:   'Picking Task',
  lostAndFound:  'Lost & Found',
  soh:           'Stock On Hand',
  stockMovement: 'Stock Movement & Deduction',
  admin:         'Admin Panel'
};
const ROLES = ['Super', 'Supervisor', 'Staff', 'Manager'];

export function renderAdmin(container, currentUser) {
  let activeSubTab = 'users';

  container.innerHTML = `
    <div class="card-panel admin-panel">

      <!-- Panel Header -->
      <div class="card-title-group" style="flex-wrap: wrap; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid var(--border-light);">
        <div>
          <h3 style="display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">admin_panel_settings</span>
            Admin Panel
          </h3>
          <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px;">
            Manage users and warehouse zones — accessible to Super role only
          </span>
        </div>
        <div class="admin-badge">
          <span class="material-icons-round" style="font-size: 14px;">shield</span>
          <span>${currentUser.name} · ${currentUser.role}</span>
        </div>
      </div>

      <!-- Sub-tab Bar -->
      <div class="admin-subtab-bar">
        <button class="admin-subtab active" data-subtab="users">
          <span class="material-icons-round">manage_accounts</span>
          <span>Users</span>
        </button>
        <button class="admin-subtab" data-subtab="zones">
          <span class="material-icons-round">grid_view</span>
          <span>Zones</span>
        </button>
      </div>

      <!-- Sub-tab Content -->
      <div id="adminSubContent" style="flex: 1; overflow-y: auto; min-height: 0; margin-top: 16px;">
      </div>

    </div>
  `;

  const subTabs = container.querySelectorAll('.admin-subtab');
  const subContent = container.querySelector('#adminSubContent');

  // ── Sub-tab switching ──────────────────────────────────────────────────────
  function switchSubTab(tabId) {
    activeSubTab = tabId;
    subTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === tabId));
    if (tabId === 'users') renderUsersTab(subContent);
    else if (tabId === 'zones') renderZonesTab(subContent);
  }

  subTabs.forEach(btn => btn.addEventListener('click', () => switchSubTab(btn.dataset.subtab)));
  switchSubTab('users');

  // Re-render active sub-tab when db data changes
  const ownRoot = container.firstElementChild;
  const unsubscribe = db.subscribe(() => {
    if (!container.isConnected || container.firstElementChild !== ownRoot) {
      unsubscribe();
      return;
    }
    // Re-render only the active sub-tab content (not the whole panel)
    if (activeSubTab === 'users') renderUsersTab(subContent);
    else if (activeSubTab === 'zones') renderZonesTab(subContent);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════════════════

function renderUsersTab(container) {
  const users = db.getUsers();

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">

      <!-- Toolbar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 13px; color: var(--text-secondary);">
          <strong style="color: var(--text-primary);">${users.length}</strong> users registered
        </div>
        <button id="addUserBtn" class="btn-primary" style="gap: 6px;">
          <span class="material-icons-round" style="font-size: 16px;">person_add</span>
          Register New User
        </button>
      </div>

      <!-- Desktop Table -->
      <div class="data-table-wrapper admin-table-wrapper">
        <table class="custom-table">
          <thead>
            <tr>
              <th style="min-width: 90px;">Staff ID</th>
              <th style="min-width: 160px;">Name</th>
              <th style="min-width: 100px;">Role</th>
              <th style="min-width: 220px;">Access</th>
              <th style="min-width: 90px;">Password</th>
              <th style="width: 110px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            ${users.length === 0 ? `<tr><td colspan="6"><div class="empty-state"><span class="material-icons-round">group_off</span><p>No users found. Add one to get started.</p></div></td></tr>` :
              users.map(u => renderUserRow(u)).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="mobile-card-list" id="usersMobileList">
        ${users.length === 0 ? `<div class="empty-state"><span class="material-icons-round">group_off</span><p>No users found.</p></div>` :
          users.map(u => renderUserCard(u)).join('')}
      </div>
    </div>
  `;

  // Wire add button
  container.querySelector('#addUserBtn').addEventListener('click', () => openUserModal(null));

  // Wire row edit/delete buttons
  container.querySelectorAll('.edit-user-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const staffId = btn.dataset.staffid;
      const user = db.getUsers().find(u => u.staffId === staffId);
      if (user) openUserModal(user);
    });
  });

  container.querySelectorAll('.delete-user-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const staffId = btn.dataset.staffid;
      const user = db.getUsers().find(u => u.staffId === staffId);
      if (!user) return;
      if (!confirm(`Delete user "${user.name}" (${staffId})? This cannot be undone.`)) return;
      try {
        await db.deleteUser(staffId);
        showAdminToast(`User "${user.name}" deleted.`, 'success');
      } catch (err) {
        showAdminToast(err.message, 'error');
      }
    });
  });
}

function renderUserRow(u) {
  const isSuper = (u.role || '').toLowerCase() === 'super';
  const accessBadges = isSuper
    ? '<span class="admin-access-chip" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: 700;">★ All Access Unlocked</span>'
    : (u.access || '').split(',').map(a => a.trim()).filter(Boolean)
        .map(a => `<span class="admin-access-chip">${MENU_LABELS[a] || a}</span>`).join('');

  return `
    <tr>
      <td><strong style="font-family: monospace; color: var(--primary-700);">${escHtml(u.staffId)}</strong></td>
      <td><span style="font-weight: 600; color: var(--text-primary);">${escHtml(u.name)}</span></td>
      <td><span class="admin-role-badge admin-role-${(u.role || '').toLowerCase()}">${escHtml(u.role)}</span></td>
      <td><div style="display: flex; flex-wrap: wrap; gap: 4px;">${accessBadges || '<span style="color:var(--text-muted);font-size:11px;">None</span>'}</div></td>
      <td><span style="font-family: monospace; letter-spacing: 2px; color: var(--text-secondary);">${u.password ? escHtml(u.password) : '••••'}</span></td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 6px; justify-content: center;">
          <button class="edit-user-btn icon-action-btn" data-staffid="${escHtml(u.staffId)}" title="Edit">
            <span class="material-icons-round">edit</span>
          </button>
          <button class="delete-user-btn icon-action-btn icon-action-btn-danger" data-staffid="${escHtml(u.staffId)}" title="Delete">
            <span class="material-icons-round">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderUserCard(u) {
  const isSuper = (u.role || '').toLowerCase() === 'super';
  const accessBadges = isSuper
    ? '<span class="admin-access-chip" style="background: #fef3c7; color: #92400e; border: 1px solid #fde68a; font-weight: 700;">★ All Access Unlocked</span>'
    : (u.access || '').split(',').map(a => a.trim()).filter(Boolean)
        .map(a => `<span class="admin-access-chip">${MENU_LABELS[a] || a}</span>`).join('');

  return `
    <div class="mobile-task-card">
      <div class="card-header-row">
        <span class="picking-id-label" style="font-size: 14px;">${escHtml(u.staffId)}</span>
        <span class="admin-role-badge admin-role-${(u.role || '').toLowerCase()}">${escHtml(u.role)}</span>
      </div>
      <div class="card-body-content" style="margin-top: 8px;">
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary);">${escHtml(u.name)}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
          ${accessBadges || '<span style="color:var(--text-muted);font-size:11px;">No access assigned</span>'}
        </div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;">
        <button class="edit-user-btn btn-secondary" data-staffid="${escHtml(u.staffId)}" style="padding: 6px 14px; font-size: 12px; gap: 4px;">
          <span class="material-icons-round" style="font-size: 14px;">edit</span> Edit
        </button>
        <button class="delete-user-btn btn-danger-outline" data-staffid="${escHtml(u.staffId)}" style="padding: 6px 14px; font-size: 12px; gap: 4px;">
          <span class="material-icons-round" style="font-size: 14px;">delete</span> Delete
        </button>
      </div>
    </div>
  `;
}

function openUserModal(existingUser) {
  const isEdit = !!existingUser;
  const menuOptions = AVAILABLE_MENUS.map(key => {
    const checked = isEdit && (existingUser.access || '').split(',').map(a => a.trim()).includes(key);
    return `
      <label class="admin-checkbox-label" style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--text-primary); cursor: pointer; padding: 4px 0;">
        <input type="checkbox" class="access-checkbox" value="${key}" ${checked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary-600); cursor: pointer;">
        <span>${MENU_LABELS[key]}</span>
      </label>
    `;
  }).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-panel" style="max-width: 520px; border-radius: 20px;">
      <div class="modal-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <span class="material-icons-round" style="color: var(--primary-600);">${isEdit ? 'edit' : 'person_add'}</span>
          ${isEdit ? `Edit User · ${escHtml(existingUser.staffId)}` : 'Register New User'}
        </h3>
        <button class="modal-close-btn" id="closeUserModal">
          <span class="material-icons-round">close</span>
        </button>
      </div>

      <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px; padding: 20px 24px;">

        <div class="form-field-group">
          <label class="form-label">Staff ID <span style="color:var(--danger);">*</span></label>
          <input type="text" id="userStaffId" class="text-control" placeholder="e.g. 1005" value="${isEdit ? escHtml(existingUser.staffId) : ''}" ${isEdit ? 'readonly style="opacity:0.6;cursor:not-allowed;"' : ''}>
        </div>

        <div class="form-field-group">
          <label class="form-label">Full Name <span style="color:var(--danger);">*</span></label>
          <input type="text" id="userName" class="text-control" placeholder="e.g. John Doe" value="${isEdit ? escHtml(existingUser.name) : ''}">
        </div>

        <div class="form-field-group">
          <label class="form-label">Role <span style="color:var(--danger);">*</span></label>
          <select id="userRole" class="text-control">
            ${ROLES.map(r => `<option value="${r}" ${isEdit && existingUser.role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>

        <div class="form-field-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">Password (4-digit PIN) <span style="color:var(--danger);">*</span></label>
            <button type="button" id="genPinBtn" style="border: none; background: transparent; color: var(--primary-600); font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 2px;">
              <span class="material-icons-round" style="font-size: 13px;">autorenew</span> Generate PIN
            </button>
          </div>
          <input type="text" id="userPassword" class="text-control" placeholder="e.g. 1234" maxlength="4" value="${isEdit ? escHtml(existingUser.password) : ''}" style="font-family: monospace; font-size: 14px; font-weight: 700; letter-spacing: 2px;">
        </div>

        <div class="form-field-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="margin-bottom: 0;">Access Dropdown (Menu Permissions)
              <span style="font-size: 11px; color: var(--text-muted); display: block;">Unlocked automatically if Role = Super</span>
            </label>
            <div id="accessBatchBtns" style="display: flex; gap: 6px;">
              <button type="button" id="selectAllAccessBtn" style="border: none; background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">Select All</button>
              <button type="button" id="clearAllAccessBtn" style="border: none; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; cursor: pointer;">Clear</button>
            </div>
          </div>
          <div id="accessMenuList" style="display: flex; flex-direction: column; gap: 8px; background: var(--surface-body); border: 1.5px solid var(--border-light); border-radius: 12px; padding: 12px;">
            ${menuOptions}
          </div>
        </div>

        <div id="userModalError" style="display: none; background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600;"></div>
      </div>

      <div class="modal-footer" style="padding: 16px 24px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-light);">
        <button id="cancelUserBtn" class="btn-secondary">Cancel</button>
        <button id="saveUserBtn" class="btn-primary">
          <span class="material-icons-round" style="font-size: 16px;">${isEdit ? 'save' : 'person_add'}</span>
          ${isEdit ? 'Save Changes' : 'Register User'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const roleSelect = modal.querySelector('#userRole');
  const accessMenuList = modal.querySelector('#accessMenuList');
  const accessBatchBtns = modal.querySelector('#accessBatchBtns');
  const userPasswordInput = modal.querySelector('#userPassword');

  // Auto PIN Generator
  modal.querySelector('#genPinBtn').addEventListener('click', () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    userPasswordInput.value = pin;
  });

  // Select All / Clear All helpers
  modal.querySelector('#selectAllAccessBtn').addEventListener('click', () => {
    if (roleSelect.value === 'Super') return;
    accessMenuList.querySelectorAll('.access-checkbox').forEach(cb => cb.checked = true);
  });

  modal.querySelector('#clearAllAccessBtn').addEventListener('click', () => {
    if (roleSelect.value === 'Super') return;
    accessMenuList.querySelectorAll('.access-checkbox').forEach(cb => cb.checked = false);
  });

  // Auto-lock checkboxes when role = Super
  function syncAccessWithRole() {
    const checkboxes = accessMenuList.querySelectorAll('.access-checkbox');
    if (roleSelect.value === 'Super') {
      checkboxes.forEach(cb => { cb.checked = true; cb.disabled = true; });
      accessBatchBtns.style.opacity = '0.4';
      accessBatchBtns.style.pointerEvents = 'none';
    } else {
      checkboxes.forEach(cb => { cb.disabled = false; });
      accessBatchBtns.style.opacity = '1';
      accessBatchBtns.style.pointerEvents = 'auto';
    }
  }

  roleSelect.addEventListener('change', syncAccessWithRole);
  syncAccessWithRole();

  modal.querySelector('#closeUserModal').addEventListener('click', () => modal.remove());
  modal.querySelector('#cancelUserBtn').addEventListener('click', () => modal.remove());

  modal.querySelector('#saveUserBtn').addEventListener('click', async () => {
    const staffId = modal.querySelector('#userStaffId').value.trim();
    const name    = modal.querySelector('#userName').value.trim();
    const role    = modal.querySelector('#userRole').value;
    const password = modal.querySelector('#userPassword').value.trim();
    const errorEl = modal.querySelector('#userModalError');

    const accessList = Array.from(modal.querySelectorAll('.access-checkbox:checked')).map(cb => cb.value);
    const access = role === 'Super' ? AVAILABLE_MENUS.join(',') : accessList.join(',');

    errorEl.style.display = 'none';

    if (!staffId || !name) {
      errorEl.textContent = 'Staff ID and Name are required.';
      errorEl.style.display = 'block';
      return;
    }

    if (!password) {
      errorEl.textContent = 'Password (4-digit PIN) is required.';
      errorEl.style.display = 'block';
      return;
    }

    const saveBtn = modal.querySelector('#saveUserBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-round" style="font-size:16px;animation:spinIcon 1s linear infinite;">sync</span> Saving…';

    try {
      if (isEdit) {
        await db.updateUser(existingUser.staffId, { name, role, access, password });
        showAdminToast(`User "${name}" updated.`, 'success');
      } else {
        await db.addUser({ staffId, name, role, access, password });
        showAdminToast(`User "${name}" registered successfully.`, 'success');
      }
      modal.remove();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span class="material-icons-round" style="font-size:16px;">${isEdit ? 'save' : 'person_add'}</span> ${isEdit ? 'Save Changes' : 'Register User'}`;
    }
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

// ═══════════════════════════════════════════════════════════════════════════
// ZONES TAB
// ═══════════════════════════════════════════════════════════════════════════

function renderZonesTab(container) {
  const zones = db.getZones();

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">

      <!-- Toolbar -->
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
        <div style="font-size: 13px; color: var(--text-secondary);">
          <strong style="color: var(--text-primary);">${zones.length}</strong> zones configured
        </div>
        <button id="addZoneBtn" class="btn-primary" style="gap: 6px;">
          <span class="material-icons-round" style="font-size: 16px;">add_location_alt</span>
          Add Zone
        </button>
      </div>

      <!-- Zone Grid -->
      <div class="admin-zone-grid" id="zonesGrid">
        ${zones.length === 0 ? `<div class="empty-state"><span class="material-icons-round">location_off</span><p>No zones configured. Add one to get started.</p></div>` :
          zones.map(z => renderZoneCard(z)).join('')}
      </div>

    </div>
  `;

  container.querySelector('#addZoneBtn').addEventListener('click', () => openZoneModal(null));

  container.querySelectorAll('.edit-zone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = db.getZones().find(z => z.id === btn.dataset.id);
      if (zone) openZoneModal(zone);
    });
  });

  container.querySelectorAll('.delete-zone-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const zone = db.getZones().find(z => z.id === id);
      if (!zone) return;
      if (!confirm(`Delete zone "${zone.zoneName}"? This cannot be undone.`)) return;
      try {
        await db.deleteZone(id);
        showAdminToast(`Zone "${zone.zoneName}" deleted.`, 'success');
      } catch (err) {
        showAdminToast(err.message, 'error');
      }
    });
  });
}

function renderZoneCard(z) {
  return `
    <div class="admin-zone-card">
      <div class="admin-zone-icon">
        <span class="material-icons-round">grid_view</span>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escHtml(z.zoneName)}</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; font-family: monospace;">ID: ${escHtml(z.id)}</div>
      </div>
      <div style="display: flex; gap: 6px; flex-shrink: 0;">
        <button class="edit-zone-btn icon-action-btn" data-id="${escHtml(z.id)}" title="Rename">
          <span class="material-icons-round">edit</span>
        </button>
        <button class="delete-zone-btn icon-action-btn icon-action-btn-danger" data-id="${escHtml(z.id)}" title="Delete">
          <span class="material-icons-round">delete</span>
        </button>
      </div>
    </div>
  `;
}

function openZoneModal(existingZone) {
  const isEdit = !!existingZone;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-panel" style="max-width: 420px;">
      <div class="modal-header">
        <h3 style="display: flex; align-items: center; gap: 8px;">
          <span class="material-icons-round" style="color: var(--primary-600);">${isEdit ? 'edit_location' : 'add_location_alt'}</span>
          ${isEdit ? `Edit Zone · ${escHtml(existingZone.zoneName)}` : 'Add New Zone'}
        </h3>
        <button class="modal-close-btn" id="closeZoneModal">
          <span class="material-icons-round">close</span>
        </button>
      </div>

      <div class="modal-body" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-field-group">
          <label class="form-label">Zone Name <span style="color:var(--danger);">*</span></label>
          <input type="text" id="zoneNameInput" class="text-control" placeholder="e.g. ZONE-A1" value="${isEdit ? escHtml(existingZone.zoneName) : ''}">
          <span style="font-size: 11px; color: var(--text-muted); margin-top: 4px; display: block;">
            This name will appear in rack location dropdowns across the app.
          </span>
        </div>
        <div id="zoneModalError" style="display: none; background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600;"></div>
      </div>

      <div class="modal-footer" style="padding: 16px 24px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-light);">
        <button id="cancelZoneBtn" class="btn-secondary">Cancel</button>
        <button id="saveZoneBtn" class="btn-primary">
          <span class="material-icons-round" style="font-size: 16px;">${isEdit ? 'save' : 'add_location_alt'}</span>
          ${isEdit ? 'Save Changes' : 'Add Zone'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#closeZoneModal').addEventListener('click', () => modal.remove());
  modal.querySelector('#cancelZoneBtn').addEventListener('click', () => modal.remove());

  modal.querySelector('#saveZoneBtn').addEventListener('click', async () => {
    const zoneName = modal.querySelector('#zoneNameInput').value.trim();
    const errorEl  = modal.querySelector('#zoneModalError');
    errorEl.style.display = 'none';

    if (!zoneName) {
      errorEl.textContent = 'Zone name is required.';
      errorEl.style.display = 'block';
      return;
    }

    const saveBtn = modal.querySelector('#saveZoneBtn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="material-icons-round" style="font-size:16px;animation:spinIcon 1s linear infinite;">sync</span> Saving…';

    try {
      if (isEdit) {
        await db.updateZone(existingZone.id, zoneName);
        showAdminToast(`Zone renamed to "${zoneName}".`, 'success');
      } else {
        await db.addZone(zoneName);
        showAdminToast(`Zone "${zoneName}" added.`, 'success');
      }
      modal.remove();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<span class="material-icons-round" style="font-size:16px;">${isEdit ? 'save' : 'add_location_alt'}</span> ${isEdit ? 'Save Changes' : 'Add Zone'}`;
    }
  });

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  setTimeout(() => modal.querySelector('#zoneNameInput').focus(), 50);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
function showAdminToast(message, type = 'success') {
  let toast = document.getElementById('adminToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'adminToast';
    document.body.appendChild(toast);
  }
  const bg = type === 'error' ? '#c92a2a' : '#087f5b';
  const icon = type === 'error' ? 'error' : 'check_circle';
  toast.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:${bg};color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);transition:opacity 0.3s;`;
  toast.innerHTML = `<span class="material-icons-round" style="font-size:16px;">${icon}</span>${escHtml(message)}`;
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
