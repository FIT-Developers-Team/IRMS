import Papa from 'papaparse';
import { GOOGLE_SHEETS_CONFIG } from '../config/googleSheets.js';
import { cacheManager } from './cacheManager.js';

export const DATA_EXPIRY_DURATION_MS = 1 * 60 * 1000; // 1 minute TTL

class DatabaseService {
  constructor() {
    this.users = [];
    this.soList = [];
    this.requests = this.loadSavedRequests();
    this.pickingTasks = this.loadSavedPickingTasks();
    this.racks = [];
    this.zones = [];
    this.checkerLines = [];
    this.lostAndFound = this.loadSavedLostAndFound();
    this.putawayRecords = this.loadSavedPutawayRecords();
    this.stockMovements = this.loadSavedStockMovements();
    this.stockActivities = this.loadSavedStockActivities();
    this.skus = [];
    this.soh = [];
    this.spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
    this.webAppUrl = GOOGLE_SHEETS_CONFIG.webAppUrl;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.lastSectionSyncTime = {};  // { tabId: ISO string } per-section timestamps
    this.syncError = null;
    this.isLoaded = false;
    this.listeners = [];
    
    // Instant 0ms IndexedDB Hydration
    this.initCache();

    // On fresh start / browser refresh (F5) / login: fetch Master Reference Data once.
    // Master data (skusDb, zones, racks, checkerLines) is cached in IndexedDB and NOT re-fetched on page navigation.
    this.initPromise = this.syncGoogleSheets(['userDb', 'skusDb', 'zones', 'racks', 'checkerLines']);

    // Background interval: Check every 60 seconds if data has reached expiry duration and force refresh
    this.cacheCheckInterval = setInterval(() => {
      this.checkAndRefreshIfExpired();
    }, 60 * 1000);
  }

