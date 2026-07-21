import Papa from 'papaparse';
import { GOOGLE_SHEETS_CONFIG } from '../config/googleSheets.js';

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
    this.spreadsheetId = GOOGLE_SHEETS_CONFIG.spreadsheetId;
    this.webAppUrl = GOOGLE_SHEETS_CONFIG.webAppUrl;
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncError = null;
    this.isLoaded = false;
    this.listeners = [];
    
    // Auto-fetch hardcoded Google Sheets on init
    this.initPromise = this.syncGoogleSheets();
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
        const pickerName = this.findRowValue(row, ['picker_name', 'picker name', 'picker']) || 'N/A';
        const soNumber = this.findRowValue(row, ['so_number', 'so number', 'so']);
        const skuNumber = this.findRowValue(row, ['sku_number', 'sku code', 'sku number', 'sku']);
        const productName = this.findRowValue(row, ['product_name', 'product name', 'product']);
        const qty = this.findRowValue(row, ['request_quantity', 'qty', 'quantity']) || '1';

        return {
          pickerName: String(pickerName).trim(),
          soNumber: String(soNumber).trim(),
          skuNumber: String(skuNumber).trim(),
          productName: String(productName).trim(),
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

    // Google Sheet is source of truth for Picking_Task
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

    const userDbTab = GOOGLE_SHEETS_CONFIG.tabs.userDb;
    const soDataTab = GOOGLE_SHEETS_CONFIG.tabs.soData;
    const requestCheckerTab = GOOGLE_SHEETS_CONFIG.tabs.requestChecker;
    const pickingTaskTab = GOOGLE_SHEETS_CONFIG.tabs.pickingTask;
    const racksTab = GOOGLE_SHEETS_CONFIG.tabs.racks;
    const zonesTab = GOOGLE_SHEETS_CONFIG.tabs.zones || 'Zone';
    const lostAndFoundTab = GOOGLE_SHEETS_CONFIG.tabs.lostAndFound;
    const checkerLinesTab = GOOGLE_SHEETS_CONFIG.tabs.checkerLines;
    const cacheBuster = `_t=${Date.now()}`;

    const shouldSync = (tabKey) => !tabsToSync || tabsToSync.includes(tabKey);

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
    if (shouldSync('racks') || shouldSync('zones')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(zonesTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'zones', res: r })).catch(() => null));
    }
    if (shouldSync('lostAndFound')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(lostAndFoundTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'lostAndFound', res: r })).catch(() => null));
    }
    if (shouldSync('checkerLines')) {
      fetches.push(fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(checkerLinesTab)}&${cacheBuster}`, { cache: 'no-store' }).then(r => ({ key: 'checkerLines', res: r })).catch(() => null));
    }

    try {
      const results = await Promise.all(fetches);
      for (const item of results) {
        if (!item || !item.res || !item.res.ok) continue;
        const text = await item.res.text();
        if (text.includes('<!DOCTYPE html>')) continue;

        if (item.key === 'userDb') this.parseUsers(text);
        if (item.key === 'soData') this.parseSoData(text);
        if (item.key === 'requestChecker') this.parseRequestChecker(text);
        if (item.key === 'pickingTask') this.parsePickingTask(text);
        if (item.key === 'zones') {
          this.parseRacks(text);
          this.parseZones(text);
        }
        if (item.key === 'lostAndFound') this.parseLostAndFound(text);
        if (item.key === 'checkerLines') this.parseCheckerLines(text);
      }

      this.lastSyncTime = new Date().toISOString();
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

  lookupStaffId(staffId) {
    const trimmed = String(staffId).trim();
    if (!trimmed) return null;
    return this.users.find(u => u.staffId === trimmed) || null;
  }

  getUniqueSoNumbers() {
    const map = new Map();
    this.soList.forEach(item => {
      if (!map.has(item.soNumber)) {
        map.set(item.soNumber, item.pickerName || 'N/A');
      }
    });
    return Array.from(map.entries()).map(([soNumber, pickerName]) => ({
      soNumber,
      pickerName
    }));
  }

  getProductsForSo(soNumber) {
    if (!soNumber) return [];
    return this.soList.filter(item => item.soNumber === soNumber);
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

  // Filter requests privately by Checker Name for logged user
  getPickupRequestsForUser(currentUser) {
    if (!currentUser || !currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId).trim().toLowerCase();

    return this.requests.filter(req => {
      const chkName = (req.checkerName || '').trim().toLowerCase();
      if (!chkName) return false;
      return chkName === nameLower || chkName === staffIdStr || chkName.includes(nameLower) || nameLower.includes(chkName);
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
    if (!currentUser || !currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId).trim().toLowerCase();

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
        const id = this.findRowValue(row, ['id']);
        const rackName = this.findRowValue(row, ['rack name', 'rack_name', 'rack', 'zone', 'zone name']);
        return {
          id: String(id).trim(),
          rackName: String(rackName).trim()
        };
      }).filter(r => r.rackName);
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
      const qty = this.findRowValue(row, ['qty', 'quantity']) || '1';
      const foundAt = this.findRowValue(row, ['found at', 'found_at', 'rack', 'rack name', 'rack_name']);
      const status = this.findRowValue(row, ['status']) || 'Pending';
      const reason = this.findRowValue(row, ['reason', 'reasons', 'cause']);

      return {
        ticketId: String(ticketId).trim(),
        timestamp: String(timestamp).trim(),
        btiStaff: String(btiStaff).trim(),
        skuCode: String(skuCode).trim(),
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
    } catch (e) {
      console.error('Failed to persist lostAndFound', e);
    }
  }

  getRacks() {
    return this.racks;
  }

  searchRacks(query) {
    if (!query) return this.racks.slice(0, 50);
    const q = query.toLowerCase();
    return this.racks.filter(r => r.rackName.toLowerCase().includes(q)).slice(0, 50);
  }

  getLostAndFoundForUser(currentUser) {
    if (!currentUser || !currentUser.name) return [];
    const nameLower = currentUser.name.trim().toLowerCase();
    const staffIdStr = String(currentUser.staffId).trim().toLowerCase();

    return this.lostAndFound.filter(entry => {
      const staff = (entry.btiStaff || '').trim().toLowerCase();
      if (!staff) return false;
      return staff === nameLower || staff === staffIdStr || staff.includes(nameLower) || nameLower.includes(staff);
    });
  }

  async saveLostAndFoundEntry(entryData) {
    const newEntry = {
      ticketId: 'LF-' + this.generate6DigitId(),
      timestamp: new Date().toISOString(),
      btiStaff: entryData.btiStaff,
      skuCode: entryData.skuCode,
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
}

export const db = new DatabaseService();

