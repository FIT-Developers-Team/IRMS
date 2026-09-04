/**
 * Date and Time utilities for Asia/Jakarta (WIB / GMT+7)
 */

/**
 * Format a Date, ISO string, or timestamp into Asia/Jakarta datetime string (yyyy-MM-dd HH:mm:ss)
 * @param {Date|string|number|null|undefined} val
 * @returns {string} Formatted string "YYYY-MM-DD HH:mm:ss" or empty string
 */
export function formatJakartaDateTime(val = new Date()) {
  if (!val) return '';

  // If already in 'yyyy-MM-dd HH:mm:ss' format, return directly
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }

  let d;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    d = new Date(val);
  } else if (typeof val === 'string') {
    const str = val.trim();
    // If it's a date string with space or T without timezone, parse it or let Date handle it
    d = new Date(str);
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) {
    return String(val);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    });

    const parts = Object.fromEntries(formatter.formatToParts(d).map(p => [p.type, p.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  } catch (err) {
    console.error('Failed to format Jakarta datetime:', err);
    return d.toISOString().replace('T', ' ').substring(0, 19);
  }
}

/**
 * Robustly parse a timestamp into epoch milliseconds, correctly interpreting Asia/Jakarta datetimes.
 * @param {Date|string|number|null|undefined} ts
 * @returns {number} Epoch milliseconds (0 if invalid)
 */
export function parseJakartaTimestamp(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return isNaN(ts.getTime()) ? 0 : ts.getTime();

  const str = String(ts).trim();
  if (!str) return 0;

  // If format is "yyyy-MM-dd HH:mm:ss" or "yyyy-MM-ddTHH:mm:ss" without timezone offset,
  // explicitly attach Asia/Jakarta (+07:00) so parsing is timezone-accurate across all systems
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(str)) {
    const ms = new Date(str.replace(' ', 'T') + '+07:00').getTime();
    if (!isNaN(ms)) return ms;
  }

  const ms = new Date(str).getTime();
  return isNaN(ms) ? 0 : ms;
}

/**
 * Get date string "YYYY-MM-DD" in Asia/Jakarta timezone
 * @param {Date|string|number|null|undefined} val
 * @returns {string} "YYYY-MM-DD"
 */
export function getJakartaDateString(val = new Date()) {
  const dt = formatJakartaDateTime(val);
  return dt ? dt.substring(0, 10) : '';
}

/**
 * Return relative time ago string ("Just now", "5m ago", "2h ago", "3d ago")
 * @param {Date|string|number|null|undefined} timestamp
 * @returns {string}
 */
export function getTimeAgo(timestamp) {
  if (!timestamp) return '';
  const timeMs = parseJakartaTimestamp(timestamp);
  if (timeMs === 0) return '';

  const diff = Date.now() - timeMs;
  if (diff < 0) return 'Just now'; // Slight clock drift

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
