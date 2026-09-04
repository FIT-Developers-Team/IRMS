/**
 * Google Apps Script for IRMS Web App Integration
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1WPpJSZ3yGR2fyG72j5u2wO2WrvWaMztO-56h0gDWgsM/edit
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;
  try {
    hasLock = lock.tryLock(20000);
    if (!hasLock) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: "error", message: "Server busy processing other requests. Please retry in a few seconds." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

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
    } else if (action === 'createStockMovement') {
      return handleCreateStockMovement(ss, data);
    } else if (action === 'updateStockMovement') {
      return handleUpdateStockMovement(ss, data);
    } else if (action === 'completeStockMovement') {
      return handleCompleteStockMovement(ss, data);
    } else if (action === 'cancelStockMovement') {
      return handleCancelStockMovement(ss, data);
    } else if (action === 'addUser') {
      return handleAddUser(ss, data);
    } else if (action === 'updateUser') {
      return handleUpdateUser(ss, data);
    } else if (action === 'deleteUser') {
      return handleDeleteUser(ss, data);
    } else if (action === 'addZone') {
      return handleAddZone(ss, data);
    } else if (action === 'updateZone') {
      return handleUpdateZone(ss, data);
    } else if (action === 'deleteZone') {
      return handleDeleteZone(ss, data);
    } else if (action === 'addRack') {
      return handleAddRack(ss, data);
    } else if (action === 'updateRack') {
      return handleUpdateRack(ss, data);
    } else if (action === 'deleteRack') {
      return handleDeleteRack(ss, data);
    } else if (action === 'addCheckerLine') {
      return handleAddCheckerLine(ss, data);
    } else if (action === 'updateCheckerLine') {
      return handleUpdateCheckerLine(ss, data);
    } else if (action === 'deleteCheckerLine') {
      return handleDeleteCheckerLine(ss, data);
    } else if (action === 'createTroubleShoot') {
      return handleCreateTroubleShoot(ss, data);
    } else if (action === 'assignTroubleShoot') {
      return handleAssignTroubleShoot(ss, data);
    } else if (action === 'pickTroubleShoot') {
      return handlePickTroubleShoot(ss, data);
    } else if (action === 'completeTroubleShoot') {
      return handleCompleteTroubleShoot(ss, data);
    } else if (action === 'uploadTroubleShootPhoto') {
      return handleUploadTroubleShootPhoto(ss, data);
    } else {
      // Default: Create Request_Checker entry
      return handleCreateRequestChecker(ss, data);
    }

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

/**
 * doGet — handles GET requests to the Web App URL.
 * Supports: ?action=getUsers  → returns User_DB as JSON (bypasses GViz CSV text-cell bug)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getUsers') {
      var sheet = ss.getSheetByName('User_DB');
      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify({ result: 'error', message: 'User_DB sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var values = sheet.getDataRange().getDisplayValues(); // DisplayValues returns text as-is, including text-formatted cells
      if (values.length < 2) {
        return ContentService
          .createTextOutput(JSON.stringify({ result: 'success', users: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var headers = values[0].map(function(h) { return String(h).trim(); });
      var users = [];
      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        var user = {};
        headers.forEach(function(h, idx) {
          user[h] = String(row[idx] || '').trim();
        });
        // Only include rows that have a non-empty Staff ID column
        var staffId = user['Staff ID'] || user['staff_id'] || user['staffid'] || user['id'] || '';
        if (staffId && staffId.length > 0) {
          users.push(user);
        }
      }

      return ContentService
        .createTextOutput(JSON.stringify({ result: 'success', users: users }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: 'Unknown action: ' + action }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
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
    var sohValues = sheet.getDataRange().getValues();
    var skuColIdx = -1, locColIdx = -1, prodColIdx = -1, updatedColIdx = -1, qtySohColIdx = -1;

    if (sohValues.length > 0) {
      var hRow = sohValues[0];
      for (var c = 0; c < hRow.length; c++) {
        var cH = String(hRow[c]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cH === 'skunumber' || cH === 'skucode' || cH === 'sku') skuColIdx = c;
        if (cH === 'racklocation' || cH === 'location') locColIdx = c;
        if (cH === 'productname' || cH === 'productid') prodColIdx = c;
        if (cH === 'updatedat' || cH === 'timestamp') updatedColIdx = c;
        if (cH === 'qtysoh' || cH === 'qty') qtySohColIdx = c;
      }
    }

    var targetSku = String(payload.skuNumber || payload.skuCode || '').trim();
    var targetLoc = String(payload.rackLocation || payload.location || '').trim();

    // 1. Check if matching row already exists in SOH
    var existingRowIdx = -1;
    if (targetSku !== '' && targetLoc !== '' && skuColIdx !== -1 && locColIdx !== -1) {
      for (var r = 1; r < sohValues.length; r++) {
        var rSku = String(sohValues[r][skuColIdx] || '').trim();
        var rLoc = String(sohValues[r][locColIdx] || '').trim();
        if (rSku === targetSku && rLoc === targetLoc) {
          existingRowIdx = r + 1; // 1-indexed row number
          break;
        }
      }
    }

    var targetRowIdx = existingRowIdx;

    // 2. If no existing row, append at bottom of non-empty data rows (lastDataRow + 1)
    if (targetRowIdx === -1) {
      var lastDataRow = 1; // row 1 is header
      for (var r2 = sohValues.length - 1; r2 >= 1; r2--) {
        var sVal = skuColIdx !== -1 ? String(sohValues[r2][skuColIdx] || '').trim() : '';
        var lVal = locColIdx !== -1 ? String(sohValues[r2][locColIdx] || '').trim() : '';
        if (sVal !== '' || lVal !== '') {
          lastDataRow = r2 + 1;
          break;
        }
      }
      targetRowIdx = lastDataRow + 1;
    }

    // 3. Write data to targetRowIdx without calling insertRowAfter (prevents shifting rows and breaking array formulas)
    var formulaCols = ["qtyonso", "countso", "qtyonldp", "stockage", "actionsuggestion"];
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      var cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (formulaCols.indexOf(cleanHeader) !== -1) {
        continue; // Skip formula columns so ARRAYFORMULA in row 2 can expand automatically
      }
      var val = getValueForHeader(cleanHeader, payload);
      if (existingRowIdx !== -1 && cleanHeader === 'qtysoh') {
        var currentQty = qtySohColIdx !== -1 ? parseInt(sohValues[existingRowIdx - 1][qtySohColIdx] || 0, 10) : 0;
        if (isNaN(currentQty)) currentQty = 0;
        val = currentQty + parseInt(payload.qtySoh || payload.qty || 0, 10);
      }
      sheet.getRange(targetRowIdx, i + 1).setValue(val);
    }
  } else {
    var newRow = headers.map(function(h) {
      var cleanHeader = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
      return getValueForHeader(cleanHeader, payload);
    });
    sheet.appendRow(newRow);
  }
}

function formatJakartaDateTime(val) {
  if (!val) return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  var d;
  if (val instanceof Date) {
    d = val;
  } else {
    d = new Date(val);
  }
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  return Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
}

function getValueForHeader(cleanHeader, payload) {
  // Troubleshoot Module explicit mappings
  if (cleanHeader === 'requesttimestamp') {
    return payload.requestTimestamp ? formatJakartaDateTime(payload.requestTimestamp) : formatJakartaDateTime(new Date());
  }
  if (cleanHeader === 'requestedby') {
    return payload.requestedBy || '';
  }
  if (cleanHeader === 'originrackname') {
    return payload.originRackName || '';
  }
  if (cleanHeader === 'requestquantity') {
    return payload.requestQuantity || payload.qty || 1;
  }
  if (cleanHeader === 'photo') {
    return payload.photo || '';
  }
  if (cleanHeader === 'assignedto') {
    return payload.assignedTo || '';
  }
  if (cleanHeader === 'statusticket') {
    return payload.statusTicket || payload.status || 'Open';
  }
  if (cleanHeader === 'troubleshootevidence') {
    return payload.troubleshootEvidence || '';
  }
  if (cleanHeader === 'foundqty') {
    return payload.foundQty !== undefined ? payload.foundQty : '';
  }
  if (cleanHeader === 'deliveredat') {
    return payload.deliveredAt || '';
  }
  if (cleanHeader === 'updateat') {
    var upVal = payload.updateAt || payload.updatedAt;
    return upVal ? formatJakartaDateTime(upVal) : '';
  }

  // Standard mappings
  if (cleanHeader === 'ticketid' || cleanHeader === 'uniqueid' || cleanHeader === 'id') {
    return payload.ticketId || payload.uniqueid || payload.ticket_id || payload.id || '';
  }
  if (cleanHeader === 'pickingid') {
    return payload.pickingId || payload.picking_id || '';
  }
  if (cleanHeader === 'checkerline' || cleanHeader === 'line') {
    return payload.checkerLine || '';
  }
  if (cleanHeader === 'timestamp' || cleanHeader === 'date' || cleanHeader === 'time' || cleanHeader === 'updatedat' || cleanHeader === 'updated_at') {
    var rawDate = new Date();
    if (payload.timestamp || payload.updatedAt || payload.updated_at) {
      var parsed = new Date(payload.timestamp || payload.updatedAt || payload.updated_at);
      if (!isNaN(parsed.getTime())) {
        rawDate = parsed;
      }
    }
    return Utilities.formatDate(rawDate, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
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
  if (cleanHeader === 'movementid') {
    return payload.movementId || payload.id || '';
  }
  if (cleanHeader === 'assignedby') {
    return payload.assignedBy || '';
  }
  if (cleanHeader === 'sourceqty') {
    return payload.sourceQty || 0;
  }
  if (cleanHeader === 'type') {
    return payload.type || '';
  }
  if (cleanHeader === 'staffid') {
    return payload.staffId || payload.id || '';
  }
  if (cleanHeader === 'name') {
    return payload.name || '';
  }
  if (cleanHeader === 'role') {
    return payload.role || '';
  }
  if (cleanHeader === 'acess' || cleanHeader === 'access') {
    return payload.access || '';
  }
  if (cleanHeader === 'password') {
    return payload.password || '';
  }
  if (cleanHeader === 'zone' || cleanHeader === 'zonename') {
    return payload.zoneName || payload.zone || '';
  }
  if (cleanHeader === 'wave' || cleanHeader === 'wavenumber') {
    return payload.wave || '';
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
    "Status",
    "Reason"
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
  var smSheet = ss.getSheetByName("Stock_Movement");

  var tasks = data.tasks || (data.pickingId ? [data] : []);

  tasks.forEach(function(t) {
    var ticketIdVal = String(t.ticketId || t.uniqueid || t.ticket_id || '').trim();
    var isLf = (data.sourceProcess === 'Lost_And_Found' || t.sourceProcess === 'Lost_And_Found' || ticketIdVal.indexOf('LF-') === 0);
    var isSm = (data.sourceProcess === 'Stock_Movement' || t.sourceProcess === 'Stock_Movement' || ticketIdVal.indexOf('SM-') === 0);

    // 1. Append row to Picking_Task sheet by header matching
    appendRowByHeader(pickingSheet, t, defaultHeaders);

    // 2. Update status on source sheet
    if (isLf && lfSheet) {
      updateStatusByHeader(lfSheet, "Ticket ID", ticketIdVal, "Picking");
    } else if (isSm && smSheet) {
      updateStatusByHeader(smSheet, "Movement ID", ticketIdVal, "Picking");
    } else if (!isLf && !isSm && reqSheet) {
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

  var ticketIdVal = String(data.ticketId || '').trim();
  var isSm = (ticketIdVal.indexOf('SM-') === 0 || ticketIdVal.indexOf('SM') === 0);
  var isSmDeduction = false;
  var smFromLocation = '';
  
  if (isSm) {
    try {
      var smSheet = ss.getSheetByName("Stock_Movement");
      if (smSheet) {
        var smValues = smSheet.getDataRange().getValues();
        var smHeaders = smValues[0];
        var smIdCol = -1, smTypeCol = -1, smFromCol = -1;
        
        for (var col = 0; col < smHeaders.length; col++) {
          var cleanH = String(smHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanH === 'movementid' || cleanH === 'ticketid' || cleanH === 'id') smIdCol = col;
          if (cleanH === 'type') smTypeCol = col;
          if (cleanH === 'fromlocation' || cleanH === 'from') smFromCol = col;
        }
        
        if (smIdCol !== -1) {
          for (var r = 1; r < smValues.length; r++) {
            if (String(smValues[r][smIdCol]).trim() === ticketIdVal) {
              var smType = smTypeCol !== -1 ? String(smValues[r][smTypeCol]).trim() : '';
              if (smType === 'Stock deduction') {
                isSmDeduction = true;
              }
              if (smFromCol !== -1) {
                smFromLocation = String(smValues[r][smFromCol]).trim();
              }
              break;
            }
          }
        }
      }
    } catch (e) {
      Logger.log("Pre-lookup SM error: " + e.toString());
    }
  }

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
    
    var fromLocation = '';
    
    if (ticketIdVal) {
      var isLf = (ticketIdVal.indexOf('LF-') === 0);
      if (isLf) {
        var lfSheet = ss.getSheetByName("Lost_And_Found");
        if (lfSheet) {
          fromLocation = getCellValueByHeader(lfSheet, "Ticket ID", ticketIdVal, "Found At");
        }
      } else if (isSm) {
        fromLocation = smFromLocation;
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
      operator: isSmDeduction ? '[-]' : '[+]',
      fromLocation: fromLocation || 'N/A',
      toLocation: data.location || '',
      timestamp: new Date().toISOString()
    };
    
    appendRowByHeader(saSheet, saPayload, saHeaders);
  } catch(saErr) {
    Logger.log("Stock Activity error: " + saErr.toString());
  }
  // Common variables needed by both SOH increment and source deduction logic
  var skuCodeVal = String(data.skuCode || '').trim();
  var qtyPutVal = parseInt(data.qtyPut || 0, 10);

  // 1c. Update Stock On Hand (SOH) sheet — skip for stock deductions (no target record created)
  if (!isSmDeduction) {
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
      
      var formattedNowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
      
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
  }
  
  // 2. Perform status updates if completed (passed from frontend as data.isCompleted)
  var isCompleted = (data.isCompleted === true || data.status === 'Completed');
  var pickingId = String(data.pickingId || '').trim();
  var ticketId = String(data.ticketId || '').trim();
  
  // Deduct source location SOH if this is a Stock Movement transfer
  var isSm = (ticketId.indexOf('SM-') === 0 || ticketId.indexOf('SM') === 0);
  if (isSm) {
    try {
      var smSheet = ss.getSheetByName("Stock_Movement");
      if (smSheet) {
        var smValues = smSheet.getDataRange().getValues();
        var smHeaders = smValues[0];
        var smIdCol = -1, smTypeCol = -1, smFromCol = -1;
        
        for (var col = 0; col < smHeaders.length; col++) {
          var cleanH = String(smHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanH === 'movementid' || cleanH === 'ticketid' || cleanH === 'id') smIdCol = col;
          if (cleanH === 'type') smTypeCol = col;
          if (cleanH === 'fromlocation' || cleanH === 'from') smFromCol = col;
        }
        
        if (smIdCol !== -1) {
          for (var r = 1; r < smValues.length; r++) {
            if (String(smValues[r][smIdCol]).trim() === ticketId) {
              var smType = smTypeCol !== -1 ? String(smValues[r][smTypeCol]).trim() : '';
              var smFromLoc = smFromCol !== -1 ? String(smValues[r][smFromCol]).trim() : '';
              
              if ((smType === 'Transfer location' || smType === 'Stock deduction') && smFromLoc !== '') {
                // Deduct from SOH sheet for smFromLoc
                var sohSheet = ss.getSheetByName("SOH");
                if (sohSheet) {
                  var sohValues = sohSheet.getDataRange().getValues();
                  var sHeaders = sohValues[0];
                  var sSkuCol = -1, sLocCol = -1, sQtySohCol = -1;
                  for (var col = 0; col < sHeaders.length; col++) {
                    var cleanH = String(sHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (cleanH === 'skunumber' || cleanH === 'skucode' || cleanH === 'sku') sSkuCol = col;
                    if (cleanH === 'racklocation' || cleanH === 'location') sLocCol = col;
                    if (cleanH === 'qtysoh' || cleanH === 'qty') sQtySohCol = col;
                  }
                  
                  if (sSkuCol !== -1 && sLocCol !== -1 && sQtySohCol !== -1) {
                    for (var sr = 1; sr < sohValues.length; sr++) {
                      var rowSku = String(sohValues[sr][sSkuCol]).toLowerCase().trim();
                      var rowLoc = String(sohValues[sr][sLocCol]).toLowerCase().trim();
                      if (rowSku === skuCodeVal.toLowerCase().trim() && rowLoc === smFromLoc.toLowerCase().trim()) {
                        var currentQty = parseInt(sohValues[sr][sQtySohCol], 10) || 0;
                        var newQty = Math.max(0, currentQty - qtyPutVal);
                        sohSheet.getRange(sr + 1, sQtySohCol + 1).setValue(newQty);
                        break;
                      }
                    }
                  }
                }
              }
              
              if (smType === 'Stock deduction') {
                var smToLocCol = -1;
                for (var col = 0; col < smHeaders.length; col++) {
                  var cleanH = String(smHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (cleanH === 'tolocation' || cleanH === 'to') smToLocCol = col;
                }
                if (smToLocCol !== -1) {
                  smSheet.getRange(r + 1, smToLocCol + 1).setValue(data.location || "");
                }
              }
              
              // If task is completed, update Stock_Movement status to Done
              if (isCompleted) {
                var statusColIdx = -1, completedAtColIdx = -1, completedByColIdx = -1;
                for (var col = 0; col < smHeaders.length; col++) {
                  var cleanH = String(smHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (cleanH === 'status') statusColIdx = col;
                  if (cleanH === 'completedat') completedAtColIdx = col;
                  if (cleanH === 'completedby' || cleanH === 'staffname') completedByColIdx = col;
                }
                
                if (statusColIdx !== -1) {
                  smSheet.getRange(r + 1, statusColIdx + 1).setValue("Done");
                }
                if (completedAtColIdx !== -1) {
                  smSheet.getRange(r + 1, completedAtColIdx + 1).setValue(new Date().toISOString());
                }
                if (completedByColIdx !== -1) {
                  smSheet.getRange(r + 1, completedByColIdx + 1).setValue(data.staffName || "System");
                }
              }
              break;
            }
          }
        }
      }
    } catch (smErr) {
      Logger.log("Stock Movement completion error: " + smErr.toString());
    }
  }
  
  if (isCompleted) {
    var pickingSheet = ss.getSheetByName("Picking_Task");
    if (pickingSheet && pickingId) {
      updateStatusByHeader(pickingSheet, "picking_id", pickingId, "Completed");
    }
    
    if (ticketId && !isSm) {
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

// ── Stock Movement & Deduction Handlers ─────────────────────────────────────

function handleCreateStockMovement(ss, data) {
  var defaultHeaders = [
    "Movement ID",
    "Timestamp",
    "Assigned By",
    "Staff Name",
    "Sku Code",
    "Product Name",
    "source Qty",
    "Qty",
    "Type",
    "Reason",
    "From Location",
    "To Location",
    "Status"
  ];
  var sheet = getOrCreateSheet(ss, "Stock_Movement", defaultHeaders);
  var movementIdVal = data.movementId || '';
  
  appendRowByHeader(sheet, data, defaultHeaders);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", movementId: movementIdVal }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateStockMovement(ss, data) {
  var sheet = ss.getSheetByName("Stock_Movement");
  var movementIdVal = String(data.movementId || '').trim();

  if (sheet && movementIdVal) {
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var movementIdCol = -1, staffNameCol = -1, qtyCol = -1, typeCol = -1, reasonCol = -1, toLocCol = -1;

      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'movementid' || cleanH === 'id') movementIdCol = h;
        if (cleanH === 'staffname') staffNameCol = h;
        if (cleanH === 'qty' || cleanH === 'quantity') qtyCol = h;
        if (cleanH === 'type') typeCol = h;
        if (cleanH === 'reason') reasonCol = h;
        if (cleanH === 'tolocation') toLocCol = h;
      }

      if (movementIdCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][movementIdCol]).trim() === movementIdVal) {
            if (staffNameCol !== -1 && data.staffName !== undefined) sheet.getRange(i + 1, staffNameCol + 1).setValue(data.staffName);
            if (qtyCol !== -1 && data.qty !== undefined) sheet.getRange(i + 1, qtyCol + 1).setValue(data.qty);
            if (typeCol !== -1 && data.type !== undefined) sheet.getRange(i + 1, typeCol + 1).setValue(data.type);
            if (reasonCol !== -1 && data.reason !== undefined) sheet.getRange(i + 1, reasonCol + 1).setValue(data.reason);
            if (toLocCol !== -1 && data.toLocation !== undefined) sheet.getRange(i + 1, toLocCol + 1).setValue(data.toLocation);
            break;
          }
        }
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", movementId: movementIdVal }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCompleteStockMovement(ss, data) {
  var smSheet = ss.getSheetByName("Stock_Movement");
  var movementId = String(data.movementId || '').trim();

  if (smSheet && movementId) {
    // 1. Update status in Stock_Movement sheet to Done
    updateStatusByHeader(smSheet, "Movement ID", movementId, "Done");

    // 2. Fetch full movement details from row
    var smValues = smSheet.getDataRange().getValues();
    var headers = smValues[0];
    var rowData = {};

    var mIdx = -1;
    for (var h = 0; h < headers.length; h++) {
      var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanH === 'movementid' || cleanH === 'id') mIdx = h;
    }

    if (mIdx !== -1) {
      for (var r = 1; r < smValues.length; r++) {
        if (String(smValues[r][mIdx]).trim() === movementId) {
          for (var c = 0; c < headers.length; c++) {
            var colKey = String(headers[c]).toLowerCase().replace(/[^a-z0-9]/g, '');
            rowData[colKey] = smValues[r][c];
          }
          break;
        }
      }
    }

    var skuCode = data.skuCode || rowData['skucode'] || rowData['skunumber'] || '';
    var productName = data.productName || rowData['productname'] || '';
    var qty = parseInt(data.qty || rowData['qty'] || 1, 10);
    var type = data.type || rowData['type'] || 'Transfer location';
    var reason = data.reason || rowData['reason'] || '';
    var fromLocation = data.fromLocation || rowData['fromlocation'] || '';
    var toLocation = data.toLocation || rowData['tolocation'] || '';
    var assignedBy = data.assignedBy || rowData['assignedby'] || '';
    var staffName = data.staffName || rowData['staffname'] || '';
    var productId = data.productId || '';
    var l0CategoryName = data.l0CategoryName || '';
    var l1CategoryName = data.l1CategoryName || '';
    var l2CategoryName = data.l2CategoryName || '';
    var foodOrNonFood = data.foodOrNonFood || '';

    // 3. Record Stock Activity log
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
      
      var nowStr = new Date().toISOString();

      var saPayload1 = {
        activityId: "SA-" + Math.floor(100000 + Math.random() * 900000),
        ticketId: movementId,
        skuCode: skuCode,
        productName: productName,
        qty: qty,
        operator: '[-]',
        fromLocation: fromLocation,
        toLocation: type === 'Transfer location' ? toLocation : 'Deduction',
        timestamp: nowStr
      };
      appendRowByHeader(saSheet, saPayload1, saHeaders);

      if (type === 'Transfer location' && toLocation && toLocation !== 'Deduction') {
        var saPayload2 = {
          activityId: "SA-" + Math.floor(100000 + Math.random() * 900000),
          ticketId: movementId,
          skuCode: skuCode,
          productName: productName,
          qty: qty,
          operator: '[+]',
          fromLocation: fromLocation,
          toLocation: toLocation,
          timestamp: nowStr
        };
        appendRowByHeader(saSheet, saPayload2, saHeaders);
      }
    } catch (saErr) {
      Logger.log("Stock Activity logging error: " + saErr.toString());
    }

    // 4. Update SOH sheet
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
      
      var sUpdatedAtCol = -1, sSkuCol = -1, sLocCol = -1, sQtySohCol = -1;
      var sProductIdCol = -1, sProductNameCol = -1, sL0Col = -1, sL1Col = -1, sL2Col = -1, sFoodCol = -1;
      for (var col = 0; col < sHeaders.length; col++) {
        var cleanH = String(sHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'updatedat') sUpdatedAtCol = col;
        if (cleanH === 'skunumber' || cleanH === 'skucode' || cleanH === 'sku') sSkuCol = col;
        if (cleanH === 'racklocation' || cleanH === 'location') sLocCol = col;
        if (cleanH === 'qtysoh' || cleanH === 'qty') sQtySohCol = col;
        if (cleanH === 'productid') sProductIdCol = col;
        if (cleanH === 'productname' || cleanH === 'product') sProductNameCol = col;
        if (cleanH === 'l0categoryname') sL0Col = col;
        if (cleanH === 'l1categoryname') sL1Col = col;
        if (cleanH === 'l2categoryname') sL2Col = col;
        if (cleanH === 'foodornonfood') sFoodCol = col;
      }

      var formattedNowStr = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");

      // Deduct from source rack location
      if (sSkuCol !== -1 && sLocCol !== -1 && sQtySohCol !== -1) {
        for (var r = 1; r < sohValues.length; r++) {
          var rowSku = String(sohValues[r][sSkuCol]).trim();
          var rowLoc = String(sohValues[r][sLocCol]).trim();
          if (rowSku === String(skuCode).trim() && rowLoc === String(fromLocation).trim()) {
            var currQty = parseInt(sohValues[r][sQtySohCol] || 0, 10);
            var newQty = Math.max(0, currQty - qty);
            sohSheet.getRange(r + 1, sQtySohCol + 1).setValue(newQty);
            if (sUpdatedAtCol !== -1) sohSheet.getRange(r + 1, sUpdatedAtCol + 1).setValue(formattedNowStr);
            break;
          }
        }
      }

      // Add to destination rack location if Transfer location
      if (type === 'Transfer location' && toLocation && toLocation !== 'Deduction') {
        var destRowIdx = -1;
        if (sSkuCol !== -1 && sLocCol !== -1) {
          for (var r2 = 1; r2 < sohValues.length; r2++) {
            var rowSku2 = String(sohValues[r2][sSkuCol]).trim();
            var rowLoc2 = String(sohValues[r2][sLocCol]).trim();
            if (rowSku2 === String(skuCode).trim() && rowLoc2 === String(toLocation).trim()) {
              destRowIdx = r2;
              break;
            }
          }
        }

        if (destRowIdx !== -1) {
          var currQty2 = parseInt(sohValues[destRowIdx][sQtySohCol] || 0, 10);
          sohSheet.getRange(destRowIdx + 1, sQtySohCol + 1).setValue(currQty2 + qty);
          if (sUpdatedAtCol !== -1) sohSheet.getRange(destRowIdx + 1, sUpdatedAtCol + 1).setValue(formattedNowStr);
        } else {
          // Older clients may not send SKU metadata. Reuse it from another
          // SOH row for the same SKU (normally the source rack) as a fallback.
          if (sSkuCol !== -1) {
            for (var metadataRow = 1; metadataRow < sohValues.length; metadataRow++) {
              if (String(sohValues[metadataRow][sSkuCol]).trim() !== String(skuCode).trim()) continue;
              if (!productId && sProductIdCol !== -1) productId = sohValues[metadataRow][sProductIdCol] || '';
              if (!productName && sProductNameCol !== -1) productName = sohValues[metadataRow][sProductNameCol] || '';
              if (!l0CategoryName && sL0Col !== -1) l0CategoryName = sohValues[metadataRow][sL0Col] || '';
              if (!l1CategoryName && sL1Col !== -1) l1CategoryName = sohValues[metadataRow][sL1Col] || '';
              if (!l2CategoryName && sL2Col !== -1) l2CategoryName = sohValues[metadataRow][sL2Col] || '';
              if (!foodOrNonFood && sFoodCol !== -1) foodOrNonFood = sohValues[metadataRow][sFoodCol] || '';
              break;
            }
          }

          var sohPayload = {
            updatedAt: formattedNowStr,
            productId: productId,
            skuNumber: skuCode,
            productName: productName,
            l0CategoryName: l0CategoryName,
            l1CategoryName: l1CategoryName,
            l2CategoryName: l2CategoryName,
            foodOrNonFood: foodOrNonFood,
            rackLocation: toLocation,
            qtySoh: qty,
            qtyOnSo: 0,
            countSo: 0,
            qtyOnLdp: 0,
            stockAge: ''
          };
          appendRowByHeader(sohSheet, sohPayload, sohHeaders);
        }
      }

    } catch (sohErr) {
      Logger.log("SOH update error in stock movement completion: " + sohErr.toString());
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", movementId: movementId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCancelStockMovement(ss, data) {
  var smSheet = ss.getSheetByName("Stock_Movement");
  if (smSheet && data.movementId) {
    updateStatusByHeader(smSheet, "Movement ID", data.movementId, "Cancelled");
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", movementId: data.movementId || '' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Admin Handlers ──────────────────────────────────────────────────────────

function handleAddUser(ss, data) {
  var defaultHeaders = ["Staff ID", "Name", "Role", "Acess", "Password"];
  var sheet = getOrCreateSheet(ss, "User_DB", defaultHeaders);

  if (data && data.staffId !== undefined) {
    var sId = String(data.staffId).trim();
    // Always store as plain string — do NOT prefix with ' here since
    // we will explicitly set the cell format to text (@) after appending
    data.staffId = sId;
  }

  appendRowByHeader(sheet, data, defaultHeaders);

  // Set the Staff ID column cell of the newly added row to Text format
  // so GViz CSV won't silently drop it or convert it to a number
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var idColIdx = -1;
    for (var h = 0; h < headers.length; h++) {
      var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanH === 'staffid' || cleanH === 'id') { idColIdx = h + 1; break; }
    }
    if (idColIdx > 0) {
      sheet.getRange(lastRow, idColIdx).setNumberFormat('@'); // '@' = plain text format
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", staffId: data.staffId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateUser(ss, data) {
  var sheet = ss.getSheetByName("User_DB");
  if (sheet && data.staffId) {
    var targetId = String(data.staffId).replace(/^'/, '').trim().toLowerCase();
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var idCol = -1, nameCol = -1, roleCol = -1, accessCol = -1, passCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'staffid' || cleanH === 'id') idCol = h;
        if (cleanH === 'name') nameCol = h;
        if (cleanH === 'role') roleCol = h;
        if (cleanH === 'acess' || cleanH === 'access') accessCol = h;
        if (cleanH === 'password' || cleanH === 'pwd') passCol = h;
      }

      if (idCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          var rowId = String(values[i][idCol]).replace(/^'/, '').trim().toLowerCase();
          if (rowId === targetId) {
            if (nameCol !== -1 && data.name !== undefined) sheet.getRange(i + 1, nameCol + 1).setValue(data.name);
            if (roleCol !== -1 && data.role !== undefined) sheet.getRange(i + 1, roleCol + 1).setValue(data.role);
            if (accessCol !== -1 && data.access !== undefined) sheet.getRange(i + 1, accessCol + 1).setValue(data.access);
            if (passCol !== -1 && data.password !== undefined) sheet.getRange(i + 1, passCol + 1).setValue(data.password);
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", staffId: data.staffId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteUser(ss, data) {
  var sheet = ss.getSheetByName("User_DB");
  if (sheet && data.staffId) {
    var targetId = String(data.staffId).replace(/^'/, '').trim().toLowerCase();
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var idCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'staffid' || cleanH === 'id') { idCol = h; break; }
      }
      if (idCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          var rowId = String(values[i][idCol]).replace(/^'/, '').trim().toLowerCase();
          if (rowId === targetId) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", staffId: data.staffId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddZone(ss, data) {
  var defaultHeaders = ["Id", "Zone"];
  var sheet = getOrCreateSheet(ss, "Zone", defaultHeaders);
  appendRowByHeader(sheet, data, defaultHeaders);
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: data.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateZone(ss, data) {
  var sheet = ss.getSheetByName("Zone");
  if (sheet && data.id) {
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var idCol = -1, zoneCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'id') idCol = h;
        if (cleanH === 'zone' || cleanH === 'zonename') zoneCol = h;
      }
      if (idCol !== -1 && zoneCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][idCol]).trim() === String(data.id).trim()) {
            sheet.getRange(i + 1, zoneCol + 1).setValue(data.zoneName || data.zone || '');
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: data.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteZone(ss, data) {
  var sheet = ss.getSheetByName("Zone");
  if (sheet && data.id) {
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var idCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'id') { idCol = h; break; }
      }
      if (idCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][idCol]).trim() === String(data.id).trim()) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: data.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddRack(ss, data) {
  var defaultHeaders = ["Location Name", "Facillity", "Zone", "Aisle", "Bay", "Partisi", "Level", "Priority", "Capacity", "Environment"];
  var sheet = getOrCreateSheet(ss, "Racks", defaultHeaders);
  appendRowByHeader(sheet, data, defaultHeaders);
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", locationName: data.locationName || data.rackName }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateRack(ss, data) {
  var sheet = ss.getSheetByName("Racks");
  if (sheet && (data.locationName || data.rackName || data.id)) {
    var target = String(data.locationName || data.rackName || data.id).trim().toLowerCase();
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var locCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'locationname' || cleanH === 'rackname' || cleanH === 'id' || cleanH === 'location') { locCol = h; break; }
      }
      if (locCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][locCol]).trim().toLowerCase() === target) {
            headers.forEach(function(header, colIdx) {
              var clean = String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
              if (clean === 'zone' && data.zone !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.zone);
              if ((clean === 'facillity' || clean === 'facility') && data.facility !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.facility);
              if (clean === 'aisle' && data.aisle !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.aisle);
              if (clean === 'bay' && data.bay !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.bay);
              if (clean === 'partisi' && data.partisi !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.partisi);
              if (clean === 'level' && data.level !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.level);
              if (clean === 'priority' && data.priority !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.priority);
              if (clean === 'capacity' && data.capacity !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.capacity);
              if (clean === 'environment' && data.environment !== undefined) sheet.getRange(i + 1, colIdx + 1).setValue(data.environment);
            });
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteRack(ss, data) {
  var sheet = ss.getSheetByName("Racks");
  if (sheet && (data.locationName || data.rackName || data.id)) {
    var target = String(data.locationName || data.rackName || data.id).trim().toLowerCase();
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var locCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'locationname' || cleanH === 'rackname' || cleanH === 'id' || cleanH === 'location') { locCol = h; break; }
      }
      if (locCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][locCol]).trim().toLowerCase() === target) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddCheckerLine(ss, data) {
  var defaultHeaders = ["Id", "Line Name"];
  var sheet = getOrCreateSheet(ss, "Checker_Lines", defaultHeaders);
  appendRowByHeader(sheet, data, defaultHeaders);
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: data.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdateCheckerLine(ss, data) {
  var sheet = ss.getSheetByName("Checker_Lines");
  if (sheet && data.id) {
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var idCol = -1, lineCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'id') idCol = h;
        if (cleanH === 'linename' || cleanH === 'line' || cleanH === 'checkerline') lineCol = h;
      }
      if (idCol !== -1 && lineCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][idCol]).trim() === String(data.id).trim()) {
            sheet.getRange(i + 1, lineCol + 1).setValue(data.lineName || data.line || '');
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: data.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleDeleteCheckerLine(ss, data) {
  var sheet = ss.getSheetByName("Checker_Lines");
  if (sheet && data.id) {
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0];
      var idCol = -1;
      for (var h = 0; h < headers.length; h++) {
        var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanH === 'id') { idCol = h; break; }
      }
      if (idCol !== -1) {
        for (var i = 1; i < values.length; i++) {
          if (String(values[i][idCol]).trim() === String(data.id).trim()) {
            sheet.deleteRow(i + 1);
            break;
          }
        }
      }
    }
  }
  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: data.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

// lookupSkuDetails removed (lookups are performed client-side to improve save response latency)

// ── Troubleshoot Handlers ─────────────────────────────────────────────────────

function handleCreateTroubleShoot(ss, data) {
  var tsHeaders = [
    "id", "Request Timestamp", "Requested By", "Staff ID", "Checker Line",
    "Photo", "Reason", "Picker Name", "SO Number", "SKU Number",
    "Product Name", "Origin Rack Name", "Request Quantity",
    "Assigned By", "Assigned To", "Status Ticket",
    "Troubleshoot Evidence", "Found Qty", "Found At",
    "Delivered At", "Picked By", "Update At", "Wave"
  ];
  var tsSheet = getOrCreateSheet(ss, "Trouble_Shoot", tsHeaders);

  var payload = {
    id: String(data.id || '').trim(),
    requestTimestamp: formatJakartaDateTime(data.requestTimestamp || new Date()),
    requestedBy: String(data.requestedBy || '').trim(),
    staffId: String(data.staffId || '').trim(),
    checkerLine: String(data.checkerLine || '').trim(),
    photo: String(data.photo || '').trim(),
    reason: String(data.reason || '').trim(),
    pickerName: String(data.pickerName || '').trim(),
    soNumber: String(data.soNumber || '').trim(),
    skuNumber: String(data.skuNumber || '').trim(),
    productName: String(data.productName || '').trim(),
    originRackName: String(data.originRackName || '').trim(),
    requestQuantity: parseInt(data.requestQuantity || 1, 10),
    assignedBy: '',
    assignedTo: '',
    statusTicket: 'Open',
    troubleshootEvidence: '',
    foundQty: '',
    foundAt: '',
    deliveredAt: '',
    pickedBy: '',
    updateAt: data.updateAt ? formatJakartaDateTime(data.updateAt) : '',
    wave: String(data.wave || '').trim()
  };

  appendRowByHeader(tsSheet, payload, tsHeaders);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: payload.id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAssignTroubleShoot(ss, data) {
  var tsSheet = ss.getSheetByName("Trouble_Shoot");
  if (!tsSheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Trouble_Shoot sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ticketId = String(data.ticketId || '').trim();
  var values = tsSheet.getDataRange().getValues();
  var headers = values[0];

  var idCol = -1, statusCol = -1, assignedByCol = -1, assignedToCol = -1, pickedByCol = -1, updateAtCol = -1;
  for (var h = 0; h < headers.length; h++) {
    var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanH === 'id') idCol = h;
    if (cleanH === 'statusticket') statusCol = h;
    if (cleanH === 'assignedby') assignedByCol = h;
    if (cleanH === 'assignedto') assignedToCol = h;
    if (cleanH === 'pickedby') pickedByCol = h;
    if (cleanH === 'updateat') updateAtCol = h;
  }

  if (idCol === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "ID column not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]).trim() === ticketId) {
      var currentStatus = String(values[r][statusCol] || '').trim();
      if (currentStatus === 'Found' || currentStatus === 'Found Partial' || currentStatus === 'Not Found') {
        return ContentService
          .createTextOutput(JSON.stringify({ result: "error", message: "Ticket is already " + currentStatus + " and cannot be reassigned" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var updateAtFormatted = formatJakartaDateTime(data.updateAt || new Date());
      if (statusCol !== -1) tsSheet.getRange(r + 1, statusCol + 1).setValue('Assigned');
      if (assignedByCol !== -1) tsSheet.getRange(r + 1, assignedByCol + 1).setValue(String(data.assignedBy || ''));
      if (assignedToCol !== -1) tsSheet.getRange(r + 1, assignedToCol + 1).setValue(String(data.assignedTo || ''));
      if (pickedByCol !== -1) tsSheet.getRange(r + 1, pickedByCol + 1).setValue('');
      if (updateAtCol !== -1) tsSheet.getRange(r + 1, updateAtCol + 1).setNumberFormat("yyyy-MM-dd HH:mm:ss").setValue(updateAtFormatted);
      break;
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handlePickTroubleShoot(ss, data) {
  var tsSheet = ss.getSheetByName("Trouble_Shoot");
  if (!tsSheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Trouble_Shoot sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ticketId = String(data.ticketId || '').trim();
  var values = tsSheet.getDataRange().getValues();
  var headers = values[0];

  var idCol = -1, statusCol = -1, pickedByCol = -1, updateAtCol = -1;
  for (var h = 0; h < headers.length; h++) {
    var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanH === 'id') idCol = h;
    if (cleanH === 'statusticket') statusCol = h;
    if (cleanH === 'pickedby') pickedByCol = h;
    if (cleanH === 'updateat') updateAtCol = h;
  }

  if (idCol === -1) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "ID column not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]).trim() === ticketId) {
      var currentStatus = String(values[r][statusCol] || '').trim();
      if (currentStatus !== 'Assigned') {
        return ContentService
          .createTextOutput(JSON.stringify({ result: "error", message: "Ticket is no longer Assigned (current: " + currentStatus + "). It may have been picked by someone else." }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var updateAtFormatted = formatJakartaDateTime(data.updateAt || new Date());
      if (statusCol !== -1) tsSheet.getRange(r + 1, statusCol + 1).setValue('Picked Up');
      if (pickedByCol !== -1) tsSheet.getRange(r + 1, pickedByCol + 1).setValue(String(data.pickedBy || ''));
      if (updateAtCol !== -1) tsSheet.getRange(r + 1, updateAtCol + 1).setNumberFormat("yyyy-MM-dd HH:mm:ss").setValue(updateAtFormatted);
      break;
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCompleteTroubleShoot(ss, data) {
  var tsSheet = ss.getSheetByName("Trouble_Shoot");
  if (!tsSheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Trouble_Shoot sheet not found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var ticketId = String(data.ticketId || '').trim();
  var statusTicket = String(data.statusTicket || 'Not Found').trim();
  var foundQty = parseInt(data.foundQty || 0, 10);
  var foundAt = String(data.foundAt || '').trim();
  var foundFrom = String(data.foundFrom || '').trim();
  var skuNumber = String(data.skuNumber || '').trim();
  var productName = String(data.productName || '').trim();
  var troubleshootEvidence = String(data.troubleshootEvidence || '').trim();
  var deliveredAt = String(data.deliveredAt || '').trim();
  var updateAt = formatJakartaDateTime(data.updateAt || new Date());

  // 1. Update Trouble_Shoot sheet
  var values = tsSheet.getDataRange().getValues();
  var headers = values[0];

  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
    colMap[cleanH] = h;
  }

  var idCol = colMap['id'];
  if (idCol === undefined) idCol = -1;

  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]).trim() === ticketId) {
      if (colMap['statusticket'] !== undefined) tsSheet.getRange(r + 1, colMap['statusticket'] + 1).setValue(statusTicket);
      if (colMap['foundqty'] !== undefined) tsSheet.getRange(r + 1, colMap['foundqty'] + 1).setValue(foundQty);
      if (colMap['foundat'] !== undefined) tsSheet.getRange(r + 1, colMap['foundat'] + 1).setValue(foundAt);
      if (colMap['troubleshootevidence'] !== undefined) tsSheet.getRange(r + 1, colMap['troubleshootevidence'] + 1).setValue(troubleshootEvidence);
      if (colMap['deliveredat'] !== undefined) tsSheet.getRange(r + 1, colMap['deliveredat'] + 1).setValue(deliveredAt);
      if (colMap['updateat'] !== undefined) tsSheet.getRange(r + 1, colMap['updateat'] + 1).setNumberFormat("yyyy-MM-dd HH:mm:ss").setValue(updateAt);
      break;
    }
  }

  // 2. SOH Deduction — only if found at SOH STG rack
  if ((statusTicket === 'Found' || statusTicket === 'Found Partial') && foundFrom === 'soh' && foundAt && foundQty > 0) {
    try {
      var sohSheet = ss.getSheetByName("SOH");
      if (sohSheet) {
        var sohValues = sohSheet.getDataRange().getValues();
        var sHeaders = sohValues[0];

        var sUpdatedAtCol = -1, sSkuCol = -1, sLocCol = -1, sQtySohCol = -1;
        for (var col = 0; col < sHeaders.length; col++) {
          var sCleanH = String(sHeaders[col]).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (sCleanH === 'updatedat') sUpdatedAtCol = col;
          if (sCleanH === 'skunumber' || sCleanH === 'skucode' || sCleanH === 'sku') sSkuCol = col;
          if (sCleanH === 'racklocation' || sCleanH === 'location') sLocCol = col;
          if (sCleanH === 'qtysoh' || sCleanH === 'qty') sQtySohCol = col;
        }

        if (sSkuCol !== -1 && sLocCol !== -1 && sQtySohCol !== -1) {
          for (var sr = 1; sr < sohValues.length; sr++) {
            var rowSku = String(sohValues[sr][sSkuCol]).replace(/^'/, '').trim().toLowerCase();
            var rowLoc = String(sohValues[sr][sLocCol]).trim().toLowerCase();
            var targetSku = String(skuNumber || '').replace(/^'/, '').trim().toLowerCase();
            var targetLoc = String(foundAt || '').trim().toLowerCase();

            if (rowSku === targetSku && rowLoc === targetLoc) {
              var currQty = parseInt(sohValues[sr][sQtySohCol] || 0, 10);
              var newQty = Math.max(0, currQty - foundQty);
              sohSheet.getRange(sr + 1, sQtySohCol + 1).setValue(newQty);
              if (sUpdatedAtCol !== -1) {
                var formattedNow = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
                sohSheet.getRange(sr + 1, sUpdatedAtCol + 1).setValue(formattedNow);
              }
              break;
            }
          }
        }
      }

      // 3. Append Stock_Activity record
      var saHeaders = [
        "Activity ID", "Ticket ID", "Sku Code", "Product Name",
        "Qty", "Operator", "From Location", "To Location", "Timestamp"
      ];
      var saSheet = getOrCreateSheet(ss, "Stock_Activity", saHeaders);
      var saPayload = {
        activityId: "SA-" + Math.floor(100000 + Math.random() * 900000),
        ticketId: ticketId,
        skuCode: skuNumber,
        productName: productName,
        qty: foundQty,
        operator: '[-]',
        fromLocation: foundAt,
        toLocation: 'Troubleshoot Resolution',
        timestamp: Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss")
      };
      appendRowByHeader(saSheet, saPayload, saHeaders);

    } catch (sohErr) {
      Logger.log("SOH deduction error in troubleshoot: " + sohErr.toString());
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketId, statusTicket: statusTicket }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Utility to fix existing Troubleshoot sheet timestamps to Asia/Jakarta format
 */
