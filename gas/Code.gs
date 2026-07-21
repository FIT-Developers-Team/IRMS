/**
 * Google Apps Script for IRMS Web App Integration
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1WPpJSZ3yGR2fyG72j5u2wO2WrvWaMztO-56h0gDWgsM/edit
 * Tabs: Request_Checker, Picking_Task
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

function handleCreateRequestChecker(ss, data) {
  var sheet = ss.getSheetByName("Request_Checker");
  if (!sheet) {
    sheet = ss.insertSheet("Request_Checker");
    sheet.appendRow([
      "Ticket ID", 
      "Timestamp", 
      "Picker Name", 
      "Checker Name", 
      "So Number", 
      "Sku Code", 
      "Product Name", 
      "Qty", 
      "Status"
    ]);
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#eef6ff");
  }

  var ticketIdVal = data.ticketId || data.uniqueid || '';
  sheet.appendRow([
    ticketIdVal,
    data.timestamp || new Date().toISOString(),
    data.pickerName || '',
    data.checkerName || '',
    data.soNumber || '',
    data.skuNumber || '',
    data.productName || '',
    data.qty || 1,
    data.status || 'Pending'
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketIdVal }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCreatePickingTasks(ss, data) {
  var pickingSheet = ss.getSheetByName("Picking_Task");
  if (!pickingSheet) {
    pickingSheet = ss.insertSheet("Picking_Task");
    pickingSheet.appendRow([
      "picking_id",
      "ticket_id",
      "picked_by",
      "sku_code",
      "product_name",
      "qty",
      "status",
      "timestamp"
    ]);
    pickingSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#eef6ff");
  }

  var reqSheet = ss.getSheetByName("Request_Checker");
  var lfSheet = ss.getSheetByName("Lost_And_Found");

  var tasks = data.tasks || (data.pickingId ? [data] : []);

  tasks.forEach(function(t) {
    var ticketIdVal = String(t.ticketId || t.uniqueid || t.ticket_id || '').trim();
    var pickingIdVal = String(t.pickingId || t.picking_id || '').trim();
    var isLf = (data.sourceProcess === 'Lost_And_Found' || t.sourceProcess === 'Lost_And_Found' || ticketIdVal.indexOf('LF-') === 0);

    // 1. Append row to Picking_Task sheet
    pickingSheet.appendRow([
      pickingIdVal,
      ticketIdVal,
      t.pickedBy || t.picked_by || '',
      t.skuCode || t.sku_code || t.skuNumber || '',
      t.productName || t.product_name || t.foundAt || '',
      t.qty || 1,
      t.status || 'Picking',
      t.timestamp || new Date().toISOString()
    ]);

    // 2. Update status on Lost_And_Found sheet (Column 7: Status)
    if (isLf && lfSheet) {
      var lfData = lfSheet.getDataRange().getValues();
      for (var k = 1; k < lfData.length; k++) {
        var lfRowId = String(lfData[k][0]).trim();
        if (lfRowId === ticketIdVal) {
          lfSheet.getRange(k + 1, 7).setValue("Picking");
        }
      }
    }

    // 3. Update status on Request_Checker sheet (Column 9: Status)
    if (!isLf && reqSheet) {
      var reqData = reqSheet.getDataRange().getValues();
      for (var i = 1; i < reqData.length; i++) {
        var rowId = String(reqData[i][0]).trim();
        if (rowId === ticketIdVal) {
          reqSheet.getRange(i + 1, 9).setValue("Picking");
        }
      }
    }
  });

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", tasksCount: tasks.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleUpdatePickingTaskStatus(ss, data) {
  var pickingSheet = ss.getSheetByName("Picking_Task");
  if (pickingSheet) {
    var values = pickingSheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      var pId = String(values[i][0]).trim();
      if (pId === String(data.pickingId).trim()) {
        // Column 7 (1-based index) is 'status' in Picking_Task
        pickingSheet.getRange(i + 1, 7).setValue(data.status);
      }
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", pickingId: data.pickingId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCreateLostAndFound(ss, data) {
  var sheet = ss.getSheetByName("Lost_And_Found");
  if (!sheet) {
    sheet = ss.insertSheet("Lost_And_Found");
    sheet.appendRow([
      "Ticket ID", 
      "Timestamp", 
      "BTI Staff", 
      "Sku Code", 
      "Qty", 
      "Found At", 
      "Status"
    ]);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#eef6ff");
  }

  var ticketIdVal = data.ticketId || data.uniqueid || '';
  sheet.appendRow([
    ticketIdVal,
    data.timestamp || new Date().toISOString(),
    data.btiStaff || data.checkerName || '',
    data.skuCode || data.skuNumber || '',
    data.qty || 1,
    data.foundAt || '',
    data.status || 'Pending'
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", ticketId: ticketIdVal }))
    .setMimeType(ContentService.MimeType.JSON);
}
