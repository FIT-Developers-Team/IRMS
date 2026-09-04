/**
 * Custom Mobile-Friendly Date & Time Range Picker for IRMS
 */
import { getJakartaDateString } from './dateTime.js';

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDateDisplay(dtStr) {
  if (!dtStr) return '';
  const clean = dtStr.replace('T', ' ');
  return clean.substring(0, 16);
}

/**
 * Open Custom Date & Time Range Picker Modal
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.subtitle
 * @param {string} options.initialStart - 'YYYY-MM-DDTHH:mm' or ''
 * @param {string} options.initialEnd   - 'YYYY-MM-DDTHH:mm' or ''
 * @param {Function} options.onApply    - (startVal, endVal) => void
 * @param {Function} options.onClear    - () => void
 */
export function openCustomDateRangePicker({
  title = 'Select Date & Time Range',
  subtitle = '',
  initialStart = '',
  initialEnd = '',
  onApply = () => {},
  onClear = () => {}
}) {
  const existing = document.getElementById('customDtPickerModal');
  if (existing) existing.remove();

  // Parse initial values
  let startDate = '';
  let startTime = '00:00';
  if (initialStart) {
    const parts = initialStart.split('T');
    startDate = parts[0] || '';
    if (parts[1]) startTime = parts[1].substring(0, 5);
  }

  let endDate = '';
  let endTime = '23:59';
  if (initialEnd) {
    const parts = initialEnd.split('T');
    endDate = parts[0] || '';
    if (parts[1]) endTime = parts[1].substring(0, 5);
  }

  const todayStr = getJakartaDateString() || new Date().toISOString().substring(0, 10);
  const [todayY, todayM] = todayStr.split('-').map(Number);

  let viewYear = startDate ? parseInt(startDate.split('-')[0], 10) : todayY;
  let viewMonth = startDate ? parseInt(startDate.split('-')[1], 10) - 1 : (todayM - 1);
  let activeStep = (!startDate || (startDate && endDate)) ? 'start' : 'end';
  let hoveredDate = null;

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const overlay = document.createElement('div');
  overlay.id = 'customDtPickerModal';
  overlay.className = 'custom-dt-modal-overlay';

  overlay.innerHTML = `
    <div class="custom-dt-modal-card" role="dialog" aria-modal="true">
      <!-- Header -->
      <div class="custom-dt-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="custom-dt-header-icon">
            <span class="material-icons-round">calendar_month</span>
          </div>
          <div>
            <h4 class="custom-dt-title">${title}</h4>
            ${subtitle ? `<span class="custom-dt-subtitle">${subtitle}</span>` : ''}
          </div>
        </div>
        <button type="button" class="custom-dt-close-btn" id="dtCloseBtn" title="Close">
          <span class="material-icons-round">close</span>
        </button>
      </div>

      <!-- Quick Presets -->
      <div class="custom-dt-presets-bar">
        <button type="button" class="custom-dt-preset-btn" data-preset="today">Today</button>
        <button type="button" class="custom-dt-preset-btn" data-preset="yesterday">Yesterday</button>
        <button type="button" class="custom-dt-preset-btn" data-preset="last7">Last 7 Days</button>
        <button type="button" class="custom-dt-preset-btn" data-preset="thisMonth">This Month</button>
      </div>

      <!-- Active Range Selection Summary Tabs -->
      <div class="custom-dt-tabs">
        <button type="button" class="custom-dt-tab ${activeStep === 'start' ? 'active' : ''}" id="tabStart">
          <span class="custom-dt-tab-tag">Start</span>
          <span class="custom-dt-tab-val" id="dtSummaryStart">${startDate ? `${startDate} ${startTime}` : 'Not set'}</span>
        </button>
        <div class="custom-dt-tab-arrow">
          <span class="material-icons-round">arrow_forward</span>
        </div>
        <button type="button" class="custom-dt-tab ${activeStep === 'end' ? 'active' : ''}" id="tabEnd">
          <span class="custom-dt-tab-tag end">End</span>
          <span class="custom-dt-tab-val" id="dtSummaryEnd">${endDate ? `${endDate} ${endTime}` : 'Not set'}</span>
        </button>
      </div>

      <!-- Calendar Navigation & Grid -->
      <div class="custom-dt-calendar-box">
        <div class="custom-dt-nav-row">
          <button type="button" class="custom-dt-nav-btn" id="dtPrevMonth" title="Previous Month">
            <span class="material-icons-round">chevron_left</span>
          </button>
          <span class="custom-dt-month-label" id="dtMonthLabel"></span>
          <button type="button" class="custom-dt-nav-btn" id="dtNextMonth" title="Next Month">
            <span class="material-icons-round">chevron_right</span>
          </button>
        </div>

        <div class="custom-dt-weekdays">
          ${DAY_NAMES.map(d => `<div class="custom-dt-weekday">${d}</div>`).join('')}
        </div>

        <div class="custom-dt-days-grid" id="dtDaysGrid"></div>
      </div>

      <!-- Time Pickers Section -->
      <div class="custom-dt-time-section">
        <div class="custom-dt-time-col">
          <label class="custom-dt-time-lbl">
            <span class="material-icons-round">schedule</span>
            <span>Start Time</span>
          </label>
          <div class="custom-dt-time-input-wrap">
            <input type="time" class="custom-dt-time-input" id="dtInputStartTime" value="${startTime}">
            <div class="custom-dt-time-quick-pills">
              <button type="button" class="custom-dt-quick-time" data-target="start" data-time="00:00">00:00</button>
              <button type="button" class="custom-dt-quick-time" data-target="start" data-time="08:00">08:00</button>
            </div>
          </div>
        </div>

        <div class="custom-dt-time-col">
          <label class="custom-dt-time-lbl">
            <span class="material-icons-round">schedule</span>
            <span>End Time</span>
          </label>
          <div class="custom-dt-time-input-wrap">
            <input type="time" class="custom-dt-time-input" id="dtInputEndTime" value="${endTime}">
            <div class="custom-dt-time-quick-pills">
              <button type="button" class="custom-dt-quick-time" data-target="end" data-time="18:00">18:00</button>
              <button type="button" class="custom-dt-quick-time" data-target="end" data-time="23:59">23:59</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="custom-dt-footer">
        <button type="button" class="custom-dt-btn custom-dt-btn-secondary" id="dtBtnClear">
          <span class="material-icons-round" style="font-size: 16px;">delete_outline</span>
          <span>Clear</span>
        </button>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="custom-dt-btn custom-dt-btn-ghost" id="dtBtnCancel">Cancel</button>
          <button type="button" class="custom-dt-btn custom-dt-btn-primary" id="dtBtnApply">
            <span class="material-icons-round" style="font-size: 16px;">check</span>
            <span>Apply Range</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // References
  const monthLabel = overlay.querySelector('#dtMonthLabel');
  const daysGrid = overlay.querySelector('#dtDaysGrid');
  const summaryStart = overlay.querySelector('#dtSummaryStart');
  const summaryEnd = overlay.querySelector('#dtSummaryEnd');
  const tabStart = overlay.querySelector('#tabStart');
  const tabEnd = overlay.querySelector('#tabEnd');
  const inputStartTime = overlay.querySelector('#dtInputStartTime');
  const inputEndTime = overlay.querySelector('#dtInputEndTime');

  function updateTabs() {
    summaryStart.textContent = startDate ? `${startDate} ${startTime}` : 'Not set';
    summaryEnd.textContent = endDate ? `${endDate} ${endTime}` : 'Not set';

    if (activeStep === 'start') {
      tabStart.classList.add('active');
      tabEnd.classList.remove('active');
    } else {
      tabStart.classList.remove('active');
      tabEnd.classList.add('active');
    }
  }

  function renderCalendar() {
    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    updateTabs();

    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    daysGrid.innerHTML = '';

    // Prev month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${pad(prevM + 1)}-${pad(dayNum)}`;

      const cell = document.createElement('div');
      cell.className = 'custom-dt-day-cell is-other-month';
      cell.textContent = dayNum;
      cell.dataset.date = dateStr;
      cell.addEventListener('click', () => handleDayClick(dateStr));
      daysGrid.appendChild(cell);
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(dayNum)}`;
      const cell = document.createElement('div');
      cell.className = 'custom-dt-day-cell';
      cell.textContent = dayNum;
      cell.dataset.date = dateStr;

      if (dateStr === todayStr) {
        cell.classList.add('is-today');
      }

      if (startDate && dateStr === startDate) {
        cell.classList.add('is-start-date');
      }
      if (endDate && dateStr === endDate) {
        cell.classList.add('is-end-date');
      }
      if (startDate && endDate && dateStr > startDate && dateStr < endDate) {
        cell.classList.add('is-in-range');
      }

      // Hover preview when picking end date
      if (activeStep === 'end' && startDate && !endDate && hoveredDate && hoveredDate > startDate) {
        if (dateStr > startDate && dateStr <= hoveredDate) {
          cell.classList.add('is-hover-range');
        }
      }

      cell.addEventListener('mouseenter', () => {
        if (activeStep === 'end' && startDate && !endDate) {
          hoveredDate = dateStr;
          renderCalendar();
        }
      });

      cell.addEventListener('click', () => handleDayClick(dateStr));
      daysGrid.appendChild(cell);
    }

    // Next month overflow days
    const totalCells = firstDayIndex + daysInMonth;
    const nextMonthDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let dayNum = 1; dayNum <= nextMonthDays; dayNum++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${pad(nextM + 1)}-${pad(dayNum)}`;

      const cell = document.createElement('div');
      cell.className = 'custom-dt-day-cell is-other-month';
      cell.textContent = dayNum;
      cell.dataset.date = dateStr;
      cell.addEventListener('click', () => handleDayClick(dateStr));
      daysGrid.appendChild(cell);
    }
  }

  function handleDayClick(dateStr) {
    if (activeStep === 'start') {
      startDate = dateStr;
      if (endDate && endDate < startDate) {
        endDate = '';
      }
      activeStep = 'end';
    } else {
      if (!startDate || dateStr < startDate) {
        startDate = dateStr;
        endDate = '';
        activeStep = 'end';
      } else {
        endDate = dateStr;
        activeStep = 'start';
      }
    }
    hoveredDate = null;
    renderCalendar();
  }

  // Preset Handlers
  overlay.querySelectorAll('.custom-dt-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      const [tYear, tMonth, tDay] = todayStr.split('-').map(Number);

      if (preset === 'today') {
        startDate = todayStr;
        startTime = '00:00';
        endDate = todayStr;
        endTime = '23:59';
      } else if (preset === 'yesterday') {
        const yDate = new Date(tYear, tMonth - 1, tDay - 1);
        const yStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;
        startDate = yStr;
        startTime = '00:00';
        endDate = yStr;
        endTime = '23:59';
      } else if (preset === 'last7') {
        const pastDate = new Date(tYear, tMonth - 1, tDay - 6);
        const pStr = `${pastDate.getFullYear()}-${pad(pastDate.getMonth() + 1)}-${pad(pastDate.getDate())}`;
        startDate = pStr;
        startTime = '00:00';
        endDate = todayStr;
        endTime = '23:59';
      } else if (preset === 'thisMonth') {
        startDate = `${tYear}-${pad(tMonth)}-01`;
        startTime = '00:00';
        endDate = todayStr;
        endTime = '23:59';
      }

      inputStartTime.value = startTime;
      inputEndTime.value = endTime;
      activeStep = 'start';
      viewYear = tYear;
      viewMonth = tMonth - 1;
      renderCalendar();
    });
  });

  // Step tabs
  tabStart.addEventListener('click', () => {
    activeStep = 'start';
    if (startDate) {
      viewYear = parseInt(startDate.split('-')[0], 10);
      viewMonth = parseInt(startDate.split('-')[1], 10) - 1;
    }
    renderCalendar();
  });

  tabEnd.addEventListener('click', () => {
    activeStep = 'end';
    if (endDate) {
      viewYear = parseInt(endDate.split('-')[0], 10);
      viewMonth = parseInt(endDate.split('-')[1], 10) - 1;
    }
    renderCalendar();
  });

  // Month navigation
  overlay.querySelector('#dtPrevMonth').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  });

  overlay.querySelector('#dtNextMonth').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
  });

  // Time Inputs
  inputStartTime.addEventListener('change', (e) => {
    startTime = e.target.value || '00:00';
    updateTabs();
  });
  inputEndTime.addEventListener('change', (e) => {
    endTime = e.target.value || '23:59';
    updateTabs();
  });

  overlay.querySelectorAll('.custom-dt-quick-time').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const tVal = btn.dataset.time;
      if (target === 'start') {
        startTime = tVal;
        inputStartTime.value = tVal;
      } else {
        endTime = tVal;
        inputEndTime.value = tVal;
      }
      updateTabs();
    });
  });

  // Close & Cancel
  function closeModal() {
    overlay.remove();
  }

  overlay.querySelector('#dtCloseBtn').addEventListener('click', closeModal);
  overlay.querySelector('#dtBtnCancel').addEventListener('click', closeModal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Clear
  overlay.querySelector('#dtBtnClear').addEventListener('click', () => {
    startDate = '';
    endDate = '';
    onClear();
    closeModal();
  });

  // Apply
  overlay.querySelector('#dtBtnApply').addEventListener('click', () => {
    const startVal = startDate ? `${startDate}T${startTime || '00:00'}` : '';
    const endVal = endDate ? `${endDate}T${endTime || '23:59'}` : '';
    onApply(startVal, endVal);
    closeModal();
  });

  renderCalendar();
}
