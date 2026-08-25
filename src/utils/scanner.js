import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Supported barcode formats — explicit list for reliable 1D + 2D scanning.
 */
const SUPPORTED_FORMATS = [
  // 1D Linear barcodes
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.RSS_14,
  Html5QrcodeSupportedFormats.RSS_EXPANDED,
  // 2D barcodes
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417,
];

/**
 * Sort cameras so that:
 * 1. Main rear camera (1x) is first
 * 2. Other rear cameras (wide/tele) are next
 * 3. Front cameras are last
 */
function sortCameras(cameras) {
  if (!cameras || cameras.length === 0) return [];

  const frontKeywords = ['front', 'depan', 'user', 'selfie', 'face', 'facing front'];
  const ultraWideKeywords = ['ultra', 'wide-angle', 'ultrawide', 'ultra-wide', '0.5x', '0.6x', 'wide angle'];
  const teleKeywords = ['telephoto', 'tele', 'zoom', '2x', '3x', '5x', '10x'];

  const mainRear = [];
  const otherRear = [];
  const front = [];
  const unknown = [];

  for (const cam of cameras) {
    const l = (cam.label || '').toLowerCase();
    const isFront = frontKeywords.some(k => l.includes(k));
    const isUltra = ultraWideKeywords.some(k => l.includes(k));
    const isTele = teleKeywords.some(k => l.includes(k));

    if (isFront) {
      front.push(cam);
    } else if (isUltra || isTele) {
      otherRear.push(cam);
    } else if (l.length > 0) {
      // Main rear candidate
      if (l.includes('main') || l.includes('primary') || l.includes('0') || l.includes('back') || l.includes('rear') || l.includes('belakang')) {
        mainRear.unshift(cam);
      } else {
        mainRear.push(cam);
      }
    } else {
      unknown.push(cam);
    }
  }

  return [...mainRear, ...otherRear, ...unknown, ...front];
}

/**
 * Get friendly display name for a camera
 */
function getFriendlyCameraLabel(cam, index) {
  if (!cam || !cam.label || cam.label.trim() === '') {
    return `Camera ${index + 1}`;
  }
  const l = cam.label.toLowerCase();
  if (l.includes('front') || l.includes('depan') || l.includes('user') || l.includes('selfie')) {
    return 'Front Camera';
  }
  if (l.includes('ultra') || l.includes('wide')) {
    return 'Rear Camera (Wide)';
  }
  if (l.includes('tele') || l.includes('zoom')) {
    return 'Rear Camera (Zoom)';
  }
  if (l.includes('back') || l.includes('rear') || l.includes('environment') || l.includes('belakang') || l.includes('main')) {
    return 'Rear Camera';
  }
  return cam.label.length > 25 ? `Camera ${index + 1}` : cam.label;
}

/**
 * Applies continuous autofocus if supported
 */
