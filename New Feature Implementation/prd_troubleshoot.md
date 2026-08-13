# Product Requirements Document (PRD)
# IRMS — Troubleshoot Module

| Field | Detail |
|-------|--------|
| **Document Version** | 1.1 |
| **Date** | 2026-08-12 |
| **Author** | IRMS Development Team |
| **Status** | Draft — Pending Approval |
| **Product** | IRMS (Inventory Rack Management System) |
| **Module** | Troubleshoot |

---

## 1. Product Overview

### 1.1 Summary

The **Troubleshoot Module** is a new feature within the IRMS platform that introduces a ticket-based workflow for handling missing, wrong, or bad items during the warehouse checking and picking process. When a Checker or Picker identifies a problem with an item, they create a troubleshoot ticket. An Admin or Supervisor assigns the ticket to a Troubleshooter (Picker role). The Troubleshooter then picks up the ticket, physically searches for the item across multiple rack sources, and updates the system with the result.

### 1.2 Objective

- Eliminate manual / verbal communication between Checkers, Pickers, and Troubleshooters
- Provide full traceability of item search requests and outcomes
- Automate stock-on-hand (SOH) adjustments when items are found in staging (STG) racks
- Reduce item loss rates and improve warehouse fulfillment accuracy

### 1.3 Success Metrics

| Metric | Target |
|--------|--------|
| Ticket creation-to-resolution time | < 30 minutes (average) |
| Item found rate | > 80% of tickets resolved as "Found" or "Found Partial" |
| Manual stock corrections | Reduce by 50% (compared to pre-feature baseline) |
| User adoption | 100% of Checkers, Pickers, and Troubleshooters using the system within 2 weeks |

---

## 2. Problem Statement

### Current State

When a Checker or Picker discovers a missing, wrong, or bad item, they must verbally notify a Troubleshooter or write it on a physical paper log. There is no systematic tracking of:

- Which items are being searched for
- Who is searching
- Whether the item was found and where
- Whether stock records were updated after the item was relocated

This leads to **lost items, duplicate searches, untracked stock movements, and inaccurate SOH data**.

### Desired State

A fully digital, real-time ticketing system where:

1. Checkers and Pickers create structured request tickets with auto-populated SO data
2. Admins/Supervisors assign tickets to Troubleshooters
3. Troubleshooters pick and process tickets with guided rack scanning (origin → STG → SOHWH)
4. Stock records automatically update when items are found at non-origin SOH STG locations
5. Full audit trail of every troubleshoot action is maintained

---

## 3. User Personas

### 3.1 Checker (as Requester)

| Attribute | Detail |
|-----------|--------|
| **Role** | Warehouse Checker |
| **Goal** | Quickly report missing/wrong items so they can continue checking |
| **Pain Points** | Loses time walking to find a Troubleshooter; no feedback on whether item was found |
| **Key Need** | Fast ticket creation with auto-fill from SO data; optional photo |
| **Device** | Mobile (Android tablet/phone) |

### 3.2 Picker (as Requester)

| Attribute | Detail |
|-----------|--------|
| **Role** | Warehouse Picker |
| **Goal** | Report bad or wrong items encountered during picking |
| **Pain Points** | No formal channel to report picking issues |
| **Key Need** | Ticket creation with photo evidence (required) and a reason code |
| **Device** | Responsive, Desktop / Mobile |

### 3.3 Admin / Supervisor

| Attribute | Detail |
|-----------|--------|
| **Goal** | Review open tickets and assign them to available Troubleshooters |
| **Key Need** | Full ticket overview, assignment capability, status tracking |
| **Device** | Responsive, Desktop / Mobile |

### 3.4 Troubleshooter (Picker Role)

| Attribute | Detail |
|-----------|--------|
| **Goal** | Efficiently locate missing items using guided rack suggestions |
| **Pain Points** | Doesn't know which items to prioritize; no system guidance on where to look |
| **Key Need** | Clear task queue, rack scanning validation, SOH/SOHWH-based suggestions |
| **Device** | Mobile (Android phone with camera for scanning) |

