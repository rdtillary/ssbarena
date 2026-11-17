'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Inbox, Send, ArrowLeft } from 'lucide-react';

interface Thread {
  user_id: string;
  email: string;
  last_body: string;
  last_sender: 'user' | 'cadet';
  last_at: string;
  unread: number;
}
interface Msg {
  id: number;
  sender: 'user' | 'cadet';
  body: string;
  created_at: string;
}

export function AdminInbox() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/messages', { cache: 'no-store' });
      if (res.ok) setThreads((await res.json()).threads || []);
    } catch {}
  }, []);

  const loadThread = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/messages?user_id=${userId}`, { cache: 'no-store' });
      if (res.ok) setMessages((await res.json()).messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadThreads();
    const id = setInterval(() => {
      loadThreads();
      if (active) loadThread(active.user_id);
    }, 10000);
    return () => clearInterval(id);
  }, [active, loadThreads, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const open = async (t: Thread) => {
    setActive(t);
    setMessages([]);
    setError('');
    await loadThread(t.user_id);
    loadThreads();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = reply.trim();
    if (!body || !active || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: active.user_id, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send.');
      setMessages((m) => [...m, data.message]);
      setReply('');
      loadThreads();
    } catch (err: any) {
      setError(err.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = threads.reduce((n, t) => n + t.unread, 0);

  return (
    <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
      <h2 className="text-base font-black text-white flex items-center gap-2">
        <Inbox className="w-4 h-4 text-amber-400" /> Cadet Inbox
        {totalUnread > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
            {totalUnread} new
          </span>
        )}
      </h2>

      {!active ? (
        <div className="space-y-2">
          {threads.length === 0 && <p className="text-xs text-slate-400">No messages yet.</p>}
          {threads.map((t) => (
            <button
              key={t.user_id}
              type="button"
              onClick={() => open(t)}
              className="w-full text-left p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{t.email}</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {t.last_sender === 'cadet' ? 'You: ' : ''}
                  {t.last_body}
                </p>
              </div>
              {t.unread > 0 && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                  {t.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setActive(null);
              loadThreads();
            }}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> All conversations
          </button>
          <p className="text-xs font-bold text-amber-400">{active.email}</p>

          <div className="max-h-80 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            {messages.map((m) => {
              const me = m.sender === 'cadet';
              return (
                <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      me ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="space-y-2">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <textarea
                rows={2}
                maxLength={1000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply as Cadet..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white resize-none"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40"
                aria-label="Send reply"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
