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
    } else if (action === 'createPutaway') {
      return handleCreatePutaway(ss, data);
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

  var sheetName = sheet.getName();
  var isSoh = (sheetName === "SOH");
  var formulaHeaders = ["qtyonso", "countso", "qtyonldp", "stockage"];

  if (isSoh) {
    var lastRow = sheet.getLastRow();
    sheet.insertRowAfter(lastRow);
    var newRowIdx = lastRow + 1;
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      var cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (formulaHeaders.indexOf(cleanHeader) !== -1) {
        continue; // Skip formula columns entirely so ARRAYFORMULA can expand
      }
      var val = getValueForHeader(cleanHeader, payload);
      sheet.getRange(newRowIdx, i + 1).setValue(val);
    }
  } else {
    var newRow = headers.map(function(h) {
      var cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
      return getValueForHeader(cleanHeader, payload);
    });
    sheet.appendRow(newRow);
  }
}

function getValueForHeader(cleanHeader, payload) {
  if (cleanHeader === 'ticketid' || cleanHeader === 'uniqueid' || cleanHeader === 'id') {
    return payload.ticketId || payload.uniqueid || payload.ticket_id || '';
  }
  if (cleanHeader === 'pickingid') {
    return payload.pickingId || payload.picking_id || '';
  }
  if (cleanHeader === 'checkerline' || cleanHeader === 'line') {
    return payload.checkerLine || '';
  }
  if (cleanHeader === 'timestamp' || cleanHeader === 'date' || cleanHeader === 'time' || cleanHeader === 'updatedat') {
    var rawDate = new Date();
    if (payload.timestamp || payload.updatedAt) {
      var parsed = new Date(payload.timestamp || payload.updatedAt);
      if (!isNaN(parsed.getTime())) {
        rawDate = parsed;
      }
    }
    return Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
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
  if (cleanHeader === 'putwayid' || cleanHeader === 'putawayid') {
    return payload.putawayId || payload.putwayId || '';
  }
  if (cleanHeader === 'qtyput') {
    return payload.qtyPut || payload.qty || 1;
  }
  if (cleanHeader === 'location') {
    return payload.location || '';
  }
  if (cleanHeader === 'staffname') {
    return payload.staffName || payload.staff_name || '';
  }
  if (cleanHeader === 'activityid') {
    return payload.activityId || '';
  }
  if (cleanHeader === 'operator') {
    return payload.operator || '';
  }
  if (cleanHeader === 'fromlocation') {
    return payload.fromLocation || '';
  }
  if (cleanHeader === 'tolocation') {
    return payload.toLocation || '';
  }
  if (cleanHeader === 'productid') {
    return payload.productId || '';
  }
  if (cleanHeader === 'l0categoryname') {
    return payload.l0CategoryName || '';
  }
  if (cleanHeader === 'l1categoryname') {
    return payload.l1CategoryName || '';
  }
  if (cleanHeader === 'l2categoryname') {
    return payload.l2CategoryName || '';
  }
  if (cleanHeader === 'foodornonfood') {
    return payload.foodOrNonFood || '';
  }
  if (cleanHeader === 'racklocation') {
    return payload.rackLocation || '';
  }
  if (cleanHeader === 'qtysoh') {
    return payload.qtySoh || 0;
  }
  if (cleanHeader === 'qtyonso') {
    return payload.qtyOnSo || 0;
  }
  if (cleanHeader === 'countso') {
    return payload.countSo || 0;
  }
  if (cleanHeader === 'qtyonldp') {
    return payload.qtyOnLdp || 0;
  }
  if (cleanHeader === 'stockage') {
    return payload.stockAge || '';
  }

  return '';
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
    "Product Name",
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

function handleCreatePutaway(ss, data) {
  var defaultHeaders = [
    "Timestamp",
    "Putway ID",
    "Picking ID",
    "Ticket ID",
    "Sku Code",
    "Product Name",
    "Qty Put",
    "Location",
    "Staff Name"
  ];
  var putawaySheet = getOrCreateSheet(ss, "Putaway", defaultHeaders);
  var putawayIdVal = data.putawayId || data.putwayId || '';
  
  // 1. Append row to Putaway sheet
  appendRowByHeader(putawaySheet, data, defaultHeaders);

  // 1b. Create Stock Activity log
  try {
    var saHeaders = [
      "Activity ID",
      "Ticket ID",
      "Sku Code",
      "Product Name",
      "Qty",
      "Operator",
      "From Location",
      "To Location",
      "Timestamp"
    ];
    var saSheet = getOrCreateSheet(ss, "Stock_Activity", saHeaders);
    
    var ticketIdVal = String(data.ticketId || '').trim();
    var fromLocation = '';
    
    if (ticketIdVal) {
      var isLf = (ticketIdVal.indexOf('LF-') === 0);
      if (isLf) {
        var lfSheet = ss.getSheetByName("Lost_And_Found");
        if (lfSheet) {
          fromLocation = getCellValueByHeader(lfSheet, "Ticket ID", ticketIdVal, "Found At");
        }
      } else {
        var reqSheet = ss.getSheetByName("Request_Checker");
        if (reqSheet) {
          fromLocation = getCellValueByHeader(reqSheet, "Ticket ID", ticketIdVal, "Checker Line");
        }
      }
    }
    
    var saPayload = {
      activityId: "SA-" + Math.floor(100000 + Math.random() * 900000),
      ticketId: ticketIdVal,
      skuCode: data.skuCode || '',
      productName: data.productName || '',
      qty: data.qtyPut || 0,
      operator: '[+]',
      fromLocation: fromLocation || 'N/A',
      toLocation: data.location || '',
      timestamp: new Date().toISOString()
    };
    
    appendRowByHeader(saSheet, saPayload, saHeaders);
  } catch(saErr) {
    Logger.log("Stock Activity error: " + saErr.toString());
  }

  // 1c. Update Stock On Hand (SOH) sheet
  try {
    var sohHeaders = [
      "Updated At",
      "Product ID",
      "Product Name",
      "Sku Number",
      "L0 Category Name",
      "L1 Category Name",
      "L2 Category Name",
      "Food or Non Food",
      "Rack Location",
      "Qty SOH",
      "Qty On SO",
      "Count SO",
      "Qty On LDP",
      "Stock Age"
    ];
    var sohSheet = getOrCreateSheet(ss, "SOH", sohHeaders);
    var sohValues = sohSheet.getDataRange().getValues();
    var sHeaders = sohValues[0];
    
    var sUpdatedAtCol = -1;
    var sSkuCol = -1;
    var sLocCol = -1;
    var sQtySohCol = -1;
    
    for (var col = 0; col < sHeaders.length; col++) {
      var cleanH = String(sHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanH === 'updatedat') sUpdatedAtCol = col;
      if (cleanH === 'skunumber' || cleanH === 'skucode' || cleanH === 'sku') sSkuCol = col;
      if (cleanH === 'racklocation' || cleanH === 'location') sLocCol = col;
      if (cleanH === 'qtysoh' || cleanH === 'qty') sQtySohCol = col;
    }
    
    var skuCodeVal = String(data.skuCode || '').trim();
    var targetLocation = String(data.location || '').trim();
    var qtyPutVal = parseInt(data.qtyPut || 0, 10);
    
    var existingRowIdx = -1;
    if (sSkuCol !== -1 && sLocCol !== -1) {
      for (var r = 1; r < sohValues.length; r++) {
        var rowSku = String(sohValues[r][sSkuCol]).trim();
        var rowLoc = String(sohValues[r][sLocCol]).trim();
        if (rowSku === skuCodeVal && rowLoc === targetLocation) {
          existingRowIdx = r;
          break;
        }
      }
    }
    
    var formattedNowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    if (existingRowIdx !== -1) {
      // Update existing row
      var currentQty = sQtySohCol !== -1 ? parseInt(sohValues[existingRowIdx][sQtySohCol], 10) : 0;
      if (isNaN(currentQty)) currentQty = 0;
      var newQty = currentQty + qtyPutVal;
      
      if (sQtySohCol !== -1) {
        sohSheet.getRange(existingRowIdx + 1, sQtySohCol + 1).setValue(newQty);
      }
      if (sUpdatedAtCol !== -1) {
        sohSheet.getRange(existingRowIdx + 1, sUpdatedAtCol + 1).setValue(formattedNowStr);
      }
    } else {
      // Insert new row using pre-filled payload fields passed from the frontend
      var sohPayload = {
        updatedAt: formattedNowStr,
        productId: data.productId || '',
        productName: data.productName || '',
        skuNumber: skuCodeVal,
        l0CategoryName: data.l0CategoryName || '',
        l1CategoryName: data.l1CategoryName || '',
        l2CategoryName: data.l2CategoryName || '',
        foodOrNonFood: data.foodOrNonFood || '',
        rackLocation: targetLocation,
        qtySoh: qtyPutVal,
        qtyOnSo: 0,
        countSo: 0,
        qtyOnLdp: 0,
        stockAge: ''
      };
      
      appendRowByHeader(sohSheet, sohPayload, sohHeaders);
    }
  } catch(sohErr) {
    Logger.log("SOH update error: " + sohErr.toString());
  }
  
  // 2. Perform status updates if completed (passed from frontend as data.isCompleted)
  var isCompleted = (data.isCompleted === true || data.status === 'Completed');
  var pickingId = String(data.pickingId || '').trim();
  var ticketId = String(data.ticketId || '').trim();
  
  if (isCompleted) {
    var pickingSheet = ss.getSheetByName("Picking_Task");
    if (pickingSheet && pickingId) {
      updateStatusByHeader(pickingSheet, "picking_id", pickingId, "Completed");
    }
    
    if (ticketId) {
      var isLf = (ticketId.indexOf('LF-') === 0);
      var reqSheet = ss.getSheetByName("Request_Checker");
      var lfSheet = ss.getSheetByName("Lost_And_Found");
      
      if (isLf && lfSheet) {
        updateStatusByHeader(lfSheet, "Ticket ID", ticketId, "Completed");
      } else if (!isLf && reqSheet) {
        updateStatusByHeader(reqSheet, "Ticket ID", ticketId, "Completed");
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", putawayId: putawayIdVal, completed: isCompleted }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getCellValueByHeader(sheet, idColHeader, targetIdVal, targetColHeader) {
  if (!sheet) return '';
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  if (values.length <= 1) return '';

  var headers = values[0];
  var idColIdx = -1;
  var targetColIdx = -1;

  for (var h = 0; h < headers.length; h++) {
    var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanH === idColHeader.toLowerCase().replace(/[^a-z0-9]/g, '') || cleanH === 'ticketid' || cleanH === 'id') {
      if (idColIdx === -1) idColIdx = h;
    }
    if (cleanH === targetColHeader.toLowerCase().replace(/[^a-z0-9]/g, '')) {
      targetColIdx = h;
    }
  }

  if (idColIdx !== -1 && targetColIdx !== -1) {
    for (var i = 1; i < values.length; i++) {
      var rowId = String(values[i][idColIdx]).trim();
      if (rowId === String(targetIdVal).trim()) {
        return String(values[i][targetColIdx]).trim();
      }
    }
  }
  return '';
}

// lookupSkuDetails removed (lookups are performed client-side to improve save response latency)
