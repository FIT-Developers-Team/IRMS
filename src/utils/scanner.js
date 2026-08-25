import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Audio feedback for successful scan
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (_) {
    // Ignore audio context errors
  }
}

// All standard 1D & 2D barcode formats for warehouse & retail
const ALL_SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
  Html5QrcodeSupportedFormats.PDF_417
];

/**
 * Classify available cameras into rear and front arrays with priority.
 * Back cameras without 'ultra', 'wide-angle', '0.5' get higher priority.
 */
function classifyCameras(cameras) {
  const rearCameras = [];
  const frontCameras = [];

  cameras.forEach((cam, idx) => {
    const label = (cam.label || '').toLowerCase();
    const isFront = label.includes('front') || label.includes('user') || label.includes('selfie') || label.includes('facing front');

    if (isFront) {
      frontCameras.push({ ...cam, displayName: cam.label || `Front Camera ${frontCameras.length + 1}` });
    } else {
      // Rear camera
      const isUltraWide = label.includes('ultra') || label.includes('0.5') || label.includes('0.6') || label.includes('wide-angle') || label.includes('wide angle') || label.includes('macro') || label.includes('depth') || label.includes('aux');
      const isTelephoto = label.includes('telephoto') || label.includes('2x') || label.includes('3x') || label.includes('5x') || label.includes('zoom');
      const isMain = label.includes('main') || label.includes('primary') || label.includes('1x') || label.includes('standard') || label.includes('camera2 0') || label.includes('back 0') || label.includes('rear 0');

      let displayName = cam.label || `Back Camera ${rearCameras.length + 1}`;
      if (isMain) displayName = `📷 Main Camera (1x)`;
      else if (isUltraWide) displayName = `📷 Ultra-Wide (0.5x)`;
      else if (isTelephoto) displayName = `📷 Telephoto/Zoom`;

      rearCameras.push({
        ...cam,
        displayName,
        isUltraWide,
        isTelephoto,
        isMain,
        priority: isMain ? 3 : (!isUltraWide && !isTelephoto ? 2 : (isTelephoto ? 1 : 0))
      });
    }
  });

  // Sort rear cameras so standard 1x main back camera is prioritized
  rearCameras.sort((a, b) => b.priority - a.priority);

  return { rearCameras, frontCameras };
}

