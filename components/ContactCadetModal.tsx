'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';

interface Msg {
  id: number;
  sender: 'user' | 'cadet';
  body: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  onRequireAuth: () => void;
}

export function ContactCadetModal({ open, onClose, signedIn, onRequireAuth }: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/contact/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open || !signedIn) return;
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [open, signedIn, load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  if (!open) return null;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send.');
      setMessages((m) => [...m, data.message]);
      setText('');
    } catch (err: any) {
      setError(err.message || 'Could not send.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full relative shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-amber-400" /> Ask a Recommended Cadet
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Doubts about SSB, PPDT or OIR? Message directly. Replies appear here.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!signedIn ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-slate-300">Sign in so the cadet can reply to you.</p>
            <button
              onClick={() => {
                onClose();
                onRequireAuth();
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
            >
              Sign In to Message
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
              {messages.length === 0 && (
                <p className="text-xs text-slate-500 text-center mt-8">
                  No messages yet. Say hello to a recommended cadet!
                </p>
              )}
              {messages.map((m) => {
                const mine = m.sender === 'user';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        mine
                          ? 'bg-amber-500 text-slate-950 rounded-br-sm'
                          : 'bg-slate-800 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      {!mine && <p className="text-[10px] font-black text-amber-400 mb-0.5">Cadet</p>}
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <form onSubmit={send} className="p-3 border-t border-slate-800 space-y-2">
              {error && <p className="text-xs text-red-400">{error}</p>}
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(e as any);
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
