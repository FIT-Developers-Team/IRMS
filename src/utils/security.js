/**
 * Security access control helper based on User_DB specification.
 * Rules:
 * 1. Home ("home") is accessible to all authenticated users.
 * 2. Role "Super" (or "Admin") automatically unlocks all pages ("unlock all if role = Super").
 * 3. Role !== "Super" restricts access strictly to the items listed in user's access list.
 */

export const ALL_PAGES = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'requestPickup', label: 'Request Pickup', icon: 'outbox' },
  { key: 'pickingTask', label: 'Picking Task', icon: 'fact_check' },
  { key: 'lostAndFound', label: 'Lost & Found', icon: 'travel_explore' },
  { key: 'soh', label: 'Stock On Hand', icon: 'inventory_2' },
  { key: 'stockMovement', label: 'Stock Movement', icon: 'swap_horiz' },
  { key: 'admin', label: 'Admin Panel', icon: 'admin_panel_settings' }
];

export function hasUserAccess(user, pageKey) {
  if (!user) return false;
  
  // Home is accessible to all logged-in users
  if (pageKey === 'home') return true;

  // Super / Admin role unlocks all pages automatically ("unlock all if role = Super")
  const role = String(user.role || '').toLowerCase();
  if (role === 'super' || role === 'admin') return true;

  const access = String(user.access || user.acess || '').toLowerCase();
  if (!access) return false;
  if (access.includes('all')) return true;

  const pageMap = {
    requestPickup: ['requestpickup', 'request pickup', 'pickup'],
    pickingTask: ['pickingtask', 'picking task', 'picking'],
    lostAndFound: ['lostandfound', 'lost & found', 'lost and found'],
    soh: ['soh', 'stock on hand', 'stockonhand'],
    stockMovement: ['stockmovement', 'stock movement', 'stock movement & deduction', 'movement', 'deduction'],
    admin: ['admin', 'admin panel']
  };

  const aliases = pageMap[pageKey] || [pageKey.toLowerCase()];
  return aliases.some(alias => access.includes(alias));
}

export function getUserAccessiblePages(user) {
  return ALL_PAGES.filter(p => hasUserAccess(user, p.key));
}
