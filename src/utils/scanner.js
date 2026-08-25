import { Html5Qrcode } from 'html5-qrcode';

export function openCameraScanner(onScanSuccess) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay scanner-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; color:#fff; font-family:var(--font-family);';

  overlay.innerHTML = `
    <div class="scanner-card" style="width:90%; max-width:400px; background:#1e293b; border-radius:24px; border:1.5px solid rgba(255,255,255,0.1); padding:20px; box-shadow:0 24px 60px rgba(0,0,0,0.5); display:flex; flex-direction:column; gap:16px; position:relative; box-sizing:border-box;">
      
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-icons-round" style="color:#38bdf8;">qr_code_scanner</span>
          <h3 style="margin:0; font-size:16px; font-weight:700; color:#f8fafc;">Camera Scanner</h3>
        </div>
        <button id="closeScannerBtn" style="border:none; background:rgba(255,255,255,0.1); color:#94a3b8; cursor:pointer; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:0.2s;">
          <span class="material-icons-round" style="font-size:18px;">close</span>
        </button>
      </div>

      <!-- Preview Box -->
      <div style="position:relative; width:100%; aspect-ratio:1; background:#0f172a; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
        <!-- Camera Stream Viewport -->
        <div id="scanner-reader" style="width:100%; height:100%;"></div>

        <!-- Scanning Reticle Overlay -->
        <div class="scanner-reticle" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:65%; height:65%; border:2px dashed #38bdf8; border-radius:12px; pointer-events:none; box-shadow:0 0 0 100vmax rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center;">
          <!-- Laser Line Animation -->
          <div class="scanner-laser" style="position:absolute; top:0; left:0; width:100%; height:2px; background:linear-gradient(90deg, transparent, #ef4444, transparent); box-shadow:0 0 8px #ef4444; animation: laserScan 2s linear infinite;"></div>
        </div>
      </div>

      <!-- Controls & Status -->
      <div style="text-align:center; display:flex; flex-direction:column; gap:8px;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">Position barcode inside the scan frame</p>
        <div id="scanner-error-message" style="font-size:11px; color:#f87171; min-height:16px;">Initializing camera...</div>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="toggleCameraFacingBtn" class="btn-secondary" style="height:36px; padding:0 14px; font-size:11px; font-weight:700; border-radius:18px; background:rgba(255,255,255,0.05); color:#e2e8f0; border:1px solid rgba(255,255,255,0.1); gap:4px; display:inline-flex; align-items:center; cursor:pointer; outline:none;">
            <span class="material-icons-round" style="font-size:16px;">flip_camera_ios</span>
            <span>Switch Camera</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Laser Animation CSS -->
    <style>
      @keyframes laserScan {
        0% { top: 0%; }
        50% { top: 100%; }
        100% { top: 0%; }
      }
      #scanner-reader video {
        object-fit: cover !important;
        width: 100% !important;
        height: 100% !important;
      }
    </style>
  `;

  document.body.appendChild(overlay);

  const errorEl = overlay.querySelector('#scanner-error-message');
  const closeBtn = overlay.querySelector('#closeScannerBtn');
  const toggleBtn = overlay.querySelector('#toggleCameraFacingBtn');
  
  let html5Qrcode = null;
  let currentFacingMode = 'environment';
  let isScanning = false;

  async function startScanning() {
    try {
      if (html5Qrcode) {
        await html5Qrcode.stop().catch(() => {});
      }
      
      const container = overlay.querySelector('#scanner-reader');
      container.innerHTML = '';

      html5Qrcode = new Html5Qrcode("scanner-reader");
      isScanning = true;
      errorEl.textContent = 'Starting camera stream...';
      errorEl.style.color = '#38bdf8';

      await html5Qrcode.start(
        { facingMode: currentFacingMode },
        {
          fps: 15,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.65;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          cleanup();
          if (typeof onScanSuccess === 'function') {
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Verbose scan frame errors
        }
      );
      errorEl.textContent = 'Scanning for barcodes...';
      errorEl.style.color = '#34d399';
    } catch (err) {
      console.error('Html5Qrcode start error:', err);
      errorEl.textContent = 'Camera error: ' + (err.message || err || 'Access denied');
      errorEl.style.color = '#f87171';
      isScanning = false;
    }
  }

  function cleanup() {
    if (html5Qrcode && isScanning) {
      isScanning = false;
      html5Qrcode.stop().catch(err => console.error('Stop error:', err));
    }
    overlay.remove();
  }

  closeBtn.addEventListener('click', cleanup);
  
  toggleBtn.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    startScanning();
  });

  startScanning();
}
