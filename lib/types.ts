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

export interface EvaluationResult {
  storyScore: number;
  narrationScore: number;
  totalScore: number;
  wpm: number;
  wordCount: number;
  fillerCount: number;
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
