/**
 * Google Apps Script for IRMS Web App Integration
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1WPpJSZ3yGR2fyG72j5u2wO2WrvWaMztO-56h0gDWgsM/edit
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};
    
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    
    var action = data.action;

    if (action === 'createPickingTasks') {
      return handleCreatePickingTasks(ss, data);
    } else if (action === 'updatePickingTaskStatus') {
      return handleUpdatePickingTaskStatus(ss, data);
    } else if (action === 'createLostAndFound') {
      return handleCreateLostAndFound(ss, data);
    } else {
      // Default: Create Request_Checker entry
      return handleCreateRequestChecker(ss, data);
    }

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, sheetName, defaultHeaders) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(defaultHeaders);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold").setBackground("#eef6ff");
  }
  return sheet;
}

function appendRowByHeader(sheet, payload, defaultHeaders) {
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.appendRow(defaultHeaders);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setFontWeight("bold").setBackground("#eef6ff");
    lastCol = defaultHeaders.length;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Auto-append any missing default headers to row 1
  defaultHeaders.forEach(function(dh) {
    var dhNorm = String(dh).toLowerCase().replace(/[^a-z0-9]/g, '');
    var exists = headers.some(function(h) {
      return String(h).toLowerCase().replace(/[^a-z0-9]/g, '') === dhNorm;
    });
    if (!exists) {
      headers.push(dh);
      sheet.getRange(1, headers.length).setValue(dh).setFontWeight("bold").setBackground("#eef6ff");
    }
  });

  var newRow = headers.map(function(h) {
    var cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanHeader === 'ticketid' || cleanHeader === 'uniqueid' || cleanHeader === 'id') {
      return payload.ticketId || payload.uniqueid || payload.ticket_id || '';
    }
    if (cleanHeader === 'pickingid') {
      return payload.pickingId || payload.picking_id || '';
    }
    if (cleanHeader === 'checkerline' || cleanHeader === 'line') {
      return payload.checkerLine || '';
    }
    if (cleanHeader === 'timestamp' || cleanHeader === 'date' || cleanHeader === 'time') {
      return payload.timestamp || new Date().toISOString();
    }
    if (cleanHeader === 'pickername' || cleanHeader === 'picker') {
      return payload.pickerName || payload.picker_name || '';
    }
    if (cleanHeader === 'checkername' || cleanHeader === 'checker') {
      return payload.checkerName || payload.checker_name || '';
    }
    if (cleanHeader === 'btistaff') {
      return payload.btiStaff || payload.checkerName || '';
    }
    if (cleanHeader === 'pickedby') {
      return payload.pickedBy || payload.picked_by || '';
    }
    if (cleanHeader === 'sonumber' || cleanHeader === 'so') {
      return payload.soNumber || payload.so_number || '';
    }
    if (cleanHeader === 'skucode' || cleanHeader === 'skunumber' || cleanHeader === 'sku') {
      return payload.skuCode || payload.sku_code || payload.skuNumber || '';
    }
    if (cleanHeader === 'productname' || cleanHeader === 'product') {
      return payload.productName || payload.product_name || payload.foundAt || '';
    }
    if (cleanHeader === 'qty' || cleanHeader === 'quantity') {
      return payload.qty || 1;
    }
    if (cleanHeader === 'status') {
      return payload.status || 'Pending';
    }
    if (cleanHeader === 'foundat' || cleanHeader === 'found') {
      return payload.foundAt || payload.found_at || '';
    }
    if (cleanHeader === 'reason') {
      return payload.reason || '';
    }

    return '';
  });

  sheet.appendRow(newRow);
}

function updateStatusByHeader(sheet, idColHeader, targetIdVal, statusVal) {
  if (!sheet) return;
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length <= 1) return;

  var headers = values[0];
  var idColIdx = -1;
  var statusColIdx = -1;

  for (var h = 0; h < headers.length; h++) {
    var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanH === idColHeader.toLowerCase().replace(/[^a-z0-9]/g, '') || cleanH === 'ticketid' || cleanH === 'pickingid' || cleanH === 'id') {
      if (idColIdx === -1) idColIdx = h;
    }
    if (cleanH === 'status') {
      statusColIdx = h;
    }
  }

  if (idColIdx !== -1 && statusColIdx !== -1) {
    for (var i = 1; i < values.length; i++) {
      var rowId = String(values[i][idColIdx]).trim();
      if (rowId === String(targetIdVal).trim()) {
        sheet.getRange(i + 1, statusColIdx + 1).setValue(statusVal);
      }
    }
  }
}

function handleCreateRequestChecker(ss, data) {
  var defaultHeaders = [
    "Ticket ID", 
    "Checker Line",
    "Timestamp", 
    "Picker Name", 
    "Checker Name", 
    "So Number", 
    "Sku Code", 
    "Product Name", 
    "Qty", 
    "Status"
  ];
  var sheet = getOrCreateSheet(ss, "Request_Checker", defaultHeaders);
  var ticketIdVal = data.ticketId || data.uniqueid || '';
  
  appendRowByHeader(sheet, data, defaultHeaders);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketIdVal }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCreatePickingTasks(ss, data) {
  var defaultHeaders = [
    "picking_id",
    "ticket_id",
    "picked_by",
    "sku_code",
    "product_name",
    "qty",
    "status",
    "timestamp"
  ];
  var pickingSheet = getOrCreateSheet(ss, "Picking_Task", defaultHeaders);
  var reqSheet = ss.getSheetByName("Request_Checker");
  var lfSheet = ss.getSheetByName("Lost_And_Found");

  var tasks = data.tasks || (data.pickingId ? [data] : []);

  tasks.forEach(function(t) {
    var ticketIdVal = String(t.ticketId || t.uniqueid || t.ticket_id || '').trim();
    var isLf = (data.sourceProcess === 'Lost_And_Found' || t.sourceProcess === 'Lost_And_Found' || ticketIdVal.indexOf('LF-') === 0);

    // 1. Append row to Picking_Task sheet by header matching
    appendRowByHeader(pickingSheet, t, defaultHeaders);

    // 2. Update status on Lost_And_Found sheet
    if (isLf && lfSheet) {
      updateStatusByHeader(lfSheet, "Ticket ID", ticketIdVal, "Picking");
    }

    // 3. Update status on Request_Checker sheet
    if (!isLf && reqSheet) {
      updateStatusByHeader(reqSheet, "Ticket ID", ticketIdVal, "Picking");
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", tasksCount: tasks.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdatePickingTaskStatus(ss, data) {
  var pickingSheet = ss.getSheetByName("Picking_Task");
  if (pickingSheet && data.pickingId && data.status) {
    updateStatusByHeader(pickingSheet, "picking_id", data.pickingId, data.status);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", pickingId: data.pickingId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCreateLostAndFound(ss, data) {
  var defaultHeaders = [
    "Ticket ID", 
    "Timestamp", 
    "BTI Staff", 
    "Sku Code", 
    "Qty", 
    "Found At", 
    "Reason",
    "Status"
  ];
  var sheet = getOrCreateSheet(ss, "Lost_And_Found", defaultHeaders);
  var ticketIdVal = data.ticketId || data.uniqueid || '';
  
  appendRowByHeader(sheet, data, defaultHeaders);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketIdVal }))
    .setMimeType(ContentService.MimeType.JSON);
}
