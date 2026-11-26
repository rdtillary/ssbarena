// SRT look: an officer's answer booklet. Ink navy desk, ivory paper, one signal-orange accent.
export const SRT_CSS = `
.sr{--ink:#0b1220;--paper:#f4efe3;--paper2:#ebe4d3;--line:rgba(11,18,32,.14);--mute:#6b6a63;--accent:#d9480f;--gold:#f6b73c;
  --serif:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif;--mono:ui-monospace,'SF Mono',Menlo,Consolas,monospace}
.sr-root{position:fixed;inset:0;z-index:40;overflow-y:auto;color:#f4efe3;background:
  linear-gradient(rgba(244,239,227,.035) 1px,transparent 1px) 0 0/100% 32px,
  radial-gradient(900px 500px at 80% -10%,rgba(217,72,15,.22),transparent 60%),#0b1220}
.sr-wrap{max-width:880px;margin:0 auto;padding:0 20px 56px}
.sr-top{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 0;background:rgba(11,18,32,.94);border-bottom:1px solid rgba(244,239,227,.14)}
.sr-link{font-size:12px;font-weight:700;color:#aab2c3;cursor:pointer}.sr-link:hover{color:#fff}
.sr-clock{font-family:var(--mono);font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--gold)}
.sr-clock.low{color:#ff6b4a}
.sr-progress{height:3px;background:rgba(244,239,227,.12)}.sr-progress>i{display:block;height:100%;background:var(--accent);transition:width .4s}
.sr-eyebrow{font-size:11px;font-weight:800;letter-spacing:.32em;text-transform:uppercase;color:var(--gold)}
.sr-h1{font-family:var(--serif);font-size:clamp(2.4rem,8vw,4.6rem);line-height:1;letter-spacing:-.03em;margin-top:14px}
.sr-h1 em{color:var(--accent);font-style:italic}
.sr-lead{max-width:34rem;margin-top:16px;font-size:14px;line-height:1.7;color:#aab2c3}
.sr-stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:30px;border-block:1px solid rgba(244,239,227,.16)}
.sr-stats div{padding:16px 0}.sr-stats b{display:block;font-family:var(--serif);font-size:34px;font-weight:600}
.sr-stats span{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#8b94a8}
.sr-modes{display:grid;gap:16px;margin-top:28px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}
.sr-mode{position:relative;text-align:left;padding:26px;border-radius:6px 28px 6px 6px;background:var(--paper);color:var(--ink);cursor:pointer;
  box-shadow:0 30px 50px -30px rgba(0,0,0,.9);transition:transform .25s,box-shadow .25s}
.sr-mode:hover{transform:translateY(-5px);box-shadow:0 34px 60px -26px rgba(217,72,15,.7)}
.sr-mode h3{font-family:var(--serif);font-size:30px;font-weight:600;margin-top:34px}
.sr-mode p{font-size:13px;line-height:1.6;color:var(--mute);margin-top:6px}
.sr-mode .go{display:inline-block;margin-top:18px;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.sr-sheet{position:relative;background:var(--paper);color:var(--ink);border-radius:4px 30px 4px 4px;box-shadow:0 40px 70px -40px rgba(0,0,0,.95)}
.sr-card{padding:28px 24px 24px 46px;margin-top:22px}
.sr-card:before,.sr-list:before{content:'';position:absolute;top:0;bottom:0;left:30px;width:1px;background:rgba(217,72,15,.45)}
.sr-no{font-family:var(--serif);font-size:64px;line-height:1;color:var(--accent);letter-spacing:-.04em}
.sr-no small{font-size:15px;color:var(--mute);letter-spacing:0;margin-left:8px}
.sr-q{font-family:var(--serif);font-size:clamp(1.35rem,3.6vw,1.9rem);line-height:1.4;margin-top:16px;min-height:5.6em}
.sr-input{width:100%;resize:none;margin-top:8px;font-size:16px;line-height:32px;color:var(--ink);outline:none;border:0;
  background:repeating-linear-gradient(transparent 0 31px,var(--line) 31px 32px);background-attachment:local}
.sr-input:focus{background-color:rgba(246,183,60,.1)}
.sr-row{display:flex;gap:12px;margin-top:18px}
.sr-btn{flex:1;padding:14px 20px;border-radius:999px;font-size:14px;font-weight:800;background:var(--accent);color:#fff;cursor:pointer;text-align:center}
.sr-btn:hover{filter:brightness(1.1)}.sr-btn:disabled{opacity:.35;cursor:default}
.sr-btn.alt{flex:0 0 auto;background:transparent;color:inherit;box-shadow:inset 0 0 0 1px currentColor}
.sr-grid{display:grid;grid-template-columns:repeat(10,1fr);gap:6px;margin-top:22px}
.sr-dot{padding:7px 0;border-radius:6px;font-family:var(--mono);font-size:11px;color:#8b94a8;border:1px solid rgba(244,239,227,.14);cursor:pointer}
.sr-dot.filled{background:var(--paper2);color:var(--ink);border-color:transparent}
.sr-dot.now{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.sr-list{margin-top:20px;padding:8px 22px 8px 46px;list-style:none}
.sr-list li{display:flex;gap:14px;padding:18px 0;border-bottom:1px solid var(--line)}.sr-list li:last-child{border-bottom:0}
.sr-list .n{flex:none;width:30px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--accent);padding-top:3px}
.sr-list .t{font-family:var(--serif);font-size:17px;line-height:1.5}
.sr-ans{margin-top:8px;padding-left:12px;border-left:3px solid var(--gold);font-size:14px;line-height:1.6;white-space:pre-wrap}
.sr-ans.none{border-color:var(--line);color:var(--mute)}
@media (max-width:480px){.sr-card{padding-left:42px;padding-right:18px}.sr-grid{grid-template-columns:repeat(8,1fr)}}
`;
