function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderHome(container, currentUser) {
  try {
    if (!container) {
      throw new Error('renderHome container is null or missing');
    }
    const userName = currentUser && currentUser.name ? currentUser.name : 'Valued Staff';
    const userRole = currentUser && currentUser.role ? currentUser.role : 'Staff';

    container.innerHTML = `
      <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 24px; overflow-y: auto; box-sizing: border-box; background: var(--surface-card-solid);">
        
        <!-- Welcome Hero Banner -->
        <div style="background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%); padding: 32px; border-radius: 20px; color: #ffffff; position: relative; overflow: hidden; box-shadow: var(--shadow-md);">
          <div style="position: absolute; right: -20px; bottom: -30px; opacity: 0.1; pointer-events: none;">
            <span class="material-icons-round" style="font-size: 200px;">analytics</span>
          </div>
          <div style="position: relative; z-index: 2; max-width: 600px;">
            <div style="display: inline-block; padding: 6px 12px; background: rgba(255,255,255,0.15); border-radius: 30px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
              System Portal v1.2.0
            </div>
            <h2 style="font-size: 28px; font-weight: 800; margin: 0; line-height: 1.2;">Welcome, ${escapeHtml(userName)}!</h2>
            <p style="font-size: 14px; margin-top: 8px; line-height: 1.6; opacity: 0.9;">
              Inventory Recovery Management System (IRMS) is your centralized console for tracking real-time stock levels, handling checker recovery pickings, and syncing sheet allocations.
            </p>
          </div>
        </div>

        <!-- Quick Summary Stats Widgets (Placeholder Content) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          
          <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); color: #22c55e; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-icons-round" style="font-size: 24px;">cloud_done</span>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Sync Status</span>
              <strong style="font-size: 16px; color: var(--text-primary); display: block; margin-top: 2px;">All Synced</strong>
            </div>
          </div>

          <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-icons-round" style="font-size: 24px;">assignment</span>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Active Tasks</span>
              <strong style="font-size: 16px; color: var(--text-primary); display: block; margin-top: 2px;">5 Claims</strong>
            </div>
          </div>

          <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 18px; display: flex; align-items: center; gap: 14px; box-shadow: var(--shadow-sm);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #f59e0b; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <span class="material-icons-round" style="font-size: 24px;">people</span>
            </div>
            <div>
              <span style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Role Session</span>
              <strong style="font-size: 16px; color: var(--text-primary); display: block; margin-top: 2px;">${escapeHtml(userRole)}</strong>
            </div>
          </div>

        </div>

        <!-- App Overview & Purpose -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
          <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--primary-50); color: var(--primary-600); display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span class="material-icons-round" style="font-size: 24px;">outbox</span>
            </div>
            <h4 style="font-size: 15px; font-weight: 800; color: var(--primary-900); margin: 0;">Request Pickup</h4>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
              Allows Checker staff to file claims for items found on checker lines. Triggers picking tasks directly in the database queue for immediate collection.
            </p>
          </div>

          <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span class="material-icons-round" style="font-size: 24px;">fact_check</span>
            </div>
            <h4 style="font-size: 15px; font-weight: 800; color: var(--primary-900); margin: 0;">Picking Tasks</h4>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
              Operational queue for warehouse staff to pick items, update item count statuses (Waiting List, In Progress, Completed), and confirm quantities.
            </p>
          </div>

          <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 20px; box-shadow: var(--shadow-sm);">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <span class="material-icons-round" style="font-size: 24px;">travel_explore</span>
            </div>
            <h4 style="font-size: 15px; font-weight: 800; color: var(--primary-900); margin: 0;">Lost & Found</h4>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
              Logbook for items discovered in incorrect bin zones. Staff can input locations and submit details to Google Sheets for tracking.
            </p>
          </div>
        </div>

        <!-- App Workflow Diagram -->
        <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm);">
          <h4 style="font-size: 15px; font-weight: 800; color: var(--primary-900); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">account_tree</span>
            Operational Workflow Timeline
          </h4>
          <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Typical lifecycle of a recovery claim within IRMS</p>
          
          <div class="workflow-timeline" style="margin-top: 24px; display: flex; flex-direction: column; gap: 20px; position: relative; padding-left: 20px; border-left: 2px dashed var(--border-light);">
            
            <div style="position: relative;">
              <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-600); border: 4px solid #ffffff; box-shadow: 0 0 0 2px var(--primary-200);"></div>
              <strong style="font-size: 13px; color: var(--primary-800); display: block;">1. Claim Filing (Checker Line)</strong>
              <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px; line-height: 1.4;">
                Checker staff discovers mismatched items at verification registers and submits a **Request Pickup** form specifying SKU details, quantities, and locations.
              </span>
            </div>

            <div style="position: relative;">
              <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-600); border: 4px solid #ffffff; box-shadow: 0 0 0 2px var(--primary-200);"></div>
              <strong style="font-size: 13px; color: var(--primary-800); display: block;">2. Picking Queue Assignment</strong>
              <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px; line-height: 1.4;">
                A record is generated in the **Picking Task** list under *Waiting List* status. Pickers can multiple select tasks to claim them, shifting them to *In Progress*.
              </span>
            </div>

            <div style="position: relative;">
              <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-600); border: 4px solid #ffffff; box-shadow: 0 0 0 2px var(--primary-200);"></div>
              <strong style="font-size: 13px; color: var(--primary-800); display: block;">3. Collection & Verification</strong>
              <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px; line-height: 1.4;">
                Warehouse staff collects items from checker zones, updates counts, resolves discrepancies (mismatched, lost, or found items are logged), and saves tasks.
              </span>
            </div>

            <div style="position: relative;">
              <div style="position: absolute; left: -26px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary-600); border: 4px solid #ffffff; box-shadow: 0 0 0 2px var(--primary-200);"></div>
              <strong style="font-size: 13px; color: var(--primary-800); display: block;">4. Real-time Google Sheet Sync & SOH Updates</strong>
              <span style="font-size: 12px; color: var(--text-secondary); display: block; margin-top: 2px; line-height: 1.4;">
                Completed picking logs automatically sync to Google Sheets, dynamically updating stock records on the **SOH (Stock On Hand)** dashboard overview.
              </span>
            </div>
          </div>
        </div>

        <!-- Quick Tips & Help Guide -->
        <div style="background: #f8fafc; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
          <h4 style="font-size: 14px; font-weight: 800; color: var(--primary-900); margin: 0; display: flex; align-items: center; gap: 8px;">
            <span class="material-icons-round" style="color: var(--primary-600);">help_outline</span>
            System Quick Guides
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; font-size: 12px; line-height: 1.5; color: var(--text-secondary);">
            <div>
              <strong style="color: var(--text-primary); display: block; margin-bottom: 2px;">Offline Operations Support</strong>
              All claims, picks, and changes are cached locally in the database. If internet drops, work is saved and synced when network returns.
            </div>
            <div>
              <strong style="color: var(--text-primary); display: block; margin-bottom: 2px;">Filters and Search</strong>
              Table columns are filterable in-header. You can type comparison selectors (like <code>&gt;10</code>, <code>&lt;=2</code>) inside metric columns to slice listings instantly.
            </div>
            <div>
              <strong style="color: var(--text-primary); display: block; margin-bottom: 2px;">Detailed Rack Breakdown</strong>
              On the SOH screen, clicking on a SKU row reveals all physical location details, stock quantities, and aging values inside a details popup.
            </div>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    console.error('[renderHome Error]', err);
    container.innerHTML = `
      <div style="padding: 24px; color: var(--danger-700); background: var(--danger-50); border: 1px solid var(--danger-200); border-radius: 12px;">
        <h3>Error rendering Home dashboard</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}
