// The 15 Officer Like Qualities (OLQs) assessed in the SSB.
export const OLQS = [
  'Effective Intelligence',
  'Reasoning Ability',
  'Organizing Ability',
  'Power of Expression',
  'Social Adaptability',
  'Cooperation',
  'Sense of Responsibility',
  'Initiative',
  'Self-Confidence',
  'Speed of Decision',
  'Ability to Influence a Group',
  'Liveliness',
  'Determination',
  'Courage',
  'Stamina',
] as const;

export type OlqName = (typeof OLQS)[number];

export interface OlqReport {
  scores: Record<string, number>; // 0-100 per OLQ
  remarks: Record<string, string>; // one short line per OLQ
  summary: string;
  strengths: string[];
  improvements: string[];
  generated_at: string;
}
