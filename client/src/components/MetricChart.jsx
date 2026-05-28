import React, { useState, useCallback, useMemo } from 'react';
import {
  ComposedChart, AreaChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Brush, ReferenceLine
} from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Units and context for each metric
const metricMeta = {
  speed: { unit: 'km/s', label: 'Speed', fullUnit: 'Kilometers per second' },
  density: { unit: 'p/cm³', label: 'Density', fullUnit: 'Protons per cubic cm' },
  bz: { unit: 'nT', label: 'Bz', fullUnit: 'Nanotesla' },
  xray: { unit: 'W/m²', label: 'Flux', fullUnit: 'Watts per square meter' },
  kp: { unit: 'Kp', label: 'Kp Index', fullUnit: 'Planetary K-index (0–9)' },
};

// Reference thresholds for visual context
const referenceLines = {
  speed: [
    { value: 500, label: 'Fast Solar Wind', color: '#f59e0b' },
    { value: 700, label: 'Severe Storm Warning', color: '#ef4444' }
  ],
  kp: [
    { value: 5, label: 'G1 Minor', color: '#f59e0b' },
    { value: 7, label: 'G3 Strong', color: '#ef4444' },
    { value: 9, label: 'G5 Extreme', color: '#b91c1c' }
  ],
  bz: [
    { value: 0, label: 'Magnetic Neutral', color: '#64748b' },
    { value: -10, label: 'Storm Precursor (Southward Bz)', color: '#ef4444' }
  ],
  xray: [
    { value: 1e-6, label: 'C-Class Flare', color: '#fcd34d' },
    { value: 1e-5, label: 'M-Class Flare', color: '#f59e0b' },
    { value: 1e-4, label: 'X-Class Flare (Critical)', color: '#ef4444' }
  ],
  density: [
    { value: 10, label: 'Elevated Density', color: '#f59e0b' },
    { value: 30, label: 'Dense Particle Cluster', color: '#ef4444' }
  ]
};

const CustomTooltip = ({ active, payload, label, dataKey, color }) => {
  if (!active || !payload || !payload.length) return null;
  const meta = metricMeta[dataKey] || {};
  const entry = payload.find(p => p.dataKey === dataKey);
  if (!entry) return null;

  return (
    <div className="rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md" style={{ background: 'var(--bg-tooltip)', border: '1px solid var(--border-panel)' }}>
      <p className="text-[11px] font-mono text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {entry.value != null ? (dataKey === 'xray' ? entry.value.toExponential(2) : entry.value.toFixed(2)) : '—'}
        <span className="text-xs font-normal ml-1.5" style={{ color: 'var(--text-dim)' }}>{meta.unit}</span>
      </p>
    </div>
  );
};

