import { useId, useState, type ReactNode } from 'react';
import { useMeasure } from '../lib/hooks';
import { fmtCompact, fmtMoney } from '../lib/format';

export function niceScale(min: number, max: number, count = 4) {
  if (max <= min) max = min + 1;
  const rough = (max - min) / count;
  const p = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const n = Math.round((hi - lo) / step);
  return { lo, hi, ticks: Array.from({ length: n + 1 }, (_, i) => lo + i * step) };
}

const GRID = { stroke: 'rgb(var(--line))' };

function Tooltip({ left, children }: { left: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-line bg-raised px-3 py-2 text-xs shadow-lg"
      style={{ left }}
    >
      {children}
    </div>
  );
}

const Dot = ({ color }: { color: string }) => <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />;

export function BarChart({
  data,
  aName,
  bName,
  aColor,
  bColor,
  height = 240,
}: {
  data: { label: string; a: number; b: number }[];
  aName: string;
  bName: string;
  aColor: string;
  bColor: string;
  height?: number;
}) {
  const [ref, w] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { l: 52, r: 8, t: 12, b: 26 };
  const max = Math.max(0, ...data.flatMap((d) => [d.a, d.b]));
  const { hi, ticks } = niceScale(0, max || 1000);
  const iw = Math.max(w - pad.l - pad.r, 0);
  const ih = height - pad.t - pad.b;
  const band = data.length ? iw / data.length : 0;
  const bw = Math.min(26, band * 0.32);
  const y = (v: number) => pad.t + ih - (v / hi) * ih;
  const h = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={`${aName} y ${bName} por mes`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} style={GRID} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[10px]">
                {fmtCompact(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + band * i + band / 2;
            const dim = hover !== null && hover !== i ? 0.35 : 1;
            return (
              <g key={d.label + i}>
                {[
                  { v: d.a, c: aColor, x: cx - bw - 1.5 },
                  { v: d.b, c: bColor, x: cx + 1.5 },
                ].map((bar, k) => (
                  <rect
                    key={k}
                    x={bar.x}
                    y={y(bar.v)}
                    width={bw}
                    height={Math.max(pad.t + ih - y(bar.v), 0)}
                    rx={Math.min(4, bw / 2)}
                    style={{ fill: bar.c, opacity: dim, transition: 'opacity .15s' }}
                  />
                ))}
                <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {d.label}
                </text>
                <rect
                  x={pad.l + band * i}
                  y={pad.t}
                  width={band}
                  height={ih}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover(hover === i ? null : i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {h && hover !== null && (
        <Tooltip left={Math.min(Math.max(pad.l + band * hover + band / 2, 80), Math.max(w - 80, 80))}>
          <p className="mb-1 font-medium">{h.label}</p>
          <p className="flex items-center gap-1.5 tabular-nums">
            <Dot color={aColor} /> {aName}: {fmtMoney(h.a)}
          </p>
          <p className="flex items-center gap-1.5 tabular-nums">
            <Dot color={bColor} /> {bName}: {fmtMoney(h.b)}
          </p>
        </Tooltip>
      )}
    </div>
  );
}

export interface Series {
  name: string;
  color: string;
  values: number[];
  area?: boolean;
  dashed?: boolean;
}

export function LineChart({ labels, series, height = 240 }: { labels: string[]; series: Series[]; height?: number }) {
  const [ref, w] = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = 'g' + useId().replace(/:/g, '');
  const pad = { l: 56, r: 14, t: 12, b: 26 };
  const n = labels.length;
  const all = series.flatMap((s) => s.values);
  const { lo, hi, ticks } = niceScale(Math.min(0, ...all), Math.max(0, ...all));
  const iw = Math.max(w - pad.l - pad.r, 0);
  const ih = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (n > 1 ? (iw * i) / (n - 1) : iw / 2);
  const y = (v: number) => pad.t + ih - ((v - lo) / (hi - lo)) * ih;
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))));
  const pick = (clientX: number, svg: SVGSVGElement) => {
    const r = svg.getBoundingClientRect();
    const rel = (clientX - r.left - pad.l) / (iw || 1);
    setHover(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))));
  };

  return (
    <div ref={ref} className="relative w-full select-none">
      {w > 0 && n > 0 && (
        <svg
          width={w}
          height={height}
          role="img"
          aria-label={series.map((s) => s.name).join(', ')}
          onMouseMove={(e) => pick(e.clientX, e.currentTarget)}
          onMouseLeave={() => setHover(null)}
          onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget)}
          onTouchMove={(e) => pick(e.touches[0].clientX, e.currentTarget)}
        >
          <defs>
            {series.map(
              (s, i) =>
                s.area && (
                  <linearGradient key={i} id={`${gid}-${i}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" style={{ stopColor: s.color, stopOpacity: 0.28 }} />
                    <stop offset="100%" style={{ stopColor: s.color, stopOpacity: 0 }} />
                  </linearGradient>
                ),
            )}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} style={GRID} strokeDasharray={t === 0 ? undefined : '3 4'} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted text-[10px]">
                {fmtCompact(t)}
              </text>
            </g>
          ))}
          {labels.map(
            (l, i) =>
              i % every === 0 && (
                <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                  {l}
                </text>
              ),
          )}
          {series.map((s, i) => {
            const line = s.values.map((v, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
            return (
              <g key={i}>
                {s.area && (
                  <path d={`${line} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} style={{ fill: `url(#${gid}-${i})` }} />
                )}
                <path
                  d={line}
                  fill="none"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={s.dashed ? '5 5' : undefined}
                  style={{ stroke: s.color }}
                />
              </g>
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} style={GRID} />
              {series.map((s, i) => (
                <circle key={i} cx={x(hover)} cy={y(s.values[hover])} r={4} strokeWidth={2} style={{ fill: 'rgb(var(--surface))', stroke: s.color }} />
              ))}
            </g>
          )}
        </svg>
      )}
      {hover !== null && (
        <Tooltip left={Math.min(Math.max(x(hover), 80), Math.max(w - 80, 80))}>
          <p className="mb-1 font-medium">{labels[hover]}</p>
          {series.map((s, i) => (
            <p key={i} className="flex items-center gap-1.5 tabular-nums">
              <Dot color={s.color} /> {s.name}: {fmtMoney(s.values[hover])}
            </p>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

export function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 190,
  thickness = 20,
}: {
  segments: Segment[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  thickness?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness - 6) / 2;
  const c = 2 * Math.PI * r;
  const gap = segments.length > 1 ? 2 : 0;
  const act = active !== null ? segments[active] : null;
  let acc = 0;

  return (
    <div className="relative mx-auto select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} style={{ stroke: 'rgb(var(--raised))' }} />
        {total > 0 &&
          segments.map((s, i) => {
            const len = (s.value / total) * c;
            const off = acc;
            acc += len;
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={active === i ? thickness + 5 : thickness}
                strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`}
                strokeDashoffset={-off}
                style={{ stroke: s.color, opacity: active === null || active === i ? 1 : 0.35, transition: 'all .2s' }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
              />
            );
          })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-content-center px-6 text-center">
        <p className="truncate text-xs text-muted">{act ? act.label : centerLabel}</p>
        <p className="text-lg font-semibold tabular-nums">{act ? fmtMoney(act.value) : centerValue}</p>
      </div>
    </div>
  );
}

export function Ring({ pct, size = 84, stroke = 8, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} style={{ stroke: 'rgb(var(--raised))' }} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
          style={{ stroke: 'rgb(var(--accent))', transition: 'stroke-dasharray .8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center">{children}</div>
    </div>
  );
}
