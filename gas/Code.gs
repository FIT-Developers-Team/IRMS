/**
 * Google Apps Script for IRMS Web App Integration
 * Spreadsheet: https://docs.google.com/spreadsheets/d/1WPpJSZ3yGR2fyG72j5u2wO2WrvWaMztO-56h0gDWgsM/edit
 * Target Tab: Request_Checker
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Request_Checker");
    
    // Automatically create tab and header if missing
    if (!sheet) {
      sheet = ss.insertSheet("Request_Checker");
      sheet.appendRow([
        "uniqueid", 
        "timestamp", 
        "picker_name", 
        "checker_name", 
        "so_number", 
        "sku_number", 
        "product_name", 
        "qty", 
        "status"
      ]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#eef6ff");
    }

    var data = JSON.parse(e.postData.contents);
    
    // Append submission row
    sheet.appendRow([
      data.uniqueid || '',
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
      .createTextOutput(JSON.stringify({ result: "success", uniqueid: data.uniqueid }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