async function applyContinuousFocus(html5Qrcode) {
  try {
    const capabilities = html5Qrcode.getRunningTrackCapabilities ? html5Qrcode.getRunningTrackCapabilities() : null;
    if (!capabilities) return;

    if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
      await html5Qrcode.applyVideoConstraints({ focusMode: 'continuous' }).catch(() => {});
    }
  } catch (err) {
    // Non-critical capability
  }
}

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

      <!-- Preview Box (4:3 aspect ratio) -->
      <div style="position:relative; width:100%; aspect-ratio:4/3; background:#0f172a; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
        <!-- Camera Stream Viewport -->
        <div id="scanner-reader" style="width:100%; height:100%;"></div>

        <!-- Scanning Reticle Overlay — rectangular for 1D barcodes -->
        <div class="scanner-reticle" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:82%; height:36%; border:2px dashed #38bdf8; border-radius:8px; pointer-events:none; box-shadow:0 0 0 100vmax rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center;">
          <!-- Laser Line Animation -->
          <div class="scanner-laser" style="position:absolute; top:0; left:0; width:100%; height:2px; background:linear-gradient(90deg, transparent, #ef4444, transparent); box-shadow:0 0 8px #ef4444; animation: laserScan 2s linear infinite;"></div>
        </div>
      </div>

      <!-- Controls & Status -->
      <div style="text-align:center; display:flex; flex-direction:column; gap:8px;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">Align barcode inside the frame</p>
        <div id="scanner-error-message" style="font-size:11px; color:#38bdf8; min-height:16px;">Starting camera...</div>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="toggleCameraFacingBtn" class="btn-secondary" style="height:36px; padding:0 16px; font-size:12px; font-weight:700; border-radius:18px; background:rgba(255,255,255,0.08); color:#e2e8f0; border:1px solid rgba(255,255,255,0.15); gap:6px; display:inline-flex; align-items:center; cursor:pointer; outline:none;">
            <span class="material-icons-round" style="font-size:16px;">flip_camera_ios</span>
            <span id="toggleCameraLabel">Switch Camera</span>
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
  const toggleLabel = overlay.querySelector('#toggleCameraLabel');

  let html5Qrcode = null;
  let allCameras = [];
  let currentCameraIndex = 0;
  let isScanning = false;
  let isSwitching = false;

  async function startScanning(cameraTarget) {
    if (isSwitching) return;
    isSwitching = true;

    try {
      if (html5Qrcode) {
        try {
          await html5Qrcode.stop();
        } catch (e) {}
        html5Qrcode = null;
      }

      const container = overlay.querySelector('#scanner-reader');
      container.innerHTML = '';

      html5Qrcode = new Html5Qrcode("scanner-reader", {
        formatsToSupport: SUPPORTED_FORMATS,
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      errorEl.textContent = 'Opening camera...';
      errorEl.style.color = '#38bdf8';

      // Start scanning
      // NOTE: Do NOT put videoConstraints in the config object, as html5-qrcode
      // would completely discard cameraTarget/facingMode if videoConstraints is present!
      await html5Qrcode.start(
        cameraTarget,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.floor(viewfinderWidth * 0.82);
            const height = Math.floor(Math.min(viewfinderHeight * 0.38, width * 0.5));
            return { width, height };
          },
        },
        (decodedText) => {
          cleanup();
          if (typeof onScanSuccess === 'function') {
            onScanSuccess(decodedText);
          }
        },
        () => {} // scan frame errors ignored
      );

      isScanning = true;

      // Apply continuous autofocus if available on this device
      await applyContinuousFocus(html5Qrcode);

      // Now that camera permissions are active, enumerate all available cameras with full labels
      try {
        const rawCameras = await Html5Qrcode.getCameras();
        if (rawCameras && rawCameras.length > 0) {
          allCameras = sortCameras(rawCameras);

          // Find current active camera index
          const settings = html5Qrcode.getRunningTrackSettings ? html5Qrcode.getRunningTrackSettings() : null;
          if (settings && settings.deviceId) {
            const activeIdx = allCameras.findIndex(c => c.id === settings.deviceId);
            if (activeIdx >= 0) {
              currentCameraIndex = activeIdx;
            }
          }
        }
      } catch (e) {}

      // Update UI with camera info
      const activeCam = allCameras[currentCameraIndex];
      const friendlyName = getFriendlyCameraLabel(activeCam, currentCameraIndex);
      errorEl.textContent = `Scanning (${friendlyName}) — align barcode`;
      errorEl.style.color = '#34d399';

      // Update button label if multiple cameras exist
      if (allCameras.length > 1) {
        const nextIdx = (currentCameraIndex + 1) % allCameras.length;
        const nextName = getFriendlyCameraLabel(allCameras[nextIdx], nextIdx);
        toggleLabel.textContent = `Switch to ${nextName}`;
      } else {
        toggleLabel.textContent = 'Switch Camera';
      }
    } catch (err) {
      console.error('Html5Qrcode start error:', err);
      errorEl.textContent = 'Camera error: ' + (err.message || err || 'Unable to open camera');
      errorEl.style.color = '#f87171';
      isScanning = false;
    } finally {
      isSwitching = false;
    }
  }

  function cleanup() {
    if (html5Qrcode && isScanning) {
      isScanning = false;
      html5Qrcode.stop().catch(() => {});
    }
    overlay.remove();
  }

  closeBtn.addEventListener('click', cleanup);

  // Switch camera button handler
  toggleBtn.addEventListener('click', () => {
    if (isSwitching) return;

    if (allCameras.length > 1) {
      // Cycle to the next camera in the sorted list
      currentCameraIndex = (currentCameraIndex + 1) % allCameras.length;
      const nextCamera = allCameras[currentCameraIndex];
      startScanning(nextCamera.id);
    } else {
      // Fallback: toggle facingMode constraint
      const nextFacing = (html5Qrcode && currentCameraIndex === 0) ? 'user' : 'environment';
      currentCameraIndex = (nextFacing === 'user') ? 1 : 0;
      startScanning({ facingMode: nextFacing });
    }
  });

  // Start with default rear camera
  startScanning({ facingMode: 'environment' });
}
