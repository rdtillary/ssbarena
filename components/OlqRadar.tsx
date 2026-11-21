'use client';

import React from 'react';
import { OLQS } from '@/lib/olq';

interface Props {
  scores: Record<string, number>;
}

const SIZE = 460;
const C = SIZE / 2;
const R = 150;

function point(i: number, value: number, radius = R) {
  const angle = ((-90 + (i * 360) / OLQS.length) * Math.PI) / 180;
  const r = (value / 100) * radius;
  return { x: C + r * Math.cos(angle), y: C + r * Math.sin(angle), angle };
}

export function OlqRadar({ scores }: Props) {
  const rings = [20, 40, 60, 80, 100];
  const polygon = OLQS.map((q, i) => {
    const p = point(i, scores[q] ?? 0);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-md mx-auto"
      role="img"
      aria-label="Spider graph of the 15 Officer Like Qualities"
    >
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={OLQS.map((_, i) => {
            const p = point(i, ring);
            return `${p.x},${p.y}`;
          }).join(' ')}
          fill="none"
          stroke="#334155"
          strokeWidth={ring === 100 ? 1.2 : 0.7}
        />
      ))}

      {OLQS.map((_, i) => {
        const p = point(i, 100);
        return <line key={i} x1={C} y1={C} x2={p.x} y2={p.y} stroke="#334155" strokeWidth={0.7} />;
      })}

      {rings.map((ring) => (
        <text key={ring} x={C + 3} y={C - (ring / 100) * R + 9} fontSize={8} fill="#64748b">
          {ring}
        </text>
      ))}

      <polygon points={polygon} fill="rgba(245,158,11,0.28)" stroke="#f59e0b" strokeWidth={2} />

      {OLQS.map((q, i) => {
        const p = point(i, scores[q] ?? 0);
        return <circle key={q} cx={p.x} cy={p.y} r={3.2} fill="#f59e0b" />;
      })}

      {OLQS.map((q, i) => {
        const p = point(i, 100, R + 16);
        const cos = Math.cos(p.angle);
        const anchor = cos > 0.25 ? 'start' : cos < -0.25 ? 'end' : 'middle';
        return (
          <text
            key={q}
            x={p.x}
            y={p.y}
            fontSize={9.5}
            fontWeight={700}
            fill="#e2e8f0"
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {q.length > 18 ? (
              <>
                <tspan x={p.x} dy="-0.5em">{q.split(' ').slice(0, Math.ceil(q.split(' ').length / 2)).join(' ')}</tspan>
                <tspan x={p.x} dy="1.1em">{q.split(' ').slice(Math.ceil(q.split(' ').length / 2)).join(' ')}</tspan>
                <tspan x={p.x} dy="1.1em" fill="#f59e0b">{scores[q] ?? 0}</tspan>
              </>
            ) : (
              <>
                <tspan x={p.x} dy="-0.3em">{q}</tspan>
                <tspan x={p.x} dy="1.1em" fill="#f59e0b">{scores[q] ?? 0}</tspan>
              </>
            )}
          </text>
        );
      })}
    </svg>
  );
}