  async initCache() {
    try {
      await cacheManager.init();
      const [cReqs, cTasks, cLf, cSoh, cSm, cUsers, cSkus, cRacks, cZones, cLines] = await Promise.all([
        cacheManager.getStore('requests'),
        cacheManager.getStore('pickingTasks'),
        cacheManager.getStore('lostAndFound'),
        cacheManager.getStore('soh'),
        cacheManager.getStore('stockMovements'),
        cacheManager.getStore('userDb'),
        cacheManager.getStore('skusDb'),
        cacheManager.getStore('racks'),
        cacheManager.getStore('zones'),
        cacheManager.getStore('checkerLines')
      ]);

      if (cReqs && cReqs.length) this.requests = cReqs;
      if (cTasks && cTasks.length) this.pickingTasks = cTasks;
      if (cLf && cLf.length) this.lostAndFound = cLf;
      if (cSoh && cSoh.length) this.soh = cSoh;
      if (cSm && cSm.length) this.stockMovements = cSm;
      if (cUsers && cUsers.length) this.users = cUsers;
      if (cSkus && cSkus.length) this.skus = cSkus;
      if (cRacks && cRacks.length) this.racks = cRacks;
      if (cZones && cZones.length) this.zones = cZones;
      if (cLines && cLines.length) this.checkerLines = cLines;

      this.isLoaded = true;
      this.notifyListeners();
    } catch (err) {
      console.warn('IndexedDB hydration fallback:', err);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error('Listener error:', e); }
    });
  }

  parseUsers(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.users = result.data.map(row => {
        const staffId = this.findRowValue(row, ['staff id', 'staff_id', 'staffid', 'id']);
        const name = this.findRowValue(row, ['name', 'staff name']);
        const role = this.findRowValue(row, ['role']);
        const access = this.findRowValue(row, ['acess', 'access']);
        const password = this.findRowValue(row, ['password', 'pwd', 'pass']);

        return {
          staffId: String(staffId).trim(),
          name: String(name).trim(),
          role: String(role).trim(),
          access: String(access).trim(),
          password: String(password).trim()
        };
      }).filter(u => u.staffId);
    }
  }

  parseSoData(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.soList = result.data.map(row => {
        const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();
        const pickerName = this.findRowValue(row, ['picker_name', 'picker name', 'picker']) || 'N/A';
        const soNumber = this.findRowValue(row, ['so_number', 'so number', 'so']);
        const skuNumber = this.findRowValue(row, ['sku_number', 'sku code', 'sku number', 'sku']);
        const productName = this.findRowValue(row, ['product_name', 'product name', 'product']);
        const status = this.findRowValue(row, ['status']) || '';
        const qty = this.findRowValue(row, ['sum(request_quantity)', 'sum_request_quantity', 'request_quantity', 'qty', 'quantity']) || '1';

        return {
          timestamp: String(timestamp).trim(),
          pickerName: String(pickerName).trim(),
          soNumber: String(soNumber).trim(),
          skuNumber: String(skuNumber).trim(),
          productName: String(productName).trim(),
          status: String(status).trim(),
          requestQty: parseInt(String(qty).trim() || '1', 10)
        };
      }).filter(item => item.soNumber);
    }
  }

  parseRequestChecker(csvText) {
    if (!csvText) {
      this.requests = [];
      this.persistRequests();
      return;
    }

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    const remoteReqs = (result.data || []).map(row => {
      const ticketId = this.findRowValue(row, ['ticket id', 'ticket_id', 'ticketid', 'uniqueid', 'unique id', 'id']);
      const checkerLine = this.findRowValue(row, ['checker line', 'checker_line', 'checkerline', 'line']);
      const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();
      const pickerName = this.findRowValue(row, ['picker name', 'picker_name', 'picker']) || 'N/A';
      const checkerName = this.findRowValue(row, ['checker name', 'checker_name', 'checker']);
      const soNumber = this.findRowValue(row, ['so number', 'so_number', 'so']);
      const skuNumber = this.findRowValue(row, ['sku code', 'sku_code', 'sku number', 'sku_number', 'sku']);
      const productName = this.findRowValue(row, ['product name', 'product_name', 'product']);
      const qty = this.findRowValue(row, ['qty', 'quantity', 'request_quantity']) || '1';
      const status = this.findRowValue(row, ['status']) || 'Pending';

      const tid = String(ticketId).trim();
      return {
        ticketId: tid,
        uniqueid: tid,
        checkerLine: String(checkerLine).trim(),
        timestamp: String(timestamp).trim(),
        pickerName: String(pickerName).trim(),
        checkerName: String(checkerName).trim(),
        soNumber: String(soNumber).trim(),
        skuNumber: String(skuNumber).trim(),
        productName: String(productName).trim(),
        qty: parseInt(String(qty).trim() || '1', 10),
        status: String(status).trim()
      };
    }).filter(req => req.ticketId || req.soNumber);

    // Google Sheet is source of truth for Request_Checker
    this.requests = remoteReqs;
    this.requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.persistRequests();
  }

  parsePickingTask(csvText) {
    if (!csvText) {
      this.pickingTasks = [];
      this.persistPickingTasks();
      return;
    }

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    const remoteTasks = (result.data || []).map(row => {
      const pickingId = this.findRowValue(row, ['picking id', 'picking_id', 'pickingid', 'id']);
      const ticketId = this.findRowValue(row, ['ticket id', 'ticket_id', 'ticketid', 'uniqueid', 'unique id']);
      const pickedBy = this.findRowValue(row, ['picked by', 'picked_by', 'picker']);
      const skuCode = this.findRowValue(row, ['sku code', 'sku_code', 'sku number', 'sku_number', 'sku']);
      const productName = this.findRowValue(row, ['product name', 'product_name', 'product']);
      const qty = this.findRowValue(row, ['qty', 'quantity']) || '1';
      const status = this.findRowValue(row, ['status']) || 'Picking';
      const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time', 'timestamp']) || new Date().toISOString();

      return {
        pickingId: String(pickingId).trim(),
        ticketId: String(ticketId).trim(),
        pickedBy: String(pickedBy).trim(),
        skuCode: String(skuCode).trim(),
        productName: String(productName).trim(),
        qty: parseInt(String(qty).trim() || '1', 10),
        status: String(status).trim(),
        timestamp: String(timestamp).trim()
      };
    }).filter(task => task.pickingId || task.ticketId);

    // Google Sheet is source of truth for Picking Tasks
    this.pickingTasks = remoteTasks;
    this.pickingTasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.persistPickingTasks();
  }

  findRowValue(row, possibleKeys) {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const key of possibleKeys) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const matchedKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanKey);
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        const val = String(row[matchedKey]).trim();
        if (val) return val;
      }
    }
    // Fallback to first column for ID if possibleKeys includes 'ticket id'
    if (keys.length > 0 && possibleKeys.includes('ticket id')) {
      const firstVal = String(row[keys[0]] || '').trim();
      if (firstVal && firstVal !== 'Ticket ID' && firstVal !== 'uniqueid') {
        return firstVal;
      }
    }
    return '';
  }

  async syncGoogleSheets(tabsToSync = null) {
    const id = this.spreadsheetId;
    if (!id) {
      this.syncError = 'Missing Google Spreadsheet ID in config';
      return false;
    }

    this.isSyncing = true;
    this.syncError = null;
    this.notifyListeners(); // Notify immediately so status bar shows "Syncing…" at start

    const userDbTab = GOOGLE_SHEETS_CONFIG.tabs.userDb;
    const soDataTab = GOOGLE_SHEETS_CONFIG.tabs.soData;
    const requestCheckerTab = GOOGLE_SHEETS_CONFIG.tabs.requestChecker;
    const pickingTaskTab = GOOGLE_SHEETS_CONFIG.tabs.pickingTask;
    const racksTab = GOOGLE_SHEETS_CONFIG.tabs.racks;
    const zonesTab = GOOGLE_SHEETS_CONFIG.tabs.zones || 'Zone';
    const lostAndFoundTab = GOOGLE_SHEETS_CONFIG.tabs.lostAndFound;
    const checkerLinesTab = GOOGLE_SHEETS_CONFIG.tabs.checkerLines;
    const putawayTab = GOOGLE_SHEETS_CONFIG.tabs.putaway || 'Putaway';
    const skusDbTab = GOOGLE_SHEETS_CONFIG.tabs.skusDb || 'SKUs_DB';
    const sohTab = GOOGLE_SHEETS_CONFIG.tabs.soh || 'SOH';
    const stockMovementTab = GOOGLE_SHEETS_CONFIG.tabs.stockMovement || 'Stock_Movement';
    const stockActivityTab = GOOGLE_SHEETS_CONFIG.tabs.stockActivity || 'Stock_Activity';
    const cacheBuster = `_t=${Date.now()}`;

    let normalizedTabSet = null;
    if (tabsToSync && Array.isArray(tabsToSync)) {
      normalizedTabSet = new Set();
      tabsToSync.forEach(t => {
        if (t === 'admin') {
          normalizedTabSet.add('userDb');
          normalizedTabSet.add('zones');
          normalizedTabSet.add('racks');
          normalizedTabSet.add('checkerLines');
        } else if (t === 'requestPickup') {
          normalizedTabSet.add('requestChecker');
          normalizedTabSet.add('soData');
          normalizedTabSet.add('checkerLines');
          // skusDb excluded from section sync — fetched on initial load/login/refresh
        } else if (t === 'pickingTask') {
          normalizedTabSet.add('pickingTask');
          normalizedTabSet.add('racks');
          normalizedTabSet.add('soh');
        } else if (t === 'lostAndFound') {
          normalizedTabSet.add('lostAndFound');
        } else if (t === 'soh') {
          normalizedTabSet.add('soh');
          normalizedTabSet.add('racks');
          // skusDb excluded from section sync — fetched on initial load/login/refresh
        } else if (t === 'stockMovement') {
          normalizedTabSet.add('stockMovement');
          normalizedTabSet.add('stockActivity');
          normalizedTabSet.add('racks');
          normalizedTabSet.add('soh');
        } else {
          normalizedTabSet.add(t);
        }
      });
    }

    const shouldSync = (tabKey) => !normalizedTabSet || normalizedTabSet.has(tabKey);

    const fetches = [];
    if (shouldSync('userDb')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(userDbTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'userDb', res: r })));
    }
    if (shouldSync('soData')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(soDataTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'soData', res: r })));
    }
    if (shouldSync('requestChecker')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(requestCheckerTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'requestChecker', res: r })).catch(() => null));
    }
    if (shouldSync('pickingTask')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(pickingTaskTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'pickingTask', res: r })).catch(() => null));
    }
    if (shouldSync('racks')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(racksTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'racks', res: r })).catch(() => null));
    }
    if (shouldSync('zones')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(zonesTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'zones', res: r })).catch(() => null));
    }
    if (shouldSync('lostAndFound')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(lostAndFoundTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'lostAndFound', res: r })).catch(() => null));
    }
    if (shouldSync('checkerLines')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(checkerLinesTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'checkerLines', res: r })).catch(() => null));
    }
    if (shouldSync('putaway')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(putawayTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'putaway', res: r })).catch(() => null));
    }
    if (shouldSync('skusDb')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(skusDbTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'skusDb', res: r })).catch(() => null));
    }
    if (shouldSync('soh')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sohTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'soh', res: r })).catch(() => null));
    }
    if (shouldSync('stockMovement')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(stockMovementTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'stockMovement', res: r })).catch(() => null));
    }
    if (shouldSync('stockActivity')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(stockActivityTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'stockActivity', res: r })).catch(() => null));
    }

    try {
      const results = await Promise.all(fetches);
      let successCount = 0;

      for (const item of results) {
        if (!item || !item.res || !item.res.ok) continue;
        const text = await item.res.text();
        if (text.includes('<!DOCTYPE html>')) continue;

        successCount++;
        if (item.key === 'userDb') this.parseUsers(text);
        if (item.key === 'soData') this.parseSoData(text);
        if (item.key === 'requestChecker') this.parseRequestChecker(text);
        if (item.key === 'pickingTask') this.parsePickingTask(text);
        if (item.key === 'racks') this.parseRacks(text);
        if (item.key === 'zones') this.parseZones(text);
        if (item.key === 'lostAndFound') this.parseLostAndFound(text);
        if (item.key === 'checkerLines') this.parseCheckerLines(text);
        if (item.key === 'putaway') this.parsePutaway(text);
        if (item.key === 'skusDb') this.parseSkusDb(text);
        if (item.key === 'soh') this.parseSoh(text);
        if (item.key === 'stockMovement') this.parseStockMovement(text);
        if (item.key === 'stockActivity') this.parseStockActivity(text);
      }

      // If fetches were attempted but ALL failed, treat as network error
      if (fetches.length > 0 && successCount === 0) {
        this.syncError = 'No data received — check your network connection';
        this.isSyncing = false;
        this.notifyListeners();
        return false;
      }

      this.lastSyncTime = new Date().toISOString();
      this.syncError = null;
      this.isSyncing = false;
      this.isLoaded = true;

      this.notifyListeners();
      return true;
    } catch (err) {
      console.error('Google Sheets sync error:', err);
      this.syncError = err.message || 'Error syncing Google Sheets';
      this.isSyncing = false;
      this.isLoaded = true;
      this.notifyListeners();
      return false;
    }
  }

  async clearCacheAndResync() {
    await cacheManager.clearAll();
    localStorage.removeItem('irms_pickup_requests');
    localStorage.removeItem('irms_picking_tasks');
    localStorage.removeItem('irms_lost_and_found');
    localStorage.removeItem('irms_putaway_records');
    localStorage.removeItem('irms_stock_movements');
    localStorage.removeItem('irms_stock_activities');

    this.requests = [];
    this.pickingTasks = [];
    this.lostAndFound = [];
    this.putawayRecords = [];
    this.stockMovements = [];
    this.stockActivities = [];
    this.soh = [];
    this.racks = [];
    this.zones = [];
    this.checkerLines = [];
    this.skus = [];
    this.lastSyncTime = null;
    this.lastSectionSyncTime = {};

    return await this.syncGoogleSheets(null);
  }

  isDataExpired() {
    if (!this.lastSyncTime) return true;
    const lastSyncMs = new Date(this.lastSyncTime).getTime();
    if (isNaN(lastSyncMs)) return true;
    return (Date.now() - lastSyncMs) >= DATA_EXPIRY_DURATION_MS;
  }

  async checkAndRefreshIfExpired() {
    if (this.isDataExpired() && !this.isSyncing) {
      const activeTab = window.irmsActiveTab || 'home';
      await this.syncSectionData(activeTab);
      return true;
    }
    return false;
  }

  /**
   * Returns true if the given section's data is older than DATA_EXPIRY_DURATION_MS
   * or has never been synced.
   */
  isSectionDataExpired(tabId) {
    const lastSync = this.lastSectionSyncTime[tabId];
    if (!lastSync) return true;
    const lastSyncMs = new Date(lastSync).getTime();
    if (isNaN(lastSyncMs)) return true;
    return (Date.now() - lastSyncMs) >= DATA_EXPIRY_DURATION_MS;
  }

  /**
   * Syncs only the sheet tabs required for a specific dashboard section.
   * Called lazily on navigation (respects expiry). Master reference data (SKUs_DB, Zone, Racks, Checker_Lines)
   * is fetched ONLY on fresh start / browser refresh / login and excluded from navigation syncs.
   */
  async syncSectionData(tabId) {
    const tabMap = {
      home:          [],
      requestPickup: ['requestChecker', 'soData'],
      pickingTask:   ['pickingTask', 'requestChecker', 'putaway', 'soh'],
      lostAndFound:  ['lostAndFound'],
      soh:           ['soh'],
      stockMovement: ['stockMovement', 'stockActivity', 'soh'],
      admin:         ['userDb']
    };
    const tabsToSync = tabMap[tabId];
    if (!tabsToSync || tabsToSync.length === 0) return true;
    const ok = await this.syncGoogleSheets(tabsToSync);
    if (ok) {
      this.lastSectionSyncTime[tabId] = new Date().toISOString();
    }
    return ok;
  }

  lookupStaffId(staffId) {
    const trimmed = String(staffId).trim();
    if (!trimmed) return null;
    return this.users.find(u => u.staffId === trimmed) || null;
  }

  // ── Admin: Users ──────────────────────────────────────────────────────────

  getUsers() {
    return [...this.users];
  }

  async addUser(userData) {
    const { staffId, name, role, access, password } = userData;
    if (!staffId || !name) throw new Error('Staff ID and Name are required');
    if (this.users.find(u => u.staffId === String(staffId).trim())) {
      throw new Error(`Staff ID "${staffId}" already exists`);
    }

    const newUser = {
      staffId: String(staffId).trim(),
      name: String(name).trim(),
      role: String(role || 'Staff').trim(),
      access: String(access || '').trim(),
      password: String(password || '').trim()
    };

    this.users.push(newUser);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'addUser', ...newUser })
        });
        setTimeout(() => this.syncGoogleSheets(['userDb']), 2500);
      } catch (err) {
        console.error('Failed to push addUser to WebApp:', err);
      }
    }
    return newUser;
  }

  async updateUser(staffId, updates) {
    const idx = this.users.findIndex(u => u.staffId === String(staffId).trim());
    if (idx === -1) throw new Error(`User "${staffId}" not found`);

    this.users[idx] = { ...this.users[idx], ...updates };
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateUser', staffId: String(staffId).trim(), ...updates })
        });
        setTimeout(() => this.syncGoogleSheets(['userDb']), 2500);
      } catch (err) {
        console.error('Failed to push updateUser to WebApp:', err);
      }
    }
    return this.users[idx];
  }

  async deleteUser(staffId) {
    const idx = this.users.findIndex(u => u.staffId === String(staffId).trim());
    if (idx === -1) throw new Error(`User "${staffId}" not found`);

    this.users.splice(idx, 1);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deleteUser', staffId: String(staffId).trim() })
        });
        setTimeout(() => this.syncGoogleSheets(['userDb']), 2500);
      } catch (err) {
        console.error('Failed to push deleteUser to WebApp:', err);
      }
    }
  }

  // ── Admin: Zones ──────────────────────────────────────────────────────────

  async addZone(zoneName) {
    if (!zoneName || !zoneName.trim()) throw new Error('Zone name is required');
    const name = zoneName.trim();
    if (this.zones.find(z => z.zoneName.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Zone "${name}" already exists`);
    }
    const newId = String(Date.now());
    const newZone = { id: newId, zoneName: name };

    this.zones.push(newZone);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'addZone', id: newId, zoneName: name })
        });
        setTimeout(() => this.syncGoogleSheets(['zones']), 2500);
      } catch (err) {
        console.error('Failed to push addZone to WebApp:', err);
      }
    }
    return newZone;
  }

  async updateZone(id, newZoneName) {
    if (!newZoneName || !newZoneName.trim()) throw new Error('Zone name is required');
    const idx = this.zones.findIndex(z => z.id === String(id));
    if (idx === -1) throw new Error(`Zone ID "${id}" not found`);
    const name = newZoneName.trim();

    this.zones[idx].zoneName = name;
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateZone', id: String(id), zoneName: name })
        });
        setTimeout(() => this.syncGoogleSheets(['zones']), 2500);
      } catch (err) {
        console.error('Failed to push updateZone to WebApp:', err);
      }
    }
    return this.zones[idx];
  }

  async deleteZone(id) {
    const idx = this.zones.findIndex(z => z.id === String(id));
    if (idx === -1) throw new Error(`Zone ID "${id}" not found`);

    this.zones.splice(idx, 1);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deleteZone', id: String(id) })
        });
        setTimeout(() => this.syncGoogleSheets(['zones']), 2500);
      } catch (err) {
        console.error('Failed to push deleteZone to WebApp:', err);
      }
    }
  }

  // ── Admin: Racks ──────────────────────────────────────────────────────────

  async addRack(rackData) {
    const locationName = String(rackData.locationName || rackData.rackName || '').trim();
    if (!locationName) throw new Error('Location Name is required');

    const existing = this.racks.find(r => (r.locationName || r.rackName || '').toLowerCase() === locationName.toLowerCase());
    if (existing) throw new Error(`Rack "${locationName}" already exists`);

    const newRack = {
      id: locationName,
      rackName: locationName,
      locationName: locationName,
      facility: String(rackData.facility || '').trim(),
      zone: String(rackData.zone || '').trim(),
      aisle: String(rackData.aisle || '').trim(),
      bay: String(rackData.bay || '').trim(),
      partisi: String(rackData.partisi || '').trim(),
      level: String(rackData.level || '').trim(),
      priority: String(rackData.priority || '').trim(),
      capacity: String(rackData.capacity || '').trim(),
      environment: String(rackData.environment || '').trim()
    };

    this.racks.push(newRack);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'addRack', ...newRack })
        });
        setTimeout(() => this.syncGoogleSheets(['racks']), 2500);
      } catch (err) {
        console.error('Failed to push addRack to WebApp:', err);
      }
    }
    return newRack;
  }

  async updateRack(locationName, rackData) {
    const key = String(locationName || '').trim().toLowerCase();
    const idx = this.racks.findIndex(r => (r.locationName || r.rackName || '').toLowerCase() === key);
    if (idx === -1) throw new Error(`Rack Location "${locationName}" not found`);

    const updated = {
      ...this.racks[idx],
      facility: rackData.facility !== undefined ? String(rackData.facility).trim() : this.racks[idx].facility,
      zone: rackData.zone !== undefined ? String(rackData.zone).trim() : this.racks[idx].zone,
      aisle: rackData.aisle !== undefined ? String(rackData.aisle).trim() : this.racks[idx].aisle,
      bay: rackData.bay !== undefined ? String(rackData.bay).trim() : this.racks[idx].bay,
      partisi: rackData.partisi !== undefined ? String(rackData.partisi).trim() : this.racks[idx].partisi,
      level: rackData.level !== undefined ? String(rackData.level).trim() : this.racks[idx].level,
      priority: rackData.priority !== undefined ? String(rackData.priority).trim() : this.racks[idx].priority,
      capacity: rackData.capacity !== undefined ? String(rackData.capacity).trim() : this.racks[idx].capacity,
      environment: rackData.environment !== undefined ? String(rackData.environment).trim() : this.racks[idx].environment
    };

    this.racks[idx] = updated;
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateRack', ...updated })
        });
        setTimeout(() => this.syncGoogleSheets(['racks']), 2500);
      } catch (err) {
        console.error('Failed to push updateRack to WebApp:', err);
      }
    }
    return updated;
  }

  async deleteRack(locationName) {
    const key = String(locationName || '').trim().toLowerCase();
    const idx = this.racks.findIndex(r => (r.locationName || r.rackName || '').toLowerCase() === key);
    if (idx === -1) throw new Error(`Rack Location "${locationName}" not found`);

    const deleted = this.racks.splice(idx, 1)[0];
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deleteRack', locationName: deleted.locationName || deleted.rackName })
        });
        setTimeout(() => this.syncGoogleSheets(['racks']), 2500);
      } catch (err) {
        console.error('Failed to push deleteRack to WebApp:', err);
      }
    }
    return deleted;
  }

  // ── Admin: Checker Lines ──────────────────────────────────────────────────

  async addCheckerLine(lineName) {
    if (!lineName || !lineName.trim()) throw new Error('Checker Line Name is required');
    const name = lineName.trim();
    if (this.checkerLines.find(l => l.lineName.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Checker Line "${name}" already exists`);
    }
    const newId = String(Date.now());
    const newLine = { id: newId, lineName: name };

    this.checkerLines.push(newLine);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'addCheckerLine', id: newId, lineName: name })
        });
        setTimeout(() => this.syncGoogleSheets(['checkerLines']), 2500);
      } catch (err) {
        console.error('Failed to push addCheckerLine to WebApp:', err);
      }
    }
    return newLine;
  }

  async updateCheckerLine(id, newName) {
    if (!newName || !newName.trim()) throw new Error('Checker Line Name is required');
    const idx = this.checkerLines.findIndex(l => l.id === String(id));
    if (idx === -1) throw new Error(`Checker Line ID "${id}" not found`);
    const name = newName.trim();

    this.checkerLines[idx].lineName = name;
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateCheckerLine', id: String(id), lineName: name })
        });
        setTimeout(() => this.syncGoogleSheets(['checkerLines']), 2500);
      } catch (err) {
        console.error('Failed to push updateCheckerLine to WebApp:', err);
      }
    }
    return this.checkerLines[idx];
  }

  async deleteCheckerLine(id) {
    const idx = this.checkerLines.findIndex(l => l.id === String(id));
    if (idx === -1) throw new Error(`Checker Line ID "${id}" not found`);

    this.checkerLines.splice(idx, 1);
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deleteCheckerLine', id: String(id) })
        });
        setTimeout(() => this.syncGoogleSheets(['checkerLines']), 2500);
      } catch (err) {
        console.error('Failed to push deleteCheckerLine to WebApp:', err);
      }
    }
  }

  getUniqueSoNumbers() {
    this.checkAndRefreshIfExpired();
    const map = new Map();
    this.soList.forEach(item => {
      const status = (item.status || '').toLowerCase().trim();
      const isValidStatus = ['picking', 'packing', 'staging'].includes(status);
      if (isValidStatus && item.soNumber && !map.has(item.soNumber)) {
        map.set(item.soNumber, {
          soNumber: item.soNumber,
          pickerName: item.pickerName || '',
          status: item.status || ''
        });
      }
    });
    return Array.from(map.values());
  }

  getProductsForSo(soNumber) {
    if (!soNumber) return [];
    return this.soList.filter(item => item.soNumber === soNumber);
  }

  getSoDetails(soNumber, skuNumber) {
    if (!soNumber || !skuNumber) return null;
    return this.soList.find(item => 
      item.soNumber === soNumber && 
      item.skuNumber === skuNumber
    ) || null;
  }

  searchProducts(query, soNumber = null) {
    let list = this.soList;
    if (soNumber) {
      list = list.filter(item => item.soNumber === soNumber);
    }
    if (!query) return list.slice(0, 50);

    const q = query.toLowerCase();
    return list.filter(item => 
      item.skuNumber.toLowerCase().includes(q) || 
      item.productName.toLowerCase().includes(q)
    ).slice(0, 50);
  }

  generate6DigitId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  loadSavedRequests() {
    try {
      const saved = localStorage.getItem('irms_pickup_requests');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  persistRequests() {
    try {
      localStorage.setItem('irms_pickup_requests', JSON.stringify(this.requests));
      cacheManager.setStore('requests', this.requests);
    } catch (e) {
      console.error('Failed to persist requests', e);
    }
  }

  async savePickupRequest(requestData) {
    const tId = 'RC-' + this.generate6DigitId();
    const newReq = {
      ticketId: tId,
      uniqueid: tId,
      checkerLine: requestData.checkerLine || '',
      timestamp: new Date().toISOString(),
      checkerName: requestData.checkerName,
      pickerName: requestData.pickerName,
      soNumber: requestData.soNumber,
      skuNumber: requestData.skuNumber,
      productName: requestData.productName,
      qty: requestData.qty,
      status: 'Pending'
    };

    // 1. Add locally immediately for instant feedback
    this.requests.unshift(newReq);
    this.persistRequests();
    this.notifyListeners();

    // 2. Push to Google Sheets via WebApp endpoint
    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'createRequestChecker', ...newReq })
        });

        // Background refetch after Apps Script completes write
        setTimeout(() => {
          this.syncGoogleSheets();
        }, 2500);
      } catch (err) {
        console.error('Failed to push request to Google Apps Script WebApp:', err);
      }
    }

    return newReq;
  }

  isElevatedRole(user) {
    if (!user || !user.role) return false;
    const role = String(user.role).trim().toLowerCase();
    return ['super', 'admin', 'manager', 'supervisor', 'spv'].includes(role);
  }

  // Filter requests privately by Checker Name for logged user (or all if elevated role)
  getPickupRequestsForUser(currentUser) {
    if (!currentUser) return [];
    if (this.isElevatedRole(currentUser)) {
      return this.requests;
    }
    if (!currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId || '').trim().toLowerCase();

    return this.requests.filter(req => {
      const chkName = (req.checkerName || '').trim().toLowerCase();
      const pkrName = (req.pickerName || '').trim().toLowerCase();
      if (!chkName && !pkrName) return false;
      return chkName === nameLower || chkName === staffIdStr || chkName.includes(nameLower) || nameLower.includes(chkName) || pkrName === nameLower || pkrName === staffIdStr || pkrName.includes(nameLower);
    });
  }

  getPendingRequests() {
    return this.requests.filter(req => (req.status || '').trim().toLowerCase() === 'pending');
  }

  getPendingLostAndFound() {
    return this.lostAndFound.filter(entry => (entry.status || '').trim().toLowerCase() === 'pending');
  }

  loadSavedPickingTasks() {
    try {
      const saved = localStorage.getItem('irms_picking_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  persistPickingTasks() {
    try {
      localStorage.setItem('irms_picking_tasks', JSON.stringify(this.pickingTasks));
      cacheManager.setStore('pickingTasks', this.pickingTasks);
    } catch (e) {
      console.error('Failed to persist picking tasks', e);
    }
  }

  async createPickingTasks(selectedRequests, pickedByName, sourceProcess = 'Request_Checker') {
    const newTasks = [];
    const now = new Date().toISOString();

    for (const req of selectedRequests) {
      const pickingId = 'PK-' + this.generate6DigitId();
      const ticketId = String(req.ticketId || req.uniqueid || req.id || '').trim();

      const task = {
        pickingId: pickingId,
        ticketId: ticketId,
        pickedBy: pickedByName,
        skuCode: req.skuNumber || req.skuCode || '',
        productName: req.productName || (req.foundAt ? `Lost & Found (${req.foundAt})` : ''),
        qty: req.qty || 1,
        status: 'Picking',
        timestamp: now,
        sourceProcess: sourceProcess
      };
      newTasks.push(task);

      if (sourceProcess === 'Lost_And_Found' || (ticketId && ticketId.startsWith('LF-'))) {
        const matchingEntry = this.lostAndFound.find(e => String(e.ticketId).trim() === ticketId);
        if (matchingEntry) {
          matchingEntry.status = 'Picking';
        }
      } else {
        const matchingReq = this.requests.find(r => String(r.ticketId || r.uniqueid).trim() === ticketId);
        if (matchingReq) {
          matchingReq.status = 'Picking';
        }
      }
    }

    this.pickingTasks.unshift(...newTasks);
    this.persistPickingTasks();
    this.persistRequests();
    this.persistLostAndFound();
    this.notifyListeners();

    // Push to Google Sheets WebApp if configured
    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'createPickingTasks', tasks: newTasks, sourceProcess })
        });
        setTimeout(() => this.syncGoogleSheets(), 2500);
      } catch (err) {
        console.error('Failed to push picking tasks to WebApp:', err);
      }
    }

    return newTasks;
  }

  async updatePickingTaskStatus(pickingId, newStatus) {
    const task = this.pickingTasks.find(t => String(t.pickingId).trim() === String(pickingId).trim());
    if (task) {
      task.status = newStatus;
      this.persistPickingTasks();
      this.notifyListeners();

      if (this.webAppUrl) {
        try {
          await fetch(this.webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'updatePickingTaskStatus', pickingId, status: newStatus })
          });
          setTimeout(() => this.syncGoogleSheets(), 2500);
        } catch (err) {
          console.error('Failed to push task status update to WebApp:', err);
        }
      }
    }
  }

  getPickingTasks() {
    return this.pickingTasks;
  }

  getPickingTasksForUser(currentUser) {
    if (!currentUser) return [];
    if (this.isElevatedRole(currentUser)) {
      return this.pickingTasks;
    }
    if (!currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId || '').trim().toLowerCase();

    return this.pickingTasks.filter(task => {
      const picker = (task.pickedBy || '').trim().toLowerCase();
      if (!picker) return false;
      return picker === nameLower || picker === staffIdStr || picker.includes(nameLower) || nameLower.includes(picker);
    });
  }

  parseRacks(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.racks = result.data.map(row => {
        const id = this.findRowValue(row, ['id', 'location name', 'location_name', 'rack name', 'rack_name']);
        const locationName = this.findRowValue(row, ['location name', 'location_name', 'rack name', 'rack_name', 'rack', 'location']);
        const zone = this.findRowValue(row, ['zone']);
        const facility = this.findRowValue(row, ['facillity', 'facility']);
        const aisle = this.findRowValue(row, ['aisle']);
        const bay = this.findRowValue(row, ['bay']);
        const partisi = this.findRowValue(row, ['partisi']);
        const level = this.findRowValue(row, ['level']);
        const priority = this.findRowValue(row, ['priority']);
        const capacity = this.findRowValue(row, ['capacity']);
        const environment = this.findRowValue(row, ['environment']);

        const finalName = String(locationName || id || '').trim();

        return {
          id: String(id || finalName).trim(),
          rackName: finalName,
          locationName: finalName,
          facility: String(facility || '').trim(),
          zone: String(zone || '').trim(),
          aisle: String(aisle || '').trim(),
          bay: String(bay || '').trim(),
          partisi: String(partisi || '').trim(),
          level: String(level || '').trim(),
          priority: String(priority || '').trim(),
          capacity: String(capacity || '').trim(),
          environment: String(environment || '').trim()
        };
      }).filter(r => r.locationName || r.rackName);
    }
  }

  parseZones(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.zones = result.data.map(row => {
        const id = this.findRowValue(row, ['id']);
        const zoneName = this.findRowValue(row, ['zone', 'zone name', 'zone_name', 'rack name', 'rack']);
        return {
          id: String(id).trim(),
          zoneName: String(zoneName).trim()
        };
      }).filter(z => z.zoneName);
    }
  }

  getZones() {
    this.checkAndRefreshIfExpired();
    return this.zones;
  }

  parseCheckerLines(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.checkerLines = result.data.map(row => {
        const id = this.findRowValue(row, ['id']);
        const lineName = this.findRowValue(row, ['line name', 'line_name', 'linename', 'checker line', 'checker_line', 'line']);
        return {
          id: String(id).trim(),
          lineName: String(lineName).trim()
        };
      }).filter(l => l.lineName);
    }
  }

  getCheckerLines() {
    this.checkAndRefreshIfExpired();
    return this.checkerLines;
  }

  parseLostAndFound(csvText) {
    if (!csvText) {
      this.lostAndFound = [];
      this.persistLostAndFound();
      return;
    }

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    const remoteEntries = (result.data || []).map(row => {
      const ticketId = this.findRowValue(row, ['ticket id', 'ticket_id', 'ticketid', 'uniqueid', 'unique id', 'id']);
      const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();
      const btiStaff = this.findRowValue(row, ['bti staff', 'bti_staff', 'checker name', 'checker_name', 'picker name', 'picker_name']);
      const skuCode = this.findRowValue(row, ['sku code', 'sku_code', 'sku number', 'sku_number', 'sku']);
      const productName = this.findRowValue(row, ['product name', 'product_name', 'product']);
      const qty = this.findRowValue(row, ['qty', 'quantity']) || '1';
      const foundAt = this.findRowValue(row, ['found at', 'found_at', 'rack', 'rack name', 'rack_name']);
      const status = this.findRowValue(row, ['status']) || 'Pending';
      const reason = this.findRowValue(row, ['reason', 'reasons', 'cause']);

      return {
        ticketId: String(ticketId).trim(),
        timestamp: String(timestamp).trim(),
        btiStaff: String(btiStaff).trim(),
        skuCode: String(skuCode).trim(),
        productName: String(productName).trim(),
        qty: parseInt(String(qty).trim() || '1', 10),
        foundAt: String(foundAt).trim(),
        status: String(status).trim(),
        reason: String(reason).trim()
      };
    }).filter(e => e.ticketId || e.skuCode);

    this.lostAndFound = remoteEntries;
    this.lostAndFound.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.persistLostAndFound();
  }

  loadSavedLostAndFound() {
    try {
      const saved = localStorage.getItem('irms_lost_and_found');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  persistLostAndFound() {
    try {
      localStorage.setItem('irms_lost_and_found', JSON.stringify(this.lostAndFound));
      cacheManager.setStore('lostAndFound', this.lostAndFound);
    } catch (e) {
      console.error('Failed to persist lostAndFound', e);
    }
  }

  getRacks() {
    return this.racks;
  }

  searchRacks(query) {
    if (!query) return this.racks.slice(0, 100);
    const q = query.toLowerCase();
    return this.racks.filter(r => 
      (r.locationName || r.rackName || '').toLowerCase().includes(q) ||
      (r.zone || '').toLowerCase().includes(q) ||
      (r.facility || '').toLowerCase().includes(q)
    ).slice(0, 100);
  }

  getLostAndFoundForUser(currentUser) {
    if (!currentUser) return [];
    if (this.isElevatedRole(currentUser)) {
      return this.lostAndFound;
    }
    if (!currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId || '').trim().toLowerCase();

    return this.lostAndFound.filter(entry => {
      const staff = (entry.btiStaff || '').trim().toLowerCase();
      if (!staff) return false;
      return staff === nameLower || staff === staffIdStr || staff.includes(nameLower) || nameLower.includes(staff);
    });
  }

  getStockMovementsForUser(currentUser) {
    if (!currentUser) return [];
    if (this.isElevatedRole(currentUser)) {
      return this.stockMovements;
    }
    if (!currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId || '').trim().toLowerCase();

    return this.stockMovements.filter(m => {
      const staff = (m.staffName || '').trim().toLowerCase();
      const assigned = (m.assignedBy || '').trim().toLowerCase();
      return staff === nameLower || staff === staffIdStr || staff.includes(nameLower) || nameLower.includes(staff) || assigned === nameLower || assigned === staffIdStr;
    });
  }

  async saveLostAndFoundEntry(entryData) {
    const prodName = this.lookupProductName(entryData.skuCode) || entryData.productName || 'Unknown SKU';
    const newEntry = {
      ticketId: 'LF-' + this.generate6DigitId(),
      timestamp: new Date().toISOString(),
      btiStaff: entryData.btiStaff,
      skuCode: entryData.skuCode,
      productName: prodName,
      qty: entryData.qty,
      foundAt: entryData.foundAt,
      reason: entryData.reason || '',
      status: 'Pending'
    };

    this.lostAndFound.unshift(newEntry);
    this.persistLostAndFound();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'createLostAndFound', ...newEntry })
        });
        setTimeout(() => this.syncGoogleSheets(), 2500);
      } catch (err) {
        console.error('Failed to push Lost & Found entry to WebApp:', err);
      }
    }

    return newEntry;
  }

  parsePutaway(csvText) {
    if (!csvText) {
      this.putawayRecords = [];
      this.persistPutawayRecords();
      return;
    }

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    const remoteEntries = (result.data || []).map(row => {
      const putawayId = this.findRowValue(row, ['putway id', 'putaway id', 'putway_id', 'putaway_id', 'id']);
      const pickingId = this.findRowValue(row, ['picking id', 'picking_id', 'pickingid']);
      const ticketId = this.findRowValue(row, ['ticket id', 'ticket_id', 'ticketid', 'uniqueid']);
      const skuCode = this.findRowValue(row, ['sku code', 'sku_code', 'sku number', 'sku_number', 'sku']);
      const productName = this.findRowValue(row, ['product name', 'product_name', 'product']);
      const qtyPut = this.findRowValue(row, ['qty put', 'qty_put', 'quantity put', 'quantity_put', 'qty', 'quantity']);
      const location = this.findRowValue(row, ['location', 'loc', 'storage location']);
      const staffName = this.findRowValue(row, ['staff name', 'staff_name', 'staff', 'operator']);
      const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();

      return {
        putawayId: String(putawayId).trim(),
        pickingId: String(pickingId).trim(),
        ticketId: String(ticketId).trim(),
        skuCode: String(skuCode).trim(),
        productName: String(productName).trim(),
        qtyPut: parseInt(String(qtyPut).trim() || '0', 10),
        location: String(location).trim(),
        staffName: String(staffName).trim(),
        timestamp: String(timestamp).trim()
      };
    }).filter(e => e.putawayId || e.pickingId);

    const unsynced = this.putawayRecords.filter(p => p.syncState === 'pending' || p.syncState === 'failed');
    const merged = [...unsynced];
    remoteEntries.forEach(re => {
      if (!merged.some(p => p.putawayId === re.putawayId)) {
        re.syncState = 'synced';
        merged.push(re);
      }
    });

    this.putawayRecords = merged;
    this.putawayRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.persistPutawayRecords();
  }

  loadSavedPutawayRecords() {
    try {
      const saved = localStorage.getItem('irms_putaway_records');
      const records = saved ? JSON.parse(saved) : [];
      records.forEach(r => {
        if (!r.syncState) r.syncState = 'synced';
      });
      return records;
    } catch (e) {
      return [];
    }
  }

  persistPutawayRecords() {
    try {
      localStorage.setItem('irms_putaway_records', JSON.stringify(this.putawayRecords));
    } catch (e) {
      console.error('Failed to persist putawayRecords', e);
    }
  }

  getPickingTaskRemainingQty(pickingId) {
    const task = this.pickingTasks.find(t => String(t.pickingId).trim() === String(pickingId).trim());
    if (!task) return 0;
    
    const sumPut = this.putawayRecords
      .filter(p => String(p.pickingId).trim() === String(pickingId).trim())
      .reduce((sum, p) => sum + (p.qtyPut || 0), 0);
      
    return Math.max(0, task.qty - sumPut);
  }

  async savePutawayEntry(entryData) {
    const ptId = 'PT-' + this.generate6DigitId();
    const now = new Date().toISOString();
    const pickingId = String(entryData.pickingId).trim();
    
    // Calculate total quantity put away so far for this task (including this submission)
    const sumPutSoFar = this.putawayRecords
      .filter(p => String(p.pickingId).trim() === pickingId)
      .reduce((sum, p) => sum + (p.qtyPut || 0), 0);
    
    const qtyPutThisTime = parseInt(entryData.qtyPut, 10);
    const task = this.pickingTasks.find(t => String(t.pickingId).trim() === pickingId);
    const taskQty = task ? task.qty : 0;
    const isCompleted = (sumPutSoFar + qtyPutThisTime) >= taskQty;

    const skuDetails = this.lookupSkuDetails(entryData.skuCode);
    const newEntry = {
      putawayId: ptId,
      pickingId: entryData.pickingId,
      ticketId: entryData.ticketId || '',
      skuCode: entryData.skuCode,
      productName: entryData.productName || (skuDetails ? skuDetails.productName : ''),
      qtyPut: qtyPutThisTime,
      location: entryData.location,
      staffName: entryData.staffName,
      timestamp: now,
      
      // Pre-filled lookup fields for SOH
      productId: skuDetails ? skuDetails.productId : '',
      l0CategoryName: skuDetails ? skuDetails.l0CategoryName : '',
      l1CategoryName: skuDetails ? skuDetails.l1CategoryName : '',
      l2CategoryName: skuDetails ? skuDetails.l2CategoryName : '',
      foodOrNonFood: skuDetails ? skuDetails.foodOrNonFood : '',

      // Pre-calculated statuses for Strategy A
      isCompleted: isCompleted,
      status: isCompleted ? 'Completed' : 'Picking',
      ticketStatus: isCompleted ? 'Completed' : 'Picking',
      syncState: 'pending'
    };

    // 1. Add locally immediately
    this.putawayRecords.unshift(newEntry);
    this.persistPutawayRecords();

    // 2. Local state updates for picking task and ticket IDs
    if (task) {
      if (isCompleted) {
        task.status = 'Completed';
        
        // Update ticket ID status
        const ticketId = String(task.ticketId || '').trim();
        if (ticketId) {
          const isLf = ticketId.startsWith('LF-');
          if (isLf) {
            const lfEntry = this.lostAndFound.find(e => String(e.ticketId).trim() === ticketId);
            if (lfEntry) lfEntry.status = 'Completed';
          } else {
            const reqEntry = this.requests.find(r => String(r.ticketId || r.uniqueid).trim() === ticketId);
            if (reqEntry) reqEntry.status = 'Completed';
          }
        }
      }
    }
    
    this.persistPickingTasks();
    this.persistRequests();
    this.persistLostAndFound();
    this.notifyListeners();

    // 3. POST WebApp (Asynchronous background trigger for Strategy B)
    this.postPutawayToBackend(newEntry);

    return newEntry;
  }

  async postPutawayToBackend(entry) {
    if (!this.webAppUrl) return;
    try {
      await fetch(this.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'createPutaway', ...entry })
      });
      entry.syncState = 'synced';
      this.persistPutawayRecords();
      this.notifyListeners();
      
      // Background sheet update refresh
      setTimeout(() => this.syncGoogleSheets(), 2500);
    } catch (err) {
      console.error(`Failed to push Putaway entry PT-#${entry.putawayId} to WebApp:`, err);
      entry.syncState = 'failed';
      this.persistPutawayRecords();
      this.notifyListeners();
      
      // Schedule background sync retry
      this.scheduleSyncRetry();
    }
  }

  scheduleSyncRetry() {
    if (this._retryTimer) return;
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      this.retryPendingSyncs();
    }, 15000);
  }

  async retryPendingSyncs() {
    const pending = this.putawayRecords.filter(p => p.syncState === 'failed' || p.syncState === 'pending');
    if (pending.length === 0) return;
    
    console.log(`Retrying ${pending.length} pending putaway syncs...`);
    let someSucceeded = false;
    for (const entry of pending) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'createPutaway', ...entry })
        });
        entry.syncState = 'synced';
        someSucceeded = true;
        console.log(`Successfully synced PT-#${entry.putawayId} in background retry`);
      } catch (err) {
        console.error(`Retry failed for PT-#${entry.putawayId}:`, err);
        this.scheduleSyncRetry();
        break;
      }
    }
    if (someSucceeded) {
      this.persistPutawayRecords();
      this.notifyListeners();
    }
  }

  parseSkusDb(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.skus = result.data.map(row => {
        const skuCode = this.findRowValue(row, ['sku_number', 'sku number', 'sku code', 'sku_code', 'sku']);
        const productName = this.findRowValue(row, ['product_name', 'product name', 'product']);
        const productId = this.findRowValue(row, ['product_id', 'product id', 'id']);
        const l0CategoryName = this.findRowValue(row, ['l0_category_name', 'l0 category name', 'l0 category', 'l0']);
        const l1CategoryName = this.findRowValue(row, ['l1_category_name', 'l1 category name', 'l1 category', 'l1']);
        const l2CategoryName = this.findRowValue(row, ['l2_category_name', 'l2 category name', 'l2 category', 'l2']);
        const foodOrNonFood = this.findRowValue(row, ['food_or_non_food', 'food or non food', 'food/non food', 'food']);

        return {
          skuCode: String(skuCode).trim(),
          productName: String(productName).trim(),
          productId: String(productId).trim(),
          l0CategoryName: String(l0CategoryName).trim(),
          l1CategoryName: String(l1CategoryName).trim(),
          l2CategoryName: String(l2CategoryName).trim(),
          foodOrNonFood: String(foodOrNonFood).trim()
        };
      }).filter(s => s.skuCode);
    }
  }

  lookupSkuDetails(skuCode) {
    const cleanSku = String(skuCode || '').trim();
    if (!cleanSku) return null;
    return this.skus.find(s => s.skuCode === cleanSku) || null;
  }

  lookupProductName(skuCode) {
    const cleanSku = String(skuCode || '').trim();
    if (!cleanSku) return '';
    const match = this.skus.find(s => s.skuCode === cleanSku);
    return match ? match.productName : '';
  }

  parseSoh(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      this.soh = result.data.map(row => {
        const skuCode = this.findRowValue(row, ['sku_number', 'sku number', 'sku code', 'sku_code', 'sku']);
        const rackLocation = this.findRowValue(row, ['rack_location', 'rack location', 'location', 'rack']);
        const qtySoh = this.findRowValue(row, ['qty soh', 'qty_soh', 'quantity SOH', 'quantity_soh', 'qty', 'quantity']);
        const updatedAt = this.findRowValue(row, ['updated_at', 'updated at', 'timestamp', 'date', 'time']) || new Date().toISOString();

        const qtyOnSo = this.findRowValue(row, ['qty on so', 'qty_on_so', 'qtyonso', 'qty_so', 'qty on sales order']);
        const countSo = this.findRowValue(row, ['count so', 'count_so', 'countso', 'count_so', 'count sales order']);
        const qtyOnLdp = this.findRowValue(row, ['qty on ldp', 'qty_on_ldp', 'qtyonldp', 'ldp', 'qty ldp']);
        const stockAge = this.findRowValue(row, ['stock age', 'stock_age', 'stockage', 'age']);
        const actionSuggestion = this.findRowValue(row, ['action suggestion', 'action_suggestion', 'actionsuggest', 'suggestion']);

        return {
          skuCode: String(skuCode).trim(),
          rackLocation: String(rackLocation).trim(),
          qtySoh: parseInt(String(qtySoh).trim() || '0', 10),
          updatedAt: String(updatedAt).trim(),
          qtyOnSo: parseFloat(String(qtyOnSo).trim() || '0'),
          countSo: parseInt(String(countSo).trim() || '0', 10),
          qtyOnLdp: parseFloat(String(qtyOnLdp).trim() || '0'),
          stockAge: parseInt(String(stockAge).trim() || '0', 10),
          actionSuggestion: String(actionSuggestion || '').trim()
        };
      }).filter(s => s.skuCode);
    }
  }

  getSohList() {
    return this.soh.map(item => {
      const skuDetails = this.lookupSkuDetails(item.skuCode) || {};
      return {
        ...item,
        productId: skuDetails.productId || 'N/A',
        productName: skuDetails.productName || 'Unknown Product',
        l0CategoryName: skuDetails.l0CategoryName || 'N/A',
        l1CategoryName: skuDetails.l1CategoryName || 'N/A',
        l2CategoryName: skuDetails.l2CategoryName || 'N/A',
        foodOrNonFood: skuDetails.foodOrNonFood || 'N/A'
      };
    });
  }

  parseStockMovement(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      const remoteMovements = result.data.map(row => {
        const movementId = this.findRowValue(row, ['movement id', 'movement_id', 'movementid', 'id']);
        const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();
        const assignedBy = this.findRowValue(row, ['assigned by', 'assigned_by', 'assignedby']);
        const staffName = this.findRowValue(row, ['staff name', 'staff_name', 'staffname', 'staff']);
        const skuCode = this.findRowValue(row, ['sku code', 'sku_code', 'skucode', 'sku number', 'sku']);
        const productName = this.findRowValue(row, ['product name', 'product_name', 'productname', 'product']);
        const sourceQty = this.findRowValue(row, ['source qty', 'source_qty', 'sourceqty']);
        const qty = this.findRowValue(row, ['qty', 'quantity']);
        const type = this.findRowValue(row, ['type']);
        const reason = this.findRowValue(row, ['reason']);
        const fromLocation = this.findRowValue(row, ['from location', 'from_location', 'fromlocation']);
        const toLocation = this.findRowValue(row, ['to location', 'to_location', 'tolocation']);
        const status = this.findRowValue(row, ['status']) || 'Pending';

        return {
          movementId: String(movementId).trim(),
          timestamp: String(timestamp).trim(),
          assignedBy: String(assignedBy).trim(),
          staffName: String(staffName).trim(),
          skuCode: String(skuCode).trim(),
          productName: String(productName).trim(),
          sourceQty: parseInt(String(sourceQty).trim() || '0', 10),
          qty: parseInt(String(qty).trim() || '1', 10),
          type: String(type).trim(),
          reason: String(reason).trim(),
          fromLocation: String(fromLocation).trim(),
          toLocation: String(toLocation).trim(),
          status: String(status).trim()
        };
      }).filter(m => m.movementId);

      const mergedMap = new Map();
      this.stockMovements.forEach(m => mergedMap.set(m.movementId, m));
      remoteMovements.forEach(m => mergedMap.set(m.movementId, m));
      
      this.stockMovements = Array.from(mergedMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.persistStockMovements();
    }
  }

  parseStockActivity(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      const remoteActs = result.data.map(row => {
        const activityId = this.findRowValue(row, ['activity id', 'activity_id', 'activityid', 'id']);
        const ticketId = this.findRowValue(row, ['ticket id', 'ticket_id', 'ticketid']);
        const skuCode = this.findRowValue(row, ['sku code', 'sku_code', 'skucode', 'sku']);
        const productName = this.findRowValue(row, ['product name', 'product_name', 'productname', 'product']);
        const qty = this.findRowValue(row, ['qty', 'quantity']);
        const operator = this.findRowValue(row, ['operator']);
        const fromLocation = this.findRowValue(row, ['from location', 'from_location', 'fromlocation']);
        const toLocation = this.findRowValue(row, ['to location', 'to_location', 'tolocation']);
        const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();

        return {
          activityId: String(activityId).trim(),
          ticketId: String(ticketId).trim(),
          skuCode: String(skuCode).trim(),
          productName: String(productName).trim(),
          qty: parseInt(String(qty).trim() || '0', 10),
          operator: String(operator).trim(),
          fromLocation: String(fromLocation).trim(),
          toLocation: String(toLocation).trim(),
          timestamp: String(timestamp).trim()
        };
      }).filter(a => a.activityId);

      const mergedMap = new Map();
      this.stockActivities.forEach(a => mergedMap.set(a.activityId, a));
      remoteActs.forEach(a => mergedMap.set(a.activityId, a));

      this.stockActivities = Array.from(mergedMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.persistStockActivities();
    }
  }

  // ── Stock Movement & Deduction ──────────────────────────────────────────

  loadSavedStockMovements() {
    try {
      const saved = localStorage.getItem('irms_stock_movements');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  persistStockMovements() {
    try {
      localStorage.setItem('irms_stock_movements', JSON.stringify(this.stockMovements));
    } catch (e) {
      console.error('Failed to persist stockMovements', e);
    }
  }

  loadSavedStockActivities() {
    try {
      const saved = localStorage.getItem('irms_stock_activities');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  persistStockActivities() {
    try {
      localStorage.setItem('irms_stock_activities', JSON.stringify(this.stockActivities));
    } catch (e) {
      console.error('Failed to persist stockActivities', e);
    }
  }

  getStockMovements() {
    return [...this.stockMovements].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getStockActivities() {
    return [...this.stockActivities].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  async createStockMovement(data, currentUser) {
    const movementId = 'SM' + this.generate6DigitId();
    const timestamp = new Date().toISOString();
    const assignedBy = currentUser ? (currentUser.name || currentUser.staffId) : 'System';

    const qty = parseInt(String(data.qty || '1').trim(), 10) || 1;
    const sourceQty = parseInt(String(data.sourceQty || '0').trim(), 10) || 0;

    const newMovement = {
      movementId,
      timestamp,
      assignedBy,
      staffName: String(data.staffName || '').trim(),
      skuCode: String(data.skuCode || '').trim(),
      productName: String(data.productName || '').trim(),
      sourceQty,
      qty,
      type: String(data.type || 'Transfer location').trim(),
      reason: String(data.reason || '').trim(),
      fromLocation: String(data.fromLocation || '').trim(),
      toLocation: data.type === 'Stock deduction' ? 'Deduction' : String(data.toLocation || '').trim(),
      status: 'Pending'
    };

    this.stockMovements.unshift(newMovement);
    this.persistStockMovements();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'createStockMovement', ...newMovement })
        });
        setTimeout(() => this.syncGoogleSheets(['soh']), 2500);
      } catch (err) {
        console.error('Failed to push createStockMovement to WebApp:', err);
      }
    }

    return newMovement;
  }

  async updateStockMovement(movementId, updates) {
    const idx = this.stockMovements.findIndex(m => String(m.movementId).trim() === String(movementId).trim());
    if (idx === -1) throw new Error(`Stock movement "${movementId}" not found`);

    if (this.stockMovements[idx].status !== 'Pending') {
      throw new Error('Only pending stock movement tasks can be edited');
    }

    const updated = {
      ...this.stockMovements[idx],
      ...updates
    };

    if (updates.type === 'Stock deduction') {
      updated.toLocation = 'Deduction';
    }

    this.stockMovements[idx] = updated;
    this.persistStockMovements();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateStockMovement', movementId, ...updates })
        });
      } catch (err) {
        console.error('Failed to push updateStockMovement to WebApp:', err);
      }
    }

    return updated;
  }

  async completeStockMovement(movementId, operatorUser, updatedToLocation) {
    const idx = this.stockMovements.findIndex(m => String(m.movementId).trim() === String(movementId).trim());
    if (idx === -1) throw new Error(`Stock movement "${movementId}" not found`);

    const movement = this.stockMovements[idx];
    if (movement.status === 'Done') {
      throw new Error(`Stock movement "${movementId}" is already completed`);
    }

    if (updatedToLocation && String(updatedToLocation).trim()) {
      movement.toLocation = String(updatedToLocation).trim();
    }

    // 1. Mark status as Done
    movement.status = 'Done';
    movement.completedAt = new Date().toISOString();
    movement.completedBy = operatorUser ? (operatorUser.name || operatorUser.staffId) : 'System';

    // 2. Affect Stock On Hand (SOH)
    const moveQty = movement.qty || 0;
    const sku = movement.skuCode;
    const fromLoc = movement.fromLocation;
    const toLoc = movement.toLocation;

    // Deduct from source rack location
    const sourceSohIdx = this.soh.findIndex(s => s.skuCode === sku && s.rackLocation === fromLoc);
    if (sourceSohIdx !== -1) {
      this.soh[sourceSohIdx].qtySoh = Math.max(0, this.soh[sourceSohIdx].qtySoh - moveQty);
      this.soh[sourceSohIdx].updatedAt = new Date().toISOString();
    }

    // If Transfer Location, add to destination rack location
    if (movement.type === 'Transfer location' && toLoc && toLoc !== 'Deduction') {
      const destSohIdx = this.soh.findIndex(s => s.skuCode === sku && s.rackLocation === toLoc);
      if (destSohIdx !== -1) {
        this.soh[destSohIdx].qtySoh += moveQty;
        this.soh[destSohIdx].updatedAt = new Date().toISOString();
      } else {
        // Create new rack entry in SOH
        this.soh.push({
          skuCode: sku,
          rackLocation: toLoc,
          qtySoh: moveQty,
          updatedAt: new Date().toISOString(),
          qtyOnSo: 0,
          countSo: 0,
          qtyOnLdp: 0,
          stockAge: 0,
          actionSuggestion: ''
        });
      }
    }

    // 3. Populate Stock Activity Log
    const actTimestamp = new Date().toISOString();
    const act1 = {
      activityId: 'SA' + this.generate6DigitId(),
      ticketId: movement.movementId,
      skuCode: movement.skuCode,
      productName: movement.productName,
      qty: moveQty,
      operator: '-',
      fromLocation: fromLoc,
      toLocation: movement.type === 'Transfer location' ? toLoc : 'Deduction',
      timestamp: actTimestamp,
      assignedBy: movement.assignedBy,
      executedBy: movement.staffName || (operatorUser ? operatorUser.name : 'System'),
      type: movement.type,
      reason: movement.reason
    };
    this.stockActivities.unshift(act1);

    if (movement.type === 'Transfer location' && toLoc && toLoc !== 'Deduction') {
      const act2 = {
        activityId: 'SA' + this.generate6DigitId(),
        ticketId: movement.movementId,
        skuCode: movement.skuCode,
        productName: movement.productName,
        qty: moveQty,
        operator: '+',
        fromLocation: fromLoc,
        toLocation: toLoc,
        timestamp: actTimestamp,
        assignedBy: movement.assignedBy,
        executedBy: movement.staffName || (operatorUser ? operatorUser.name : 'System'),
        type: movement.type,
        reason: movement.reason
      };
      this.stockActivities.unshift(act2);
    }

    this.persistStockMovements();
    this.persistStockActivities();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'completeStockMovement', movementId, completedBy: movement.completedBy })
        });
        setTimeout(() => this.syncGoogleSheets(['soh']), 2500);
      } catch (err) {
        console.error('Failed to push completeStockMovement to WebApp:', err);
      }
    }

    return movement;
  }

  async cancelStockMovement(movementId) {
    const idx = this.stockMovements.findIndex(m => String(m.movementId).trim() === String(movementId).trim());
    if (idx === -1) throw new Error(`Stock movement "${movementId}" not found`);

    if (this.stockMovements[idx].status !== 'Pending') {
      throw new Error('Only pending tasks can be cancelled');
    }

    this.stockMovements.splice(idx, 1);
    this.persistStockMovements();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'cancelStockMovement', movementId })
        });
      } catch (err) {
        console.error('Failed to push cancelStockMovement to WebApp:', err);
      }
    }
  }
}

export const db = new DatabaseService();

