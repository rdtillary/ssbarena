// Shared look for the sign-up screen and the onboarding quiz.
export const GATE_CSS = `
.gt-root{position:fixed;inset:0;z-index:40;overflow-y:auto;color:#f8fafc;
  background:
    radial-gradient(900px 520px at 50% -10%,rgba(245,158,11,.18),transparent 65%),
    radial-gradient(700px 500px at 100% 100%,rgba(56,189,248,.11),transparent 65%),
    radial-gradient(600px 420px at 0% 80%,rgba(99,102,241,.12),transparent 65%),#070a12}
.gt-grain{position:fixed;inset:0;pointer-events:none;opacity:.07;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.gt-orb{position:fixed;border-radius:9999px;filter:blur(80px);opacity:.32;pointer-events:none;animation:gt-float 16s ease-in-out infinite alternate}
@keyframes gt-float{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(36px,-44px,0) scale(1.14)}}
@keyframes gt-in{from{opacity:0;transform:translateY(22px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes gt-out{to{opacity:0;transform:translateY(-16px);filter:blur(5px)}}
.gt-in{animation:gt-in .6s cubic-bezier(.2,.8,.2,1) backwards}
.gt-leave{animation:gt-out .24s ease forwards}
.gt-serif{font-family:ui-serif,Georgia,Cambria,'Times New Roman',serif;letter-spacing:-.025em;font-weight:600}
.gt-eyebrow{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#fbbf24;font-weight:800}
.gt-glass{background:linear-gradient(145deg,rgba(30,41,59,.62),rgba(15,23,42,.5));border:1px solid rgba(148,163,184,.16);
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:0 40px 80px -40px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.06)}
.gt-opt{position:relative;display:flex;align-items:center;gap:16px;width:100%;padding:16px 18px;border-radius:18px;text-align:left;cursor:pointer;
  border:1px solid rgba(148,163,184,.16);color:#e2e8f0;
  background:linear-gradient(135deg,rgba(30,41,59,.62),rgba(15,23,42,.35));
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease,background .25s ease,opacity .3s ease;
  animation:gt-in .55s cubic-bezier(.2,.8,.2,1) backwards}
.gt-opt:not(:disabled):hover{transform:translateX(6px);border-color:rgba(251,191,36,.65);
  box-shadow:0 0 0 1px rgba(251,191,36,.2),0 22px 46px -22px rgba(245,158,11,.55)}
.gt-opt:disabled{cursor:default}
.gt-badge{flex:none;width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;
  font-weight:900;font-size:13px;color:#fbbf24;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);transition:all .25s ease}
.gt-t{display:block;font-size:16px;font-weight:700;color:#fff;line-height:1.25}
.gt-sub{display:block;font-size:12px;color:#94a3b8;margin-top:2px}
.gt-arrow{margin-left:auto;color:#475569;font-size:18px;transition:all .25s ease}
.gt-opt:not(:disabled):hover .gt-arrow{color:#fbbf24;transform:translateX(4px)}
.gt-picked{background:linear-gradient(135deg,#fde68a,#f59e0b)!important;border-color:transparent!important;transform:translateX(6px) scale(1.01)!important}
.gt-picked .gt-t{color:#0b0f19}.gt-picked .gt-sub{color:rgba(11,15,25,.68)}
.gt-picked .gt-badge{background:#0b0f19;color:#fbbf24;border-color:transparent}.gt-picked .gt-arrow{color:#0b0f19}
.gt-dim{opacity:.28}
.gt-chip{justify-content:center;padding:18px 14px;text-align:center;font-weight:800;font-size:15px}
.gt-label{display:block;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;color:#94a3b8;margin-bottom:8px}
.gt-input{width:100%;padding:14px 16px;border-radius:14px;background:rgba(2,6,23,.6);border:1px solid rgba(148,163,184,.22);
  color:#fff;font-size:15px;outline:none;color-scheme:dark;transition:border-color .2s ease,box-shadow .2s ease}
.gt-input:focus{border-color:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.16)}
.gt-input option{background:#0f172a;color:#fff}
.gt-btn{width:100%;padding:15px;border-radius:14px;font-weight:900;font-size:15px;color:#0b0f19;cursor:pointer;
  background:linear-gradient(180deg,#fde68a,#f59e0b);box-shadow:0 14px 30px -12px rgba(245,158,11,.7),inset 0 1px 0 rgba(255,255,255,.5);
  transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease}
.gt-btn:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 20px 38px -12px rgba(245,158,11,.85),inset 0 1px 0 rgba(255,255,255,.5)}
.gt-btn:disabled{opacity:.4;cursor:not-allowed}
.gt-ghost{width:100%;padding:14px;border-radius:14px;font-weight:800;font-size:14px;color:#0b0f19;background:#fff;cursor:pointer;transition:background .2s ease}
.gt-ghost:hover{background:#f1f5f9}
.gt-bar{height:3px;flex:1;border-radius:9999px;background:rgba(148,163,184,.2);overflow:hidden}
.gt-bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#fde68a,#f59e0b);transition:width .5s cubic-bezier(.2,.8,.2,1)}
.gt-bar.on>i{width:100%}
@media (prefers-reduced-motion:reduce){.gt-orb,.gt-in,.gt-opt{animation:none!important}}
`;
