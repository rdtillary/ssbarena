export interface PPDTScenario {
  id: number;
  title: string;
  difficulty: 'Standard' | 'Ambiguous' | 'High-Pressure';
  is_free: boolean;
  image_url?: string | null;
  scene_preset: string;
  expected_characters: number;
  key_cues: string[];
  recommended_story: string;
  olq_highlights: string[];
}

export interface CharacterPin {
  id: number;
  x: number;
  y: number;
  age: number;
  sex: 'M' | 'F' | 'P';
  mood: '+' | '-' | '0';
  isHero: boolean;
}

export interface OIRQuestion {
  id: number;
  set_id: number;
  question_number: number;
  category: string;
  question_text: string;
  svg_diagram?: string | null;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface OIRSet {
  id: number;
  title: string;
  is_free: boolean;
  duration_seconds: number;
  questions: OIRQuestion[];
}

/** One piece of the transcript: a spoken word, or a detected pause. */
export interface TranscriptToken {
  type: 'word' | 'filler' | 'stammer' | 'pause';
  text: string; // the word, or e.g. "2.1s" for a pause
  seconds?: number; // pause length
}

export interface EvaluationResult {
  valid: boolean; // false when no usable speech was detected
  message?: string; // shown when valid is false
  transcript: string;
  tokens: TranscriptToken[];
  storyScore: number; // /40 (AI graded)
  narrationScore: number; // /20 (measured from the audio)
  totalScore: number; // /60
  wpm: number;
  wordCount: number;
  fillerCount: number;
  stammerCount: number;
  pauseCount: number;
  longestPause: number;
  breakdown: {
    heroClarity: number;
    pastPresentFuture: number;
    practicalAction: number;
    structurePacing: number;
    vocalFluency: number;
    timeControl: number;
  };
  strengths: string[];
  improvements: string[];
  /** 15 Officer Like Qualities, each scored 0-100 by the AI (with a one-line remark). */
  olq?: {
    scores: Record<string, number>;
    remarks: Record<string, string>;
  };
}

export interface UserAttempt {
  id: string;
  attempt_type: 'PPDT' | 'OIR';
  scenario_id: number;
  scenario_title: string;
  story_score: number;
  narration_score: number;
  total_score: number;
  max_score: number;
  transcript?: string;
  audio_url?: string | null;
  payload?: any;
  created_at: string;
}

export interface RecommendedCandidate {
  id: number;
  name: string;
  ssb_name: string;
  photo_url: string;
  sort_order?: number;
}