---

## 4. User Stories

### 4.1 Checker Stories

| ID | Story | Priority |
|----|-------|----------|
| US-01 | As a Checker, I want to create a troubleshoot ticket by entering an SO Number, so the system auto-fills item details from SO_DATA | **P0** |
| US-02 | As a Checker, I want to see my submitted tickets and their current status, so I know if the item has been found | **P1** |
| US-03 | As a Checker, I want my Checker Line to auto-populate from my profile, so I don't have to type it every time | **P1** |
| US-04 | As a Checker, I want to optionally attach a photo to my ticket | **P2** |

### 4.2 Picker (Requester) Stories

| ID | Story | Priority |
|----|-------|----------|
| US-05 | As a Picker, I want to create a troubleshoot ticket for a bad or wrong item, so the issue is formally tracked | **P0** |
| US-06 | As a Picker, I want to attach a required photo as evidence when creating a ticket | **P0** |
| US-07 | As a Picker, I do NOT want to see or fill a "Checker Line" field, since it doesn't apply to my role | **P0** |

### 4.3 Admin / Supervisor Stories

| ID | Story | Priority |
|----|-------|----------|
| US-08 | As an Admin, I want to view all open (unassigned) tickets in one view | **P0** |
| US-09 | As an Admin, I want to assign a ticket to a specific Troubleshooter | **P0** |
| US-10 | As an Admin, I want to see the full ticket history with filters by status | **P1** |

### 4.4 Troubleshooter Stories

| ID | Story | Priority |
|----|-------|----------|
| US-11 | As a Troubleshooter, I want to see all tickets assigned to me, so I can pick the most urgent one | **P0** |
| US-12 | As a Troubleshooter, I want to pick up an assigned ticket, so the system marks it as in progress | **P0** |
| US-13 | As a Troubleshooter, I want to scan the origin rack barcode to validate I'm at the correct location | **P0** |
| US-14 | As a Troubleshooter, I want the system to suggest STG rack locations from SOH when the item isn't at the origin rack | **P0** |
| US-15 | As a Troubleshooter, I want the system to suggest SOHWH rack locations if the item isn't at any STG rack | **P0** |
| US-16 | As a Troubleshooter, I want to mark a ticket as "Found", "Found Partial", or "Not Found" | **P0** |
| US-17 | As a Troubleshooter, I want to upload photo evidence when completing a ticket | **P1** |
| US-18 | As a Troubleshooter, I want to enter the delivery location/time (via text or scanner) | **P1** |

### 4.5 System Stories

| ID | Story | Priority |
|----|-------|----------|
| US-19 | When an item is found at an SOH STG rack, the system must auto-deduct SOH stock and log a Stock_Activity entry | **P0** |
| US-20 | When an item is found at a SOHWH rack, the system must NOT trigger any SOH deduction | **P0** |
| US-21 | The system must prevent two Troubleshooters from picking the same ticket | **P1** |

---

## 5. Functional Requirements

### 5.1 Ticket Creation (Checker / Picker Flow)

| Req ID | Requirement | Details |
|--------|-------------|---------|
| FR-01 | Create Ticket Form | Modal form with: SO Number (manual entry or scanner), auto-populated fields (SKU, Product Name, Origin Rack, Qty, Picker Name), Reason (required), Photo (required for Picker, optional for Checker) |
| FR-02 | SO Number Lookup | On SO Number entry, system queries `db.soList` (SO_DATA) to auto-populate: `sku_number`, `product_name`, `origin_rack_name`, `request_quantity`, `picker_name` |
| FR-03 | Auto-populated Fields | `requestedBy` = current user name, `staffId` = current user staff ID, `requestTimestamp` = current ISO timestamp |
| FR-04 | Checker Line | Auto-filled from user profile for Checker role. **Hidden entirely when user role is Picker** |
| FR-05 | Ticket ID Generation | Auto-generate unique ID: `TS-RC-XXXXXX` for Checkers, `TS-PC-XXXXXX` for Pickers |
| FR-06 | Initial Status | Ticket created with `statusTicket = 'Open'` |
| FR-07 | Reason Selection | Required field with fixed options: `Bad Item` / `Wrong Picking` / `Missing Item` |
| FR-08 | Validation | SO Number is required and must match existing SO_DATA record. Photo is required for Picker role |

