import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Supported barcode formats — explicit list for reliable 1D + 2D scanning.
 * By declaring these upfront, the decoder focuses on these specific formats
 * instead of trying all possible formats (which degrades performance).
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
 * Finds the best rear camera from a list of camera devices, avoiding ultrawide/telephoto lenses.
 * If labels are not available (e.g. before permissions are granted), returns null so
 * the caller can safely fall back to `{ facingMode: 'environment' }`.
 *
 * @param {Array<{id: string, label: string}>} cameras
 * @returns {string|null} deviceId or null
 */
function findBestRearCamera(cameras) {
  if (!cameras || cameras.length === 0) return null;

  // Check if labels are actually populated (before permission, labels are empty strings)
  const hasLabels = cameras.some(c => c.label && c.label.trim().length > 0);
  if (!hasLabels) return null;

  const rearKeywords = ['back', 'rear', 'environment', 'belakang', 'facing back', '0, facing back'];
  const frontKeywords = ['front', 'depan', 'user', 'selfie', 'face', 'facing front', '1, facing front'];
  const ultraWideKeywords = ['ultra', 'wide-angle', 'ultrawide', 'ultra-wide', '0.5x', '0.6x', 'wide angle'];
  const teleKeywords = ['telephoto', 'tele', 'zoom', '2x', '3x', '5x', '10x'];

  // Exclude front-facing cameras
  const nonFront = cameras.filter(c => {
    const l = (c.label || '').toLowerCase();
    return !frontKeywords.some(k => l.includes(k));
  });

  if (nonFront.length === 0) return null;

  // Filter explicitly for rear keywords
  const rearCams = nonFront.filter(c => {
    const l = (c.label || '').toLowerCase();
    return rearKeywords.some(k => l.includes(k));
  });

  const candidates = rearCams.length > 0 ? rearCams : nonFront;

  // Find non-ultrawide, non-telephoto camera (the main 1x sensor)
  const mainCams = candidates.filter(c => {
    const l = (c.label || '').toLowerCase();
    return !ultraWideKeywords.some(k => l.includes(k)) && !teleKeywords.some(k => l.includes(k));
  });

  if (mainCams.length > 0) {
    // Prefer camera explicitly labeled "main", "primary", or standard "camera 0"
    const preferred = mainCams.find(c => {
      const l = (c.label || '').toLowerCase();
      return l.includes('main') || l.includes('primary') || l.includes('camera 0') || l.includes('camera2 0');
    });
    return (preferred || mainCams[0]).id;
  }

  return candidates[0].id;
}

/**
 * Finds the front camera deviceId if labels are populated.
 *
 * @param {Array<{id: string, label: string}>} cameras
 * @returns {string|null} deviceId or null
 */
function findBestFrontCamera(cameras) {
  if (!cameras || cameras.length === 0) return null;
  const frontKeywords = ['front', 'depan', 'user', 'selfie', 'face', 'facing front', '1, facing front'];
  const frontCam = cameras.find(c => {
    const l = (c.label || '').toLowerCase();
    return frontKeywords.some(k => l.includes(k));
  });
  return frontCam ? frontCam.id : null;
}

/**
 * Applies advanced camera constraints (autofocus, zoom) for sharper barcode scanning.
 */
