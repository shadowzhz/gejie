export const MIN_PER_KE = 15;
export const MIN_PER_SHICHEN = 120;
export const MIN_PER_DAY = 1440;
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;
export const MIN_PER_MONTH = MIN_PER_DAY * DAYS_PER_MONTH;
export const MIN_PER_YEAR = MIN_PER_MONTH * MONTHS_PER_YEAR;

export const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function makeTime(year, month, day, shichen = 0) {
  return (((year - 1) * MONTHS_PER_YEAR + (month - 1)) * DAYS_PER_MONTH + (day - 1)) * MIN_PER_DAY + shichen * MIN_PER_SHICHEN;
}

export function yearOf(m) { return Math.floor(m / MIN_PER_YEAR) + 1; }
export function monthOf(m) { return Math.floor(m / MIN_PER_MONTH) % MONTHS_PER_YEAR + 1; }
export function dayOf(m) { return Math.floor(m / MIN_PER_DAY) % DAYS_PER_MONTH + 1; }
export function minuteOfDay(m) { return ((m % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY; }
export function shichenOf(m) { return Math.floor(minuteOfDay(m) / MIN_PER_SHICHEN); }
export function keOf(m) { return Math.floor((minuteOfDay(m) % MIN_PER_SHICHEN) / MIN_PER_KE) + 1; }
export function isNight(m) { const mod = minuteOfDay(m); return mod < 360 || mod >= 1080; }

export function cnNum(n) {
  if (n <= 10) return DIGITS[n] || String(n);
  if (n < 20) return '十' + DIGITS[n - 10];
  const t = DIGITS[Math.floor(n / 10)] + '十';
  return n % 10 === 0 ? t : t + DIGITS[n % 10];
}

export function dayName(d) {
  if (d <= 10) return '初' + DIGITS[d];
  if (d < 20) return '十' + DIGITS[d - 10];
  if (d === 20) return '二十';
  if (d < 30) return '廿' + DIGITS[d - 20];
  return '三十';
}

export function formatDateTime(m) {
  return `第${cnNum(yearOf(m))}年 ${MONTHS[monthOf(m) - 1]}${dayName(dayOf(m))} · ${SHICHEN[shichenOf(m)]}时${keOf(m)}刻`;
}

export function formatDuration(minutes) {
  if (minutes >= MIN_PER_DAY) return `${Math.round(minutes / MIN_PER_DAY)} 日`;
  if (minutes >= MIN_PER_SHICHEN && minutes % MIN_PER_SHICHEN === 0) return `${minutes / MIN_PER_SHICHEN} 时辰`;
  return `${Math.max(1, Math.round(minutes / MIN_PER_KE))} 刻`;
}

export function parseTimeExpr(str) {
  const parts = String(str).split('-');
  if (parts.length < 3) return 0;
  return makeTime(Number(parts[0]) || 1, Number(parts[1]) || 1, Number(parts[2]) || 1, Number(parts[3]) || 0);
}
