// SRT styles, using the site theme: dark navy page, slate cards, amber accent, site font.
export const SRT_CSS = `
.sr{--bg:#090d16;--card:#0f172a;--deep:#020617;--line:#1e293b;--text:#f1f5f9;--mute:#94a3b8;--accent:#f59e0b;--gold:#fbbf24}
.sr-root{position:fixed;inset:0;z-index:40;overflow-y:auto;color:var(--text);background:var(--bg)}
.sr-wrap{max-width:880px;margin:0 auto;padding:0 16px 48px}
.sr-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 0;background:var(--bg);border-bottom:1px solid var(--line)}
.sr-link{font-size:12px;font-weight:700;color:var(--mute);cursor:pointer}.sr-link:hover{color:#fff}
.sr-clock{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums;color:var(--gold)}
.sr-clock.low{color:#f87171}
.sr-progress{height:4px;margin-top:16px;border-radius:999px;overflow:hidden;background:var(--line)}
.sr-progress>i{display:block;height:100%;background:var(--accent);transition:width .4s}
.sr-eyebrow{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.sr-h1{font-size:clamp(1.6rem,5vw,2.25rem);font-weight:900;line-height:1.2;margin-top:8px;color:#fff}
.sr-h1 em{color:var(--gold);font-style:normal}
.sr-lead{max-width:36rem;margin-top:8px;font-size:14px;line-height:1.6;color:var(--mute)}
.sr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
.sr-stats div{padding:14px;border-radius:12px;background:var(--card);border:1px solid var(--line)}
.sr-stats b{display:block;font-size:24px;font-weight:900;color:#fff}
.sr-stats span{font-size:10px;font-weight:700;text-transform:uppercase;color:var(--mute)}
.sr-modes{display:grid;gap:14px;margin-top:20px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.sr-mode{text-align:left;padding:20px;border-radius:16px;background:var(--card);border:1px solid var(--line);cursor:pointer;transition:border-color .2s,transform .2s}
.sr-mode:hover{transform:translateY(-3px);border-color:rgba(245,158,11,.5)}
.sr-mode h3{font-size:20px;font-weight:900;color:#fff;margin-top:10px}
.sr-mode p{font-size:12px;line-height:1.6;color:var(--mute);margin-top:4px}
.sr-mode .go{display:inline-block;margin-top:14px;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:900;background:var(--accent);color:var(--deep)}
.sr-sheet{background:var(--card);border:1px solid var(--line);border-radius:16px}
.sr-card{padding:20px;margin-top:16px}
.sr-no{font-size:28px;font-weight:900;color:var(--gold)}
.sr-no small{font-size:13px;font-weight:700;color:var(--mute);margin-left:8px}
.sr-q{font-size:clamp(1.1rem,3.4vw,1.5rem);font-weight:700;line-height:1.5;margin-top:10px;min-height:5em;color:#fff}
.sr-input{width:100%;resize:none;margin-top:12px;padding:14px 16px;border-radius:12px;font-size:16px;line-height:1.6;color:#fff;outline:none;
  background:var(--deep);border:1px solid var(--line)}
.sr-input:focus{border-color:var(--accent)}
.sr-row{display:flex;gap:12px;margin-top:16px}
.sr-btn{flex:1;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:900;background:var(--accent);color:var(--deep);cursor:pointer;text-align:center}
.sr-btn:hover{background:var(--gold)}.sr-btn:disabled{opacity:.35;cursor:default}
.sr-btn.alt{flex:0 0 auto;background:#1e293b;color:#fff}.sr-btn.alt:hover{background:#334155}
.sr-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin-top:18px}
.sr-dot{padding:7px 0;border-radius:8px;font-size:11px;font-weight:700;color:var(--mute);background:var(--card);border:1px solid var(--line);cursor:pointer}
.sr-dot.filled{background:rgba(245,158,11,.15);color:var(--gold);border-color:rgba(245,158,11,.35)}
.sr-dot.now{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.sr-list{margin-top:16px;padding:4px 18px;list-style:none}
.sr-list li{display:flex;gap:12px;padding:16px 0;border-bottom:1px solid var(--line)}.sr-list li:last-child{border-bottom:0}
.sr-list .n{flex:none;width:26px;font-size:12px;font-weight:900;color:var(--gold);padding-top:2px}
.sr-list .t{font-size:14px;font-weight:700;line-height:1.6;color:#fff}
.sr-ans{margin-top:8px;padding:10px 12px;border-radius:8px;background:var(--deep);border:1px solid var(--line);font-size:13px;line-height:1.6;color:#cbd5e1;white-space:pre-wrap}
.sr-ans.none{color:#64748b}
@media (max-width:480px){.sr-grid{grid-template-columns:repeat(8,1fr)}}
`;