### 5.2 Ticket Assignment (Admin / Spv Flow)

| Req ID | Requirement | Details |
|--------|-------------|---------|
| FR-09 | Unassigned Ticket Queue | Display all tickets with `statusTicket = 'Open'`, sorted by `requestTimestamp` (oldest first) |
| FR-10 | Assign Action | Admin selects a Troubleshooter from a user list → updates: `statusTicket = 'Assigned'`, `assignedBy = currentAdmin.name`, `assignedTo = selectedTroubleshooter.name`, `updateAt = now()` |
| FR-11 | Assignment Visibility | Troubleshooter sees their assigned tickets in the `TS Task` menu |

### 5.3 Ticket Pickup (Troubleshooter Flow)

| Req ID | Requirement | Details |
|--------|-------------|---------|
| FR-12 | Assigned Ticket Queue | Display all tickets with `statusTicket = 'Assigned'` where `assignedTo === currentUser.name` |
| FR-13 | Pick Up Action | Troubleshooter clicks "Pick Up" → updates: `statusTicket = 'Picked Up'`, `pickedBy = currentUser.staffId`, `updateAt = now()` |
| FR-14 | Conflict Prevention | If ticket status is no longer `Assigned` at time of pickup (race condition), show error message and refresh list |

### 5.4 Ticket Resolution (Troubleshooter Flow)

| Req ID | Requirement | Details |
|--------|-------------|---------|
| FR-15 | Step 1: Origin Rack Validation | System displays: "Go to rack: `{origin_rack_name}`". Troubleshooter scans rack barcode. System validates: scanned barcode === `origin_rack_name` (case-insensitive) |
| FR-16 | Step 1a: Found at Origin | If item found at origin rack → Troubleshooter enters `foundQty`. System updates: `statusTicket = 'Found'` or `'Found Partial'`, `foundAt = origin_rack_name`, `foundQty`, `updateAt = now()` |
| FR-17 | Step 2: SOH STG Suggestions | If item NOT found at origin rack → System queries SOH data (`db.soh`) for rows where `Sku Number` matches AND `Rack Location` contains `"STG"`. Display matching STG rack locations with available qty as suggestions |
| FR-18 | Step 2a: STG Rack Scanning | Troubleshooter navigates to suggested STG rack. Scans rack barcode to validate. System verifies scanned rack matches one of the suggested STG locations |
| FR-19 | Step 2b: Found at STG | If item found at STG rack → Enter `foundQty`. System updates: `statusTicket = 'Found'` or `'Found Partial'`, `foundAt = STG rack name`, `foundQty`, `updateAt = now()`. **Triggers SOH deduction** (see FR-22) |
| FR-20 | Step 3: SOHWH Suggestions | If item NOT found at any STG rack → System queries `db.sohwh` for rows where SKU matches. Display matching SOHWH rack locations as suggestions |
| FR-21 | Step 3a: Found at SOHWH | If item found at SOHWH rack → Enter `foundQty`. System updates: `statusTicket = 'Found'` or `'Found Partial'`, `foundAt = SOHWH rack name`. **No SOH deduction triggered** |
| FR-22 | Step 4: Not Found | If item not found at any location (origin, STG, SOHWH) → `statusTicket = 'Not Found'`, `updateAt = now()` |
| FR-23 | SOH Auto-Deduction | When item is found at an SOH STG rack location: (1) Deduct `foundQty` from `SOH.Qty SOH` for matching SKU + Rack Location row, (2) Append `Stock_Activity` record with operator `[-]`, ticket ID, SKU, qty, from/to locations, timestamp |
| FR-24 | Troubleshoot Evidence | Image upload field (required). Stored as URL reference in the sheet |
| FR-25 | Delivered At | Freetext field that also accepts scanner/barcode input. Records when/where item was physically delivered |

