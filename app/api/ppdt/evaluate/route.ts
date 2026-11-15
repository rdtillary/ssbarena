import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { transcript = '', durationSeconds = 55, mainAction = '' } = await req.json();

  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = Math.round((wordCount / Math.max(15, durationSeconds)) * 60);

  const fillerMatches = transcript.match(/\b(uh|um|like|basically|actually|you know)\b/gi);
  const fillerCount = fillerMatches ? fillerMatches.length : 0;

  const actionVerbs = [
    'organized', 'coordinated', 'informed', 'gathered', 'led', 'planned',
    'arranged', 'assessed', 'rescued', 'divided', 'resolved', 'guided',
    'formed', 'convinced', 'initiated', 'alerted', 'stabilized', 'trained',
  ];
  const lower = transcript.toLowerCase();
  const actionHits = actionVerbs.filter((v) => lower.includes(v)).length;

  const preachyHits = (lower.match(/\b(moral of|we should always|miraculously|single-handedly)\b/g) || []).length;

  const heroClarity = wordCount >= 20 ? 8 : 4;
  const pastPresentFuture = wordCount >= 65 ? 9 : wordCount >= 35 ? 6 : 3;
  const practicalAction = Math.min(10, Math.max(3, 5 + actionHits * 2 - preachyHits * 2));
  const structurePacing = wordCount >= 75 && wordCount <= 135 ? 10 : wordCount >= 45 ? 7 : 4;
  const storyScore = heroClarity + pastPresentFuture + practicalAction + structurePacing;

  const vocalFluency = Math.max(4, 10 - fillerCount * 2);
  const timeControl = wpm >= 95 && wpm <= 145 && durationSeconds <= 60 ? 10 : 7;
  const narrationScore = vocalFluency + timeControl;

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (actionHits >= 2) strengths.push('Strong use of practical, team-oriented action verbs.');
  else improvements.push('Include more concrete organizing steps (e.g., divided tasks, alerted authorities).');

  if (wpm >= 95 && wpm <= 145) strengths.push(`Crisp narration pace (${wpm} WPM) ideal for Group Discussion.`);
  else improvements.push(`Adjust speaking pace (${wpm} WPM currently; aim for 105–135 WPM).`);

  if (fillerCount === 0) strengths.push('Zero filler words ("uh/um") detected in transcript.');
  else improvements.push(`Reduce filler words (${fillerCount} detected) by pausing silently between sentences.`);

  if (mainAction) strengths.push(`Aligned narration with declared action: "${mainAction}".`);

  return NextResponse.json({
    storyScore,
    narrationScore,
    totalScore: storyScore + narrationScore,
    wpm,
    wordCount,
    fillerCount,
    breakdown: {
      heroClarity,
      pastPresentFuture,
      practicalAction,
      structurePacing,
      vocalFluency,
      timeControl,
    },
    strengths,
    improvements,
  });
}
