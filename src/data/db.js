import Papa from 'papaparse';
import { GOOGLE_SHEETS_CONFIG } from '../config/googleSheets.js';
import { cacheManager } from './cacheManager.js';

export const DATA_EXPIRY_DURATION_MS = 5 * 60 * 1000; // 5 minutes TTL for operational data
export const MASTER_DATA_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours TTL for static master reference data

class DatabaseService {
  constructor() {
    this.users = [];
    this.soList = [];
    this.requests = [];
    this.pickingTasks = [];
    this.racks = [];
    this.zones = [];
    this.checkerLines = [];
    this.lostAndFound = [];
    this.putawayRecords = [];
    this.stockMovements = [];
    this.stockActivities = [];
    this.troubleShootTickets = [];
    this.skus = [];
    this.whPlanograms = [];
    this.soh = [];
    this.sohwh = [];
    this.spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
    this.webAppUrl = GOOGLE_SHEETS_CONFIG.webAppUrl;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.lastSectionSyncTime = {};  // { tabId: ISO string } per-section timestamps
    this.syncError = null;
    this.isLoaded = false;
    this.listeners = [];
    this.isRetryingSync = false;

    // Cross-tab Synchronization Channel (0ms inter-tab update propagation)
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel('irms_db_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'DATA_UPDATED') {
            this.handleRemoteTabUpdate(event.data.storeName);
          }
        };
      } catch (e) {
        this.broadcastChannel = null;
      }
    }
    
    // Instant 0ms IndexedDB Hydration & Master Data Lifecycle Check
    this.initPromise = this.initStartupSync();

    // Background interval: Check every 30 seconds if active task data needs background refresh
    this.cacheCheckInterval = setInterval(() => {
      this.checkAndRefreshIfExpired();
    }, 30 * 1000);
  }

  async isMasterDataExpired(storeName) {
    const lastSync = await cacheManager.getLastSyncTime(storeName);
    if (!lastSync) return true;
    const ms = new Date(lastSync).getTime();
    if (isNaN(ms)) return true;
    return (Date.now() - ms) >= MASTER_DATA_TTL_MS;
  }

  async initStartupSync() {
    await this.initCache();

    // Check which master data stores are missing or expired (> 12 hours)
    const masterStores = [
      { key: 'userDb', data: this.users },
      { key: 'skusDb', data: this.skus },
      { key: 'zones', data: this.zones },
      { key: 'racks', data: this.racks },
      { key: 'checkerLines', data: this.checkerLines },
      { key: 'whPlanogram', data: this.whPlanograms }
    ];

    const neededTabs = [];
    for (const m of masterStores) {
      if (!m.data || m.data.length === 0) {
        neededTabs.push(m.key);
      } else {
        const isExpired = await this.isMasterDataExpired(m.key);
        if (isExpired) {
          neededTabs.push(m.key);
        }
      }
    }

    if (neededTabs.length > 0) {
      console.log(`[Master Data Sync] Fetching missing/expired master datasets: ${neededTabs.join(', ')}`);
      await this.syncGoogleSheets(neededTabs);
    } else {
      console.log(`[Master Data Sync] Master reference data is fully cached in IndexedDB. 0ms instant startup.`);
      // Fast background user check so role/account changes apply promptly
      this.syncGoogleSheets(['userDb']).catch(() => {});
    }
  }

  broadcastUpdate(storeName) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: 'DATA_UPDATED', storeName, timestamp: Date.now() });
      } catch (e) {}
    }
  }

  async handleRemoteTabUpdate(storeName) {
    try {
      const records = await cacheManager.getStore(storeName);
      if (records) {
        if (storeName === 'requests') this.requests = records;
        else if (storeName === 'pickingTasks') this.pickingTasks = records;
        else if (storeName === 'troubleShoot') this.troubleShootTickets = records;
        else if (storeName === 'lostAndFound') this.lostAndFound = records;
        else if (storeName === 'stockMovements') this.stockMovements = records;
        else if (storeName === 'stockActivity') this.stockActivities = records;
        else if (storeName === 'putaway') this.putawayRecords = records;
        else if (storeName === 'soh') this.soh = records;
        else if (storeName === 'userDb') this.users = records;
        else if (storeName === 'skusDb') this.skus = records;
        else if (storeName === 'racks') this.racks = records;
        else if (storeName === 'zones') this.zones = records;
        else if (storeName === 'checkerLines') this.checkerLines = records;
        else if (storeName === 'soData') this.soList = records;
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('Error handling inter-tab update:', e);
    }
  }

  /**
   * Universal Delta Sync & Upsert Helper
   * - Appends new records if ID not present in local cache.
   * - Updates existing record if remote timestamp >= local timestamp.
   * - Preserves optimistic local pending changes.
   * - Sorts resulting dataset descending by primary timestamp.
   */
  mergeDeltaRecords(cachedList, remoteList, keyProp, timestampProps = ['updateAt', 'updatedAt', 'timestamp', 'requestTimestamp', 'date', 'time']) {
    const map = new Map();
    const tProps = Array.isArray(timestampProps) ? timestampProps : [timestampProps];

    const getTimestampMs = (item) => {
      if (!item) return 0;
      for (const p of tProps) {
        if (item[p]) {
          const ms = new Date(item[p]).getTime();
          if (!isNaN(ms)) return ms;
        }
      }
      return 0;
    };

    // 1. Seed with local cached data
    if (Array.isArray(cachedList)) {
      for (const item of cachedList) {
        if (item && item[keyProp] !== undefined && item[keyProp] !== null && String(item[keyProp]).trim() !== '') {
          map.set(String(item[keyProp]).trim(), item);
        }
      }
    }

    // 2. Upsert incoming remote records
    if (Array.isArray(remoteList)) {
      for (const remote of remoteList) {
        if (!remote || remote[keyProp] === undefined || remote[keyProp] === null || String(remote[keyProp]).trim() === '') continue;
        const pk = String(remote[keyProp]).trim();
        const existing = map.get(pk);

        if (!existing) {
          // Brand new row -> Append
          map.set(pk, remote);
        } else {
          // Existing row -> Compare timestamps
          const remoteTime = getTimestampMs(remote);
          const localTime = getTimestampMs(existing);

          // Don't overwrite an optimistic local pending change with stale remote data
          if (existing.syncState === 'pending' && remote.syncState !== 'synced') {
            continue;
          }

          if (remoteTime >= localTime || localTime === 0) {
            map.set(pk, { ...existing, ...remote });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => getTimestampMs(b) - getTimestampMs(a));
  }

  async initCache() {
    try {
      await cacheManager.init();
      const [cReqs, cTasks, cLf, cSoh, cSm, cUsers, cSkus, cRacks, cZones, cLines, cSohwh, cTs, cWp, cSo, cPutaway, cSa] = await Promise.all([
        cacheManager.getStore('requests'),
        cacheManager.getStore('pickingTasks'),
        cacheManager.getStore('lostAndFound'),
        cacheManager.getStore('soh'),
        cacheManager.getStore('stockMovements'),
        cacheManager.getStore('userDb'),
        cacheManager.getStore('skusDb'),
        cacheManager.getStore('racks'),
        cacheManager.getStore('zones'),
        cacheManager.getStore('checkerLines'),
        cacheManager.getStore('sohwh'),
        cacheManager.getStore('troubleShoot'),
        cacheManager.getStore('whPlanogram'),
        cacheManager.getStore('soData'),
        cacheManager.getStore('putaway'),
        cacheManager.getStore('stockActivity')
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
      if (cSohwh && cSohwh.length) this.sohwh = cSohwh;
      if (cTs && cTs.length) this.troubleShootTickets = cTs;
      if (cWp && cWp.length) this.whPlanograms = cWp;
      if (cSo && cSo.length) this.soList = cSo;
      if (cPutaway && cPutaway.length) this.putawayRecords = cPutaway;
      if (cSa && cSa.length) this.stockActivities = cSa;

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
        const staffIdRaw = this.findRowValue(row, ['staff id', 'staff_id', 'staffid', 'user id', 'user_id', 'userid', 'id', 'staff', 'npp', 'nik', 'code']);
        const name = this.findRowValue(row, ['name', 'staff name', 'user name', 'fullname', 'nama']);
        const role = this.findRowValue(row, ['role', 'user role', 'jabatan']);
        const access = this.findRowValue(row, ['acess', 'access', 'menu access', 'akses']);
        const password = this.findRowValue(row, ['password', 'pwd', 'pass', 'pin']);

        // Strip leading single-quote (Google Sheets text-force prefix) and whitespace
        const staffId = String(staffIdRaw !== undefined && staffIdRaw !== null ? staffIdRaw : '')
          .replace(/^'/, '')
          .trim();

        return {
          staffId: staffId,
          name: String(name || '').trim(),
          role: String(role || '').trim(),
          access: String(access || '').trim(),
          password: String(password || '').trim()
        };
      }).filter(u => u.staffId && u.staffId.length > 0); // Require a non-empty staffId
    }
  }

  /**
   * Parse User_DB from GAS JSON response (doGet?action=getUsers).
   * Uses getDisplayValues() in GAS — returns actual text cell values,
   * bypassing the GViz CSV bug that drops text-formatted cells (apostrophe-prefixed).
   */
  parseUsersJson(usersArray) {
    if (!Array.isArray(usersArray)) return;
    this.users = usersArray.map(row => {
      // Normalize keys — GAS returns headers exactly as in Sheets ("Staff ID", "Name", etc.)
      const staffId = String(
        row['Staff ID'] || row['staff_id'] || row['staffid'] || row['User ID'] ||
        row['user_id'] || row['id'] || ''
      ).replace(/^'/, '').trim();

      const name     = String(row['Name'] || row['name'] || row['staff name'] || '').trim();
      const role     = String(row['Role'] || row['role'] || '').trim();
      const access   = String(row['Acess'] || row['Access'] || row['acess'] || row['access'] || '').trim();
      const password = String(row['Password'] || row['password'] || row['pwd'] || '').trim();

      return { staffId, name, role, access, password };
    }).filter(u => u.staffId && u.staffId.length > 0);
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
        const originRackName = this.findRowValue(row, ['origin_rack_name', 'origin rack name', 'origin_rack', 'origin rack']) || '';
        const wave = this.findRowValue(row, ['wave', 'wave_number', 'wavenumber', 'wave name', 'wave_name']) || '';

        const sNum = String(soNumber || '').trim();
        const sku = String(skuNumber || '').trim();
        const tStamp = String(timestamp || '').trim();

        return {
          id: `${sNum}_${sku}_${tStamp}`,
          timestamp: tStamp,
          pickerName: String(pickerName).trim(),
          soNumber: sNum,
          skuNumber: sku,
          productName: String(productName).trim(),
          status: String(status).trim(),
          requestQty: parseInt(String(qty).trim() || '1', 10),
          originRackName: String(originRackName).trim(),
          wave: String(wave).trim()
        };
      }).filter(item => item.soNumber);

      if (this.soList.length > 0) {
        const topTs = this._pendingSoDataTimestamp || this.soList[0].timestamp;
        if (topTs) {
          cacheManager.setLastSyncTime('soData_timestamp', topTs);
        }
      }
    }
  }

  async checkLatestSheetTimestamp(tabName) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}&range=A1:A2&_t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const text = await res.text();
      if (text.includes('<!DOCTYPE html>') || !text.trim()) return null;
      const lines = text.trim().split(/\r?\n/);
      if (lines.length >= 2) {
        const val = lines[1].replace(/^"|"$/g, '').trim();
        return val || null;
      }
      return null;
    } catch (e) {
      console.warn(`Timestamp check failed for ${tabName}:`, e);
      return null;
    }
  }

  recalculateVirtualSoh() {
    if (!this.sohwh || this.sohwh.length === 0) return;
    const reserveMap = new Map();
    this.soList.forEach(so => {
      const sku = String(so.skuNumber).trim();
      if (sku) {
        const current = reserveMap.get(sku) || 0;
        reserveMap.set(sku, current + (so.requestQty || 0));
      }
    });

    this.sohwh.forEach(item => {
      const reserveStock = reserveMap.get(item.skuNumber) || 0;
      item.reserveStock = reserveStock;
      item.finalVirtualSoh = (item.qtyStock || 0) - reserveStock;
    });
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
      const reason = this.findRowValue(row, ['reason', 'request reason', 'alasan']) || '';

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
        status: String(status).trim(),
        reason: String(reason).trim()
      };
    }).filter(req => req.ticketId || req.soNumber);

    // Delta sync: update existing if newer timestamp, append if new row
    this.requests = this.mergeDeltaRecords(this.requests, remoteReqs, 'ticketId', ['timestamp', 'date']);
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

    // Delta sync: update existing if newer timestamp, append if new row
    this.pickingTasks = this.mergeDeltaRecords(this.pickingTasks, remoteTasks, 'pickingId', ['timestamp', 'date']);
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
    return '';
  }

  updateBlockerMessage(message) {
    const overlay = document.getElementById('globalBlockerLock');
    if (overlay) {
      const p = overlay.querySelector('p');
      if (p) p.textContent = message;
    }
  }

  async fetchSupersetCookie() {
    const cookieSpreadsheetId = GOOGLE_SHEETS_CONFIG.superset?.cookieSpreadsheetId || '1Clj9YvTa6zaFnuEZI0eSDFAIGSBIl7vjqaYcWLNIGtg';
    const cookieTabName = GOOGLE_SHEETS_CONFIG.superset?.cookieTabName || 'Cookie';
    const cookieUrl = `https://docs.google.com/spreadsheets/d/${cookieSpreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cookieTabName)}&_t=${Date.now()}`;
    
    const res = await fetch(cookieUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch Superset session cookie from Google Sheets');
    const text = await res.text();
    const match = text.match(/"([^"]+)"/);
    return match ? match[1] : text.trim();
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
    const sohwhTab = GOOGLE_SHEETS_CONFIG.tabs.sohwh || 'SOHWH';
    const troubleShootTab = GOOGLE_SHEETS_CONFIG.tabs.troubleShoot || 'Trouble_Shoot';
    const whPlanogramTab = GOOGLE_SHEETS_CONFIG.tabs.whPlanogram || 'WH_PLANOGRAM';
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
        } else if (t === 'pickingTask') {
          normalizedTabSet.add('pickingTask');
          normalizedTabSet.add('requestChecker');
          normalizedTabSet.add('putaway');
          normalizedTabSet.add('soh');
        } else if (t === 'lostAndFound') {
          normalizedTabSet.add('lostAndFound');
        } else if (t === 'soh') {
          normalizedTabSet.add('soh');
        } else if (t === 'stockMovement') {
          normalizedTabSet.add('stockMovement');
          normalizedTabSet.add('stockActivity');
          normalizedTabSet.add('soh');
        } else if (t === 'tsRequest') {
          normalizedTabSet.add('troubleShoot');
          normalizedTabSet.add('soData');
          normalizedTabSet.add('checkerLines');
        } else if (t === 'troubleShoot') {
          normalizedTabSet.add('troubleShoot');
          normalizedTabSet.add('soData');
        } else if (t === 'tsTask') {
          normalizedTabSet.add('troubleShoot');
          normalizedTabSet.add('soData');
          normalizedTabSet.add('soh');
          normalizedTabSet.add('sohwh');
        } else {
          normalizedTabSet.add(t);
        }
      });
    }

    const shouldSync = (tabKey) => !normalizedTabSet || normalizedTabSet.has(tabKey);

    const fetches = [];
    if (shouldSync('userDb')) {
      // Use GAS web app JSON endpoint for User_DB — GViz CSV silently drops text-formatted cells (e.g. AST-01033)
      const userDbUrl = `${this.webAppUrl}?action=getUsers&${cacheBuster}`;
      fetches.push(fetch(userDbUrl, { cache: 'no-store' }).then(r => ({ key: 'userDb', res: r })).catch(() => null));
    }
    if (shouldSync('soData')) {
      const soDataFetch = (async () => {
        try {
          // If we already have cached soData, check if Column A Row 2 timestamp has changed
          if (this.soList && this.soList.length > 0) {
            const latestTs = await this.checkLatestSheetTimestamp(soDataTab);
            const cachedTs = await cacheManager.getLastSyncTime('soData_timestamp');
            if (latestTs && cachedTs && String(latestTs).trim() === String(cachedTs).trim()) {
              console.log(`[SO_DATA Sync] Timestamp unchanged (${latestTs}). Skipping full download.`);
              return { key: 'soData', skipped: true };
            }
            this._pendingSoDataTimestamp = latestTs;
          }
          const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(soDataTab)}&${cacheBuster}`, { cache: 'no-store' });
          return { key: 'soData', res: res };
        } catch (err) {
          console.error('soData fetch error:', err);
          return null;
        }
      })();
      fetches.push(soDataFetch);
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
      const skusDbFetch = (async () => {
        try {
          // If we already have cached skus, check if Column A Row 2 timestamp has changed
          if (this.skus && this.skus.length > 0) {
            const latestTs = await this.checkLatestSheetTimestamp(skusDbTab);
            const cachedTs = await cacheManager.getLastSyncTime('skusDb_timestamp');
            if (latestTs && cachedTs && String(latestTs).trim() === String(cachedTs).trim()) {
              console.log(`[SKUs_DB Sync] Timestamp unchanged (${latestTs}). Skipping full download.`);
              return { key: 'skusDb', skipped: true };
            }
            this._pendingSkusDbTimestamp = latestTs;
          }
          const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(skusDbTab)}&${cacheBuster}`, { cache: 'no-store' });
          return { key: 'skusDb', res: res };
        } catch (err) {
          console.error('skusDb fetch error:', err);
          return null;
        }
      })();
      fetches.push(skusDbFetch);
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
    if (shouldSync('troubleShoot')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(troubleShootTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'troubleShoot', res: r })).catch(() => null));
    }
    if (shouldSync('whPlanogram')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(whPlanogramTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'whPlanogram', res: r })).catch(() => null));
    }
    if (shouldSync('sohwh')) {
      const supersetFetch = (async () => {
        try {
          // 1. Get cached cookie from localStorage or fetch it
          let cookie = localStorage.getItem('superset_session_cookie');
          if (!cookie) {
            cookie = await this.fetchSupersetCookie();
            localStorage.setItem('superset_session_cookie', cookie);
          }
          
          const baseUrl = GOOGLE_SHEETS_CONFIG.superset?.baseUrl || '/superset-api';
          const datasourceId = GOOGLE_SHEETS_CONFIG.superset?.datasourceId || 348;
          
          const payload = {
            datasource: { id: datasourceId, type: "table" },
            force: true,
            result_format: "csv",
            result_type: "results",
            queries: [
              {
                columns: [
                  "product_id",
                  "sku_number",
                  "product_name",
                  "rack_name"
                ],
                metrics: [
                  {
                    expressionType: "SIMPLE",
                    aggregate: "SUM",
                    column: { column_name: "stock" },
                    label: "Qty Stock"
                  }
                ],
                filters: [
                  {
                    col: "product_detail_created_at",
                    op: "TEMPORAL_RANGE",
                    val: "No filter"
                  },
                  {
                    col: "location_id",
                    op: "IN",
                    val: ["819"]
                  },
                  {
                    col: "stock",
                    op: ">",
                    val: "0"
                  },
                  {
                    col: "inventory_status",
                    op: "IN",
                    val: ["available"]
                  }
                ],
                row_limit: 100000
              }
            ]
          };

          const makeRequest = async (cookieVal) => {
            return await fetch(`${baseUrl}/api/v1/chart/data`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Superset-Cookie': cookieVal
              },
              body: JSON.stringify(payload)
            });
          };

          let res = await makeRequest(cookie);
          
          // 2. Auto-retry once on 401 / 403 (unauthorized/cookie expired)
          if (res.status === 401 || res.status === 403) {
            console.warn('Superset session cookie expired. Fetching fresh cookie from Google Sheets...');
            cookie = await this.fetchSupersetCookie();
            localStorage.setItem('superset_session_cookie', cookie);
            res = await makeRequest(cookie);
          }

          if (!res.ok) {
            return { key: 'sohwh', res: res };
          }

          // 3. Read stream chunk-by-chunk to stream downloaded size to UI
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let chunks = [];
          let receivedLength = 0;

          this.updateBlockerMessage('Downloading SOHWH: Starting stream...');

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedLength += value.length;

            const sizeStr = receivedLength >= 1024 * 1024
              ? `${(receivedLength / (1024 * 1024)).toFixed(2)} MB`
              : `${(receivedLength / 1024).toFixed(1)} KB`;
            
            this.updateBlockerMessage(`Downloading SOHWH: ${sizeStr} received...`);
          }

          let allChunks = new Uint8Array(receivedLength);
          let position = 0;
          for (let chunk of chunks) {
            allChunks.set(chunk, position);
            position += chunk.length;
          }

          const decodedText = decoder.decode(allChunks);
          const mockResponse = {
            ok: true,
            status: 200,
            text: async () => decodedText
          };
          
          return { key: 'sohwh', res: mockResponse };
        } catch (e) {
          console.error('Superset fetch error:', e);
          return null;
        }
      })();
      fetches.push(supersetFetch);
    }

    try {
      const results = await Promise.all(fetches);
      let successCount = 0;

      for (const item of results) {
        if (!item) continue;
        if (item.skipped) {
          successCount++;
          continue;
        }
        if (!item.res || !item.res.ok) continue;
        const text = await item.res.text();
        if (text.includes('<!DOCTYPE html>')) continue;

        successCount++;
        if (item.key === 'userDb') {
          // userDb comes back as JSON from GAS web app
          try {
            const json = JSON.parse(text);
            if (json.result === 'success' && Array.isArray(json.users)) {
              this.parseUsersJson(json.users);
            } else {
              // Fallback: if JSON parse fails or error, try treating as CSV
              this.parseUsers(text);
            }
          } catch (e) {
            // Fallback to CSV parse if JSON parsing fails
            this.parseUsers(text);
          }
          cacheManager.setStore('userDb', this.users);
          cacheManager.setLastSyncTime('userDb', new Date().toISOString());
        }
        if (item.key === 'soData') {
          this.parseSoData(text);
          cacheManager.setStore('soData', this.soList);
        }
        if (item.key === 'requestChecker') this.parseRequestChecker(text);
        if (item.key === 'pickingTask') this.parsePickingTask(text);
        if (item.key === 'racks') {
          this.parseRacks(text);
          cacheManager.setStore('racks', this.racks);
          cacheManager.setLastSyncTime('racks', new Date().toISOString());
        }
        if (item.key === 'zones') {
          this.parseZones(text);
          cacheManager.setStore('zones', this.zones);
          cacheManager.setLastSyncTime('zones', new Date().toISOString());
        }
        if (item.key === 'lostAndFound') this.parseLostAndFound(text);
        if (item.key === 'checkerLines') {
          this.parseCheckerLines(text);
          cacheManager.setStore('checkerLines', this.checkerLines);
          cacheManager.setLastSyncTime('checkerLines', new Date().toISOString());
        }
        if (item.key === 'putaway') {
          this.parsePutaway(text);
          cacheManager.setStore('putaway', this.putawayRecords);
        }
        if (item.key === 'skusDb') {
          this.parseSkusDb(text);
          cacheManager.setStore('skusDb', this.skus);
          cacheManager.setLastSyncTime('skusDb', new Date().toISOString());
        }
        if (item.key === 'soh') {
          this.parseSoh(text);
          cacheManager.setStore('soh', this.soh);
        }
        if (item.key === 'stockMovement') {
          this.parseStockMovement(text);
          cacheManager.setStore('stockMovements', this.stockMovements);
        }
        if (item.key === 'stockActivity') {
          this.parseStockActivity(text);
          cacheManager.setStore('stockActivity', this.stockActivities);
        }
        if (item.key === 'sohwh') {
          this.parseSohwh(text);
          cacheManager.setStore('sohwh', this.sohwh);
        }
        if (item.key === 'troubleShoot') {
          this.parseTroubleShoot(text);
          cacheManager.setStore('troubleShoot', this.troubleShootTickets);
        }
        if (item.key === 'whPlanogram') {
          this.parseWhPlanogram(text);
          cacheManager.setStore('whPlanogram', this.whPlanograms);
          cacheManager.setLastSyncTime('whPlanogram', new Date().toISOString());
        }
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
    this.updateBlockerMessage('Purging cache & performing clean cloud sync...');
    
    // 1. Deep purge of IndexedDB
    await cacheManager.purgeEntireDatabase();

    // 2. Wipe legacy localStorage keys
    const irmsKeys = [
      'irms_pickup_requests',
      'irms_picking_tasks',
      'irms_lost_and_found',
      'irms_putaway_records',
      'irms_stock_movements',
      'irms_stock_activities',
      'irms_troubleshoot_tickets',
      'superset_session_cookie'
    ];
    irmsKeys.forEach(k => localStorage.removeItem(k));

    // Also remove any checker line or temporary storage keys except active user session
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('irms_') && !k.startsWith('irms_session_')) {
        localStorage.removeItem(k);
      }
    });

    // 3. Reset in-memory state
    this.requests = [];
    this.pickingTasks = [];
    this.lostAndFound = [];
    this.putawayRecords = [];
    this.stockMovements = [];
    this.stockActivities = [];
    this.troubleShootTickets = [];
    this.soh = [];
    this.sohwh = [];
    this.racks = [];
    this.zones = [];
    this.checkerLines = [];
    this.skus = [];
    this.whPlanograms = [];
    this.soList = [];
    this.users = [];
    this.lastSyncTime = null;
    this.lastSectionSyncTime = {};

    this.notifyListeners();

    // 4. Force a clean, complete cloud resync
    return await this.syncGoogleSheets(null);
  }

  isDataExpired() {
    if (!this.lastSyncTime) return true;
    const lastSyncMs = new Date(this.lastSyncTime).getTime();
    if (isNaN(lastSyncMs)) return true;
    return (Date.now() - lastSyncMs) >= DATA_EXPIRY_DURATION_MS;
  }

  async checkAndRefreshIfExpired() {
    const activeTab = window.irmsActiveTab || 'home';
    const isExpired = activeTab === 'sohwh' ? this.isSectionDataExpired('sohwh') : this.isDataExpired();
    if (isExpired && !this.isSyncing) {
      await this.syncSectionData(activeTab);
      return true;
    }
    return false;
  }

  /**
   * Returns true if the given section's data is older than DATA_EXPIRY_DURATION_MS (or 5 minutes for SOHWH)
   * or has never been synced.
   */
  isSectionDataExpired(tabId) {
    const lastSync = this.lastSectionSyncTime[tabId];
    if (!lastSync) return true;
    const lastSyncMs = new Date(lastSync).getTime();
    if (isNaN(lastSyncMs)) return true;
    const expiry = tabId === 'sohwh' ? 5 * 60 * 1000 : DATA_EXPIRY_DURATION_MS;
    return (Date.now() - lastSyncMs) >= expiry;
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
      admin:         ['userDb'],
      sohwh:         ['sohwh', 'soData'],
      tsRequest:     ['troubleShoot', 'soData', 'checkerLines'],
      troubleShoot:  ['troubleShoot', 'soData'],
      tsTask:        ['troubleShoot', 'soData']
    };
    const tabsToSync = tabMap[tabId];
    if (!tabsToSync || tabsToSync.length === 0) {
      this.lastSectionSyncTime[tabId] = new Date().toISOString();
      return true;
    }
    const ok = await this.syncGoogleSheets(tabsToSync);
    if (ok) {
      this.lastSectionSyncTime[tabId] = new Date().toISOString();
    }
    return ok;
  }

  lookupStaffId(staffId) {
    if (staffId === undefined || staffId === null) return null;
    const raw = String(staffId).replace(/^'/, '').trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    
    // 1. Direct or case-insensitive string match
    let found = this.users.find(u => {
      const uId = String(u.staffId || '').replace(/^'/, '').trim().toLowerCase();
      return uId === lower;
    });
    if (found) return found;

    // 2. Numeric-equivalent match (e.g. "01005" matches "1005" if Sheets converted to numeric)
    const num = parseInt(raw, 10);
    if (!isNaN(num) && /^\d+$/.test(raw)) {
      found = this.users.find(u => {
        const uRaw = String(u.staffId || '').replace(/^'/, '').trim();
        const uNum = parseInt(uRaw, 10);
        return !isNaN(uNum) && /^\d+$/.test(uRaw) && uNum === num;
      });
      if (found) return found;
    }

    return null;
  }

  // ── Admin: Users ──────────────────────────────────────────────────────────

  getUsers() {
    return [...this.users];
  }

  async addUser(userData) {
    const { staffId, name, role, access, password } = userData;
    const cleanStaffId = String(staffId || '').replace(/^'/, '').trim();
    if (!cleanStaffId || !name) throw new Error('Staff ID and Name are required');
    if (this.users.find(u => String(u.staffId).replace(/^'/, '').trim().toLowerCase() === cleanStaffId.toLowerCase())) {
      throw new Error(`Staff ID "${cleanStaffId}" already exists`);
    }

    const newUser = {
      staffId: cleanStaffId,
      name: String(name || '').trim(),
      role: String(role || 'Checker').trim(),
      access: String(access || '').trim(),
      password: String(password || '').trim()
    };

    this.users.push(newUser);
    cacheManager.setStore('userDb', this.users);
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
    const targetId = String(staffId || '').replace(/^'/, '').trim().toLowerCase();
    const idx = this.users.findIndex(u => String(u.staffId).replace(/^'/, '').trim().toLowerCase() === targetId);
    if (idx === -1) throw new Error(`User "${staffId}" not found`);

    if (updates.staffId) {
      updates.staffId = String(updates.staffId).replace(/^'/, '').trim();
    }

    this.users[idx] = { ...this.users[idx], ...updates };
    cacheManager.setStore('userDb', this.users);
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
    const targetId = String(staffId || '').replace(/^'/, '').trim().toLowerCase();
    const idx = this.users.findIndex(u => String(u.staffId).replace(/^'/, '').trim().toLowerCase() === targetId);
    if (idx === -1) throw new Error(`User "${staffId}" not found`);

    this.users.splice(idx, 1);
    cacheManager.setStore('userDb', this.users);
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
          status: item.status || '',
          wave: item.wave || ''
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

  persistRequests() {
    cacheManager.setStore('requests', this.requests);
    this.broadcastUpdate('requests');
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
      status: 'Pending',
      reason: requestData.reason || ''
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

  getPendingStockMovements() {
    return (this.stockMovements || []).filter(m => (m.status || '').trim().toLowerCase() === 'pending');
  }

  getPickingTaskSourceInfo(task) {
    if (!task) return { sourceProcess: 'Request_Checker', checkerLine: '', sourceLocation: '' };

    const tId = String(task.ticketId || '').trim();
    let sourceProcess = task.sourceProcess || '';
    let checkerLine = task.checkerLine || '';
    let sourceLocation = task.sourceLocation || task.fromLocation || task.foundAt || task.location || '';

    if (!sourceProcess) {
      if (tId.startsWith('LF-') || tId.startsWith('LF')) sourceProcess = 'Lost_And_Found';
      else if (tId.startsWith('SM-') || tId.startsWith('SM')) sourceProcess = 'Stock_Movement';
      else sourceProcess = 'Request_Checker';
    }

    if (sourceProcess === 'Request_Checker' || tId.startsWith('RC-') || tId.startsWith('RC')) {
      if (!checkerLine) {
        const req = this.requests.find(r => String(r.ticketId || r.uniqueid).trim() === tId);
        if (req && req.checkerLine) checkerLine = req.checkerLine;
      }
    } else if (sourceProcess === 'Lost_And_Found' || tId.startsWith('LF-') || tId.startsWith('LF')) {
      if (!sourceLocation) {
        const lf = this.lostAndFound.find(l => String(l.ticketId || l.uniqueid).trim() === tId);
        if (lf && (lf.foundAt || lf.location)) sourceLocation = lf.foundAt || lf.location;
      }
    } else if (sourceProcess === 'Stock_Movement' || tId.startsWith('SM-') || tId.startsWith('SM')) {
      if (!sourceLocation) {
        const sm = this.stockMovements.find(m => String(m.movementId || m.ticketId || m.id).trim() === tId);
        if (sm) {
          sourceLocation = sm.fromLocation ? (sm.toLocation ? `${sm.fromLocation} → ${sm.toLocation}` : sm.fromLocation) : (sm.location || '');
        }
      }
    }

    return {
      sourceProcess: sourceProcess || 'Request_Checker',
      checkerLine: checkerLine,
      sourceLocation: sourceLocation
    };
  }

  persistPickingTasks() {
    cacheManager.setStore('pickingTasks', this.pickingTasks);
    this.broadcastUpdate('pickingTasks');
  }

  async createPickingTasks(selectedRequests, pickedByName, defaultSourceProcess = 'Request_Checker') {
    const newTasks = [];
    const now = new Date().toISOString();

    for (const req of selectedRequests) {
      const pickingId = 'PK-' + this.generate6DigitId();
      const ticketId = String(req.ticketId || req.uniqueid || req.movementId || req.id || '').trim();
      const sourceProc = req.sourceProcess || defaultSourceProcess;
      const checkerLine = req.checkerLine || '';
      const sourceLoc = req.sourceLocation || req.fromLocation || req.foundAt || req.location || '';

      const task = {
        pickingId: pickingId,
        ticketId: ticketId,
        pickedBy: pickedByName,
        skuCode: req.skuNumber || req.skuCode || '',
        productName: req.productName || (req.foundAt ? `Lost & Found (${req.foundAt})` : ''),
        qty: req.qty || 1,
        status: 'Picking',
        timestamp: now,
        sourceProcess: sourceProc,
        checkerLine: checkerLine,
        sourceLocation: sourceLoc
      };
      newTasks.push(task);

      if (sourceProc === 'Lost_And_Found' || (ticketId && ticketId.startsWith('LF-'))) {
        const matchingEntry = this.lostAndFound.find(e => String(e.ticketId).trim() === ticketId);
        if (matchingEntry) matchingEntry.status = 'Picking';
      } else if (sourceProc === 'Stock_Movement' || (ticketId && ticketId.startsWith('SM-'))) {
        const matchingSm = this.stockMovements.find(m => String(m.movementId || m.ticketId || m.id).trim() === ticketId);
        if (matchingSm) matchingSm.status = 'Picking';
      } else {
        const matchingReq = this.requests.find(r => String(r.ticketId || r.uniqueid).trim() === ticketId);
        if (matchingReq) matchingReq.status = 'Picking';
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
          body: JSON.stringify({ action: 'createPickingTasks', tasks: newTasks, sourceProcess: defaultSourceProcess })
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

    // Delta sync: update existing if newer timestamp, append if new row
    this.lostAndFound = this.mergeDeltaRecords(this.lostAndFound, remoteEntries, 'ticketId', ['timestamp', 'date']);
    this.persistLostAndFound();
  }

  persistLostAndFound() {
    cacheManager.setStore('lostAndFound', this.lostAndFound);
    this.broadcastUpdate('lostAndFound');
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

    // Delta sync: merge remote putaway records with local pending putaways
    this.putawayRecords = this.mergeDeltaRecords(this.putawayRecords, remoteEntries, 'putawayId', ['timestamp', 'date']);
    this.persistPutawayRecords();
  }

  persistPutawayRecords() {
    cacheManager.setStore('putaway', this.putawayRecords);
    this.broadcastUpdate('putaway');
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
          const isSm = ticketId.startsWith('SM-') || ticketId.startsWith('SM');
          if (isLf) {
            const lfEntry = this.lostAndFound.find(e => String(e.ticketId).trim() === ticketId);
            if (lfEntry) lfEntry.status = 'Completed';
          } else if (isSm) {
            const smEntry = this.stockMovements.find(m => String(m.movementId || m.ticketId || m.id).trim() === ticketId);
            if (smEntry) {
              if (smEntry.type === 'Transfer location' || smEntry.type === 'Stock deduction') {
                const fromLoc = smEntry.fromLocation;
                const sourceSohIdx = this.soh.findIndex(s => 
                  String(s.skuCode).toLowerCase().trim() === String(entryData.skuCode).toLowerCase().trim() && 
                  String(s.rackLocation).toLowerCase().trim() === String(fromLoc).toLowerCase().trim()
                );
                if (sourceSohIdx !== -1) {
                  this.soh[sourceSohIdx].qtySoh = Math.max(0, this.soh[sourceSohIdx].qtySoh - qtyPutThisTime);
                  this.soh[sourceSohIdx].updatedAt = now;
                  cacheManager.setStore('soh', this.soh).catch(err => console.error('Failed to cache SOH:', err));
                }
              }
              if (smEntry.type === 'Stock deduction') {
                smEntry.toLocation = String(entryData.location || '').trim();
              }
              smEntry.status = 'Done';
              smEntry.completedAt = now;
              smEntry.completedBy = entryData.staffName || 'System';
              this.persistStockMovements();
            }
          } else {
            const reqEntry = this.requests.find(r => String(r.ticketId || r.uniqueid).trim() === ticketId);
            if (reqEntry) reqEntry.status = 'Completed';
          }
        }
      } else {
        // Even if not fully completed, if it's a Stock Movement transfer location or stock deduction, we deduct the quantity moved this time
        const ticketId = String(task.ticketId || '').trim();
        const isSm = ticketId.startsWith('SM-') || ticketId.startsWith('SM');
        if (isSm) {
          const smEntry = this.stockMovements.find(m => String(m.movementId || m.ticketId || m.id).trim() === ticketId);
          if (smEntry) {
            if (smEntry.type === 'Transfer location' || smEntry.type === 'Stock deduction') {
              const fromLoc = smEntry.fromLocation;
              const sourceSohIdx = this.soh.findIndex(s => 
                String(s.skuCode).toLowerCase().trim() === String(entryData.skuCode).toLowerCase().trim() && 
                String(s.rackLocation).toLowerCase().trim() === String(fromLoc).toLowerCase().trim()
              );
              if (sourceSohIdx !== -1) {
                this.soh[sourceSohIdx].qtySoh = Math.max(0, this.soh[sourceSohIdx].qtySoh - qtyPutThisTime);
                this.soh[sourceSohIdx].updatedAt = now;
                cacheManager.setStore('soh', this.soh).catch(err => console.error('Failed to cache SOH:', err));
              }
            }
            if (smEntry.type === 'Stock deduction') {
              smEntry.toLocation = String(entryData.location || '').trim();
              this.persistStockMovements();
            }
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
    if (this.isRetryingSync) return;
    const pending = this.putawayRecords.filter(p => p.syncState === 'failed' || p.syncState === 'pending');
    if (pending.length === 0) return;
    
    this.isRetryingSync = true;
    console.log(`Retrying ${pending.length} pending putaway syncs...`);
    let someSucceeded = false;
    try {
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
    } finally {
      this.isRetryingSync = false;
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

      if (this.skus.length > 0) {
        const topTs = this._pendingSkusDbTimestamp || new Date().toISOString();
        cacheManager.setLastSyncTime('skusDb_timestamp', topTs);
      }
    }
  }

  lookupSkuDetails(skuCode) {
    if (!skuCode) return null;
    const cleanSku = String(skuCode || '').replace(/^SKU[:\s-]*/i, '').trim().toLowerCase();
    if (!cleanSku) return null;

    // 1. Search in SKUs_DB
    let match = (this.skus || []).find(s => {
      const sCode = String(s.skuCode || s.skuNumber || '').replace(/^SKU[:\s-]*/i, '').trim().toLowerCase();
      const pId = String(s.productId || '').replace(/^SKU[:\s-]*/i, '').trim().toLowerCase();
      return sCode === cleanSku || pId === cleanSku;
    });

    // 2. Fallback to SOH if not found in SKUs_DB
    if (!match && this.soh && this.soh.length > 0) {
      const sohMatch = this.soh.find(s => {
        const sCode = String(s.skuCode || s.skuNumber || '').replace(/^SKU[:\s-]*/i, '').trim().toLowerCase();
        return sCode === cleanSku;
      });
      if (sohMatch) {
        match = {
          skuCode: sohMatch.skuCode || sohMatch.skuNumber,
          productName: sohMatch.productName,
          productId: sohMatch.productId,
          l0CategoryName: sohMatch.l0CategoryName || '',
          l1CategoryName: sohMatch.l1CategoryName || '',
          l2CategoryName: sohMatch.l2CategoryName || '',
          foodOrNonFood: sohMatch.foodOrNonFood || ''
        };
      }
    }

    return match || null;
  }

  lookupProductName(skuCode) {
    const cleanSku = String(skuCode || '').replace(/^SKU[:\s-]*/i, '').trim().toLowerCase();
    if (!cleanSku) return '';
    const match = this.lookupSkuDetails(skuCode);
    return match ? match.productName : '';
  }

  parseWhPlanogram(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, { skipEmptyLines: true });
    const rows = result.data || [];
    if (rows.length === 0) return;

    const list = [];
    let startIndex = 0;

    // Check if row 0 has concatenated categories or is standard header
    const firstRow = rows[0] || [];
    const cell0 = String(firstRow[0] || '').trim();
    const cell1 = String(firstRow[1] || '').trim();
    const cell2 = String(firstRow[2] || '').trim();

    if (cell0.toLowerCase().includes('l1 category') && cell0.length > 25) {
      // Concatenated row 0
      const knownCats = [
        'Minuman', 'Snack', 'Biskuit', 'Sarapan', 'Tepung & Bahan Kue',
        'Susu & Olahan Susu', 'Bahan Masak & Bumbu', 'Kebutuhan Pokok',
        'Kebutuhan Dapur', 'Kebutuhan Cuci Baju', 'Tata Rumah',
        'Perlengkapan Pakaian', 'Kebutuhan Ibu & Bayi'
      ];
      
      const zones = cell1.replace(/^zone\s*suggestion\s*/i, '').trim().split(/\s+/);
      const aisleMatches = cell2.replace(/^aisle\s*suggestion\s*/i, '').trim().match(/\d+(?:\s*-\s*\d+)?/g) || [];

      knownCats.forEach((cat, i) => {
        list.push({
          id: `wp_hdr_${i}_${cat}`,
          l1Category: cat,
          zoneSuggestion: zones[i] || '',
          aisleSuggestion: aisleMatches[i] || ''
        });
      });
      startIndex = 1;
    } else if (cell0.toLowerCase() === 'l1 category' || cell0.toLowerCase().includes('category')) {
      startIndex = 1;
    }

    // Parse all subsequent rows
    for (let i = startIndex; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.length < 2) continue;
      const cat = String(r[0] || '').trim();
      const zone = String(r[1] || '').trim();
      const aisle = String(r[2] || '').trim();
      if (cat && !cat.toLowerCase().startsWith('l1 category')) {
        list.push({
          id: `wp_${i}_${cat}`,
          l1Category: cat,
          zoneSuggestion: zone,
          aisleSuggestion: aisle
        });
      }
    }

    this.whPlanograms = list;
  }

  lookupPlanogramsByL1Category(l1Category) {
    if (!l1Category) return [];
    const clean = String(l1Category).trim().toLowerCase();
    return (this.whPlanograms || []).filter(p => {
      const pCat = String(p.l1Category || '').trim().toLowerCase();
      return pCat === clean || pCat.includes(clean) || clean.includes(pCat);
    });
  }

  lookupPlanogramByL1Category(l1Category) {
    const list = this.lookupPlanogramsByL1Category(l1Category);
    return list.length > 0 ? list[0] : null;
  }

  getPlanogramSuggestionForSku(skuCode) {
    if (!skuCode) return null;
    const skuDetails = this.lookupSkuDetails(skuCode);
    const l1Category = skuDetails ? (skuDetails.l1CategoryName || '') : '';
    if (!l1Category) {
      return {
        l1Category: '',
        suggestions: []
      };
    }

    const matches = this.lookupPlanogramsByL1Category(l1Category);
    return {
      l1Category: l1Category,
      suggestions: matches.map(m => ({
        zoneSuggestion: m.zoneSuggestion || '',
        aisleSuggestion: m.aisleSuggestion || ''
      }))
    };
  }

  parseSoh(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      const remoteSoh = result.data.map(row => {
        const skuCode = this.findRowValue(row, ['sku_number', 'sku number', 'sku code', 'sku_code', 'sku']);
        const rackLocation = this.findRowValue(row, ['rack_location', 'rack location', 'location', 'rack']);
        const qtySoh = this.findRowValue(row, ['qty soh', 'qty_soh', 'quantity SOH', 'quantity_soh', 'qty', 'quantity']);
        const updatedAt = this.findRowValue(row, ['updated_at', 'updated at', 'timestamp', 'date', 'time']) || new Date().toISOString();

        const qtyOnSo = this.findRowValue(row, ['qty on so', 'qty_on_so', 'qtyonso', 'qty_so', 'qty on sales order']);
        const countSo = this.findRowValue(row, ['count so', 'count_so', 'countso', 'count_so', 'count sales order']);
        const qtyOnLdp = this.findRowValue(row, ['qty on ldp', 'qty_on_ldp', 'qtyonldp', 'ldp', 'qty ldp']);
        const stockAge = this.findRowValue(row, ['stock age', 'stock_age', 'stockage', 'age']);
        const actionSuggestion = this.findRowValue(row, ['action suggestion', 'action_suggestion', 'actionsuggest', 'suggestion']);

        const sCode = String(skuCode).trim();
        const rLoc = String(rackLocation).trim();

        return {
          id: `${sCode}_${rLoc}`,
          skuCode: sCode,
          skuNumber: sCode,
          rackLocation: rLoc,
          qtySoh: parseInt(String(qtySoh).trim() || '0', 10),
          updatedAt: String(updatedAt).trim(),
          qtyOnSo: parseFloat(String(qtyOnSo).trim() || '0'),
          countSo: parseInt(String(countSo).trim() || '0', 10),
          qtyOnLdp: parseFloat(String(qtyOnLdp).trim() || '0'),
          stockAge: parseInt(String(stockAge).trim() || '0', 10),
          actionSuggestion: String(actionSuggestion || '').trim()
        };
      }).filter(s => s.skuCode);

      // Delta sync for SOH by unique SKU + Location key
      this.soh = this.mergeDeltaRecords(this.soh, remoteSoh, 'id', ['updatedAt', 'timestamp', 'date']);
      cacheManager.setStore('soh', this.soh);
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

  parseSohwh(csvText) {
    if (!csvText) return;
    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    if (result.data && result.data.length > 0) {
      // 1. Pre-aggregate SO_DATA by SKU for O(1) lookups and to avoid O(N * M) UI freeze
      const reserveMap = new Map();
      this.soList.forEach(so => {
        const sku = String(so.skuNumber).trim();
        if (sku) {
          const current = reserveMap.get(sku) || 0;
          reserveMap.set(sku, current + (so.requestQty || 0));
        }
      });

      this.sohwh = result.data.map(row => {
        const productId = this.findRowValue(row, ['product_id', 'product id', 'productid']);
        const skuNumber = this.findRowValue(row, ['sku_number', 'sku number', 'sku code', 'sku_code', 'sku']);
        const productName = this.findRowValue(row, ['product_name', 'product name', 'product']);
        const rackName = this.findRowValue(row, ['rack_name', 'rack name', 'rack', 'location']);
        const qtyStock = this.findRowValue(row, ['qty stock', 'qty_stock', 'quantity stock', 'qty', 'sum(stock)', 'sum_stock']);

        const sku = String(skuNumber).trim();
        const rack = String(rackName).trim();

        // Constant time lookup: O(1)
        const reserveStock = reserveMap.get(sku) || 0;

        const qtyVal = parseInt(String(qtyStock).trim() || '0', 10);
        const finalVirtualSoh = qtyVal - reserveStock;

        return {
          id: `${sku}_${rack}`,
          productId: String(productId).trim(),
          skuNumber: sku,
          productName: String(productName).trim(),
          rackName: rack,
          qtyStock: qtyVal,
          reserveStock: reserveStock,
          finalVirtualSoh: finalVirtualSoh
        };
      }).filter(s => s.skuNumber);

      if (this.sohwh.length > 0) {
        const topTs = this._pendingSohwhTimestamp || new Date().toISOString();
        cacheManager.setLastSyncTime('sohwh_timestamp', topTs);
      }
    }
  }

  getSohwhList() {
    return [...this.sohwh];
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

      // Delta sync: update existing movement status if newer, append if new movement
      this.stockMovements = this.mergeDeltaRecords(this.stockMovements, remoteMovements, 'movementId', ['timestamp', 'date']);
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

      // Delta sync: append/update stock activity logs
      this.stockActivities = this.mergeDeltaRecords(this.stockActivities, remoteActs, 'activityId', ['timestamp', 'date']);
      this.persistStockActivities();
    }
  }

  // ── Stock Movement & Deduction ──────────────────────────────────────────

  persistStockMovements() {
    cacheManager.setStore('stockMovements', this.stockMovements);
    this.broadcastUpdate('stockMovements');
  }

  persistStockActivities() {
    cacheManager.setStore('stockActivity', this.stockActivities);
    this.broadcastUpdate('stockActivity');
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
    const skuDetails = this.lookupSkuDetails(sku) || {};

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
          productId: skuDetails.productId || '',
          productName: skuDetails.productName || movement.productName || '',
          l0CategoryName: skuDetails.l0CategoryName || '',
          l1CategoryName: skuDetails.l1CategoryName || '',
          l2CategoryName: skuDetails.l2CategoryName || '',
          foodOrNonFood: skuDetails.foodOrNonFood || '',
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
          body: JSON.stringify({
            action: 'completeStockMovement',
            movementId,
            completedBy: movement.completedBy,
            productId: skuDetails.productId || '',
            productName: skuDetails.productName || movement.productName || '',
            l0CategoryName: skuDetails.l0CategoryName || '',
            l1CategoryName: skuDetails.l1CategoryName || '',
            l2CategoryName: skuDetails.l2CategoryName || '',
            foodOrNonFood: skuDetails.foodOrNonFood || ''
          })
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

  // ── Troubleshoot Tickets ────────────────────────────────────────────────

  parseTroubleShoot(csvText) {
    if (!csvText) {
      this.troubleShootTickets = [];
      this.persistTroubleShoot();
      return;
    }

    const result = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim()
    });

    const remoteEntries = (result.data || []).map(row => {
      const id = this.findRowValue(row, ['id', 'ticket id', 'ticket_id', 'ticketid']);
      const requestTimestamp = this.findRowValue(row, ['request timestamp', 'request_timestamp', 'requesttimestamp', 'timestamp']) || '';
      const requestedBy = this.findRowValue(row, ['requested by', 'requested_by', 'requestedby']) || '';
      const staffId = this.findRowValue(row, ['staff id', 'staff_id', 'staffid']) || '';
      const checkerLine = this.findRowValue(row, ['checker line', 'checker_line', 'checkerline']) || '';
      const photo = this.findRowValue(row, ['photo', 'image', 'photo_url']) || '';
      const reason = this.findRowValue(row, ['reason', 'reasons']) || '';
      const pickerName = this.findRowValue(row, ['picker name', 'picker_name', 'pickername']) || '';
      const soNumber = this.findRowValue(row, ['so number', 'so_number', 'sonumber']) || '';
      const skuNumber = this.findRowValue(row, ['sku number', 'sku_number', 'skunumber', 'sku code', 'sku_code']) || '';
      const productName = this.findRowValue(row, ['product name', 'product_name', 'productname']) || '';
      const originRackName = this.findRowValue(row, ['origin rack name', 'origin_rack_name', 'originrackname']) || '';
      const requestQuantity = this.findRowValue(row, ['request quantity', 'request_quantity', 'requestquantity', 'qty']) || '1';
      const assignedBy = this.findRowValue(row, ['assigned by', 'assigned_by', 'assignedby']) || '';
      const assignedTo = this.findRowValue(row, ['assigned to', 'assigned_to', 'assignedto']) || '';
      const statusTicket = this.findRowValue(row, ['status ticket', 'status_ticket', 'statusticket', 'status']) || 'Open';
      const troubleshootEvidence = this.findRowValue(row, ['troubleshoot evidence', 'troubleshoot_evidence', 'troubleshootevidence', 'evidence']) || '';
      const foundQty = this.findRowValue(row, ['found qty', 'found_qty', 'foundqty']) || '0';
      const foundAt = this.findRowValue(row, ['found at', 'found_at', 'foundat']) || '';
      const deliveredAt = this.findRowValue(row, ['delivered at', 'delivered_at', 'deliveredat']) || '';
      const pickedBy = this.findRowValue(row, ['picked by', 'picked_by', 'pickedby']) || '';
      const updateAt = this.findRowValue(row, ['update at', 'update_at', 'updateat', 'updated at', 'updated_at']) || '';
      const wave = this.findRowValue(row, ['wave', 'wave_number', 'wavenumber', 'wave name', 'wave_name']) || '';

      return {
        id: String(id).trim(),
        requestTimestamp: String(requestTimestamp).trim(),
        requestedBy: String(requestedBy).trim(),
        staffId: String(staffId).trim(),
        checkerLine: String(checkerLine).trim(),
        photo: String(photo).trim(),
        reason: String(reason).trim(),
        pickerName: String(pickerName).trim(),
        soNumber: String(soNumber).trim(),
        skuNumber: String(skuNumber).trim(),
        productName: String(productName).trim(),
        originRackName: String(originRackName).trim(),
        requestQuantity: parseInt(String(requestQuantity).trim() || '1', 10),
        assignedBy: String(assignedBy).trim(),
        assignedTo: String(assignedTo).trim(),
        statusTicket: String(statusTicket).trim(),
        troubleshootEvidence: String(troubleshootEvidence).trim(),
        foundQty: parseInt(String(foundQty).trim() || '0', 10),
        foundAt: String(foundAt).trim(),
        deliveredAt: String(deliveredAt).trim(),
        pickedBy: String(pickedBy).trim(),
        updateAt: String(updateAt).trim(),
        wave: String(wave).trim()
      };
    }).filter(e => e.id);

    this.troubleShootTickets = this.mergeDeltaRecords(this.troubleShootTickets, remoteEntries, 'id', ['updateAt', 'requestTimestamp', 'timestamp']);
    this.troubleShootTickets.sort((a, b) => new Date(b.requestTimestamp) - new Date(a.requestTimestamp));
    this.persistTroubleShoot();
  }

  persistTroubleShoot() {
    cacheManager.setStore('troubleShoot', this.troubleShootTickets);
    this.broadcastUpdate('troubleShoot');
  }

  getTroubleShootTickets() {
    return [...this.troubleShootTickets].sort((a, b) => new Date(b.requestTimestamp) - new Date(a.requestTimestamp));
  }

  getTroubleShootTicketsForUser(currentUser) {
    if (!currentUser) return [];
    const role = (currentUser.role || '').trim().toLowerCase();
    
    // Roles with full access: Checker, Super, Admin, Superuser, Supervisor
    const unrestrictedRoles = ['checker', 'super', 'admin', 'superuser', 'supervisor', 'super user'];
    if (unrestrictedRoles.includes(role)) {
      return this.getTroubleShootTickets();
    }

    const myName = (currentUser.name || '').trim().toLowerCase();
    const myId = (currentUser.staffId || '').trim().toLowerCase();
    return this.troubleShootTickets.filter(t => {
      const reqBy = (t.requestedBy || '').trim().toLowerCase();
      const sId = (t.staffId || '').trim().toLowerCase();
      return reqBy === myName || sId === myId;
    }).sort((a, b) => new Date(b.requestTimestamp) - new Date(a.requestTimestamp));
  }

  getTroubleShootTasksForUser(currentUser) {
    const myName = (currentUser.name || '').trim().toLowerCase();
    const myId = (currentUser.staffId || '').trim().toLowerCase();
    return this.troubleShootTickets.filter(t => {
      const assignedTo = (t.assignedTo || '').trim().toLowerCase();
      const pickedBy = (t.pickedBy || '').trim().toLowerCase();
      return assignedTo === myName || assignedTo === myId || pickedBy === myId;
    }).sort((a, b) => new Date(b.requestTimestamp) - new Date(a.requestTimestamp));
  }

  /**
   * Generate a 6-digit random numeric ID string (reuse existing pattern if available)
   */
  generateTroubleShootId(requesterRole) {
    const prefix = (requesterRole || '').toLowerCase() === 'picker' ? 'TS-PC-' : 'TS-RC-';
    const num = String(Math.floor(100000 + Math.random() * 900000));
    const id = prefix + num;
    // Ensure uniqueness against existing tickets
    if (this.troubleShootTickets.some(t => t.id === id)) {
      return this.generateTroubleShootId(requesterRole); // Retry on collision
    }
    return id;
  }

  async createTroubleShootTicket(ticketData, currentUser) {
    const role = (currentUser.role || '').trim().toLowerCase();
    const requesterRole = (role === 'picker') ? 'picker' : 'checker';
    const id = this.generateTroubleShootId(requesterRole);
    const timestamp = new Date().toISOString();

    const newTicket = {
      id,
      requestTimestamp: timestamp,
      requestedBy: String(currentUser.name || '').trim(),
      staffId: String(currentUser.staffId || '').trim(),
      checkerLine: requesterRole === 'checker' ? String(ticketData.checkerLine || '').trim() : '',
      photo: String(ticketData.photo || '').trim(),
      reason: String(ticketData.reason || '').trim(),
      pickerName: String(ticketData.pickerName || '').trim(),
      soNumber: String(ticketData.soNumber || '').trim(),
      skuNumber: String(ticketData.skuNumber || '').trim(),
      productName: String(ticketData.productName || '').trim(),
      originRackName: String(ticketData.originRackName || '').trim(),
      requestQuantity: parseInt(String(ticketData.requestQuantity || '1').trim(), 10),
      assignedBy: '',
      assignedTo: '',
      statusTicket: 'Open',
      troubleshootEvidence: '',
      foundQty: 0,
      foundAt: '',
      deliveredAt: '',
      pickedBy: '',
      updateAt: '',
      wave: String(ticketData.wave || '').trim()
    };

    this.troubleShootTickets.unshift(newTicket);
    this.persistTroubleShoot();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'createTroubleShoot', ...newTicket, requesterRole })
        });
        setTimeout(() => this.syncGoogleSheets(['troubleShoot']), 2500);
      } catch (err) {
        console.error('Failed to push createTroubleShoot to WebApp:', err);
      }
    }

    return newTicket;
  }

  async assignTroubleShootTicket(ticketId, assignedBy, assignedTo) {
    const idx = this.troubleShootTickets.findIndex(t => String(t.id).trim() === String(ticketId).trim());
    if (idx === -1) throw new Error(`Troubleshoot ticket "${ticketId}" not found`);

    const ticket = this.troubleShootTickets[idx];
    if (ticket.statusTicket !== 'Open') {
      throw new Error('Only Open tickets can be assigned');
    }

    this.troubleShootTickets[idx] = {
      ...ticket,
      statusTicket: 'Assigned',
      assignedBy: String(assignedBy).trim(),
      assignedTo: String(assignedTo).trim(),
      updateAt: new Date().toISOString()
    };
    this.persistTroubleShoot();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'assignTroubleShoot',
            ticketId,
            assignedBy: String(assignedBy).trim(),
            assignedTo: String(assignedTo).trim(),
            updateAt: new Date().toISOString()
          })
        });
        setTimeout(() => this.syncGoogleSheets(['troubleShoot']), 2500);
      } catch (err) {
        console.error('Failed to push assignTroubleShoot to WebApp:', err);
      }
    }

    return this.troubleShootTickets[idx];
  }

  async pickTroubleShootTicket(ticketId, currentUser) {
    const idx = this.troubleShootTickets.findIndex(t => String(t.id).trim() === String(ticketId).trim());
    if (idx === -1) throw new Error(`Troubleshoot ticket "${ticketId}" not found`);

    const ticket = this.troubleShootTickets[idx];
    if (ticket.statusTicket !== 'Assigned') {
      throw new Error('Only Assigned tickets can be picked up. This ticket may have been picked by someone else.');
    }

    this.troubleShootTickets[idx] = {
      ...ticket,
      statusTicket: 'Picked Up',
      pickedBy: String(currentUser.staffId || '').trim(),
      updateAt: new Date().toISOString()
    };
    this.persistTroubleShoot();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'pickTroubleShoot',
            ticketId,
            pickedBy: String(currentUser.staffId || '').trim(),
            updateAt: new Date().toISOString()
          })
        });
        setTimeout(() => this.syncGoogleSheets(['troubleShoot']), 2500);
      } catch (err) {
        console.error('Failed to push pickTroubleShoot to WebApp:', err);
      }
    }

    return this.troubleShootTickets[idx];
  }

  async completeTroubleShootTicket(ticketId, resolutionData) {
    const idx = this.troubleShootTickets.findIndex(t => String(t.id).trim() === String(ticketId).trim());
    if (idx === -1) throw new Error(`Troubleshoot ticket "${ticketId}" not found`);

    const ticket = this.troubleShootTickets[idx];
    if (ticket.statusTicket !== 'Picked Up') {
      throw new Error('Only Picked Up tickets can be completed');
    }

    const foundQty = parseInt(String(resolutionData.foundQty || '0').trim(), 10);
    let statusTicket = 'Not Found';
    if (resolutionData.statusTicket) {
      statusTicket = resolutionData.statusTicket;
    } else if (foundQty > 0 && foundQty >= ticket.requestQuantity) {
      statusTicket = 'Found';
    } else if (foundQty > 0) {
      statusTicket = 'Found Partial';
    }

    // Determine foundFrom source for GAS backend SOH deduction logic
    const foundAt = String(resolutionData.foundAt || '').trim();
    let foundFrom = '';
    if (foundAt) {
      if (foundAt.toUpperCase().includes('STG')) {
        foundFrom = 'soh';
      } else {
        // Check if it's a SOHWH rack
        const sohwhMatch = this.sohwh.some(s =>
          String(s.rackName).trim().toLowerCase() === foundAt.toLowerCase()
        );
        if (sohwhMatch) {
          foundFrom = 'sohwh';
        }
      }
    }

    this.troubleShootTickets[idx] = {
      ...ticket,
      statusTicket,
      foundQty,
      foundAt,
      troubleshootEvidence: String(resolutionData.troubleshootEvidence || '').trim(),
      deliveredAt: String(resolutionData.deliveredAt || '').trim(),
      updateAt: new Date().toISOString()
    };
    this.persistTroubleShoot();
    this.notifyListeners();

    if (this.webAppUrl) {
      try {
        await fetch(this.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'completeTroubleShoot',
            ticketId,
            statusTicket,
            foundQty,
            foundAt,
            foundFrom,
            skuNumber: ticket.skuNumber,
            productName: ticket.productName,
            troubleshootEvidence: String(resolutionData.troubleshootEvidence || '').trim(),
            deliveredAt: String(resolutionData.deliveredAt || '').trim(),
            updateAt: new Date().toISOString()
          })
        });
        setTimeout(() => this.syncGoogleSheets(['troubleShoot', 'soh']), 2500);
      } catch (err) {
        console.error('Failed to push completeTroubleShoot to WebApp:', err);
      }
    }

    return this.troubleShootTickets[idx];
  }

  /**
   * Upload a photo to Google Drive via GAS DriveApp.
   * Sends base64 image data to GAS which saves it and returns a Drive URL.
   * Since we use mode: 'no-cors', we can't read the response. The URL will be
   * written to the sheet by GAS and synced on next data fetch.
   */
  async uploadTroubleShootPhoto(base64Data, fileName, ticketId, fieldName) {
    if (!this.webAppUrl) throw new Error('No WebApp URL configured');

    try {
      await fetch(this.webAppUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'uploadTroubleShootPhoto',
          base64Data,
          fileName: fileName || `ts_photo_${Date.now()}.jpg`,
          ticketId: ticketId || '',
          fieldName: fieldName || 'photo'
        })
      });
      return true;
    } catch (err) {
      console.error('Failed to upload troubleshoot photo:', err);
      throw err;
    }
  }
}

export const db = new DatabaseService();

