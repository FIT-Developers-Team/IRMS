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
 * Attempts to find the main rear camera, avoiding ultrawide lenses.
 * Strategy:
 *   1. Enumerate all cameras via Html5Qrcode.getCameras()
 *   2. Filter for rear-facing cameras by label keywords
 *   3. Prefer the "main" camera (not ultrawide/telephoto) based on label heuristics
 *   4. Fallback to facingMode constraint if enumeration fails
 *
 * @returns {Promise<string|{facingMode: string}>} deviceId string or facingMode config
 */
async function selectMainRearCamera() {
  try {
    const cameras = await Html5Qrcode.getCameras();
    if (!cameras || cameras.length === 0) {
      return { facingMode: 'environment' };
    }

    // Normalize labels for matching
    const labeledCameras = cameras.map((cam, index) => ({
      ...cam,
      labelLower: (cam.label || '').toLowerCase(),
      index,
    }));

    // Filter for rear-facing cameras
    const rearKeywords = ['back', 'rear', 'environment', 'belakang'];
    const ultraWideKeywords = ['ultra', 'wide angle', 'ultrawide', 'ultra-wide', '0.5x', '0.6x'];
    const telephotoKeywords = ['telephoto', 'tele', 'zoom', '2x', '3x', '5x', '10x'];

    // Find rear cameras (exclude front-facing)
    let rearCameras = labeledCameras.filter(cam => {
      const label = cam.labelLower;
      // Exclude front cameras
      if (label.includes('front') || label.includes('depan') || label.includes('user')) {
        return false;
      }
      // Include if it has rear keywords OR if it's unlabeled (could be rear)
      return rearKeywords.some(k => label.includes(k)) || label === '';
    });

    // If no rear cameras found by label, use all non-front cameras
    if (rearCameras.length === 0) {
      rearCameras = labeledCameras.filter(cam => {
        const label = cam.labelLower;
        return !label.includes('front') && !label.includes('depan') && !label.includes('user');
      });
    }

    // Still nothing? Use all cameras
    if (rearCameras.length === 0) {
      rearCameras = labeledCameras;
    }

    // If only one rear camera, use it
    if (rearCameras.length === 1) {
      return rearCameras[0].id;
    }

    // Among rear cameras, try to find the "main" one (exclude ultrawide and telephoto)
    const mainCameras = rearCameras.filter(cam => {
      const label = cam.labelLower;
      const isUltraWide = ultraWideKeywords.some(k => label.includes(k));
      const isTelephoto = telephotoKeywords.some(k => label.includes(k));
      return !isUltraWide && !isTelephoto;
    });

    if (mainCameras.length > 0) {
      // Prefer camera with "main" in label, otherwise take the first non-ultra/tele
      const mainCam = mainCameras.find(c => c.labelLower.includes('main')) || mainCameras[0];
      return mainCam.id;
    }

    // If all cameras are ultra/tele, just take the first rear camera
    // (on some phones camera "0" is typically the main sensor)
    return rearCameras[0].id;
  } catch (err) {
    console.warn('Camera enumeration failed, falling back to facingMode:', err);
    return { facingMode: 'environment' };
  }
}

/**
 * Applies advanced camera constraints for better barcode scanning.
 * Requests continuous autofocus, higher resolution, and optimal zoom.
 */
async function applyAdvancedConstraints(html5Qrcode) {
  try {
    const capabilities = html5Qrcode.getRunningTrackCapabilities();
    const constraints = {};

    // Enable continuous autofocus if supported
    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
      constraints.focusMode = 'continuous';
    }

    // Set zoom to 1.0 (avoid ultrawide distortion) if supported
    if (capabilities.zoom) {
      constraints.zoom = capabilities.zoom.min >= 1.0 ? capabilities.zoom.min : 1.0;
    }

    if (Object.keys(constraints).length > 0) {
      await html5Qrcode.applyVideoConstraints(constraints);
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

      <!-- Preview Box (wider aspect ratio for barcode scanning) -->
      <div style="position:relative; width:100%; aspect-ratio:4/3; background:#0f172a; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.05);">
        <!-- Camera Stream Viewport -->
        <div id="scanner-reader" style="width:100%; height:100%;"></div>

        <!-- Scanning Reticle Overlay — rectangular for 1D barcodes -->
        <div class="scanner-reticle" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:80%; height:30%; border:2px dashed #38bdf8; border-radius:8px; pointer-events:none; box-shadow:0 0 0 100vmax rgba(15,23,42,0.4); display:flex; align-items:center; justify-content:center;">
          <!-- Laser Line Animation -->
          <div class="scanner-laser" style="position:absolute; top:0; left:0; width:100%; height:2px; background:linear-gradient(90deg, transparent, #ef4444, transparent); box-shadow:0 0 8px #ef4444; animation: laserScan 2s linear infinite;"></div>
        </div>
      </div>

      <!-- Controls & Status -->
      <div style="text-align:center; display:flex; flex-direction:column; gap:8px;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">Align barcode horizontally inside the frame</p>
        <div id="scanner-error-message" style="font-size:11px; color:#f87171; min-height:16px;">Detecting cameras...</div>
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
  let selectedCameraId = null;
  let usingFront = false;
  let isScanning = false;

  async function startScanning() {
    try {
      if (html5Qrcode) {
        await html5Qrcode.stop().catch(() => {});
      }
      
      const container = overlay.querySelector('#scanner-reader');
      container.innerHTML = '';

      // Create scanner with explicit format support + native barcode API
      html5Qrcode = new Html5Qrcode("scanner-reader", {
        formatsToSupport: SUPPORTED_FORMATS,
        useBarCodeDetectorIfSupported: true,
      });

      isScanning = true;
      errorEl.textContent = 'Starting camera stream...';
      errorEl.style.color = '#38bdf8';

      // Determine camera source
      let cameraConfig;
      if (usingFront) {
        cameraConfig = { facingMode: 'user' };
      } else if (selectedCameraId) {
        // Use the pre-selected main rear camera deviceId
        cameraConfig = selectedCameraId;
      } else {
        // First launch — detect and select the best rear camera
        errorEl.textContent = 'Selecting best camera...';
        const selected = await selectMainRearCamera();
        if (typeof selected === 'string') {
          selectedCameraId = selected;
          cameraConfig = selected;
        } else {
          cameraConfig = selected; // facingMode fallback
        }
      }

      await html5Qrcode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Rectangular scan region optimized for 1D barcodes
            const width = Math.floor(viewfinderWidth * 0.80);
            const height = Math.floor(Math.min(viewfinderHeight * 0.30, width * 0.45));
            return { width, height };
          },
          videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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

      // Apply continuous focus + zoom after stream is active
      await applyAdvancedConstraints(html5Qrcode);

      errorEl.textContent = 'Scanning — align barcode in frame';
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
    usingFront = !usingFront;
    startScanning();
  });

  startScanning();
}