### 5.5 Ticket Listing & Filtering

| Req ID | Requirement | Details |
|--------|-------------|---------|
| FR-26 | Search | Search across: ticket ID, SO Number, SKU Number, Product Name, Rack names, Staff names |
| FR-27 | Status Filter | Filter by: All, Open, Assigned, Picked Up, Found, Found Partial, Not Found |
| FR-28 | Sub-tabs (TS Request) | "My Requests" (all tickets submitted by current user) |
| FR-29 | Sub-tabs (Troubleshoot) | "All Tickets", "Unassigned" (Open), "Assigned" |
| FR-30 | Sub-tabs (TS Task) | "My Tasks" (Assigned to me), "In Progress" (Picked Up by me), "Completed" (resolved by me) |
| FR-31 | Real-time Sync | Ticket list refreshes on tab focus and after any write operation |

---

## 6. Data Model

### 6.1 Trouble_Shoot Table Schema

| # | Column Name | Field Key | Data Type | Source | Required | Default |
|---|------------|-----------|-----------|--------|----------|---------|
| 1 | id | `id` | String | Auto-generated | Yes | `TS-RC-XXXXXX` / `TS-PC-XXXXXX` |
| 2 | Request Timestamp | `requestTimestamp` | ISO DateTime | System | Yes | `now()` |
| 3 | Requested By | `requestedBy` | String | Current user | Yes | — |
| 4 | Staff ID | `staffId` | String | Current user | Yes | — |
| 5 | Checker Line | `checkerLine` | String | Current user profile | Checker only | — |
| 6 | Photo | `photo` | String (URL) | User upload | Required for Picker, optional for Checker | — |
| 7 | Reason | `reason` | Enum | User input | Yes | — |
| 8 | Picker Name | `pickerName` | String | SO_DATA lookup | Yes | — |
| 9 | SO Number | `soNumber` | String | User input | Yes | — |
| 10 | SKU Number | `skuNumber` | String | SO_DATA lookup | Yes | — |
| 11 | Product Name | `productName` | String | SO_DATA lookup | Yes | — |
| 12 | Origin Rack Name | `originRackName` | String | SO_DATA lookup | Yes | — |
| 13 | Request Quantity | `requestQuantity` | Integer | SO_DATA lookup | Yes | 1 |
| 14 | Assigned By | `assignedBy` | String | Admin/Spv | No | — |
| 15 | Assigned To | `assignedTo` | String | Admin/Spv (user list) | No | — |
| 16 | Status Ticket | `statusTicket` | Enum | System | Yes | `Open` |
| 17 | Troubleshoot Evidence | `troubleshootEvidence` | String (URL) | Troubleshooter upload | No | — |
| 18 | Found Qty | `foundQty` | Integer | Troubleshooter input | No | — |
| 19 | Found At | `foundAt` | String | Troubleshooter input | No | — |
| 20 | Delivered At | `deliveredAt` | String | Troubleshooter input (freetext/scanner) | No | — |
| 21 | Picked By | `pickedBy` | String | System (staff ID) | No | — |
| 22 | Update At | `updateAt` | ISO DateTime | System | No | — |

**Reason Enum Values:** `Bad Item` | `Wrong Picking` | `Missing Item`

### 6.2 Related Tables (Read-only References)

| Table | Usage |
|-------|-------|
| **SO_DATA** | Source for SO Number, SKU, Product Name, Origin Rack, Qty, Picker Name |
| **SOH** | Rack Location lookup for STG suggestions; Qty SOH for deduction |
| **SOHWH** | Rack location fallback if item not found at origin or STG racks |
| **Stock_Activity** | Write target for SOH deduction activity logs |

### 6.3 Status State Machine