function fixTroubleShootSheetTimeFormat() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tsSheet = ss.getSheetByName("Trouble_Shoot");
  if (!tsSheet) return "Trouble_Shoot sheet not found";
  var values = tsSheet.getDataRange().getValues();
  if (values.length < 2) return "No data rows in Trouble_Shoot";
  var headers = values[0];
  var reqTsCol = -1, updateAtCol = -1;
  for (var h = 0; h < headers.length; h++) {
    var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanH === 'requesttimestamp') reqTsCol = h;
    if (cleanH === 'updateat') updateAtCol = h;
  }
  var fixedCount = 0;
  for (var r = 1; r < values.length; r++) {
    if (reqTsCol !== -1 && values[r][reqTsCol]) {
      var formatted = formatJakartaDateTime(values[r][reqTsCol]);
      if (formatted && formatted !== String(values[r][reqTsCol]).trim()) {
        tsSheet.getRange(r + 1, reqTsCol + 1).setNumberFormat("yyyy-MM-dd HH:mm:ss").setValue(formatted);
        fixedCount++;
      }
    }
    if (updateAtCol !== -1 && values[r][updateAtCol]) {
      var formattedUp = formatJakartaDateTime(values[r][updateAtCol]);
      if (formattedUp && formattedUp !== String(values[r][updateAtCol]).trim()) {
        tsSheet.getRange(r + 1, updateAtCol + 1).setNumberFormat("yyyy-MM-dd HH:mm:ss").setValue(formattedUp);
        fixedCount++;
      }
    }
  }
  return "Fixed " + fixedCount + " timestamps in Trouble_Shoot sheet";
}

