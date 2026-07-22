# Putaway
This section will be used to move picking task to storage location and update the inventory levels.

a single picking ID can have multiple putway ID with diffrent location and qty, this can happen when picking task is split into multiple putway task


usecase:

first check the qty on Picking_task, check weather theres any putway record on table Putaway, match the qty by sum(Picking_task[Picking ID].[qty]) - sum(putaway[Picking ID].[qty put]) if the result is 0 then mark the picking task is complete and putaway button is not visible anymore, while if the result is not 0 then the putway button is still visible

on picking user click putway button, then a modal popup prompt qty to put away and location to put away, and a button to confirm putway

user fill qty to put away and location to put away, then click confirm putway button

system will generate a new putway ID and add it to the putway table, after that update the picking task status to completed and also the related data to Ticket ID


## Column Details

|Column Name | Behaviour|
|------------|----------|
|Timestamp |System generated|
|Putway ID |System generated PT + 6 digit uniqueid|
|Picking ID |lookup from picking task|
|Ticket ID|lookup from picking task|
|Sku Code |lookup from picking task|
|Product Name |lookup from picking task|
|Qty Put |user input|
|Location |user input , should contains 20 char eg :CBT-MZF3-35-03-L1-04|
|Staff Name |Lookup from user login credential|


## Post-Save System Behavior

After a user clicks **Confirm Putaway** and the record is successfully saved, the system executes the following steps:

1. **Record Generation**:
   - Generates a new `Putway ID` prefixed with `PT-` followed by a 6-digit unique random ID.
   - Saves the transaction to the `Putaway` sheet with the operator's staff credential and a formatted human-readable timestamp (`yyyy-MM-dd HH:mm:ss`).

2. **Picking Task Status Evaluation**:
   - Calculates the sum of all `Qty Put` for this `Picking ID` in the `Putaway` sheet.
   - Compares it to the total `Qty` required in the corresponding `Picking_Task` row:
     - If the sum of `Qty Put` matches or exceeds the picking task quantity:
       - The status of the `Picking_Task` is updated to **Completed**.
       - The status of the original parent ticket (in `Request_Checker` or `Lost_And_Found`) matching the `Ticket ID` is updated to **Completed**.

3. **Stock Activity Logging**:
   - Automatically appends a new stock trailing activity log to the `Stock_Activity` sheet:
     - **Activity ID**: System generated `SA-` + 6-digit unique ID.
     - **Ticket ID**: Putaway `Ticket ID`.
     - **Sku Code**: Putaway `Sku Code`.
     - **Product Name**: Putaway `Product Name`.
     - **Qty**: Putaway `Qty Put`.
     - **Operator**: `[+]` (to indicate stock addition).
     - **From Location**:
       - If the `Ticket ID` starts with `RC-` (Request Checker), looks up the `Checker Line` from the matching `Request_Checker` row.
       - If the `Ticket ID` starts with `LF-` (Lost & Found), looks up the `Found At` location from the matching `Lost_And_Found` row.
     - **To Location**: Putaway `Location` (the 20-character target location).
     - **Timestamp**: Human-readable Google Sheet datetime format.


## Update Inventory Reference

This step updates the Stock On Hand (SOH) data after a successful putaway operation.

### Lookup and Pre-fill Values:
Before the user confirms the putaway, the system performs lookups to populate the SOH fields (Rows 2-8) based on the entered `Sku Code`.

| Column | Source | Behavior |
|--------|--------|----------|
| **Product ID** | `SKUs_DB[product_id]` | Lookup using entered `Sku Code` |
| **Product Name** | `SKUs_DB[product_name]` | Lookup using entered `Sku Code` |
| **Sku Number** | `SKUs_DB[sku_number]` | Lookup using entered `Sku Code` |
| **L0 Category Name** | `SKUs_DB[l0_category_name]` | Lookup using entered `Sku Code` |
| **L1 Category Name** | `SKUs_DB[l1_category_name]` | Lookup using entered `Sku Code` |
| **L2 Category Name** | `SKUs_DB[l2_category_name]` | Lookup using entered `Sku Code` |
| **Food or Non Food** | `SKUs_DB[food_or_non_food]` | Lookup using entered `Sku Code` |

### Post-Putaway Calculation:
After the user confirms the putaway, the system calculates and updates the final SOH values:

| Column | Formula | Behaviour |
|--------|---------|----------|
| **Updated At** | `current timestamp` | Format as Google Sheets datetime `yyyy-MM-dd HH:mm:ss` |
| **Rack Location** | `Putaway[Location]` | check if the current sku has matching stock location as `Putaway[Location]` data entry, if yes then update the qty and update the timestamp for that sku and location, if no then add new row for that sku and location |
| **Qty SOH** | `SUM(Qty SOH + Qty Put)` | Running total of physical stock |
| **Qty On SO** | unchanged | Value from SKUs_DB (not affected by putaway) |
| **Count SO** | unchanged | Value from SKUs_DB (not affected by putaway) |
| **Qty On LDP** | unchanged | Value from SKUs_DB (not affected by putaway) |
| **Stock Age** | unchanged | Value from SKUs_DB (not affected by putaway) |


### Validation Rules:

- **Rack Location**: Must contain exactly 20 characters in the format `LLL-LLLL-LL-LL-LL-LL` (e.g., `CBT-MZF3-35-03-L1-04`).
- **Qty Put**: Must be a positive integer.
- **Qty SOH**: The running total (including the putaway quantity) cannot be less than 1.

### No Partial Updates:

- The values in the **Qty On SO**, **Count SO**, **Qty On LDP**, and **Stock Age** columns are **read-only** for this process.
- These values are **not affected** by putaway operations and remain unchanged.
- They serve as static reference data used for inventory calculations and reporting only.
- Any modifications to these columns must be performed through their respective source processes (e.g., sales order processing for **Qty On SO**).
