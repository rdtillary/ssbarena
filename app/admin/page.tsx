'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload, Trash2, Lock, Unlock, UserCheck, PlusCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PPDTScenario } from '@/lib/types';

export default function AdminDashboardPage() {
  const supabase = createClient();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [scenarios, setScenarios] = useState<PPDTScenario[]>([]);
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
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `scene-${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('ppdt-scenes')
          .upload(fileName, imageFile, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage.from('ppdt-scenes').getPublicUrl(fileName);
        publicImageUrl = pub.publicUrl;
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

      if (!res.ok) throw new Error('Failed to save scenario');
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
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `scene-${scenarioId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('ppdt-scenes')
      .upload(fileName, file, { upsert: true });

    if (error) {
      setStatusMsg(`Upload failed: ${error.message}`);
      return;
    }

    const { data: pub } = supabase.storage.from('ppdt-scenes').getPublicUrl(fileName);
    await fetch('/api/admin/scenarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: scenarioId, image_url: pub.publicUrl }),
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
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs font-bold">
          {statusMsg}
        </div>
      )}

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
        onSubmit={handleGrantPro}
        className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
      >
        <div className="flex-1">
          <p className="text-xs font-black text-white flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" /> Manually Unlock ₹99 Pro Pass (60 Days)
          </p>
          <p className="text-[11px] text-slate-400">
            Useful if an aspirant pays you directly via UPI QR on Instagram/WhatsApp.
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
        <h2 className="text-base font-black text-white">
          Manage Live PPDT Pictures ({scenarios.length})
        </h2>
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
                  {sc.is_free ? 'Free Scenario' : 'Pro ₹99 Locked'}
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
    </div>
  );
}
