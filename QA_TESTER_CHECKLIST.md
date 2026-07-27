# IRMS (Inventory & Rack Management System) — Quality Assurance Test Plan & Checklist

**Document Control Information**
- **System**: Inventory & Rack Management System (IRMS)
- **Version**: 1.0.0
- **Target Audience**: Quality Assurance Engineers, Software Testers, Release Managers
- **Repository**: [FIT-Developers-Team/IRMS](https://github.com/FIT-Developers-Team/IRMS)
- **Date**: July 27, 2026

---

## 1. Executive Summary & Test Strategy

This document provides a systematic Quality Assurance (QA) verification checklist for the Inventory & Rack Management System (IRMS). QA testers must execute the test scenarios defined herein across both Desktop and Mobile viewports. 

Testing covers the following core dimensions:
1. **Security & Role-Based Access Control (RBAC)**
2. **Master Data Administration & Privacy Protections**
3. **Operational Workflows & Inventory Tracking**
4. **Data Input Validation & Character Boundary Rules**
5. **Responsive Layouts & Mobile Bottom Sheet Drawer Navigation**
6. **Backend Synchronization with Google Sheets**

---

## 2. Authentication & Security Access Control

### 2.1 Role-Based Access Control (RBAC) Verification
- [ ] **Super Role Authentication**:
  - Authenticate using a account assigned `Super` role credentials (e.g., Staff ID `1001`).
  - **Expected Result**: System header displays `★ All Access Unlocked`. Full access is granted to all modules (`Request Pickup`, `Picking Task`, `Lost & Found`, `Stock On Hand`, `Stock Movement & Deduction`, `Admin Panel`).
- [ ] **Restricted Role Authentication**:
  - Authenticate using accounts assigned non-Super roles (`Supervisor`, `Manager`, `Staff`).
  - **Expected Result**: Navigation bar displays only the specific modules designated in the user's `Acess` profile in `User_DB`.
- [ ] **PIN Credential Validation**:
  - Verify system rejects invalid 4-digit PIN entries and non-existent Staff IDs.

### 2.2 Route Guard Security Enforcement
- [ ] **Direct Unauthorized Navigation Attempt**:
  - Attempt to navigate to an unauthorized page key programmatically or via direct browser interaction.
  - **Expected Result**: The route guard intercepts the attempt, displays an `Access Denied` toast notification, cancels rendering, and redirects to `Home`.

---

## 3. Admin Panel & Master Data Management (`/admin`)

### 3.1 User Administration (`Users` Sub-Tab)
- [ ] **User Directory Table Structure**:
  - Verify table columns: `Staff ID`, `Name`, `Role`, `Access`, `Password`, `Actions`.
- [ ] **Sensitive Password Data Protection**:
  - Verify user passwords/PINs are concealed by default using bullet masks (`••••`).
- [ ] **Password Visibility Toggle**:
  - Click the eye toggle icon button (`visibility`) on a user row.
  - **Expected Result**: The raw 4-digit PIN is displayed. Clicking the button again re-masks the value as `••••` and updates the icon to `visibility_off`.
- [ ] **User Registration (`Register New User` Modal)**:
  - Open registration modal. Fill in `Staff ID` and `Full Name`.
  - Select `Role` (`Super`, `Supervisor`, `Staff`, `Manager`). Verify `Checker` role is excluded from the dropdown options.
  - Verify **Password (4-digit PIN)** input field uses `type="password"` with an embedded eye toggle button.
  - Click **Generate PIN**: Verify a randomized 4-digit numeric PIN is generated.
  - Select module access permissions (`requestPickup`, `pickingTask`, `lostAndFound`, `soh`, `stockMovement`, `admin`).
  - Submit form: Verify new record appears in the directory table and syncs to Google Sheets `User_DB` tab.
- [ ] **User Modification & Deletion**:
  - Edit existing user profile/permissions: Verify updates persist upon saving.
  - Delete user record: Confirm deletion confirmation prompt and verify removal.

### 3.2 Warehouse Zones (`Zones` Sub-Tab)
- [ ] **Zone Card Grid Layout**:
  - Verify configured zones display in a responsive card grid (`.admin-zone-grid`) containing Zone Icon, Zone Name, and System ID.
- [ ] **Zone Filter Search**:
  - Input search queries in the search control: Verify card grid filters in real-time.
- [ ] **Zone CRUD Operations**:
  - Add Zone (e.g., `ZONE-B2`): Verify card is created and syncs to Google Sheets `Zone` tab.
  - Edit Zone Name: Verify updated zone label updates across the application.
  - Delete Zone: Confirm deletion modal prompt and removal.

### 3.3 Storage Location Racks (`Racks` Sub-Tab)
- [ ] **Rack Storage Location Grid & Table**:
  - Verify rack items display `Location Name`, `Zone`, `Facility`, `Aisle`, `Bay`, `Level`, `Capacity`, `Actions`.
- [ ] **Search & Filter Racks**:
  - Search by Rack Location Name (e.g., `CBT-MZF3-35-03-L1-04`), Zone, or Facility.
- [ ] **Rack Location CRUD Operations**:
  - Click **Add New Rack**: Verify `Zone` field is a standard text input field (decoupled from the Zone master table).
  - Complete fields: `Location Name` (required), `Zone`, `Facility`, `Aisle`, `Bay`, `Level`, `Capacity`, `Priority`.
  - Submit: Verify rack entry is created and syncs to Google Sheets `Racks` tab.

### 3.4 Receiving Lines (`Checker Lines` Sub-Tab)
- [ ] **Checker Line Card Grid**:
  - Verify receiving checker lines display in a card grid layout matching the Zone view format.
- [ ] **Checker Line Search & Filter**:
  - Search lines by Name or ID in real-time.
- [ ] **Checker Line CRUD Operations**:
  - Add Checker Line (e.g., `Receiving Line 03`): Verify entry is created and syncs to Google Sheets `Checker_Lines` tab.

### 3.5 Admin Header Synchronization
- [ ] **Manual Multi-Tab Sync**:
  - Click the header **Sync** button while active on the Admin Panel.
  - **Expected Result**: Sync icon animates, status indicator displays `Syncing...`, fetches updated CSV data for `User_DB`, `Zone`, `Racks`, and `Checker_Lines`, and transitions to `All synced`.

---

## 4. Request Pickup (`/requestPickup`)

- [ ] **Dynamic Checker Line Selection**:
  - Verify `Checker Line` dropdown option list populates dynamically from the `# Checker_Lines` dataset.
- [ ] **Automated SKU Details Lookup**:
  - Input valid SKU Code: Verify `Product Name`, `Category`, and `Food/Non-Food` populate automatically from `SKUs_DB`.
- [ ] **Request Submission**:
  - Submit request: Verify entry is recorded in Google Sheets `Request_Checker` tab and active request badge counter updates.

---

## 5. Picking Task (`/pickingTask`)

- [ ] **Private Data Filtering**:
  - Authenticate as a non-Super user: Verify task list displays strictly picking tasks assigned to or created by the logged-in user.
  - Authenticate as a Super user: Verify all system-wide picking tasks are visible.
- [ ] **Private Notification Counter**:
  - Verify red notification badge count on the `Picking Task` navigation icon reflects the user's private active task count.
- [ ] **Storage Location Autocomplete (`# Racks`)**:
  - Open Putaway action modal: Focus on `Storage Location` input.
  - **Expected Result**: Native autocomplete dropdown suggestions display matching rack locations from the `# Racks` master dataset.
- [ ] **Storage Location Boundary Validation (10–30 Characters)**:
  - Enter location shorter than 10 characters (e.g., `RACK-1`): Verify form validation blocks submission.
  - Enter location longer than 30 characters: Verify input length restriction prevents excess characters.
  - Enter valid location between 10 and 30 characters: Verify input passes validation.
- [ ] **Task Completion Verification Safety Check**:
  - Execute task completion: Verify mandatory verification modal requires physical SKU Code and Location inputs before marking task status as `Done`.

---

## 6. Lost & Found (`/lostAndFound`)

- [ ] **Found Item Registration**:
  - Select Found At location and SKU Code. Verify Ticket ID is generated with prefix `L`.
- [ ] **LDP Recovery & Warehouse Adjustment**:
  - Process LDP Recovery or Warehouse Adjustment In: Verify SOH inventory levels update and trailing records are logged in Stock Activity.

---

## 7. Stock On Hand (SOH) (`/soh`)

- [ ] **Inventory Table & Stock Metrics**:
  - Verify columns: `Qty SOH`, `Qty On SO`, `Qty On LDP`, `Stock Age`, and `Action Suggestions`.
- [ ] **Putaway Location Rules**:
  - Storage Location input presents `# Racks` datalist autocomplete dropdown and enforces 10–30 character boundary validation.
- [ ] **Hide / Show KPI Cards Header Toggle**:
  - Click `Hide KPIs` pill button in header: Verify KPI summary grid collapses (`display: none`).
  - Click `Show KPIs`: Verify KPI grid expands.
  - Refresh browser: Verify toggle state persists across sessions via `localStorage` (`irms_hide_kpis`).

---

## 8. Stock Movement & Deduction (`/stockMovement`)

- [ ] **Unified Task Management View**:
  - Verify consolidated module handling Rack Transfer Tasks and Stock Deduction operations.
- [ ] **Status Filter Navigation**:
  - Toggle status filters (`All Statuses`, `Pending`, `Done`, `Cancelled`): Verify task table updates instantly.
- [ ] **Private User Filtering & Private KPI Calculation**:
  - Authenticate as non-Super user: Verify tasks, activity logs, and KPI summary card metrics (`Total Tasks`, `Pending`, `Completed`, `Transfers`, `Deductions`) calculate exclusively for the active user.
- [ ] **Task Creation & Modification Modals**:
  - Verify `Storage Location` inputs present `# Racks` autocomplete datalist suggestions and enforce 10–30 character length validation.
- [ ] **Physical Verification Safety Modal**:
  - Click **Complete Task**: Verification modal prompts staff to confirm physical SKU Code and Target Location prior to setting status to `Done`.
- [ ] **Stock Activity Log Sub-Tab**:
  - Navigate to `Activity Log` sub-tab: Verify trailing movement log entries render correctly.

---

## 9. Mobile Responsiveness & Navigation Architecture

- [ ] **Dynamic 4-Tab Bottom Navigation Threshold**:
  - **User Profile with <= 4 Permitted Views**: All 4 tabs display directly on the mobile bottom navigation bar. `More` button is hidden.
  - **User Profile with > 4 Permitted Views**: Primary 4 views populate the bottom bar; 5th slot renders the `More` button.
- [ ] **"More" Bottom Sheet Navigation Drawer (`z-index: 5000`)**:
  - Tap `More` button on mobile: Bottom-sheet drawer slides up displaying extended permitted modules (`Lost & Found`, `Stock Movement & Deduction`, `Admin Panel`).
- [ ] **Top Mobile Header Bar & Sync Control**:
  - Verify top header bar displays application title, user badge, and embedded **Refresh & Sync Status** button.
- [ ] **Viewport Breakpoint Compliance**:
  - Test layouts across mobile viewports (375px, 414px, 768px): Verify tables convert to mobile card views without horizontal overflow or clipping.

---

## 10. Automated Compilation Verification

Execute the build compilation script in the terminal environment prior to release sign-off:

```bash
npm run build
```

- **Expected Output**: Clean build compilation with `0 errors`.

---

## 11. Quality Assurance Sign-Off Record

| Role | Signee Name | Status | Date |
|------|-------------|--------|------|
| **Lead QA Engineer** | ________________________ | [ ] Pending / [ ] Approved | ____ / ____ / 2026 |
| **Product Manager** | ________________________ | [ ] Pending / [ ] Approved | ____ / ____ / 2026 |
| **Engineering Lead** | ________________________ | [ ] Pending / [ ] Approved | ____ / ____ / 2026 |