async function applyAdvancedConstraints(html5Qrcode) {
  try {
    const capabilities = html5Qrcode.getRunningTrackCapabilities();
    if (!capabilities) return;

    const constraints = {};

    // Enable continuous autofocus if supported
    if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes('continuous')) {
      constraints.focusMode = 'continuous';
    }

    // Set zoom to 1.0 (avoid ultrawide distortion) if supported
    if (capabilities.zoom && typeof capabilities.zoom === 'object') {
      const minZoom = capabilities.zoom.min || 1.0;
      constraints.zoom = Math.max(minZoom, 1.0);
    }

    if (Object.keys(constraints).length > 0) {
      await html5Qrcode.applyVideoConstraints(constraints).catch(() => {});
    }
  } catch (err) {
    // Not all browsers/devices support these constraints — silently continue
    console.warn('Could not apply advanced camera constraints:', err);
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

      <!-- Preview Box (4:3 aspect ratio for optimal camera preview) -->
      <div style="position:relative; width:100%; aspect-ratio:4/3; background:#0f172a; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
        <!-- Camera Stream Viewport -->
        <div id="scanner-reader" style="width:100%; height:100%;"></div>

        <!-- Scanning Reticle Overlay — rectangular for 1D barcodes -->
        <div class="scanner-reticle" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80%; height:35%; border:2px dashed #38bdf8; border-radius:8px; pointer-events:none; box-shadow:0 0 0 100vmax rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center;">
          <!-- Laser Line Animation -->
          <div class="scanner-laser" style="position:absolute; top:0; left:0; width:100%; height:2px; background:linear-gradient(90deg, transparent, #ef4444, transparent); box-shadow:0 0 8px #ef4444; animation: laserScan 2s linear infinite;"></div>
        </div>
      </div>

      <!-- Controls & Status -->
      <div style="text-align:center; display:flex; flex-direction:column; gap:8px;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">Align barcode horizontally inside the frame</p>
        <div id="scanner-error-message" style="font-size:11px; color:#f87171; min-height:16px;">Starting camera...</div>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="toggleCameraFacingBtn" class="btn-secondary" style="height:36px; padding:0 14px; font-size:11px; font-weight:700; border-radius:18px; background:rgba(255,255,255,0.05); color:#e2e8f0; border:1px solid rgba(255,255,255,0.1); gap:4px; display:inline-flex; align-items:center; cursor:pointer; outline:none;">
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
  
  let html5Qrcode = null;
  let currentFacing = 'environment'; // 'environment' (back) | 'user' (front)
  let allCameras = [];
  let isScanning = false;

  async function startScanning() {
    try {
      if (html5Qrcode) {
        await html5Qrcode.stop().catch(() => {});
        html5Qrcode = null;
      }
      
      const container = overlay.querySelector('#scanner-reader');
      container.innerHTML = '';

      // Create scanner instance with explicit format support + native barcode API
      html5Qrcode = new Html5Qrcode("scanner-reader", {
        formatsToSupport: SUPPORTED_FORMATS,
        useBarCodeDetectorIfSupported: true,
        verbose: false,
      });

      isScanning = true;
      errorEl.textContent = 'Starting camera stream...';
      errorEl.style.color = '#38bdf8';

      // Try to get cameras list if not already retrieved
      if (allCameras.length === 0) {
        try {
          allCameras = await Html5Qrcode.getCameras();
        } catch (e) {
          allCameras = [];
        }
      }

      // Determine camera configuration
      let cameraConfig;
      if (currentFacing === 'user') {
        const frontId = findBestFrontCamera(allCameras);
        cameraConfig = frontId ? frontId : { facingMode: 'user' };
      } else {
        // Rear camera mode — find best rear camera by deviceId, or fallback to facingMode: 'environment'
        const rearId = findBestRearCamera(allCameras);
        cameraConfig = rearId ? rearId : { facingMode: 'environment' };
      }

      await html5Qrcode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Rectangular scan region optimized for 1D barcodes
            const width = Math.floor(viewfinderWidth * 0.80);
            const height = Math.floor(Math.min(viewfinderHeight * 0.35, width * 0.5));
            return { width, height };
          },
          videoConstraints: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        (decodedText) => {
          cleanup();
          if (typeof onScanSuccess === 'function') {
            onScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Verbose scan frame errors — ignored
        }
      );

      // Camera stream is now running, meaning permissions are granted!
      // Refresh the camera list to obtain full device labels for future toggles
      const hasLabels = allCameras.some(c => c.label && c.label.trim().length > 0);
      if (!hasLabels) {
        try {
          allCameras = await Html5Qrcode.getCameras();
        } catch (e) {}
      }

      // Apply continuous autofocus & optimal zoom
      await applyAdvancedConstraints(html5Qrcode);

      const isFrontActive = (currentFacing === 'user');
      errorEl.textContent = isFrontActive ? 'Scanning (Front Camera)...' : 'Scanning — align barcode in frame';
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
    currentFacing = (currentFacing === 'environment') ? 'user' : 'environment';
    errorEl.textContent = 'Switching camera...';
    errorEl.style.color = '#38bdf8';
    startScanning();
  });

  startScanning();
}
