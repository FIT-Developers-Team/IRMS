# Project documentation details

i need you to make a documentation about this project explaining every technical specs, workflow, and architecture ,and backend behaviour, observe and learn this project carefully, call history chat if needed to get better understanding and context

## Documentation Spec

i the document is well documented, use | as table separator, use markdown for formatting, use code block for code, use chart for workflow and data journey (use flowchart for process and entity relationship diagram for database relationship), use mermaid diagram for graph, chart, and diagram


# User Manual [COMPLETED]
- **Documentation File**: [User_Manual.html](file:///c:/AI%20Project/IRMS/Project_documentation/User_Manual.html)
Comprehensive operational user manual explaining how to use all application features step-by-step: login, pickup requests, picking task claiming, putaway into racks, stock transfers, deductions, lost and found, SOH monitoring, admin master data, and data syncing.

# Workflow [COMPLETED]
- **Documentation File**: [Workflow.md](file:///c:/AI%20Project/IRMS/Project_documentation/Workflow.md)
Detailed step-by-step operational workflows, decision logic, status lifecycles, and Mermaid flowcharts for every process and feature.

# Technical Specification [COMPLETED]
- **Documentation File**: [Technical_Specification.html](file:///c:/AI%20Project/IRMS/Project_documentation/Technical_Specification.html)
Complete technical reference: tech stack, Google Sheets schema (13 tabs), full ERD with all field types, all data model field definitions, IndexedDB cache architecture, 22 GAS API action endpoints, key business logic formulas (SOH update, putaway completion, session expiry, ID generation), status lifecycle diagrams, sync/TTL rules, validation matrix, role permission matrix, and ID generation scheme.

# Architecture [COMPLETED]
- **Documentation File**: [Architecture.html](file:///c:/AI%20Project/IRMS/Project_documentation/Architecture.html)
Comprehensive architectural reference: system layer architecture, component breakdown (UI components, DB engine, Cache Manager, GAS controllers, Google Sheets persistence), offline-first data synchronization engine, end-to-end operational sequence data flows, security & RBAC model, backend route dispatching (22 actions), ScriptLock concurrency management, database storage model across 13 worksheets, and Docker/Nginx static distribution infrastructure.

# Backend Behavior [COMPLETED]
- **Documentation File**: [Backend_Behavior.html](file:///c:/AI%20Project/IRMS/Project_documentation/Backend_Behavior.html)
Comprehensive backend technical reference: dual-endpoint architecture (direct Google Sheets gviz CSV endpoint for high-speed data reads, and Google Apps Script Web App REST API endpoint for data mutation writes/updates), action controller routing (22 handlers), dynamic header-aligned storage, in-place SOH stock aggregation, post-mutation 2.5s delay cache reconciliation sync, ScriptLock concurrency control, and Google Sheets ARRAYFORMULA protection.

# Technical Flow [COMPLETED]
- **Documentation File**: [Technical_Flow.html](file:///c:/AI%20Project/IRMS/Project_documentation/Technical_Flow.html)
Plain-language step-by-step explanation of every feature for end users — covers all 10 workflows including login, requests, picking, putaway, SOH, deductions, movements, lost & found, admin, and data sync. Includes zoomable flowcharts and data tables for each section.

this is a workflow for end user so i need a workflow only for explaining each step by step process, does not involve any coding language , just pure explanation , but this technical flow need to show the backend behavior , how data flows , how data is processed , how data is stored , how data is retrieved , how data is updated , how data is deleted , and how data is validated , everything, make the documentation like explaining to non tech people , i want the user understand the application not the project design or technical specs
