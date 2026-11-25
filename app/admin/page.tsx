'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Trash2, Lock, Unlock, UserCheck, PlusCircle, Award } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PPDTScenario, RecommendedCandidate } from '@/lib/types';
import { SSB_CENTRES } from '@/lib/ssb-centres';
import { BulkAddPanel } from '@/components/BulkAddPanel';
import { BulkPhotoPanel } from '@/components/BulkPhotoPanel';
import { AdminInbox } from '@/components/AdminInbox';

interface OirRow {
  id: number;
  title: string;
  is_free: boolean;
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [scenarios, setScenarios] = useState<PPDTScenario[]>([]);
  const [oirSets, setOirSets] = useState<OirRow[]>([]);
  const [statusMsg, setStatusMsg] = useState('');

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<'Standard' | 'Ambiguous' | 'High-Pressure'>('Standard');
  const [isFree, setIsFree] = useState(false);
  const [cues, setCues] = useState('');
  const [recommendedStory, setRecommendedStory] = useState('');
  const [olqs, setOlqs] = useState('Organizing Ability, Initiative, Courage');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [proEmail, setProEmail] = useState('');

  const [candidates, setCandidates] = useState<RecommendedCandidate[]>([]);
  const [centreImages, setCentreImages] = useState<Record<string, string>>({});
  const [candName, setCandName] = useState('');
  const [candSsb, setCandSsb] = useState('');
  const [candPhoto, setCandPhoto] = useState<File | null>(null);
  const [candUploading, setCandUploading] = useState(false);

  const loadAdminData = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const email = authData?.user?.email?.toLowerCase();
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();

    if (!email || !adminEmail || email !== adminEmail) {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);

    const { data } = await supabase
      .from('ppdt_scenarios')
      .select('*')
      .order('id', { ascending: true });
    if (data) setScenarios(data);

    const { data: oirRows } = await supabase
      .from('oir_sets')
      .select('id, title, is_free')
      .order('id', { ascending: true });
    if (oirRows) setOirSets(oirRows);

    const { data: candRows } = await supabase
      .from('recommended_candidates')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (candRows) setCandidates(candRows);

