import React, { useState, useMemo, useCallback } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { Layers, ToggleLeft, ToggleRight, Sparkles, Loader } from 'lucide-react';
import axios from 'axios';

const METRICS = [
  { id: 'speed', label: 'Speed', unit: 'km/s', color: '#38bdf8' },
  { id: 'density', label: 'Density', unit: 'p/cm³', color: '#a78bfa' },
  { id: 'bz', label: 'Bz', unit: 'nT', color: '#f43f5e' },
  { id: 'xray', label: 'X-Ray', unit: 'W/m²', color: '#fbbf24' },
  { id: 'kp', label: 'Kp', unit: 'Kp', color: '#10b981' },
  { id: 'electrons', label: 'Electrons', unit: 'pfu', color: '#c084fc' }
];

/**
 * Pearson correlation coefficient between two arrays.
 * Returns r ∈ [-1, 1], or null if insufficient data.
 */
const pearsonR = (arrA, arrB) => {
  // Build paired values where both are non-null
  const pairs = [];
  for (let i = 0; i < Math.min(arrA.length, arrB.length); i++) {
    if (arrA[i] != null && arrB[i] != null) pairs.push([arrA[i], arrB[i]]);
  }
  if (pairs.length < 5) return null;

  const n = pairs.length;
  const sumA = pairs.reduce((s, p) => s + p[0], 0);
  const sumB = pairs.reduce((s, p) => s + p[1], 0);
  const sumAB = pairs.reduce((s, p) => s + p[0] * p[1], 0);
  const sumA2 = pairs.reduce((s, p) => s + p[0] * p[0], 0);
  const sumB2 = pairs.reduce((s, p) => s + p[1] * p[1], 0);

  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (den === 0) return null;
  return num / den;
};

/**
 * Normalize a value to 0-100 range given min/max.
 */
const normalize = (val, min, max) => {
  if (max === min) return 50;
  return ((val - min) / (max - min)) * 100;
};

