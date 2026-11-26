// Turns a saved user_attempts row into the same shape as a live evaluation result.
export function attemptToResult(a: any) {
  const p = a?.payload || {};
  const rep = a?.olq_report || null;
  const olq = p.olq || (rep?.scores ? { scores: rep.scores, remarks: rep.remarks || {} } : null);
  return {
    valid: true,
    transcript: a?.transcript || '',
    tokens: p.tokens || [],
    storyScore: a?.story_score,
    narrationScore: a?.narration_score,
    totalScore: a?.total_score,
    wpm: p.wpm,
    wordCount: p.wordCount,
    fillerCount: p.fillerCount,
    stammerCount: p.stammerCount,
    pauseCount: p.pauseCount,
    longestPause: p.longestPause,
    breakdown: p.breakdown || null,
    strengths: p.strengths || rep?.strengths || [],
    improvements: p.improvements || rep?.improvements || [],
    olq,
    summary: rep?.summary || '',
    recommendation: p.recommendation || null,
    pins: p.pins || [],
    mainAction: p.mainAction || '',
  };
}
