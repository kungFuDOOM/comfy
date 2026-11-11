// Real-clock day cycle and real-calendar seasons.
export interface Season {
  id: string;
  name: string;
  months: number[]; // 1-12
  grass: string;
  grassAlt: string;
  hill: string;
  leaf: string;
  leafAlt: string;
  petal: string;
  blurb: string;
}

export const SEASONS: Season[] = [
  { id: 'blossom', name: 'Blossom Bloom', months: [3, 4, 5], grass: '#a4e6a6', grassAlt: '#b4edab', hill: '#c2f0b4', leaf: '#ffb6d0', leafAlt: '#ff9cc2', petal: '#ffc2d8', blurb: 'Petals everywhere. Ribbon Blossoms thrive.' },
  { id: 'sunsip', name: 'Sunsip Days', months: [6, 7, 8], grass: '#94e0a0', grassAlt: '#a6e8a6', hill: '#b8eeae', leaf: '#86d9a2', leafAlt: '#a3e69a', petal: '#fff2a8', blurb: 'Long glowy days. Dewdrop Shells wash ashore.' },
  { id: 'cocoa', name: 'Cocoa Leaf', months: [9, 10, 11], grass: '#ace39f', grassAlt: '#bde8a0', hill: '#c8edab', leaf: '#ffb48a', leafAlt: '#ff9fa8', petal: '#ffb08a', blurb: 'Cozy knits and drifting leaves. Perfect café weather.' },
  { id: 'snowfluff', name: 'Snowfluff', months: [12, 1, 2], grass: '#eef7fc', grassAlt: '#e3f1fa', hill: '#f6fbff', leaf: '#9fdcc0', leafAlt: '#b6e6cf', petal: '#ffffff', blurb: 'Soft snow. Starlit Buttons sparkle on the hill.' },
];

export type Phase = 'morning' | 'day' | 'evening' | 'night';
export interface Clock {
  hour: number;
  label: string;
  weekday: string;
  month: number;
  dayOfMonth: number;
  dayKey: string;
  season: Season;
  phase: Phase;
  phaseName: string;
}

const params = new URLSearchParams(location.search);
const hourOverride = params.has('hour') ? Number(params.get('hour')) : null;
const monthOverride = params.has('month') ? Number(params.get('month')) : null;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PHASE_NAMES: Record<Phase, string> = { morning: 'Morning', day: 'Daytime', evening: 'Evening', night: 'Night' };

export function seasonForMonth(m: number): Season {
  return SEASONS.find((s) => s.months.includes(m)) ?? SEASONS[0];
}

export function phaseForHour(h: number): Phase {
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20.5) return 'evening';
  return 'night';
}

export function getClock(): Clock {
  const d = new Date();
  let hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  if (hourOverride !== null && !Number.isNaN(hourOverride)) hour = hourOverride;
  const month = monthOverride && monthOverride >= 1 && monthOverride <= 12 ? monthOverride : d.getMonth() + 1;
  const h24 = Math.floor(hour);
  const mm = Math.floor((hour - h24) * 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const phase = phaseForHour(hour);
  return {
    hour,
    label: `${h12}:${String(mm).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`,
    weekday: DAYS[d.getDay()],
    month,
    dayOfMonth: d.getDate(),
    dayKey: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
    season: seasonForMonth(month),
    phase,
    phaseName: PHASE_NAMES[phase],
  };
}

// Multiply-tint keyframes: [hour, r, g, b].
// Kept close to white so colors stay saturated; night is a gentle cool blue, never a grey/purple wash.
const NIGHT: [number, number, number] = [184, 198, 248];
const KEYS: [number, number, number, number][] = [
  [0, ...NIGHT],
  [4.6, ...NIGHT],
  [6, 238, 222, 244],
  [7.4, 255, 240, 232],
  [9.5, 255, 253, 248],
  [16, 255, 252, 244],
  [17.6, 255, 236, 208],
  [19, 255, 214, 186],
  [20.2, 222, 204, 236],
  [21.4, ...NIGHT],
  [24, ...NIGHT],
];

export function skyTint(hour: number): [number, number, number] {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i], b = KEYS[i + 1];
    if (hour >= a[0] && hour <= b[0]) {
      const t = (hour - a[0]) / (b[0] - a[0] || 1);
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
    }
  }
  return [255, 255, 255];
}

const NIGHT_AVG = (NIGHT[0] + NIGHT[1] + NIGHT[2]) / 3;
/** 0 = bright day, 1 = deep night. Drives lamp glows, lit windows and fireflies. */
export function darkness(hour: number): number {
  const [r, g, b] = skyTint(hour);
  return Math.max(0, Math.min(1, (246 - (r + g + b) / 3) / (246 - NIGHT_AVG)));
}

/** 0..1 golden-hour strength (morning + evening), for warm sun glints. */
export function golden(hour: number): number {
  const bump = (c: number, w: number) => Math.max(0, 1 - Math.abs(hour - c) / w);
  return Math.max(bump(18.6, 1.6), bump(6.8, 1.2) * 0.7);
}
