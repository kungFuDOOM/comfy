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
  { id: 'blossom', name: 'Blossom Bloom', months: [3, 4, 5], grass: '#cdeec0', grassAlt: '#c5eab7', hill: '#d9f1c4', leaf: '#ffc4d9', leafAlt: '#ffa9c8', petal: '#ffd0e0', blurb: 'Petals everywhere. Ribbon Blossoms thrive.' },
  { id: 'sunsip', name: 'Sunsip Days', months: [6, 7, 8], grass: '#bde9ae', grassAlt: '#b5e4a5', hill: '#cdeeb2', leaf: '#a9e3b6', leafAlt: '#92d8a6', petal: '#fff2a8', blurb: 'Long glowy days. Dewdrop Shells wash ashore.' },
  { id: 'cocoa', name: 'Cocoa Leaf', months: [9, 10, 11], grass: '#e6dba6', grassAlt: '#e1d59f', hill: '#efdfae', leaf: '#ffc99e', leafAlt: '#ffad8a', petal: '#ffb98c', blurb: 'Cozy knits and drifting leaves. Perfect café weather.' },
  { id: 'snowfluff', name: 'Snowfluff', months: [12, 1, 2], grass: '#e4eef5', grassAlt: '#dfeaf2', hill: '#eef4fa', leaf: '#eae4fa', leafAlt: '#ddd2f4', petal: '#ffffff', blurb: 'Soft snow. Starlit Buttons sparkle on the hill.' },
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

// Multiply-tint keyframes: [hour, r, g, b]
const KEYS: [number, number, number, number][] = [
  [0, 150, 140, 215],
  [5, 160, 148, 220],
  [6.5, 255, 205, 210],
  [8, 255, 240, 238],
  [10, 255, 255, 255],
  [16, 255, 255, 250],
  [18, 255, 214, 190],
  [19.5, 238, 160, 196],
  [21, 150, 140, 215],
  [24, 150, 140, 215],
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

/** 0 = bright day, 1 = deep night. Drives glows. */
export function darkness(hour: number): number {
  const [r, g, b] = skyTint(hour);
  return Math.max(0, Math.min(1, (255 - (r + g + b) / 3) / 100));
}