export function openCameraScanner(onScanSuccess) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay scanner-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.92); backdrop-filter:blur(10px); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:9999; color:#fff; font-family:var(--font-family, sans-serif); padding:16px; box-sizing:border-box;';

  overlay.innerHTML = `
    <div class="scanner-card" style="width:100%; max-width:440px; background:#1e293b; border-radius:24px; border:1.5px solid rgba(255,255,255,0.12); padding:20px; box-shadow:0 25px 60px -12px rgba(0,0,0,0.6); display:flex; flex-direction:column; gap:14px; position:relative; box-sizing:border-box;">
      
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="material-icons-round" style="color:#38bdf8; font-size:22px;">qr_code_scanner</span>
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:700; color:#f8fafc;">Barcode & QR Scanner</h3>
            <span id="scanner-engine-tag" style="font-size:10px; color:#94a3b8; font-weight:500;">High-Speed Optical Engine</span>
          </div>
        </div>
        <button id="closeScannerBtn" style="border:none; background:rgba(255,255,255,0.08); color:#cbd5e1; cursor:pointer; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; transition:background 0.2s;">
          <span class="material-icons-round" style="font-size:20px;">close</span>
        </button>
      </div>

      <!-- Preview Box with Rectangular Scanning Viewport -->
      <div style="position:relative; width:100%; height:260px; background:#0b1120; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:center;">
        <!-- Camera Stream Viewport -->
        <div id="scanner-reader" style="width:100%; height:100%;"></div>

        <!-- Scanning Reticle Overlay (Rectangular for 1D barcodes & 2D codes) -->
        <div class="scanner-reticle" style="position:absolute; width:82%; height:58%; border:2px solid #38bdf8; border-radius:12px; pointer-events:none; box-shadow:0 0 0 9999px rgba(15,23,42,0.45); display:flex; align-items:center; justify-content:center;">
          <!-- Corner Accents -->
          <div style="position:absolute; top:-2px; left:-2px; width:16px; height:16px; border-top:3px solid #38bdf8; border-left:3px solid #38bdf8; border-radius:4px 0 0 0;"></div>
          <div style="position:absolute; top:-2px; right:-2px; width:16px; height:16px; border-top:3px solid #38bdf8; border-right:3px solid #38bdf8; border-radius:0 4px 0 0;"></div>
          <div style="position:absolute; bottom:-2px; left:-2px; width:16px; height:16px; border-bottom:3px solid #38bdf8; border-left:3px solid #38bdf8; border-radius:0 0 0 4px;"></div>
          <div style="position:absolute; bottom:-2px; right:-2px; width:16px; height:16px; border-bottom:3px solid #38bdf8; border-right:3px solid #38bdf8; border-radius:0 0 4px 0;"></div>
          
          <!-- Laser Line Animation -->
          <div class="scanner-laser" style="position:absolute; top:0; left:0; width:100%; height:2px; background:linear-gradient(90deg, transparent, #38bdf8, #ef4444, #38bdf8, transparent); box-shadow:0 0 10px #38bdf8; animation: laserScan 2.2s ease-in-out infinite;"></div>
        </div>

        <!-- Camera In-Viewport Overlay Controls (Flashlight & Zoom) -->
        <div style="position:absolute; bottom:10px; right:10px; display:flex; gap:8px; z-index:20;">
          <button id="scannerTorchBtn" style="display:none; border:none; background:rgba(15,23,42,0.75); backdrop-filter:blur(6px); color:#f8fafc; cursor:pointer; width:34px; height:34px; border-radius:50%; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.2); transition:0.2s;" title="Toggle Flashlight">
            <span class="material-icons-round" style="font-size:18px;">flash_on</span>
          </button>
          <button id="scannerZoomBtn" style="display:none; border:none; background:rgba(15,23,42,0.75); backdrop-filter:blur(6px); color:#f8fafc; cursor:pointer; min-width:34px; height:34px; padding:0 8px; border-radius:17px; align-items:center; justify-content:center; font-size:11px; font-weight:700; border:1px solid rgba(255,255,255,0.2); transition:0.2s;" title="Toggle Zoom">
            <span id="scannerZoomLabel">1x</span>
          </button>
        </div>
      </div>

      <!-- Instructions & Camera Selectors -->
      <div style="text-align:center; display:flex; flex-direction:column; gap:10px;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">Align linear barcode (Code 128/EAN) or QR code inside the box</p>
        <div id="scanner-error-message" style="font-size:11px; color:#38bdf8; min-height:16px; font-weight:500;">Starting back camera...</div>
        
        <!-- Controls Toolbar -->
        <div style="display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap;">
          <!-- Camera Selection Dropdown -->
          <div id="cameraSelectContainer" style="display:none; align-items:center;">
            <select id="scannerCameraSelect" style="height:32px; padding:0 10px; font-size:11px; font-weight:600; border-radius:8px; background:#0f172a; color:#e2e8f0; border:1px solid rgba(255,255,255,0.15); outline:none; cursor:pointer; max-width:200px; text-overflow:ellipsis;">
            </select>
          </div>

          <!-- Toggle Front/Back Camera Button -->
          <button id="toggleCameraFacingBtn" class="btn-secondary" style="height:32px; padding:0 12px; font-size:11px; font-weight:600; border-radius:8px; background:rgba(255,255,255,0.06); color:#e2e8f0; border:1px solid rgba(255,255,255,0.12); gap:4px; display:inline-flex; align-items:center; cursor:pointer; outline:none; transition:background 0.2s;">
            <span class="material-icons-round" style="font-size:15px;">flip_camera_ios</span>
            <span id="toggleCameraFacingText">Switch Camera</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Laser Animation & Video Fit CSS -->
    <style>
      @keyframes laserScan {
        0% { top: 4%; opacity: 0.8; }
        50% { top: 94%; opacity: 1; }
        100% { top: 4%; opacity: 0.8; }
      }
      #scanner-reader {
        width: 100% !important;
        height: 100% !important;
        position: relative;
      }
      #scanner-reader video {
        object-fit: cover !important;
        width: 100% !important;
        height: 100% !important;
      }
      #scanner-reader img {
        display: none !important;
      }
    </style>
  `;

  document.body.appendChild(overlay);

  const errorEl = overlay.querySelector('#scanner-error-message');
  const engineTag = overlay.querySelector('#scanner-engine-tag');
  const closeBtn = overlay.querySelector('#closeScannerBtn');
  const toggleBtn = overlay.querySelector('#toggleCameraFacingBtn');
  const cameraSelectContainer = overlay.querySelector('#cameraSelectContainer');
  const cameraSelect = overlay.querySelector('#scannerCameraSelect');
  const torchBtn = overlay.querySelector('#scannerTorchBtn');
  const zoomBtn = overlay.querySelector('#scannerZoomBtn');
  const zoomLabel = overlay.querySelector('#scannerZoomLabel');

  let html5Qrcode = null;
  let isScanning = false;
  let availableRearCameras = [];
  let availableFrontCameras = [];
  let currentSelectedDeviceId = null;
  let activeVideoTrack = null;
  let isTorchOn = false;
  let currentZoom = 1.0;
  let maxZoom = 1.0;
  let minZoom = 1.0;
  let facingMode = 'environment'; // Always default to environment (back) camera!
  let camerasEnumerated = false;

  // Detect native BarcodeDetector API support
  const hasNativeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
  if (hasNativeDetector) {
    engineTag.textContent = '⚡ Hardware-Accelerated Native Engine';
    engineTag.style.color = '#34d399';
  } else {
    engineTag.textContent = 'High-Precision Optical Engine';
  }

  // Setup torch and zoom capabilities after video track is active
  function attachTrackCapabilities() {
    try {
      const videoEl = overlay.querySelector('#scanner-reader video');
      if (!videoEl || !videoEl.srcObject) return;

      const stream = videoEl.srcObject;
      const tracks = stream.getVideoTracks();
      if (!tracks || tracks.length === 0) return;

      activeVideoTrack = tracks[0];
      const capabilities = activeVideoTrack.getCapabilities ? activeVideoTrack.getCapabilities() : {};

      // Flashlight / Torch
      if (capabilities.torch) {
        torchBtn.style.display = 'flex';
        isTorchOn = false;
        torchBtn.style.background = 'rgba(15,23,42,0.75)';
        torchBtn.style.color = '#f8fafc';
      } else {
        torchBtn.style.display = 'none';
      }

      // Zoom capability
      if (capabilities.zoom && capabilities.zoom.max > 1) {
        zoomBtn.style.display = 'flex';
        minZoom = capabilities.zoom.min || 1.0;
        maxZoom = capabilities.zoom.max || 1.0;
        currentZoom = minZoom;
        zoomLabel.textContent = `${Math.round(currentZoom)}x`;
      } else {
        zoomBtn.style.display = 'none';
      }
    } catch (e) {
      console.warn('Track capabilities warning:', e);
    }
  }

  // Torch click handler
  torchBtn.addEventListener('click', async () => {
    if (!activeVideoTrack) return;
    try {
      isTorchOn = !isTorchOn;
      await activeVideoTrack.applyConstraints({
        advanced: [{ torch: isTorchOn }]
      });
      torchBtn.style.background = isTorchOn ? '#eab308' : 'rgba(15,23,42,0.75)';
      torchBtn.style.color = isTorchOn ? '#0f172a' : '#f8fafc';
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  });

  // Zoom click handler (cycle 1x -> 2x -> 3x -> 1x)
  zoomBtn.addEventListener('click', async () => {
    if (!activeVideoTrack) return;
    try {
      if (currentZoom < 1.9 && maxZoom >= 2.0) {
        currentZoom = 2.0;
      } else if (currentZoom < 2.9 && maxZoom >= 3.0) {
        currentZoom = 3.0;
      } else {
        currentZoom = minZoom;
      }
      await activeVideoTrack.applyConstraints({
        advanced: [{ zoom: currentZoom }]
      });
      zoomLabel.textContent = `${currentZoom}x`;
    } catch (err) {
      console.warn('Zoom error:', err);
    }
  });

  // Query camera devices after camera stream starts (when labels are revealed by the browser)
  async function refreshCameraList() {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) return;

      const { rearCameras, frontCameras } = classifyCameras(devices);
      availableRearCameras = rearCameras;
      availableFrontCameras = frontCameras;

      // Populate camera select dropdown if multiple cameras exist
      if (devices.length > 1) {
        cameraSelect.innerHTML = '';
        
        if (availableRearCameras.length > 0) {
          const optGroupRear = document.createElement('optgroup');
          optGroupRear.label = 'Back Cameras';
          availableRearCameras.forEach(cam => {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.textContent = cam.displayName;
            optGroupRear.appendChild(opt);
          });
          cameraSelect.appendChild(optGroupRear);
        }

        if (availableFrontCameras.length > 0) {
          const optGroupFront = document.createElement('optgroup');
          optGroupFront.label = 'Front Cameras';
          availableFrontCameras.forEach(cam => {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.textContent = cam.displayName;
            optGroupFront.appendChild(opt);
          });
          cameraSelect.appendChild(optGroupFront);
        }

        // Set select value to active device if known
        if (currentSelectedDeviceId) {
          cameraSelect.value = currentSelectedDeviceId;
        } else if (facingMode === 'environment' && availableRearCameras.length > 0) {
          cameraSelect.value = availableRearCameras[0].id;
        } else if (facingMode === 'user' && availableFrontCameras.length > 0) {
          cameraSelect.value = availableFrontCameras[0].id;
        }

        cameraSelectContainer.style.display = 'flex';
      }
      camerasEnumerated = true;
    } catch (err) {
      console.warn('Unable to query camera devices:', err);
    }
  }

  cameraSelect.addEventListener('change', () => {
    currentSelectedDeviceId = cameraSelect.value;
    const isFront = availableFrontCameras.some(c => c.id === currentSelectedDeviceId);
    facingMode = isFront ? 'user' : 'environment';
    startScanning();
  });

  async function startScanning() {
    try {
      if (html5Qrcode && isScanning) {
        isScanning = false;
        await html5Qrcode.stop().catch(() => {});
      }
      
      const container = overlay.querySelector('#scanner-reader');
      container.innerHTML = '';

      // Initialize Html5Qrcode with all barcode formats and native detector enabled
      html5Qrcode = new Html5Qrcode("scanner-reader", {
        formatsToSupport: ALL_SUPPORTED_FORMATS,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        verbose: false
      });

      isScanning = true;
      errorEl.textContent = facingMode === 'user' ? 'Starting front camera...' : 'Starting back camera...';
      errorEl.style.color = '#38bdf8';

      // Build camera configuration:
      // If a specific deviceId was explicitly selected, use it.
      // Otherwise, use { facingMode: 'environment' } (or 'user') which forces the browser to open the correct lens!
      let cameraConfig;
      if (currentSelectedDeviceId) {
        cameraConfig = { deviceId: { exact: currentSelectedDeviceId } };
      } else {
        cameraConfig = { facingMode: { exact: facingMode } };
      }

      // High-resolution video constraints for fine 1D linear barcodes
      const scanConfig = {
        fps: 25,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const boxWidth = Math.floor(Math.min(viewfinderWidth * 0.88, 360));
          const boxHeight = Math.floor(Math.min(viewfinderHeight * 0.58, 200));
          return { width: Math.max(boxWidth, 220), height: Math.max(boxHeight, 140) };
        },
        aspectRatio: 1.0,
        videoConstraints: {
          width: { min: 640, ideal: 1920, max: 1920 },
          height: { min: 480, ideal: 1080, max: 1080 },
          focusMode: 'continuous',
          advanced: [
            { focusMode: 'continuous' }
          ]
        }
      };

      try {
        await html5Qrcode.start(
          cameraConfig,
          scanConfig,
          handleScanSuccess,
          () => {}
        );
      } catch (exactErr) {
        // Some mobile browsers reject { exact: 'environment' }. Fallback to standard { facingMode: facingMode }
        console.warn('Exact facingMode fallback:', exactErr);
        cameraConfig = { facingMode: facingMode };
        await html5Qrcode.start(
          cameraConfig,
          scanConfig,
          handleScanSuccess,
          () => {}
        );
      }

      errorEl.textContent = 'Align barcode inside the frame';
      errorEl.style.color = '#94a3b8';

      // Setup torch/zoom & enumerate cameras once stream is live
      setTimeout(() => {
        attachTrackCapabilities();
        if (!camerasEnumerated) {
          refreshCameraList();
        }
      }, 350);

    } catch (err) {
      console.error('Html5Qrcode scanner start error:', err);
      errorEl.textContent = 'Camera error: ' + (err.message || err || 'Access denied');
      errorEl.style.color = '#f87171';
      isScanning = false;
    }
  }

  function handleScanSuccess(decodedText) {
    playBeep();
    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }

    // Visual feedback pulse
    const reticle = overlay.querySelector('.scanner-reticle');
    if (reticle) {
      reticle.style.borderColor = '#10b981';
      reticle.style.boxShadow = '0 0 20px #10b981, 0 0 0 9999px rgba(15,23,42,0.5)';
    }

    errorEl.textContent = `Scanned: ${decodedText}`;
    errorEl.style.color = '#34d399';

    setTimeout(() => {
      cleanup();
      if (typeof onScanSuccess === 'function') {
        onScanSuccess(decodedText);
      }
    }, 150);
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
    // Switch between environment (back) and user (front)
    if (facingMode === 'environment') {
      facingMode = 'user';
      if (availableFrontCameras.length > 0) {
        currentSelectedDeviceId = availableFrontCameras[0].id;
      } else {
        currentSelectedDeviceId = null;
      }
    } else {
      facingMode = 'environment';
      if (availableRearCameras.length > 0) {
        currentSelectedDeviceId = availableRearCameras[0].id;
      } else {
        currentSelectedDeviceId = null;
      }
    }

    if (cameraSelect && currentSelectedDeviceId) {
      cameraSelect.value = currentSelectedDeviceId;
    }

    startScanning();
  });

  // Start back camera directly
  startScanning();
}