const MetricChart = ({ title, data, dataKey, color, selectedHours, dark }) => {
  const [brushStartIndex, setBrushStartIndex] = useState(null);
  const [brushEndIndex, setBrushEndIndex] = useState(null);

  const meta = metricMeta[dataKey] || { unit: '', label: dataKey };
  const refs = referenceLines[dataKey] || [];

  // Filter data to only include points that have a value for this metric
  const filteredData = data.filter(d => d[dataKey] !== undefined && d[dataKey] !== null);
  const dataLen = filteredData.length;

  // Zoom controls — adjust brush range
  const handleZoomIn = useCallback(() => {
    const start = brushStartIndex ?? 0;
    const end = brushEndIndex ?? dataLen - 1;
    const range = end - start;
    const step = Math.max(Math.floor(range * 0.25), 1);
    const newStart = Math.min(start + step, end - 2);
    const newEnd = Math.max(end - step, start + 2);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  }, [brushStartIndex, brushEndIndex, dataLen]);

  const handleZoomOut = useCallback(() => {
    const start = brushStartIndex ?? 0;
    const end = brushEndIndex ?? dataLen - 1;
    const range = end - start;
    const step = Math.max(Math.floor(range * 0.25), 2);
    const newStart = Math.max(start - step, 0);
    const newEnd = Math.min(end + step, dataLen - 1);
    setBrushStartIndex(newStart);
    setBrushEndIndex(newEnd);
  }, [brushStartIndex, brushEndIndex, dataLen]);

  const handleReset = useCallback(() => {
    setBrushStartIndex(null);
    setBrushEndIndex(null);
  }, []);

  const handleBrushChange = useCallback((brushArea) => {
    if (brushArea) {
      setBrushStartIndex(brushArea.startIndex);
      setBrushEndIndex(brushArea.endIndex);
    }
  }, []);

  const handleClick = useCallback((e) => {
    if (e && e.activeTooltipIndex !== undefined) {
      const clickedIdx = e.activeTooltipIndex;
      const start = brushStartIndex ?? 0;
      const end = brushEndIndex ?? dataLen - 1;
      const currentRange = end - start;
      const newRange = Math.max(Math.floor(currentRange * 0.4), 10);
      setBrushStartIndex(Math.max(0, clickedIdx - Math.floor(newRange / 2)));
      setBrushEndIndex(Math.min(dataLen - 1, clickedIdx + Math.floor(newRange / 2)));
    }
  }, [brushStartIndex, brushEndIndex, dataLen]);

  // Compute Y-axis domain so reference/baseline lines are always visible even when zoomed
  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return ['auto', 'auto'];
    const refValues = refs.map(r => r.value);
    const dataValues = filteredData.map(d => d[dataKey]).filter(v => v != null);
    const allValues = [...dataValues, ...refValues];
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const padding = (maxVal - minVal) * 0.05 || 1;
    return [minVal - padding, maxVal + padding];
  }, [filteredData, refs, dataKey]);

  return (
    <div className="backdrop-blur-md p-6 rounded-2xl border relative overflow-hidden group h-full flex flex-col"
         style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--glow-overlay), transparent)' }} />

      {/* Header with title + unit + zoom controls */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-xl font-display font-semibold flex items-center" style={{ color: 'var(--text-primary)' }}>
          <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}></div>
          {title}
          <span className="ml-3 text-xs font-mono px-2.5 py-1 rounded-md border" style={{ color: 'var(--text-dim)', background: 'var(--bg-card)', borderColor: 'var(--border-card)' }}>
            {meta.unit}
          </span>
        </h2>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {filteredData.length > 0 && (
            <span className="text-[10px] font-mono text-slate-600 ml-2">
              {filteredData.length} pts
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 relative z-10 min-h-[400px]">
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="font-mono text-sm mb-1" style={{ color: 'var(--text-dim)' }}>NO DATA IN RANGE</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try selecting a wider time range</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={filteredData}
              margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
              onClick={handleClick}
            >
              <defs>
                <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--chart-axis)"
                tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', fill: 'var(--chart-axis)' }}
                tickLine={false}
                axisLine={false}
                dy={10}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                stroke="var(--chart-axis)"
                domain={yDomain}
                allowDataOverflow={false}
                tick={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', fill: 'var(--chart-axis)' }}
                tickLine={false}
                axisLine={false}
                dx={-5}
                label={{
                  value: meta.unit,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11, fill: 'var(--text-dim)', fontFamily: 'ui-monospace, monospace' }
                }}
              />
              <Tooltip
                content={<CustomTooltip dataKey={dataKey} color={color} />}
                cursor={{ stroke: '#334155', strokeWidth: 1 }}
              />

              {/* Reference lines for thresholds */}
              {refs.map((ref, i) => (
                <ReferenceLine
                  key={i}
                  y={ref.value}
                  stroke={ref.color}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: ref.label,
                    position: 'insideTopRight',
                    style: { fontSize: 10, fill: ref.color, fontFamily: 'ui-monospace, monospace' }
                  }}
                />
              ))}



              {dataKey === 'kp' ? (
                <Bar
                  dataKey={dataKey}
                  fill={color}
                  barSize={16}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#gradient-${dataKey})`}
                  dot={false}
                  activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: '#0f172a' }}
                  connectNulls={true}
                  isAnimationActive={true}
                  animationDuration={600}
                />
              )}

              {/* Brush for manual zoom/pan */}
              <Brush
                dataKey="time"
                height={30}
                stroke="var(--chart-axis)"
                fill="var(--bg-card)"
                travellerWidth={8}
                startIndex={brushStartIndex ?? undefined}
                endIndex={brushEndIndex ?? undefined}
                onChange={handleBrushChange}
                tickFormatter={() => ''}
              >
                <AreaChart data={filteredData}>
                  <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.15}
                    strokeWidth={1}
                    dot={false}
                  />
                </AreaChart>
              </Brush>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default MetricChart;
