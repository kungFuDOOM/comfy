// Calendar context for ?cutscene=<id> previews. Deliberately imports nothing from the game: time.ts and events.ts
// read it at module load (to fill in ?date= / ?event= / ?hour= when the URL has none), so it must stay cycle-free.
export interface CutscenePreset {
  /** Event id to force active (what ?event= would do). */
  event?: string;
  /** Calendar day, YYYY-MM-DD (what ?date= would do). */
  date?: string;
  /** Hour of day (what ?hour= would do). */
  hour?: number;
}

/** One entry per previewable scene. Later holiday scenes add their own rows here. */
export const CUTSCENE_PRESETS: Record<string, CutscenePreset> = {
  'harvest-feast': { event: 'harvest', date: '2026-11-26' },
  'christmas-eve': { event: 'twinkle', date: '2026-12-24' },
  'christmas-day': { event: 'twinkle', date: '2026-12-25' },
  'tree-lighting': { event: 'twinkle', date: '2026-11-30', hour: 19.2 },
  'first-pie': { event: 'harvest', date: '2026-11-21', hour: 15.2 },
  'golden-pie': { event: 'harvest', date: '2026-11-21', hour: 16.2 },
  'first-snowfall': { event: 'twinkle', date: '2026-11-27', hour: 17.9 },
};

const params = new URLSearchParams(location.search);
/** The ?cutscene= id, or null. */
export const cutsceneParam: string | null = params.get('cutscene');

/** The preset's value for a URL param, only when ?cutscene= is set and the URL does not already set that param. */
export function presetParam(name: 'event' | 'date' | 'hour'): string | null {
  if (!cutsceneParam || params.has(name)) return null;
  const v = CUTSCENE_PRESETS[cutsceneParam]?.[name];
  return v === undefined ? null : String(v);
}
