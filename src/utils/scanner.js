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
 * Find the best back camera deviceId.
 * 
 * Strategy (bulletproof):
 * 1. Request getUserMedia with facingMode: { exact: 'environment' }.
 *    This forces the OS to open a REAR camera. We then read the actual
 *    deviceId from track.getSettings().deviceId.
 * 2. Enumerate all video devices (labels are now revealed).
 * 3. Among rear cameras, prefer the standard 1x main lens over ultrawide.
 * 4. Stop the temporary stream.
 * 
 * Returns the deviceId string, or null if detection fails.
 */
async function findMainBackCameraId() {
  let tempStream = null;
  
  try {
    // === PHASE 1: Get a confirmed back-camera deviceId from the OS ===
    let confirmedBackDeviceId = null;

    // Try exact: 'environment' — this MUST open a rear camera or throw
    try {
      tempStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: 'environment' } }
      });
      const track = tempStream.getVideoTracks()[0];
      const settings = track.getSettings();
      confirmedBackDeviceId = settings.deviceId || null;
      console.log('[Scanner] OS back camera deviceId:', confirmedBackDeviceId, 'label:', track.label);
    } catch (e) {
      console.warn('[Scanner] exact:environment failed, trying ideal:', e.message);
      // Fallback: use ideal (may give front on some devices, we'll verify below)
      try {
        tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        const track = tempStream.getVideoTracks()[0];
        const settings = track.getSettings();
        // Only trust this if the OS reports it as environment
        if (settings.facingMode === 'environment') {
          confirmedBackDeviceId = settings.deviceId || null;
        }
        console.log('[Scanner] ideal stream facingMode:', settings.facingMode, 'deviceId:', settings.deviceId);
      } catch (e2) {
        console.warn('[Scanner] ideal:environment also failed:', e2.message);
        tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
    }

    // === PHASE 2: Enumerate all cameras (labels are now available) ===
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    // Stop the temporary stream
    if (tempStream) {
      tempStream.getTracks().forEach(t => t.stop());
      tempStream = null;
    }

    console.log('[Scanner] All cameras:', videoDevices.map(d => `"${d.label}" (${d.deviceId.substring(0, 12)}...)`));

    if (videoDevices.length === 0) return null;
    if (videoDevices.length === 1) return videoDevices[0].deviceId;

    // === PHASE 3: If we have a confirmed back deviceId, check if there's a better main lens ===
    const FRONT_KEYWORDS = ['front', 'user', 'selfie', 'facing front', 'facingfront'];
    const ULTRAWIDE_KEYWORDS = ['ultra', '0.5', '0.6', 'wide-angle', 'wide angle', 'macro', 'depth', 'aux'];
    
    // If the OS gave us a definitive back camera, see if it's ultrawide
    // and if there's a better main camera available
    if (confirmedBackDeviceId) {
      const confirmedDevice = videoDevices.find(d => d.deviceId === confirmedBackDeviceId);
      const confirmedLabel = (confirmedDevice?.label || '').toLowerCase();
      const isConfirmedUltraWide = ULTRAWIDE_KEYWORDS.some(kw => confirmedLabel.includes(kw));

      if (!isConfirmedUltraWide) {
        // OS picked a non-ultrawide back camera — trust it
        console.log('[Scanner] Using OS-selected back camera:', confirmedDevice?.label);
        return confirmedBackDeviceId;
      }

      // OS picked ultrawide — find the main lens among other back cameras
      console.log('[Scanner] OS picked ultrawide, looking for main lens...');
      for (const dev of videoDevices) {
        if (dev.deviceId === confirmedBackDeviceId) continue;
        const label = (dev.label || '').toLowerCase();
        if (FRONT_KEYWORDS.some(kw => label.includes(kw))) continue;
        if (ULTRAWIDE_KEYWORDS.some(kw => label.includes(kw))) continue;
        // This is likely the main rear camera
        console.log('[Scanner] Found main lens:', dev.label);
        return dev.deviceId;
      }
      // No better option found, use the ultrawide
      return confirmedBackDeviceId;
    }

    // === PHASE 4: No confirmed back deviceId — classify by labels ===
    const MAIN_KEYWORDS = ['main', 'primary', '1x', 'standard', 'back', 'rear', 'environment'];
    
    const scored = videoDevices.map(dev => {
      const label = (dev.label || '').toLowerCase();
      const isFront = FRONT_KEYWORDS.some(kw => label.includes(kw));
      const isUltra = ULTRAWIDE_KEYWORDS.some(kw => label.includes(kw));
      const isMain = MAIN_KEYWORDS.some(kw => label.includes(kw));
      
      let score = 0;
      if (isFront) score = -100;
      else if (isMain && !isUltra) score = 100;
      else if (!isUltra) score = 50;
      else score = -10;

      return { deviceId: dev.deviceId, label: dev.label, score };
    });

    scored.sort((a, b) => b.score - a.score);
    console.log('[Scanner] Scored cameras:', scored.map(s => `"${s.label}" score:${s.score}`));

    // Pick the highest-scored camera
    if (scored[0].score > -100) {
      return scored[0].deviceId;
    }

    // Desperate fallback: use the last device (often back camera on Android)
    return videoDevices[videoDevices.length - 1].deviceId;

  } catch (err) {
    console.warn('[Scanner] Camera detection failed, will use facingMode fallback:', err);
    // Clean up temp stream if still open
    if (tempStream) {
      tempStream.getTracks().forEach(t => t.stop());
    }
    return null;
  }
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

        <!-- Scanning Reticle Overlay -->
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

      <!-- Instructions & Status -->
      <div style="text-align:center; display:flex; flex-direction:column; gap:8px;">
        <p style="font-size:12px; color:#94a3b8; margin:0;">Align linear barcode (Code 128/EAN) or QR code inside the box</p>
        <div id="scanner-error-message" style="font-size:11px; color:#38bdf8; min-height:16px; font-weight:500;">Detecting main camera...</div>
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
  const torchBtn = overlay.querySelector('#scannerTorchBtn');
  const zoomBtn = overlay.querySelector('#scannerZoomBtn');
  const zoomLabel = overlay.querySelector('#scannerZoomLabel');

  let html5Qrcode = null;
  let isScanning = false;
  let activeVideoTrack = null;
  let isTorchOn = false;
  let currentZoom = 1.0;
  let maxZoom = 1.0;
  let minZoom = 1.0;

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
      console.warn('[Scanner] Track capabilities warning:', e);
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
      console.warn('[Scanner] Torch toggle error:', err);
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
      console.warn('[Scanner] Zoom error:', err);
    }
  });

  async function startScanning(backCameraDeviceId) {
    try {
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
      errorEl.textContent = 'Starting camera...';
      errorEl.style.color = '#38bdf8';

      // Camera config: html5-qrcode .start() expects either:
      //   - a plain string deviceId (e.g. "abc123...")
      //   - or { facingMode: 'environment' }
      // NOT { deviceId: { exact: ... } } — that gets silently ignored!
      const cameraConfig = backCameraDeviceId
        ? backCameraDeviceId
        : { facingMode: 'environment' };

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

      await html5Qrcode.start(
        cameraConfig,
        scanConfig,
        handleScanSuccess,
        () => {}
      );

      errorEl.textContent = 'Align barcode inside the frame';
      errorEl.style.color = '#94a3b8';

      // Setup torch/zoom once stream is live
      setTimeout(attachTrackCapabilities, 350);

    } catch (err) {
      console.error('[Scanner] Start error:', err);
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

  // Main initialization: find back camera first, then start scanning
  findMainBackCameraId().then(deviceId => {
    if (deviceId) {
      console.log('[Scanner] Using deviceId:', deviceId);
    } else {
      console.log('[Scanner] No deviceId found, using facingMode: environment');
    }
    startScanning(deviceId);
  });
}
