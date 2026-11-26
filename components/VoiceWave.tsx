'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream | null;
  onLevel?: (level: number) => void; // called about 18 times a second while a stream is live
}

const BAR = 4;
const GAP = 3;

/** Live loudness graph (scrolling bars, newest on the right). Flat line when there is no mic stream. */
export function VoiceWave({ stream, onLevel }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 80;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const maxBars = Math.max(1, Math.floor(w / (BAR + GAP)));
    const hist: number[] = [];

    const paint = () => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < maxBars; i++) {
        const idx = hist.length - maxBars + i;
        const level = idx >= 0 ? hist[idx] : 0;
        const bh = Math.max(3, level * h * 0.95);
        const x = i * (BAR + GAP);
        const y = (h - bh) / 2;
        g.fillStyle = level > 0.02 ? '#f59e0b' : '#475569';
        g.beginPath();
        if ((g as any).roundRect) (g as any).roundRect(x, y, BAR, bh, 2);
        else g.rect(x, y, BAR, bh);
        g.fill();
      }
    };

    if (!stream) {
      paint();
      return;
    }

    const AC = window.AudioContext || (window as any).webkitAudioContext;
    let ctx: AudioContext | null = null;
    let raf = 0;
    try {
      ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      let last = 0;

      const tick = (t: number) => {
        raf = requestAnimationFrame(tick);
        if (t - last < 55) return;
        last = t;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / data.length) * 4.5);
        hist.push(level);
        onLevelRef.current?.(level);
        if (hist.length > maxBars) hist.shift();
        paint();
      };
      raf = requestAnimationFrame(tick);
    } catch {
      paint();
    }

    return () => {
      cancelAnimationFrame(raf);
      try {
        ctx?.close();
      } catch {}
    };
  }, [stream]);

  return <canvas ref={ref} className="w-full h-20" aria-label="Voice loudness graph" />;
}