```
         ┌────────────────────────────────────┐
         │                                    │
   ┌─────▼─────┐   Admin Assigns   ┌──────────┴──────────┐
   │   Open    ├──────────────────►│      Assigned        │
   └───────────┘                   └──────────┬──────────┘
                                              │ Troubleshooter Picks Up
                                   ┌──────────▼──────────┐
                                   │     Picked Up        │
                                   └──────────┬──────────┘
                                              │
                             ┌────────────────┼────────────────┐
                             │                │                │
                       ┌─────▼─────┐  ┌──────▼──────┐  ┌─────▼─────┐
                       │   Found   │  │Found Partial│  │ Not Found │
                       └───────────┘  └─────────────┘  └───────────┘
```

**State transitions:**
- `Open` → `Assigned` (Admin assigns a troubleshooter)
- `Assigned` → `Picked Up` (Troubleshooter picks up the ticket)
- `Picked Up` → `Found` (item fully located)
- `Picked Up` → `Found Partial` (item partially located)
- `Picked Up` → `Not Found` (item not located at any rack)
- No reverse transitions (terminal states: Found, Found Partial, Not Found)

---

## 7. Business Rules

| Rule ID | Rule | Impact |
|---------|------|--------|
| BR-01 | Only tickets with status `Open` can be assigned by Admin | Prevents double assignment |
| BR-02 | Only tickets with status `Assigned` can be picked up by a Troubleshooter | Enforces the Admin assignment step |
| BR-03 | Only the Troubleshooter who picked the ticket (`pickedBy`) can resolve it | Ownership enforcement |
| BR-04 | SOH deduction is ONLY triggered when `foundAt` contains "STG" (matching an SOH.Rack Location) | Prevents incorrect deductions from origin or SOHWH racks |
| BR-05 | If `foundAt` is from `SOHWH.rack_name`, no SOH deduction occurs | SOHWH is a separate stock pool |
| BR-06 | SOH deduction quantity = `foundQty`, not `requestQuantity` | Accurate stock adjustment |
| BR-07 | `Found Qty` cannot exceed `Request Quantity` | Data integrity |
| BR-08 | Stock_Activity records use operator `[-]` for deduction from STG source | Consistent with existing stock movement patterns |
| BR-09 | Ticket ID format is `TS-RC-XXXXXX` for Checker-created tickets and `TS-PC-XXXXXX` for Picker-created tickets | Traceability by requester role |
| BR-10 | `Checker Line` field is hidden for Picker role (both in form and in ticket view) | Role-appropriate UI |
| BR-11 | Photo is required for Picker-created tickets; optional for Checker-created tickets | Evidence requirement per role |
| BR-12 | Rack scan validation must match exactly (case-insensitive) | Prevents wrong-rack errors |
| BR-13 | Ticket ID must be unique across all records | Data integrity |

---

## 8. UI/UX Requirements

### 8.1 Design Principles

- Follow existing IRMS design system (card panels, Material Icons, glassmorphism elements)
- Mobile-first responsive layout (primary users are on mobile devices)
- Scanner integration via existing `openCameraScanner()` utility
- Status badges with color coding:
  - **Open**: Blue (`var(--primary-500)`)
  - **Assigned**: Purple
  - **Picked Up**: Amber/Orange (`var(--warning)`)
  - **Found**: Green (`var(--success)`)
  - **Found Partial**: Teal/Cyan
  - **Not Found**: Red (`var(--danger-500)`)

### 8.2 Menu Structure

| Menu Name | Route Key | Visible To |
|-----------|-----------|------------|
| TS Request | `tsRequest` | Checker, Picker |
| Troubleshoot | `troubleShoot` | Admin, Supervisor |
| TS Task | `tsTask` | Picker (as Troubleshooter) |

### 8.3 Screen Descriptions

#### Screen 1: TS Request — Create Ticket Modal (Checker)

