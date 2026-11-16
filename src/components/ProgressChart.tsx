import { useMemo, useState } from 'react';
import type { ProgressRecord } from '../types';

interface ProgressChartProps {
  records: ProgressRecord[];
  mode?: 'weight' | 'activity';
  height?: number;
}

export function ProgressChart({
  records,
  mode = 'weight',
  height = 240,
}: ProgressChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const sorted = useMemo(() => {
    const copy = [...records].sort((a, b) => {
      if (a.recorded_date !== b.recorded_date) {
        return a.recorded_date.localeCompare(b.recorded_date);
      }
      return a.id.localeCompare(b.id);
    });
    if (mode === 'weight') {
      return copy.filter((r) => r.weight_kg !== null && r.weight_kg > 0);
    }
    return copy.filter((r) => r.duration_min > 0 || r.activity_type !== 'Weigh-In');
  }, [records, mode]);

  if (sorted.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center"
        style={{ height }}
      >
        <p className="text-sm font-medium text-slate-700">
          {mode === 'weight'
            ? 'No weight entries recorded yet'
            : 'No activity sessions logged yet'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {mode === 'weight'
            ? 'Log a weigh-in to plot your body weight trajectory.'
            : 'Record a workout session to chart your training duration.'}
        </p>
      </div>
    );
  }

  const width = 680;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const values = sorted.map((r) =>
    mode === 'weight' ? Number(r.weight_kg || 0) : Number(r.duration_min || 0)
  );
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  const minVal =
    mode === 'weight'
      ? Math.floor((rawMin - 1.5) * 2) / 2
      : 0;
  const maxVal =
    mode === 'weight'
      ? Math.ceil((rawMax + 1.5) * 2) / 2
      : Math.max(30, Math.ceil((rawMax + 10) / 10) * 10);
  const span = Math.max(1, maxVal - minVal);

  const points = sorted.map((r, idx) => {
    const x =
      sorted.length === 1
        ? padLeft + plotW / 2
        : padLeft + (idx / (sorted.length - 1)) * plotW;
    const val = mode === 'weight' ? Number(r.weight_kg || 0) : Number(r.duration_min || 0);
    const y = padTop + plotH - ((val - minVal) / span) * plotH;
    return { x, y, val, record: r };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints =
    points.length > 1
      ? `${points[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} ${polylinePoints} ${points[points.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)}`
      : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = minVal + t * span;
    const y = padTop + plotH - t * plotH;
    return { val, y };
  });

  const activePoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;
  const unit = mode === 'weight' ? 'kg' : 'min';

  return (
    <div className="relative w-full select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={mode === 'weight' ? 'Body weight progress chart' : 'Activity duration chart'}
      >
        <defs>
          <linearGradient id={`chartFill-${mode}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={tick.y}
              x2={width - padRight}
              y2={tick.y}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray={i === 0 ? undefined : '3 3'}
            />
            <text
              x={padLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-slate-500 text-[11px] font-mono tabular-nums"
            >
              {mode === 'weight' ? tick.val.toFixed(1) : Math.round(tick.val)}
            </text>
          </g>
        ))}

        {mode === 'activity' ? (
          points.map((p, idx) => {
            const barWidth = Math.min(28, Math.max(10, plotW / Math.max(points.length * 1.8, 6)));
            const barHeight = Math.max(2, padTop + plotH - p.y);
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={p.record.id}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={p.x - barWidth / 2}
                  y={p.y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  fill={isHovered ? '#0f766e' : '#14b8a6'}
                  opacity={isHovered ? 1 : 0.82}
                />
              </g>
            );
          })
        ) : (
          <>
            {areaPoints && (
              <polygon points={areaPoints} fill={`url(#chartFill-${mode})`} />
            )}
            {points.length > 1 && (
              <polyline
                fill="none"
                stroke="#0f766e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            )}
            {points.map((p, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <g
                  key={p.record.id}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer"
                >
                  <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 5.5 : 3.8}
                    fill="#ffffff"
                    stroke="#0f766e"
                    strokeWidth={isHovered ? 2.8 : 2.2}
                  />
                </g>
              );
            })}
          </>
        )}

        {points.map((p, idx) => {
          const step = points.length <= 7 ? 1 : Math.ceil(points.length / 6);
          const showLabel = idx === 0 || idx === points.length - 1 || idx % step === 0;
          if (!showLabel) return null;
          return (
            <text
              key={`x-${p.record.id}`}
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-500 text-[11px] font-mono tabular-nums"
            >
              {p.record.recorded_date.slice(5)}
            </text>
          );
        })}
      </svg>

      {activePoint && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-slate-900 tabular-nums">
              {activePoint.record.recorded_date}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-medium text-slate-900">
              {activePoint.record.workout_title || activePoint.record.activity_type}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="font-semibold text-teal-700">
              {mode === 'weight' ? activePoint.val.toFixed(1) : activePoint.val} {unit}
            </span>
            {activePoint.record.calories_burned > 0 && (
              <span className="text-slate-500">
                {activePoint.record.calories_burned} kcal
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
