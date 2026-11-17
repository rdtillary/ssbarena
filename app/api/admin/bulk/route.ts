import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

type Admin = ReturnType<typeof createAdminSupabase>;
type Report = { added: number; skipped: string[]; errors: string[]; summary: string };

const DIFFICULTIES = ['Standard', 'Ambiguous', 'High-Pressure'];

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const list = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map(str).filter(Boolean)
    : typeof v === 'string'
    ? v.split(/[|;,]/).map((s) => s.trim()).filter(Boolean)
    : [];
const bool = (v: unknown) => v === true || (typeof v === 'string' && v.toLowerCase() === 'true');
const int = (v: unknown, def: number, lo: number, hi: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
};
const isUrl = (v: string) => /^https?:\/\/\S+$/i.test(v);
// Question images: full https link, or a file inside /public such as /oir/wda14/q01.jpg
const isImage = (v: string) => isUrl(v) || /^\/(?!\/)[\w\-./]+$/.test(v);
const asArray = (d: any): any[] => (Array.isArray(d) ? d : d && typeof d === 'object' ? [d] : []);
const fail = (msg: string): Report => ({ added: 0, skipped: [], errors: [msg], summary: 'Nothing imported.' });

// ---------- PPDT stories ----------
async function bulkPpdt(admin: Admin, data: any, dryRun: boolean): Promise<Report> {
  const items = asArray(data);
  if (!items.length) return fail('No stories found in the pasted data.');
  if (items.length > 200) return fail('Too many stories at once (max 200).');

  const { data: existing } = await admin.from('ppdt_scenarios').select('title');
  const seen = new Set((existing || []).map((r: any) => String(r.title).toLowerCase()));

  const errors: string[] = [];
  const skipped: string[] = [];
  const rows: any[] = [];

  items.forEach((it, i) => {
    const label = `Story ${i + 1}`;
    const title = str(it?.title);
    const story = str(it?.recommended_story);
    if (!title) return errors.push(`${label}: "title" is missing.`);
    if (!story) return errors.push(`${label} (${title}): "recommended_story" is missing.`);
    if (seen.has(title.toLowerCase())) return skipped.push(`${title} (already exists)`);
    seen.add(title.toLowerCase());

    const image = str(it.image_url);
    rows.push({
      title,
      difficulty: DIFFICULTIES.includes(it.difficulty) ? it.difficulty : 'Standard',
      is_free: bool(it.is_free),
      scene_preset: str(it.scene_preset) || 'village_panchayat',
      expected_characters: int(it.expected_characters, 3, 1, 10),
      key_cues: list(it.key_cues),
      recommended_story: story,
      olq_highlights: list(it.olq_highlights),
      image_url: isUrl(image) ? image : null,
    });
  });

  if (!dryRun && rows.length) {
    const { error } = await admin.from('ppdt_scenarios').insert(rows);
    if (error) return fail(error.message);
  }
  return {
    added: rows.length,
    skipped,
    errors,
    summary: `${dryRun ? 'Ready to add' : 'Added'} ${rows.length} PPDT stor${rows.length === 1 ? 'y' : 'ies'}.`,
  };
}

// ---------- OIR sets ----------
function correctIndex(q: any): number {
  const ci = q.correct_index !== undefined && q.correct_index !== '' ? Number(q.correct_index) : NaN;
  if (Number.isInteger(ci)) return ci;
  const a = str(q.correct ?? q.answer ?? q.correct_option);
  if (/^[A-Fa-f]$/.test(a)) return a.toUpperCase().charCodeAt(0) - 65;
  return -1;
}

async function bulkOir(admin: Admin, data: any, dryRun: boolean): Promise<Report> {
  const sets = Array.isArray(data) ? data : Array.isArray(data?.sets) ? data.sets : data ? [data] : [];
  if (!sets.length) return fail('No OIR sets found in the pasted data.');
  if (sets.length > 50) return fail('Too many sets at once (max 50).');

  const { data: existing } = await admin.from('oir_sets').select('title');
  const seen = new Set((existing || []).map((r: any) => String(r.title).toLowerCase()));

  const errors: string[] = [];
  const skipped: string[] = [];
  let addedSets = 0;
  let addedQs = 0;

  for (let s = 0; s < sets.length; s++) {
    const raw = sets[s];
    const title = str(raw?.title);
    const label = title ? `Set "${title}"` : `Set ${s + 1}`;
    if (!title) {
      errors.push(`${label}: "title" is missing.`);
      continue;
    }
    if (seen.has(title.toLowerCase())) {
      skipped.push(`${title} (already exists)`);
      continue;
    }
    const rawQs: any[] = Array.isArray(raw.questions) ? raw.questions : [];
    if (!rawQs.length) {
      errors.push(`${label}: no questions.`);
      continue;
    }
    if (rawQs.length > 200) {
      errors.push(`${label}: too many questions (max 200).`);
      continue;
    }

    const qErrors: string[] = [];
    const questions = rawQs.map((q, i) => {
      const n = i + 1;
      const text = str(q?.question_text);
      const options = Array.isArray(q?.options) ? q.options.map(str) : [];
      const ci = correctIndex(q || {});
      const image = str(q?.image_url);
      if (!text) qErrors.push(`${label} Q${n}: "question_text" is missing.`);
      else if (options.length < 2 || options.length > 6 || options.some((o: string) => !o))
        qErrors.push(`${label} Q${n}: needs 2-6 non-empty options.`);
      else if (ci < 0 || ci >= options.length)
        qErrors.push(`${label} Q${n}: correct answer is missing or out of range.`);
      if (image && !isImage(image))
        qErrors.push(`${label} Q${n}: "image_url" must be an https link or a /path inside public.`);
      return {
        question_number: n,
        category: str(q?.category) || 'General',
        question_text: text,
        options,
        correct_index: ci,
        explanation: str(q?.explanation),
        image_url: image || null,
      };
    });

    // A set is imported whole or not at all.
    if (qErrors.length) {
      errors.push(...qErrors.slice(0, 5));
      if (qErrors.length > 5) errors.push(`${label}: ${qErrors.length - 5} more question problems.`);
      continue;
    }

    seen.add(title.toLowerCase());
    if (dryRun) {
      addedSets++;
      addedQs += questions.length;
      continue;
    }

    const { data: created, error } = await admin
      .from('oir_sets')
      .insert({
        title,
        is_free: bool(raw.is_free),
        duration_seconds: int(raw.duration_seconds, 600, 60, 7200),
      })
      .select('id')
      .single();
    if (error || !created) {
      errors.push(`${label}: ${error?.message || 'could not create set'}`);
      continue;
    }
    const { error: qErr } = await admin
      .from('oir_questions')
      .insert(questions.map((q) => ({ ...q, set_id: created.id })));
    if (qErr) {
      await admin.from('oir_sets').delete().eq('id', created.id);
      errors.push(`${label}: ${qErr.message}`);
      continue;
    }
    addedSets++;
    addedQs += questions.length;
  }

  return {
    added: addedSets,
    skipped,
    errors,
    summary: `${dryRun ? 'Ready to add' : 'Added'} ${addedSets} OIR set${addedSets === 1 ? '' : 's'} (${addedQs} questions).`,
  };
}