    const { data: centreRows } = await supabase.from('ssb_centres').select('code, image_url');
    if (centreRows) {
      const map: Record<string, string> = {};
      centreRows.forEach((r: any) => {
        if (r.image_url) map[r.code] = r.image_url;
      });
      setCentreImages(map);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setStatusMsg('');

    try {
      let publicImageUrl: string | null = null;

      if (imageFile) {
        publicImageUrl = await uploadViaApi('ppdt-scenes', imageFile);
      }

      const res = await fetch('/api/admin/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          difficulty,
          is_free: isFree,
          image_url: publicImageUrl,
          key_cues: cues.split(',').map((c) => c.trim()).filter(Boolean),
          recommended_story: recommendedStory,
          olq_highlights: olqs.split(',').map((o) => o.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save scenario');
      }
      setStatusMsg('Scenario & picture published live!');
      setTitle('');
      setCues('');
      setRecommendedStory('');
      setImageFile(null);
      loadAdminData();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSwapPicture = async (scenarioId: number, file: File) => {
    setStatusMsg('Uploading replacement picture...');
    let imageUrl: string;
    try {
      imageUrl = await uploadViaApi('ppdt-scenes', file);
    } catch (err: any) {
      setStatusMsg(`Upload failed: ${err.message}`);
      return;
    }

    await fetch('/api/admin/scenarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: scenarioId, image_url: imageUrl }),
    });
    setStatusMsg(`Picture updated for Scenario #${scenarioId}!`);
    loadAdminData();
  };

  const toggleFreeLock = async (sc: PPDTScenario) => {
    await fetch('/api/admin/scenarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sc.id, is_free: !sc.is_free }),
    });
    loadAdminData();
  };

  const deleteScenario = async (id: number) => {
    if (!confirm('Delete this PPDT scenario?')) return;
    await fetch(`/api/admin/scenarios?id=${id}`, { method: 'DELETE' });
    loadAdminData();
  };

  const toggleOirFree = async (set: OirRow) => {
    await fetch('/api/admin/oir', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: set.id, is_free: !set.is_free }),
    });
    loadAdminData();
  };

  const deleteOirSet = async (id: number) => {
    if (!confirm('Delete this OIR set and all its questions?')) return;
    await fetch(`/api/admin/oir?id=${id}`, { method: 'DELETE' });
    loadAdminData();
  };

  const handleGrantPro = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/grant-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: proEmail }),
    });
    const data = await res.json();
    setStatusMsg(data.message || data.error);
    setProEmail('');
  };

  const uploadViaApi = async (bucket: string, file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('bucket', bucket);
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candPhoto) {
      setStatusMsg('Please choose a photo for the candidate.');
      return;
    }
    setCandUploading(true);
    setStatusMsg('');
    try {
      const photoUrl = await uploadViaApi('candidate-photos', candPhoto);
      const res = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: candName, ssb_name: candSsb, photo_url: photoUrl }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save candidate');
      }
      setStatusMsg('Recommended candidate added to the homepage slideshow!');
      setCandName('');
      setCandSsb('');
      setCandPhoto(null);
      loadAdminData();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setCandUploading(false);
    }
  };

  const deleteCandidate = async (id: number) => {
    if (!confirm('Remove this candidate from the slideshow?')) return;
    await fetch(`/api/admin/candidates?id=${id}`, { method: 'DELETE' });
    loadAdminData();
  };

  const handleCentreImage = async (code: string, file: File) => {
    setStatusMsg('Uploading SSB centre image...');
    try {
      const url = await uploadViaApi('ssb-centres', file);
      const res = await fetch('/api/admin/centres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, image_url: url }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save image');
      }
      setStatusMsg('SSB centre image updated!');
      loadAdminData();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  if (authorized === null) {
    return <div className="p-8 text-center text-slate-400 text-sm">Verifying admin access...</div>;
  }

  if (!authorized) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-lg font-black text-red-400">Admin Access Restricted</p>
        <p className="text-xs text-slate-400">
          Sign in on the home page using your configured <code>ADMIN_EMAIL</code> to manage
          pictures and Pro passes.
        </p>
        <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to SSB Arena
        </Link>
        <span className="px-2.5 py-1 rounded bg-red-600/20 text-red-400 text-xs font-black">
          ADMIN CONTROL PANEL
        </span>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold ${
            /^(Error|Upload failed)/.test(statusMsg)
              ? 'bg-red-950/60 border-red-700 text-red-300'
              : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
          }`}
        >
          {statusMsg}
        </div>
      )}

      <div className="space-y-6">
        <AdminInbox />

        <BulkAddPanel onDone={loadAdminData} />

        <BulkPhotoPanel onDone={loadAdminData} />

        <form
          onSubmit={handleCreateScenario}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5"
        >
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-amber-400" /> Add New PPDT Picture &amp; Model Story
          </h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              required
              placeholder="Title (e.g., PPDT #11 — Dam Gate Inspection)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
            <div className="flex gap-2">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="flex-1 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
              >
                <option value="Standard">Standard</option>
                <option value="Ambiguous">Ambiguous</option>
                <option value="High-Pressure">High-Pressure</option>
              </select>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                />
                Free Tier
              </label>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-700">
            <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>
                {imageFile
                  ? `Selected: ${imageFile.name}`
                  : 'Choose PPDT Image (.jpg/.png — auto-converted to hazy B&W projector view)'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          <input
            placeholder="Key Visual Cues (comma-separated, e.g., 3 men near bridge, rising water)"
            value={cues}
            onChange={(e) => setCues(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          />

          <textarea
            required
            rows={4}
            placeholder="Recommended Candidate Story (~100 words, Past-Present-Future with practical hero actions)"
            value={recommendedStory}
            onChange={(e) => setRecommendedStory(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />

          <input
            placeholder="OLQ Highlights (comma-separated)"
            value={olqs}
            onChange={(e) => setOlqs(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          />

          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
          >
            {uploading ? 'Publishing...' : 'Publish PPDT Scenario Live'}
          </button>
        </form>

        <form
          onSubmit={handleAddCandidate}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5"
        >
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Add Recommended Candidate (Homepage Slideshow)
          </h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <input
              required
              placeholder="Candidate name"
              value={candName}
              onChange={(e) => setCandName(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
            <input
              required
              list="ssb-centre-options"
              placeholder="SSB they were recommended at"
              value={candSsb}
              onChange={(e) => setCandSsb(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
            <datalist id="ssb-centre-options">
              {SSB_CENTRES.map((c) => (
                <option key={c.code} value={c.label} />
              ))}
            </datalist>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-dashed border-slate-700">
            <label className="text-xs text-slate-300 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>
                {candPhoto ? `Selected: ${candPhoto.name}` : "Choose candidate's photo (JPG/PNG/WebP, max 5 MB)"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={(e) => setCandPhoto(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={candUploading}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:opacity-50"
          >
            {candUploading ? 'Publishing...' : 'Add to Slideshow'}
          </button>
        </form>

        <div className="space-y-2.5">
          <h2 className="text-base font-black text-white">
            Recommended Candidates in Slideshow ({candidates.length})
          </h2>
          {candidates.length === 0 && (
            <p className="text-xs text-slate-400">No candidates yet. Add the first one above.</p>
          )}
          {candidates.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img src={c.photo_url} alt={c.name} className="w-10 h-12 rounded object-cover" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{c.name}</p>
                  <p className="text-[11px] text-amber-400 truncate">{c.ssb_name}</p>
                </div>
              </div>
              <button
                onClick={() => deleteCandidate(c.id)}
                className="p-1.5 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950 shrink-0"
                title="Remove candidate"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <h2 className="text-base font-black text-white">
            SSB Centre Gate Images ({SSB_CENTRES.length})
          </h2>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {SSB_CENTRES.map((c) => (
              <div
                key={c.code}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {centreImages[c.code] ? (
                    <img
                      src={centreImages[c.code]}
                      alt={c.short}
                      className="w-14 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-14 h-10 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                      No image
                    </div>
                  )}
                  <p className="text-xs font-bold text-white truncate">{c.label}</p>
                </div>
                <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 cursor-pointer shrink-0">
                  {centreImages[c.code] ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCentreImage(c.code, f);
                    }}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={handleGrantPro}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
        >
          <div className="flex-1">
            <p className="text-xs font-black text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Manually Unlock Pro Pass
            </p>
          </div>
          <input
            type="email"
            required
            placeholder="Aspirant email..."
            value={proEmail}
            onChange={(e) => setProEmail(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
          >
            Activate Pro
          </button>
        </form>

        <div className="space-y-2.5">
          <h2 className="text-base font-black text-white">Manage Live PPDT Pictures ({scenarios.length})</h2>
          {scenarios.map((sc) => (
            <div
              key={sc.id}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                {sc.image_url ? (
                  <img
                    src={sc.image_url}
                    alt={sc.title}
                    className="w-14 h-10 rounded object-cover grayscale"
                  />
                ) : (
                  <div className="w-14 h-10 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                    Preset
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-white">{sc.title}</p>
                  <p className="text-[11px] text-slate-400">
                    {sc.is_free ? 'Free Scenario' : 'Pro Locked'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 cursor-pointer">
                  Swap Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSwapPicture(sc.id, f);
                    }}
                  />
                </label>

                <button
                  onClick={() => toggleFreeLock(sc)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  title="Toggle Free / Pro"
                >
                  {sc.is_free ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  onClick={() => deleteScenario(sc.id)}
                  className="p-1.5 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950"
                  title="Delete Scenario"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <h2 className="text-base font-black text-white">Imported OIR Sets ({oirSets.length})</h2>
          {oirSets.length === 0 && (
            <p className="text-xs text-slate-400">No imported sets yet. Use Bulk Add above.</p>
          )}
          {oirSets.map((set) => (
            <div
              key={set.id}
              className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{set.title}</p>
                <p className="text-[11px] text-slate-400">{set.is_free ? 'Free' : 'Pro Locked'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleOirFree(set)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  title="Toggle Free / Pro"
                >
                  {set.is_free ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
                </button>
                <button
                  onClick={() => deleteOirSet(set.id)}
                  className="p-1.5 rounded-lg bg-slate-800 text-red-400 hover:bg-red-950"
                  title="Delete set"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
