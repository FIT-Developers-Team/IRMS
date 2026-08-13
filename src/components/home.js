function escapeHtml(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderHome(container, currentUser) {
  try {
    if (!container) {
      throw new Error('renderHome container is null or missing');
    }
    const userName = currentUser && currentUser.name ? currentUser.name : 'Valued Staff';
    const userRole = currentUser && currentUser.role ? currentUser.role : 'Checker';

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

        <!-- Project Documentation Portal -->
        <div style="background: #ffffff; border: 1.5px solid var(--border-light); border-radius: 16px; padding: 24px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 style="font-size: 16px; font-weight: 800; color: var(--primary-900); margin: 0; display: flex; align-items: center; gap: 8px;">
                <span class="material-icons-round" style="color: var(--primary-600);">auto_stories</span>
                System Documentation Portal
              </h4>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Comprehensive operational guides, technical specs, workflow diagrams, and architecture blueprints.</p>
            </div>
            <button id="openFullManualBtn" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: var(--primary-600); color: #ffffff; border: none; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s;">
              <span class="material-icons-round" style="font-size: 16px;">open_in_new</span>
              Open Full Manual
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
            <a href="/Project_documentation/User_Manual.html" data-doc-title="User Manual (How to Use Apps)" class="doc-card-link" style="text-decoration: none; background: var(--surface-body); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px;" onmouseover="this.style.borderColor='var(--primary-600)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'">
              <div style="display: flex; align-items: center; gap: 8px; color: var(--primary-600);">
                <span class="material-icons-round" style="font-size: 20px;">menu_book</span>
                <strong style="font-size: 13px; color: var(--text-primary);">User Manual</strong>
              </div>
              <span style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">Step-by-step app user guide for pickup requests, picking tasks, putaway, and SOH monitoring.</span>
            </a>

            <a href="/Project_documentation/Technical_Flow.html" data-doc-title="Technical Flow" class="doc-card-link" style="text-decoration: none; background: var(--surface-body); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px;" onmouseover="this.style.borderColor='var(--primary-600)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'">
              <div style="display: flex; align-items: center; gap: 8px; color: var(--primary-600);">
                <span class="material-icons-round" style="font-size: 20px;">alt_route</span>
                <strong style="font-size: 13px; color: var(--text-primary);">Technical Flow</strong>
              </div>
              <span style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">Plain-language explanation of features, interactive flowcharts, and background storage rules.</span>
            </a>

            <a href="/Project_documentation/Technical_Specification.html" data-doc-title="Technical Specification" class="doc-card-link" style="text-decoration: none; background: var(--surface-body); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px;" onmouseover="this.style.borderColor='var(--primary-600)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'">
              <div style="display: flex; align-items: center; gap: 8px; color: var(--primary-600);">
                <span class="material-icons-round" style="font-size: 20px;">description</span>
                <strong style="font-size: 13px; color: var(--text-primary);">Technical Spec</strong>
              </div>
              <span style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">Complete reference: ERD, 13 Google Sheets tabs, data model fields, and validation matrix.</span>
            </a>

            <a href="/Project_documentation/Workflow.html" data-doc-title="Workflow Diagram" class="doc-card-link" style="text-decoration: none; background: var(--surface-body); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px;" onmouseover="this.style.borderColor='var(--primary-600)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'">
              <div style="display: flex; align-items: center; gap: 8px; color: var(--primary-600);">
                <span class="material-icons-round" style="font-size: 20px;">schema</span>
                <strong style="font-size: 13px; color: var(--text-primary);">Workflow Diagram</strong>
              </div>
              <span style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">Visual diagrams detailing state transitions, double-verification flows, and user lifecycles.</span>
            </a>

            <a href="/Project_documentation/Architecture.html" data-doc-title="System Architecture" class="doc-card-link" style="text-decoration: none; background: var(--surface-body); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px;" onmouseover="this.style.borderColor='var(--primary-600)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'">
              <div style="display: flex; align-items: center; gap: 8px; color: var(--primary-600);">
                <span class="material-icons-round" style="font-size: 20px;">layers</span>
                <strong style="font-size: 13px; color: var(--text-primary);">Architecture</strong>
              </div>
              <span style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">Multi-tier architecture, component modules, security RBAC model, and Docker container setup.</span>
            </a>

            <a href="/Project_documentation/Backend_Behavior.html" data-doc-title="Backend Behavior" class="doc-card-link" style="text-decoration: none; background: var(--surface-body); border: 1px solid var(--border-light); border-radius: 12px; padding: 16px; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px;" onmouseover="this.style.borderColor='var(--primary-600)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='var(--border-light)'; this.style.transform='translateY(0)'">
              <div style="display: flex; align-items: center; gap: 8px; color: var(--primary-600);">
                <span class="material-icons-round" style="font-size: 20px;">dns</span>
                <strong style="font-size: 13px; color: var(--text-primary);">Backend Behavior</strong>
              </div>
              <span style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4;">Dual-endpoint model: gviz CSV read endpoint + Apps Script REST API mutation endpoint.</span>
            </a>
          </div>
        </div>

      </div>
    `;

    // Attach event listeners for in-app documentation modal viewing
    const fullManualBtn = container.querySelector('#openFullManualBtn');
    if (fullManualBtn) {
      fullManualBtn.addEventListener('click', () => {
        openDocModal('/Project_documentation/User_Manual.html', 'User Manual (How to Use Apps)');
      });
    }

    const docLinks = container.querySelectorAll('.doc-card-link');
    docLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Left-click opens in-app modal viewer
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          const href = link.getAttribute('href');
          const title = link.getAttribute('data-doc-title') || 'Documentation';
          openDocModal(href, title);
        }
      });
    });

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

export function openDocModal(docPath, title) {
  const existing = document.getElementById('docViewerModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'docViewerModal';
  modal.style.cssText = 'position: fixed; inset: 0; z-index: 99999; background: rgba(10, 20, 50, 0.75); backdrop-filter: blur(8px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box;';

  modal.innerHTML = `
    <div style="background: #ffffff; border-radius: 16px; width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,0.35);">
      <div style="padding: 14px 20px; background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%); color: #ffffff; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="material-icons-round" style="color: #38bdf8;">auto_stories</span>
          <strong style="font-size: 15px; font-weight: 700;">${escapeHtml(title)}</strong>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <a href="${escapeHtml(docPath)}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: rgba(255,255,255,0.18); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 12px; font-weight: 700;">
            <span class="material-icons-round" style="font-size: 16px;">open_in_new</span>
            Open in New Window
          </a>
          <button id="closeDocModalBtn" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <span class="material-icons-round">close</span>
          </button>
        </div>
      </div>
      <iframe src="${escapeHtml(docPath)}" style="width: 100%; height: 100%; border: none; flex: 1;"></iframe>
    </div>
  `;

  document.body.appendChild(modal);

  const closeBtn = modal.querySelector('#closeDocModalBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}
