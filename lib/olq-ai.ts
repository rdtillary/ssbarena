import { OLQS, OlqReport } from '@/lib/olq';

/**
 * Sends the narration to an AI model and returns a validated 15-OLQ report.
 * The provider is picked from whichever API key is set on the server:
 *   GROQ_API_KEY -> Groq, ANTHROPIC_API_KEY -> Claude,
 *   GEMINI_API_KEY (or GOOGLE_API_KEY) -> Gemini, OPENAI_API_KEY -> OpenAI
 * Optionally set AI_MODEL to choose the model name.
 */

const SYSTEM_PROMPT = `You are a senior SSB (Services Selection Board) psychologist in India. You assess a candidate's PPDT narration against the 15 Officer Like Qualities (OLQs).

How to assess:
- There is no model or ideal story and you are not given one. Judge the story on its own merit. Do not look for a particular theme, a rescue, a leader or a team: many different stories are excellent (study, sport, family, workplace, social service, a calm professional solving a problem).
- Look at what the story reveals about the person: a clear, relatable hero; a natural past-present-future flow; positive, responsible thinking; concrete, realistic actions; a realistic, positive ending; natural, original thinking that fits the picture.
- Penalise only real weaknesses: just describing the picture, a passive hero, negativity, luck/miracles/filmy endings, preaching, an unrelated or abrupt story, vague lines with no action.
- Score EACH of the 15 OLQs from 0 to 100 (integers). Be realistic and strict: 50-60 is average, 70+ is good, 85+ is exceptional and needs clear evidence.
- Base every score only on evidence in the narration. If a quality is not visible in the text, score it modestly (40-55) and say there was little evidence.
- remarks: one short, specific sentence per OLQ (max 22 words).
- summary: 2-3 sentences of overall feedback.
- strengths: 2-4 short bullet strings. improvements: 2-4 short, actionable strings.
- Respond with ONLY valid JSON, no markdown, in this exact shape:
{"scores":{"<OLQ>":number,...},"remarks":{"<OLQ>":"..."},"summary":"...","strengths":["..."],"improvements":["..."]}
- Use exactly these OLQ names as keys: ${OLQS.join(', ')}.`;

async function callAnthropic(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'claude-sonnet-5-5',
      max_tokens: 2500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return (data.content || []).map((c: any) => c.text || '').join('');
}

async function callGemini(system: string, user: string): Promise<string> {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) as string;
  const model = process.env.AI_MODEL || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
}

async function callOpenAI(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function callGroq(system: string, user: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_LLM_MODEL || process.env.AI_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

function extractJson(text: string): any {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI did not return JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function generateOlqReport(input: {
  scenarioTitle: string;
  transcript: string;
}): Promise<OlqReport> {
  const user = `PPDT scenario: ${input.scenarioTitle}\n\nCandidate's narration (transcript):\n"""\n${input.transcript.slice(0, 6000)}\n"""`;

  let raw: string;
  if (process.env.GROQ_API_KEY) raw = await callGroq(SYSTEM_PROMPT, user);
  else if (process.env.ANTHROPIC_API_KEY) raw = await callAnthropic(SYSTEM_PROMPT, user);
  else if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) raw = await callGemini(SYSTEM_PROMPT, user);
  else if (process.env.OPENAI_API_KEY) raw = await callOpenAI(SYSTEM_PROMPT, user);
  else throw new Error('No AI key configured on the server.');

  const parsed = extractJson(raw);

  const scores: Record<string, number> = {};
  const remarks: Record<string, string> = {};
  for (const name of OLQS) {
    const n = Number(parsed?.scores?.[name]);
    scores[name] = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 50;
    remarks[name] = String(parsed?.remarks?.[name] ?? '').slice(0, 200);
  }

  const list = (v: any) =>
    (Array.isArray(v) ? v : []).map((s) => String(s).slice(0, 220)).filter(Boolean).slice(0, 5);

  return {
    scores,
    remarks,
    summary: String(parsed?.summary ?? '').slice(0, 800),
    strengths: list(parsed?.strengths),
    improvements: list(parsed?.improvements),
    generated_at: new Date().toISOString(),
  };
}