const OverlayTooltip = ({ active, payload, label, selectedMetrics, normalized }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={{ background: 'var(--bg-tooltip)', border: '1px solid var(--border-panel)' }}
      className="rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="text-[11px] font-mono mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map(entry => {
        const meta = METRICS.find(m => m.id === entry.dataKey || `${m.id}_norm` === entry.dataKey);
        if (!meta) return null;
        const rawKey = meta.id;
        const displayKey = normalized ? `${rawKey}_norm` : rawKey;
        if (entry.dataKey !== displayKey) return null;

        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
            <span className="text-[12px] font-mono font-bold" style={{ color: meta.color }}>
              {normalized
                ? `${entry.value?.toFixed(1)}%`
                : (rawKey === 'xray' || (rawKey === 'electrons' && entry.value > 9999))
                  ? entry.value?.toExponential(2)
                  : entry.value?.toFixed(2)}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              {normalized ? `(${meta.label})` : meta.unit}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const CorrelationChart = ({ data = [], dark }) => {
  const [selected, setSelected] = useState(['speed', 'bz']);
  const [normalized, setNormalized] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [hasAutoFetched, setHasAutoFetched] = useState(false);

  const toggleMetric = useCallback((id) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // Must keep at least 1
        return prev.filter(x => x !== id);
      }
      if (prev.length >= 4) return prev; // Max 4
      return [...prev, id];
    });
  }, []);

  // Compute min/max per metric for normalization
  const ranges = useMemo(() => {
    const r = {};
    METRICS.forEach(m => {
      const vals = data.map(d => d[m.id]).filter(v => v != null);
      r[m.id] = {
        min: vals.length ? Math.min(...vals) : 0,
        max: vals.length ? Math.max(...vals) : 1,
      };
    });
    return r;
  }, [data]);

  // Prepare data with normalized columns
  const chartData = useMemo(() => {
    if (!normalized) return data;
    return data.map(d => {
      const row = { ...d };
      METRICS.forEach(m => {
        if (d[m.id] != null) {
          row[`${m.id}_norm`] = normalize(d[m.id], ranges[m.id].min, ranges[m.id].max);
        }
      });
      return row;
    });
  }, [data, normalized, ranges]);

  // Compute Pearson correlations between first selected and others
  const correlations = useMemo(() => {
    if (selected.length < 2) return {};
    const primary = selected[0];
    const primaryVals = data.map(d => d[primary]);
    const result = {};
    selected.slice(1).forEach(id => {
      result[id] = pearsonR(primaryVals, data.map(d => d[id]));
    });
    return result;
  }, [data, selected]);

  // Determine Y-axis assignments — first selected on left, rest on right
  const leftMetric = selected[0];
  const rightMetrics = selected.slice(1);

  const fetchInsight = useCallback(async () => {
    if (data.length === 0) return;
    setInsightLoading(true);
    setAiInsight(null);
    try {
      // Compute summary stats for selected metrics
      const summaryStats = {};
      selected.forEach(id => {
        const values = data.map(d => d[id]).filter(v => v != null && !isNaN(v));
        if (values.length > 0) {
          summaryStats[id] = {
            min: Math.min(...values),
            max: Math.max(...values),
            avg: (values.reduce((a, b) => a + b, 0) / values.length),
            latest: values[values.length - 1],
            points: values.length
          };
        }
      });
      const timeRange = data.length > 5000 ? '7D' : data.length > 1000 ? '24H' : '6H';
      const apiUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/ai-insight` : 'http://localhost:5000/api/ai-insight';
      const res = await axios.post(apiUrl, {
        selectedMetrics: selected,
        summaryStats,
        timeRange
      });
      if (res.data.success) {
        setAiInsight(res.data.insight);
      }
    } catch (err) {
      setAiInsight('Failed to generate insight. Please try again.');
    } finally {
      setInsightLoading(false);
    }
  }, [data, selected]);

  React.useEffect(() => {
    if (!hasAutoFetched && data.length > 0) {
      fetchInsight();
      setHasAutoFetched(true);
    }
  }, [data, hasAutoFetched, fetchInsight]);

  return (
    <div className="rounded-2xl p-5 relative overflow-hidden"
      style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-panel)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, var(--glow-overlay), transparent)` }} />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <h2 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}>
            Multi-Metric Correlation
          </h2>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Overlay parameters to identify patterns · Select 2–4 metrics
          </p>
        </div>

        {/* Normalize toggle */}
        <button
          onClick={() => setNormalized(!normalized)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all"
          style={{
            background: normalized ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-card)',
            border: `1px solid ${normalized ? 'rgba(168, 85, 247, 0.25)' : 'var(--border-card)'}`,
            color: normalized ? '#c084fc' : 'var(--text-muted)',
          }}
        >
          {normalized
            ? <ToggleRight className="w-4 h-4 text-purple-400" />
            : <ToggleLeft className="w-4 h-4" />
          }
          NORMALIZE
        </button>
      </div>

      {/* Normalize explanation */}
      {normalized && (
        <p className="text-[10px] mb-2 px-1 relative z-10" style={{ color: 'var(--text-dim)' }}>
          Normalize scales all metrics to a 0–100% range based on their min/max values in the current time window. This lets you visually compare trends between metrics with vastly different units (e.g. km/s vs nT).
        </p>
      )}

      {/* Metric selector chips */}
      <div className="flex flex-wrap gap-2 mb-3 relative z-10">
        {METRICS.map(m => {
          const isSelected = selected.includes(m.id);
          const idx = selected.indexOf(m.id);
          const corr = correlations[m.id];

          return (
            <button
              key={m.id}
              onClick={() => toggleMetric(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200"
              style={{
                background: isSelected ? `${m.color}18` : 'var(--bg-card)',
                border: `1px solid ${isSelected ? `${m.color}40` : 'var(--border-card)'}`,
                color: isSelected ? m.color : 'var(--text-dim)',
                boxShadow: isSelected ? `0 0 8px ${m.color}14` : 'none',
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color, opacity: isSelected ? 1 : 0.3 }} />
              {m.label}
              {isSelected && idx === 0 && (
                <span className="text-[8px] px-1 py-0.5 rounded ml-0.5" style={{ background: `${m.color}20`, color: m.color }}>L</span>
              )}
              {isSelected && idx > 0 && (
                <span className="text-[8px] px-1 py-0.5 rounded ml-0.5" style={{ background: `${m.color}20`, color: m.color }}>R</span>
              )}
              {corr != null && (
                <span className={`text-[9px] font-mono ml-1 px-1 py-0.5 rounded ${Math.abs(corr) >= 0.7 ? 'font-bold' : ''
                  }`} style={{
                    background: Math.abs(corr) >= 0.7
                      ? corr > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'
                      : 'var(--bg-card)',
                    color: Math.abs(corr) >= 0.7
                      ? corr > 0 ? '#4ade80' : '#f87171'
                      : 'var(--text-dim)',
                  }}>
                  r={corr.toFixed(2)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="relative z-10 h-[320px]">
        {selected.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: 'var(--text-muted)' }} className="font-mono text-sm">Select at least one metric</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--chart-axis)"
                tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', fill: 'var(--chart-axis)' }}
                tickLine={false}
                axisLine={false}
                dy={10}
                interval="preserveStartEnd"
                minTickGap={60}
              />

              {/* Left Y-axis — primary metric */}
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="var(--chart-axis)"
                tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', fill: METRICS.find(m => m.id === leftMetric)?.color || 'var(--chart-axis)' }}
                tickLine={false}
                axisLine={false}
                dx={-5}
                domain={normalized ? [0, 100] : ['auto', 'auto']}
                label={normalized ? undefined : {
                  value: METRICS.find(m => m.id === leftMetric)?.unit || '',
                  angle: -90, position: 'insideLeft', offset: 10,
                  style: { fontSize: 10, fill: METRICS.find(m => m.id === leftMetric)?.color || 'var(--chart-axis)', fontFamily: 'ui-monospace, monospace' }
                }}
              />

              {/* Right Y-axis — secondary metrics */}
              {rightMetrics.length > 0 && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--chart-axis)"
                  tick={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', fill: 'var(--chart-axis)' }}
                  tickLine={false}
                  axisLine={false}
                  dx={5}
                  domain={normalized ? [0, 100] : ['auto', 'auto']}
                  label={normalized ? undefined : {
                    value: rightMetrics.length === 1 ? (METRICS.find(m => m.id === rightMetrics[0])?.unit || '') : '',
                    angle: 90, position: 'insideRight', offset: 10,
                    style: { fontSize: 10, fill: METRICS.find(m => m.id === rightMetrics[0])?.color || 'var(--chart-axis)', fontFamily: 'ui-monospace, monospace' }
                  }}
                />
              )}

              <Tooltip content={<OverlayTooltip selectedMetrics={selected} normalized={normalized} />} />

              {/* Render lines for each selected metric */}
              {selected.map((id, idx) => {
                const meta = METRICS.find(m => m.id === id);
                const dataKey = normalized ? `${id}_norm` : id;
                return (
                  <Line
                    key={id}
                    yAxisId={idx === 0 ? 'left' : 'right'}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={meta.color}
                    strokeWidth={idx === 0 ? 2 : 1.5}
                    dot={false}
                    connectNulls
                    strokeDasharray={idx >= 2 ? '6 3' : undefined}
                    isAnimationActive={true}
                    animationDuration={500}
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Correlation legend */}
      {Object.keys(correlations).length > 0 && (
        <div className="mt-3 pt-3 relative z-10" style={{ borderTop: '1px solid var(--border-card)' }}>
          <p className="text-[9px] uppercase tracking-widest font-mono mb-2" style={{ color: 'var(--text-dim)' }}>
            Pearson Correlation (vs {METRICS.find(m => m.id === leftMetric)?.label})
          </p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(correlations).map(([id, r]) => {
              if (r == null) return null;
              const meta = METRICS.find(m => m.id === id);
              const strength = Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak';
              const direction = r > 0 ? 'positive' : 'negative';
              return (
                <div key={id} className="flex items-center gap-2 text-[11px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{meta.label}:</span>
                  <span className="font-mono font-bold" style={{
                    color: Math.abs(r) >= 0.7 ? (r > 0 ? '#4ade80' : '#f87171') : 'var(--text-muted)'
                  }}>
                    r = {r.toFixed(3)}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--text-dim)' }}>
                    ({strength} {direction})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Insight Button & Result */}
      <div className="mt-4 relative z-10">
        <button
          onClick={fetchInsight}
          disabled={insightLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: dark ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.08)',
            border: '1px solid rgba(168,85,247,0.25)',
            color: '#c084fc',
            cursor: insightLoading ? 'wait' : 'pointer',
            opacity: insightLoading ? 0.6 : 1,
          }}
        >
          {insightLoading
            ? <><Loader className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
            : <><Sparkles className="w-3.5 h-3.5" /> Find Insights</>
          }
        </button>

        {aiInsight && (
          <div className="mt-3 p-4 rounded-xl border backdrop-blur-md" style={{
            background: dark ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.04)',
            borderColor: 'rgba(168,85,247,0.2)',
          }}>
            <p className="text-[10px] uppercase font-bold tracking-widest mb-2" style={{ color: '#c084fc' }}>
              Correlation Insight
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              {aiInsight}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrelationChart;