function handleUploadTroubleShootPhoto(ss, data) {
  try {
    var base64Data = String(data.base64Data || '');
    var fileName = String(data.fileName || ('ts_photo_' + Date.now() + '.jpg'));
    var ticketId = String(data.ticketId || '').trim();
    var fieldName = String(data.fieldName || 'photo').trim();

    if (!base64Data) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: "error", message: "No image data provided" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    var cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    // Create or find the target folder
    var folderName = 'IRMS_Troubleshoot_Photos';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    // Create the file in the folder
    var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), 'image/jpeg', fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = file.getUrl();

    // Update the Trouble_Shoot sheet with the photo URL
    if (ticketId) {
      var tsSheet = ss.getSheetByName("Trouble_Shoot");
      if (tsSheet) {
        var values = tsSheet.getDataRange().getValues();
        var headers = values[0];

        var idCol = -1, photoCol = -1, evidenceCol = -1;
        for (var h = 0; h < headers.length; h++) {
          var cleanH = String(headers[h]).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanH === 'id') idCol = h;
          if (cleanH === 'photo') photoCol = h;
          if (cleanH === 'troubleshootevidence') evidenceCol = h;
        }

        if (idCol !== -1) {
          for (var r = 1; r < values.length; r++) {
            if (String(values[r][idCol]).trim() === ticketId) {
              var targetCol = (fieldName === 'troubleshootEvidence' || fieldName === 'evidence') ? evidenceCol : photoCol;
              if (targetCol !== -1) {
                tsSheet.getRange(r + 1, targetCol + 1).setValue(fileUrl);
              }
              break;
            }
          }
        }
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success", fileUrl: fileUrl }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("Photo upload error: " + err.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
