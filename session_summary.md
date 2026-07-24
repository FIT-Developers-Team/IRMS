# Daily Development Summary - IRMS Inventory Recovery Management System
**Date**: July 23, 2026  
**Repository**: [FIT-Developers-Team/IRMS](https://github.com/FIT-Developers-Team/IRMS) (`main` branch)

---

## Executive Summary

Today's session focused on completing responsive mobile improvements across all operational views, fixing tab filtering issues, and designing the SOH (Stock On Hand) inventory allocations dashboard. Wide horizontal scrolling tables have been replaced with responsive mobile card views, direct selection toggles, and detailed location breakdowns.

---

## Key Features & Changes Accomplished

### 1. Default Welcome Home Page & Null Safety (`home.js`, `dashboard.js`)
- **New Home Navigation Tab**: Created the `home.js` component, presenting system definitions, operational timelines, and guides.
- **Null Safety Validation**: Resolved a JavaScript crash (TypeError) where the home view would throw an error if `currentUser` was not fully loaded yet. Handled this safely using `currentUser && currentUser.name ? currentUser.name : 'Valued Staff'`. This prevents the home screen from rendering blank.
- **Default Landing & Routing**: Wired the tab layout to load this Home view immediately upon login. Added routing links for the "home" tabId in `dashboard.js` to ensure clicking the Home tab loads the dashboard view cleanly.

### 2. Astronaut Rocket Flight & Parallax Starfield Splash Loader
- **Asset Integration (`Loading Image.png`)**: Copied the astronaut rocket PNG image into the public assets folder (`public/Assets/Loading Image.png`) to ensure Vite serves it in both development and production.
- **Option 1 (Orbit + Hover) Combined with Option 2 (Starfield)**:
  - Renders a **parallax starfield background** with 12 dynamic stars animated to stream past at varying speeds and opacities (simulating forward speed).
  - Renders the **astronaut rocket image** in the center. The image floats and rotates subtly using a CSS `@keyframes rocketHover` micro-animation (gravity floating).
  - The rocket also follows a smooth, screen-wide bezier loop trajectory using a CSS `@keyframes rocketOrbit` path wrapper animation to orbit around the loading text card.
- **Instant Activation**: Placed directly inside `<div id="app">` in `index.html` to display instantly, and refactored `main.js` to render the same layout in the `renderLoadingState()` method until Google Sheets data synchronization completes.

### 3. Unified Mobile Card Views
- **Omni-Dashboard Layouts**: Extended the mobile-first vertical card views to all dashboard interfaces including **Lost & Found** (`lostAndFound.js`) and **Request Pickup** (`requestPickup.js`).
- **Responsive Media Query**: The global `.data-table-wrapper` now automatically hides on screens `<= 768px`, swapping immediately to the padded mobile card container with touch-optimized margins, preventing horizontal scrolls.
- **Toggle Cards & Confirm Slider**: Fixed navigation bindings and implemented card-selection clicks to activate the mobile action bar and confirmation swipe tracker.

### 4. Stock On Hand (SOH) Module Front End
- **SKU-Level Stock Aggregation**: Grouped SOH entries by SKU code. Table rows and mobile cards represent the total combined Qty SOH for each unique SKU.
- **Detailed Locations Breakdown Popup**: Clicking a SKU row or card opens a modal detailing exact locations, quantities, specific location-level stock ages, and timestamps.
- **Perfect Horizontal Filter Alignment**: Resolved vertical off-center inputs by adopting a structured **two-row header layout** inside `<thead>`. Column label strings sit on Row 1, while form inputs occupy Row 2.
- **Frozen Header & Navigation Layout (Desktop & Mobile)**:
  - Constrained main outer page boundaries (`body`, `.layout-wrapper`, and `.app-layout-root`) to exactly `100vh` height and disabled global document scrolling.
  - Made the page content containers and panel cards (`.page-content-container` and `.card-panel`) act as non-scrolling flex column boxes.
  - Set the scroll scope of desktop layouts to only occur within the `.data-table-wrapper` scroll area.
  - Set custom double-stacked top offsets for the SOH module's two-row header (`top: 0` for label headers, and `top: 41px` for dynamic input/overlay filters).
  - Set the scroll scope of mobile layouts to only occur within the `.mobile-card-list` scroll container, keeping top app headers and bottom navigation tabs locked.
- **Compact 2x2 Mobile KPI Grid**: Optimized dashboard real estate on small screen sizes (`<= 768px`) by transforming the vertically stacked 4 KPI cards into a clean, compact 2x2 grid layout.
- **Mobile Filter Panel Display Fix**: Fixed a CSS source order issue in `style.css` where the generic `.mobile-only-filters-container { display: none !important; }` rule overrode the mobile media query declaration.
- **Custom Select Dropdown Components (Desktop & Mobile)**: Replaced standard plain browser `<select>` boxes inside both desktop table headers and the mobile filter drawer panel with custom-built HTML dropdown components.
- **Cascaded Category Dropdowns**: Implemented hierarchical options population for L0, L1, and L2 Categories. Changing a parent category dynamically filters options lists for children.
- **KPI Metrics**: Implemented the **Oldest Stock Age** (maximum of `stockAge`) display on the dashboard analytics overview.
- **Real-Time Subscription**: Wired a self-cleaning updates listener that updates stock counts in the SOH table and cards in real-time as transactions complete.

---

## Files Modified & Created Today

- [home.js](file:///c:/AI Project/IRMS/src/components/home.js): [NEW] Created the Home landing dashboard component and added safe user session fallbacks.
- [dashboard.js](file:///c:/AI Project/IRMS/src/components/dashboard.js): Added the Home button item, updated switchTab conditional routes, and changed the default initial boot call to 'home'.
- [index.html](file:///c:/AI Project/IRMS/index.html): Injected static splash screen markup.
- [main.js](file:///c:/AI Project/IRMS/src/main.js): Refactored `renderLoadingState()` to draw the animated starfield and rocket loader in the app root.
- [soh.js](file:///c:/AI Project/IRMS/src/components/soh.js): Created SOH dashboard component.
- [style.css](file:///c:/AI Project/IRMS/src/style.css): Added scroll viewport boundaries and sticky headers rules.
- [db.js](file:///c:/AI Project/IRMS/src/data/db.js): Updated `parseSoh()` and `getSohList()`.
- [lostAndFound.js](file:///c:/AI Project/IRMS/src/components/lostAndFound.js): Implemented mobile card layouts.
- [requestPickup.js](file:///c:/AI Project/IRMS/src/components/requestPickup.js): Implemented mobile card layouts.
- [pickingTask.js](file:///c:/AI Project/IRMS/src/components/pickingTask.js): Restored filter tab events and search input listeners.

---

## Roadmap & Next Steps

1. **Implement Stock Movement & Stock Deduction Modules**:
   - Code `Stock_Movement` process hooks for transferring inventory between rack zones.
   - Code `Stock_Deduction` logic hooks for resolving inventory shrinkage or checker claims.
   - Design backend gas schemas and frontend UI forms.
