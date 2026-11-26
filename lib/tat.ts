// TAT: 5 practice sets x 12 slides (11 pictures + 1 blank). Set 1 is free; the rest are Pro.
export const TAT_VIEW_SECONDS = 30;
export const TAT_WRITE_SECONDS = 240;
export const TAT_PICTURES = 11;
export const TAT_SLIDES = TAT_PICTURES + 1;
export const TAT_MAX_NARRATION_SECONDS = 180;

export const TAT_SETS = [1, 2, 3, 4, 5].map((id) => ({
  id,
  title: `TAT Mock ${String(id).padStart(2, '0')}`,
  is_free: id === 1,
}));

export const getTatSet = (id: number) => TAT_SETS.find((s) => s.id === id);

// Every story is marked on the same five criteria, 0-2 each, so each is out of 10.
export const TAT_CRITERIA = [
  { key: 'hero', label: 'Hero & situation' },
  { key: 'timeline', label: 'Past, present, future' },
  { key: 'action', label: 'Practical action' },
  { key: 'olq', label: 'Officer-like qualities' },
  { key: 'outcome', label: 'Constructive outcome' },
] as const;

export type TatResult = {
  transcript: string;
  score: number | null; // null = nothing was transcribed, so no result
  breakdown?: Record<string, number>;
  feedback?: string;
};