// ---------- Recommended candidates ----------
async function bulkCandidates(admin: Admin, data: any, dryRun: boolean): Promise<Report> {
  const items = asArray(data);
  if (!items.length) return fail('No candidates found in the pasted data.');
  if (items.length > 100) return fail('Too many candidates at once (max 100).');

  const { data: existing } = await admin.from('recommended_candidates').select('name, ssb_name');
  const seen = new Set(
    (existing || []).map((r: any) => `${String(r.name).toLowerCase()}|${String(r.ssb_name).toLowerCase()}`)
  );

  const errors: string[] = [];
  const skipped: string[] = [];
  const rows: any[] = [];

  items.forEach((it, i) => {
    const label = `Candidate ${i + 1}`;
    const name = str(it?.name);
    const ssb = str(it?.ssb_name);
    const photo = str(it?.photo_url);
    if (!name || !ssb) return errors.push(`${label}: "name" and "ssb_name" are required.`);
    if (!isUrl(photo)) return errors.push(`${label} (${name}): "photo_url" must be a full http(s) link.`);
    const key = `${name.toLowerCase()}|${ssb.toLowerCase()}`;
    if (seen.has(key)) return skipped.push(`${name} (already exists)`);
    seen.add(key);
    rows.push({ name, ssb_name: ssb, photo_url: photo });
  });

  if (!dryRun && rows.length) {
    const { error } = await admin.from('recommended_candidates').insert(rows);
    if (error) return fail(error.message);
  }
  return {
    added: rows.length,
    skipped,
    errors,
    summary: `${dryRun ? 'Ready to add' : 'Added'} ${rows.length} candidate${rows.length === 1 ? '' : 's'}.`,
  };
}

// ---------- Pro passes by email ----------
async function bulkPro(admin: Admin, data: any, dryRun: boolean): Promise<Report> {
  const raw: any[] = Array.isArray(data) ? data : [];
  const errors: string[] = [];
  const emails = Array.from(
    new Set(
      raw
        .map((e) => str(e).toLowerCase())
        .filter((e) => {
          const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
          if (!ok && e) errors.push(`"${e}" is not a valid email.`);
          return ok;
        })
    )
  );
  if (!emails.length) return fail('No valid emails found.');
  if (emails.length > 500) return fail('Too many emails at once (max 500).');

  let found: string[] = [];
  if (dryRun) {
    const { data: rows, error } = await admin.from('profiles').select('email').in('email', emails);
    if (error) return fail(error.message);
    found = (rows || []).map((r: any) => String(r.email).toLowerCase());
  } else {
    const { data: rows, error } = await admin
      .from('profiles')
      .update({ is_pro: true, pro_expires_at: null })
      .in('email', emails)
      .select('email');
    if (error) return fail(error.message);
    found = (rows || []).map((r: any) => String(r.email).toLowerCase());
  }
  const foundSet = new Set(found);
  const skipped = emails
    .filter((e) => !foundSet.has(e))
    .map((e) => `${e} (not found, ask them to sign in once first)`);

  return {
    added: found.length,
    skipped,
    errors,
    summary: `${dryRun ? 'Ready to unlock' : 'Unlocked'} ${found.length} Pro pass${found.length === 1 ? '' : 'es'}.`,
  };
}

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const dryRun = body?.dryRun === true;
  const admin = createAdminSupabase();

  try {
    let report: Report;
    switch (body?.type) {
      case 'ppdt':
        report = await bulkPpdt(admin, body.data, dryRun);
        break;
      case 'oir':
        report = await bulkOir(admin, body.data, dryRun);
        break;
      case 'candidates':
        report = await bulkCandidates(admin, body.data, dryRun);
        break;
      case 'pro':
        report = await bulkPro(admin, body.data, dryRun);
        break;
      default:
        return NextResponse.json({ error: 'Unknown import type.' }, { status: 400 });
    }
    return NextResponse.json({ ...report, dryRun });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Import failed.' }, { status: 500 });
  }
}