```
┌─────────────────────────────────────┐
│ ✕  Create Troubleshoot Ticket       │
├─────────────────────────────────────┤
│ SO Number *                         │
│ ┌───────────────────────┐ [📷Scan] │
│ │ SO-20260812-001       │           │
│ └───────────────────────┘           │
│                                     │
│ ── Auto-populated from SO_DATA ──   │
│ SKU:      ABC123                    │
│ Product:  Widget Pro                │
│ Rack:     A-01-03                   │
│ Qty:      5                         │
│ Picker:   Jane Doe                  │
│                                     │
│ Checker Line: Line-03 (auto)        │
│                                     │
│ Reason *  [Bad Item ▼]             │
│ Photo     [📷 Optional]            │
│                                     │
│         [Submit Ticket]             │
└─────────────────────────────────────┘
```

#### Screen 2: TS Request — Create Ticket Modal (Picker — differences only)

```
(Checker Line field is HIDDEN)
Photo field is REQUIRED:  [📷 Required *]
Ticket ID will be: TS-PC-XXXXXX
```

#### Screen 3: Troubleshoot (Admin) — Ticket List

```
┌─────────────────────────────────────┐
│ 🔧 Troubleshoot                     │
├─────────────────────────────────────┤
│ [All Tickets] [Unassigned] [Assigned│
├─────────────────────────────────────┤
│ 🔍 Search...     [Status ▼]        │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ TS-RC-482910        🔵 Open    │ │
│ │ SO: SO-20260812-001             │ │
│ │ SKU: ABC123 — Widget Pro        │ │
│ │ Rack: A-01-03    Qty: 5        │ │
│ │ By: John (Checker)  2m ago     │ │
│ │              [Assign 👤]       │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ TS-PC-371045     🟣 Assigned   │ │
│ │ Assigned To: Bob (Troubleshooter│ │
│ │ ...                             │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Screen 4: TS Task (Troubleshooter) — Resolve Ticket Flow

```
┌─────────────────────────────────────┐
│ ← Back   Ticket TS-RC-482910        │
├─────────────────────────────────────┤
│ 📍 Step 1: Go to Origin Rack        │
│                                     │
│    ┌───────────────────────┐        │
│    │   Rack: A-01-03       │        │
│    │   📷 Scan to Validate │        │
│    └───────────────────────┘        │
│    ✅ Rack validated!               │
│                                     │
│ Was the item found here?            │
│ [✅ Found] [🔶 Partial] [❌ Not Here│
├─────────────────────────────────────┤
│ 📍 Step 2: Check STG Racks (SOH)   │
│                                     │
│ Suggested locations:                │
│  • STG-B-02-01  (Qty: 12)          │
│  • STG-C-04-02  (Qty: 3)           │
│    📷 Scan STG Rack                 │
│ [✅ Found] [🔶 Partial] [❌ Not Here│
├─────────────────────────────────────┤
│ 📍 Step 3: Check SOHWH             │
│                                     │
│ Suggested locations:                │
│  • WH-A-01  •  WH-B-03            │
│    📷 Scan SOHWH Rack               │
│ [✅ Found] [🔶 Partial] [❌ Not Found│
├─────────────────────────────────────┤
│ Found Qty: [___]                    │
│ Evidence:  [📷 Upload Photo]        │
│ Delivered At: [___________] [📷]   │
│                                     │
│         [Complete Ticket]           │
└─────────────────────────────────────┘
```

### 8.4 KPI Summary Cards (Top of Troubleshoot Page — Admin)

| Card | Value | Color |
|------|-------|-------|
| Open (Unassigned) | Count of `Open` | Blue |
| Assigned | Count of `Assigned` | Purple |
| In Progress | Count of `Picked Up` | Orange |
| Found Today | Count of `Found` + `Found Partial` (today) | Green |
| Not Found Today | Count of `Not Found` (today) | Red |

---

## 9. Non-Functional Requirements

| NFR ID | Category | Requirement |
|--------|----------|-------------|
| NFR-01 | Performance | Ticket list must load within 2 seconds |
| NFR-02 | Performance | Ticket creation must complete within 3 seconds (including GAS round-trip) |
| NFR-03 | Offline | Ticket list should work from IndexedDB cache when offline |
| NFR-04 | Offline | Write operations (create/update/assign) require network; show clear error if offline |
| NFR-05 | Scanner | Camera scanner must initialize within 2 seconds |
| NFR-06 | Scanner | Barcode recognition must work in standard warehouse lighting |
| NFR-07 | Compatibility | Must work on Android Chrome (primary) and Desktop Chrome |
| NFR-08 | Data Sync | Auto-refresh data on tab/section navigation (using existing TTL mechanism) |

---

## 10. Dependencies

| Dependency | Type | Description |
|------------|------|-------------|
| SO_DATA sheet | Data | Must contain `origin_rack_name` column — **confirm with data team** |
| SOH sheet | Data | Must be up-to-date with current rack locations and stock quantities |
| SOHWH sheet | Data | Must be synced in `db.js` — confirm tab name and `rack_name` field key |
| Stock_Activity sheet | Data | Must exist with standard headers for activity logging |
| Google Apps Script | Backend | New handlers must be deployed via GAS web app |
| `html5-qrcode` library | Frontend | Already installed — used for camera scanning |
| User_DB access control | Config | `tsRequest`, `troubleShoot`, and `tsTask` access keys must be added for relevant users |
| Photo upload mechanism | Backend | GAS `DriveApp` or equivalent — confirm upload approach |

---

## 11. Rollout Plan

### Phase 1: Core Implementation (Week 1)
- [ ] Create `Trouble_Shoot` Google Sheet tab with all 22 column headers
- [ ] Implement GAS backend handlers (create, assign, pick, complete)
- [ ] Implement frontend data layer (parser, sync incl. sohwh, write methods)
- [ ] Build ticket list UI with search and filters

### Phase 2: Ticket Workflows (Week 2)
- [ ] Build TS Request: Create Ticket modal with SO_DATA auto-populate and role-aware fields
- [ ] Build Troubleshoot (Admin): Ticket overview and assignment modal
- [ ] Build TS Task: Ticket pickup flow
- [ ] Build TS Task: Resolve flow — Step 1 (origin rack scanning)

### Phase 3: Advanced Resolution & SOH Integration (Week 3)
- [ ] Build TS Task: Resolve flow — Step 2 (SOH STG suggestions + scanning)
- [ ] Build TS Task: Resolve flow — Step 3 (SOHWH suggestions + scanning)
- [ ] Implement SOH auto-deduction on STG rack found
- [ ] Implement Stock_Activity logging
- [ ] Photo upload integration (evidence + request photo)
- [ ] Add KPI summary cards
- [ ] Dashboard badge integration

### Phase 4: Release & Monitor (Week 4)
- [ ] Deploy GAS web app update
- [ ] Update User_DB access for Checkers, Pickers, Admin/Spv, Troubleshooters
- [ ] User training
- [ ] Monitor ticket resolution metrics

---

## 12. Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **SOH** | Stock On Hand — inventory quantity at a specific rack location |
| **SOHWH** | Stock on Hand in Warehouse — a separate warehouse stock pool |
| **SO_DATA** | Sales Order Data — order details including items, quantities, and assigned racks |
| **STG Rack** | Staging Rack — temporary storage locations (identifiable by "STG" in rack name) |
| **Origin Rack** | The rack location originally assigned to an item in SO_DATA |
| **GAS** | Google Apps Script — serverless backend running on Google Sheets |
| **TS-RC** | Ticket prefix for Checker-created troubleshoot requests |
| **TS-PC** | Ticket prefix for Picker-created troubleshoot requests |

### B. Related Documents

| Document | Description |
|----------|-------------|
| Implementation Plan | Technical implementation strategy with code-level details |
| New Feature.md | Original feature specification |

### C. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-12 | Initial draft |
| 1.1 | 2026-08-12 | Updated per New Feature.md revision: added Picker as requester, Photo, Reason, Assigned By/To, Found Partial status, TS-RC/TS-PC ID format, Admin assignment step, SOHWH fallback, 3-menu UI structure |
