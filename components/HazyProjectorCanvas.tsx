'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  imageUrl?: string | null;
  preset?: string;
}

export function HazyProjectorCanvas({ imageUrl, preset = 'village_panchayat' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (imageUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.55, '#94a3b8');
    grad.addColorStop(1, '#334155');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.filter = 'blur(2.5px)';
    ctx.fillStyle = 'rgba(30, 41, 59, 0.65)';

    const drawSilhouette = (x: number, y: number, scale = 1) => {
      ctx.beginPath();
      ctx.arc(x, y - 28 * scale, 11 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x - 14 * scale, y - 15 * scale, 28 * scale, 48 * scale, 8);
      ctx.fill();
    };

    if (preset === 'flood_rescue') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.fillRect(0, h * 0.58, w, h * 0.42);
      drawSilhouette(180, 210, 1.05);
      drawSilhouette(235, 220, 0.95);
      drawSilhouette(410, 235, 0.9);
      ctx.strokeStyle = 'rgba(241, 245, 249, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(235, 215);
      ctx.quadraticCurveTo(320, 245, 410, 235);
      ctx.stroke();
    } else if (preset === 'solitary_desk') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
      ctx.fillRect(190, 235, 220, 14);
      drawSilhouette(290, 195, 1.15);
      ctx.fillStyle = 'rgba(248, 250, 252, 0.25)';
      ctx.beginPath();
      ctx.arc(365, 185, 45, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawSilhouette(210, 195, 1.15);
      drawSilhouette(300, 225, 0.95);
      drawSilhouette(350, 228, 0.92);
      drawSilhouette(405, 222, 0.98);
      drawSilhouette(145, 228, 0.9);
    }

    ctx.filter = 'none';
    const rad = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.65);
    rad.addColorStop(0, 'rgba(0,0,0,0)');
    rad.addColorStop(1, 'rgba(2,6,23,0.72)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
  }, [imageUrl, preset]);

  return (
    <div className="relative w-full aspect-[16/10] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-inner">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="SSB PPDT Projector Scene"
          className="w-full h-full object-cover grayscale contrast-75 brightness-95 blur-[1.4px] scale-[1.02] select-none pointer-events-none"
        />
      ) : (
        <canvas ref={canvasRef} width={600} height={375} className="w-full h-full object-cover" />
      )}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/40" />
      <span className="absolute bottom-2.5 right-3 text-[10px] font-mono uppercase tracking-widest text-slate-300/80 bg-slate-950/60 px-2 py-0.5 rounded">
        SSB Projector Feed • Hazy B&amp;W
      </span>
    </div>
  );
}
