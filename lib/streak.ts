// Streak maths on India-time calendar days written as YYYY-MM-DD.
const DAY = 24 * 60 * 60 * 1000;

export const dayKey = (d: Date | string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(d));

const toNum = (key: string) => Math.round(Date.parse(`${key}T00:00:00Z`) / DAY);

export const MILESTONES = [3, 7, 15, 30, 60, 100, 180, 365];

/** The current streak stays alive until the end of the day after the last login. */
export function streaks(days: Iterable<string>, today: string) {
  const nums = Array.from(new Set(days)).map(toNum).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < nums.length; i++) {
    run = i > 0 && nums[i] === nums[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const last = nums[nums.length - 1];
  const current = last !== undefined && toNum(today) - last <= 1 ? run : 0;
  return { current, best, total: nums.length };
}
