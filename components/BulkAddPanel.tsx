'use client';

import React, { useState } from 'react';
import { ClipboardCopy, CheckCircle2, AlertTriangle, ListPlus } from 'lucide-react';

type BulkType = 'ppdt' | 'oir' | 'candidates' | 'pro';

const TABS: { id: BulkType; label: string }[] = [
  { id: 'ppdt', label: 'PPDT Stories' },
  { id: 'oir', label: 'OIR Sets' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'pro', label: 'Pro Emails' },
];

const FORMATS: Record<BulkType, { rules: string; sample: string }> = {
  ppdt: {
    rules: [
      '- One object per PPDT picture, with its model (recommended) story.',
      '- difficulty: "Standard", "Ambiguous" or "High-Pressure".',
      '- is_free: true or false.',
      '- scene_preset: one of village_panchayat, flood_rescue, road_accident, forest_survey, railway_platform, urban_smoke, classroom_group, solitary_desk, sports_field.',
      '- key_cues: short visual cues of the picture. olq_highlights: OLQs shown by the story.',
      '- recommended_story: the full story text, about 100 words, Past-Present-Future.',
    ].join('\n'),
    sample: `[
  {
    "title": "PPDT #11 — Dam Gate Inspection",
    "difficulty": "Standard",
    "is_free": false,
    "scene_preset": "village_panchayat",
    "expected_characters": 3,
    "key_cues": ["cue 1", "cue 2"],
    "recommended_story": "Full story text...",
    "olq_highlights": ["Organizing Ability", "Initiative"]
  }
]`,
  },
  oir: {
    rules: [
      '- One object per OIR set; put all its questions in "questions".',
      '- options: 2 to 6 answer texts, without the A/B/C/D letters.',
      '- correct_index is 0-based (A = 0, B = 1, C = 2, D = 3).',
      '- category examples: Series, Coding-Decoding, Direction, Blood Relations, Analogy, Odd One Out.',
      '- explanation: one short line showing why the answer is correct.',
      '- duration_seconds: 600 unless the page says otherwise.',
    ].join('\n'),
    sample: `[
  {
    "title": "OIR Speed Set 02",
    "is_free": false,
    "duration_seconds": 600,
    "questions": [
      {
        "category": "Series",
        "question_text": "Find the next number: 2, 4, 8, 16, ?",
        "options": ["24", "32", "30", "28"],
        "correct_index": 1,
        "explanation": "Each number doubles."
      }
    ]
  }
]`,
  },
  candidates: {
    rules: [
      '- One object per recommended candidate.',
      '- photo_url must be a full https link to the photo.',
      '- ssb_name: the SSB centre where the candidate was recommended.',
    ].join('\n'),
    sample: `[
  {
    "name": "Candidate Name",
    "ssb_name": "Selection Centre East (SCE) – Prayagraj",
    "photo_url": "https://example.com/photo.jpg"
  }
]`,
  },
  pro: {
    rules: '- A JSON array of email addresses (or one email per line).',
    sample: `["aspirant1@gmail.com", "aspirant2@gmail.com"]`,
  },
};

const PLACEHOLDERS: Record<BulkType, string> = {
  ppdt: 'Paste the JSON from Claude here...',
  oir: 'Paste the JSON from Claude here...',
  candidates: 'Paste the JSON from Claude here...',
  pro: 'One email per line, or a JSON list...',
};

interface Result {
  summary?: string;
  skipped?: string[];
  errors?: string[];
  error?: string;
  dryRun?: boolean;
}

function parseInput(type: BulkType, raw: string): any {
  const text = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  if (!text) throw new Error('Nothing pasted.');
  if (type === 'pro' && !text.startsWith('[')) return text.split(/[\s,;]+/).filter(Boolean);
  return JSON.parse(text);
}

export function BulkAddPanel({ onDone }: { onDone?: () => void }) {
  const [type, setType] = useState<BulkType>('ppdt');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const switchType = (t: BulkType) => {
    setType(t);
    setText('');
    setResult(null);
  };

  const copyFormat = async () => {
    const f = FORMATS[type];
    const prompt =
      `Open the website I give you and convert its content into EXACTLY this JSON format for my SSB practice app.\n` +
      `Rules:\n${f.rules}\n` +
      `- Use only what is on the page. Do not invent content. Skip anything that does not fit.\n` +
      `- Return ONLY one JSON code block, with no other text.\n\n` +
      `Format:\n${f.sample}\n\nWebsite: `;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setResult({ error: 'Copy failed. Allow clipboard access in your browser.' });
    }
  };

  const run = async (dryRun: boolean) => {
    setResult(null);
    let data: any;
    try {
      data = parseInput(type, text);
    } catch (e: any) {
      setResult({ error: `Could not read the pasted text: ${e?.message || 'invalid JSON'}` });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/admin/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, dryRun }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ error: out.error || 'Request failed.' });
        return;
      }
      setResult(out);
      if (!dryRun && out.added > 0) {
        onDone?.();
        if (!out.errors?.length) setText('');
      }
    } catch {
      setResult({ error: 'Network error. Try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
      <h2 className="text-base font-black text-white flex items-center gap-2">
        <ListPlus className="w-4 h-4 text-amber-400" /> Bulk Add
      </h2>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchType(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              type === t.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={copyFormat}
        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 flex items-center gap-1.5"
      >
        <ClipboardCopy className="w-3.5 h-3.5" />
        {copied ? 'Copied! Paste it in Claude, then add the website link' : 'Copy format for Claude'}
      </button>

      <textarea
        rows={9}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDERS[type]}
        spellCheck={false}
        className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white"
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => run(true)}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-40"
        >
          Check
        </button>
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={() => run(false)}
          className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-40"
        >
          {busy ? 'Working...' : 'Import'}
        </button>
      </div>

      {result && (
        <div className="space-y-2 text-xs">
          {result.error && (
            <p className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-300 font-bold flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {result.error}
            </p>
          )}
          {result.summary && (
            <p className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-bold flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {result.summary}
            </p>
          )}
          {!!result.skipped?.length && (
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 max-h-32 overflow-auto space-y-0.5">
              <p className="font-bold text-slate-300">Skipped ({result.skipped.length})</p>
              {result.skipped.map((s, i) => (
                <p key={i}>• {s}</p>
              ))}
            </div>
          )}
          {!!result.errors?.length && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900 text-red-300 max-h-40 overflow-auto space-y-0.5">
              <p className="font-bold">Problems ({result.errors.length})</p>
              {result.errors.map((s, i) => (
                <p key={i}>• {s}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
