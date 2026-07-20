import Papa from 'papaparse';
import { GOOGLE_SHEETS_CONFIG } from '../config/googleSheets.js';

class DatabaseService {
  constructor() {
    this.users = [];
    this.soList = [];
    this.requests = this.loadSavedRequests();
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

        return {
          staffId: String(staffId).trim(),
          name: String(name).trim(),
          role: String(role).trim(),
          access: String(access).trim()
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

    if (result.data) {
      const remoteReqs = result.data.map(row => {
        const uniqueid = this.findRowValue(row, ['uniqueid', 'unique id', 'id']);
        const timestamp = this.findRowValue(row, ['timestamp', 'date', 'time']) || new Date().toISOString();
        const pickerName = this.findRowValue(row, ['picker_name', 'picker name', 'picker']) || 'N/A';
        const checkerName = this.findRowValue(row, ['checker_name', 'checker name', 'checker']);
        const soNumber = this.findRowValue(row, ['so_number', 'so number', 'so']);
        const skuNumber = this.findRowValue(row, ['sku_number', 'sku code', 'sku number', 'sku']);
        const productName = this.findRowValue(row, ['product_name', 'product name', 'product']);
        const qty = this.findRowValue(row, ['qty', 'quantity', 'request_quantity']) || '1';
        const status = this.findRowValue(row, ['status']) || 'Pending';

        return {
          uniqueid: String(uniqueid).trim(),
          timestamp: String(timestamp).trim(),
          pickerName: String(pickerName).trim(),
          checkerName: String(checkerName).trim(),
          soNumber: String(soNumber).trim(),
          skuNumber: String(skuNumber).trim(),
          productName: String(productName).trim(),
          qty: parseInt(String(qty).trim() || '1', 10),
          status: String(status).trim()
        };
      }).filter(req => req.uniqueid || req.soNumber);

      // Google Sheet is single source of truth for Request_Checker
      this.requests = remoteReqs;
      
      // Sort newest timestamp first
      this.requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Update local storage cache
      this.persistRequests();
    }
  }

  findRowValue(row, possibleKeys) {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const key of possibleKeys) {
      const matchedKey = keys.find(k => k.trim().toLowerCase() === key.toLowerCase());
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        const val = String(row[matchedKey]).trim();
        if (val) return val;
      }
    }
    return '';
  }

  async syncGoogleSheets() {
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
    const cacheBuster = `_t=${Date.now()}`;

    const userDbUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(userDbTab)}&${cacheBuster}`;
    const soDataUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(soDataTab)}&${cacheBuster}`;
    const requestCheckerUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(requestCheckerTab)}&${cacheBuster}`;

    try {
      const [userDbRes, soDataRes, requestCheckerRes] = await Promise.all([
        fetch(userDbUrl, { cache: 'no-store' }),
        fetch(soDataUrl, { cache: 'no-store' }),
        fetch(requestCheckerUrl, { cache: 'no-store' }).catch(() => null)
      ]);

      if (!userDbRes.ok || !soDataRes.ok) {
        throw new Error('Failed to fetch tabs. Please check Google Sheet sharing settings.');
      }

      const userDbCsv = await userDbRes.text();
      const soDataCsv = await soDataRes.text();

      if (userDbCsv.includes('<!DOCTYPE html>') || soDataCsv.includes('<!DOCTYPE html>')) {
        throw new Error('Google Sheet is not public. Set sharing to "Anyone with the link can view".');
      }

      this.parseUsers(userDbCsv);
      this.parseSoData(soDataCsv);

      if (requestCheckerRes && requestCheckerRes.ok) {
        const reqCheckerCsv = await requestCheckerRes.text();
        if (!reqCheckerCsv.includes('<!DOCTYPE html>')) {
          this.parseRequestChecker(reqCheckerCsv);
        } else {
          this.requests = [];
          this.persistRequests();
        }
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
    const newReq = {
      uniqueid: this.generate6DigitId(),
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReq)
        });

        // Background refetch after Apps Script completes write
        setTimeout(() => {
          this.syncGoogleSheets();
        }, 2000);
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
}

export const db = new DatabaseService();
