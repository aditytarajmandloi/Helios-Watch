import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Trash2, Zap } from 'lucide-react';

const STORAGE_KEY = 'helios_custom_alerts';
const NOTIFY_COOLDOWN = 5 * 60 * 1000;

const METRICS = [
  { id: 'speed', label: 'Solar Wind Speed', unit: 'km/s', shortLabel: 'Speed' },
  { id: 'density', label: 'Proton Density', unit: 'p/cm³', shortLabel: 'Density' },
  { id: 'bz', label: 'Magnetic Field Bz', unit: 'nT', shortLabel: 'Bz' },
  { id: 'xray', label: 'X-Ray Flux', unit: 'W/m²', shortLabel: 'X-Ray' },
  { id: 'kp', label: 'Kp Index', unit: 'Kp', shortLabel: 'Kp' },
];

const CONDITIONS = [
  { id: 'gte', symbol: '≥', label: 'rises above' },
  { id: 'lte', symbol: '≤', label: 'falls below' },
];

const PRESETS = [
  { metric: 'speed', condition: 'gte', threshold: 800, severity: 'Critical', label: 'CME Sheath Impact' },
  { metric: 'kp', condition: 'gte', threshold: 7, severity: 'Critical', label: 'G3+ Storm' },
  { metric: 'bz', condition: 'lte', threshold: -15, severity: 'Critical', label: 'Deep Southward IMF' },
  { metric: 'xray', condition: 'gte', threshold: 0.0001, severity: 'Critical', label: 'X-Class Radiation' },
  { metric: 'speed', condition: 'gte', threshold: 500, severity: 'Warning', label: 'Fast Stream Onset' },
  { metric: 'density', condition: 'gte', threshold: 20, severity: 'Warning', label: 'Density Compression' },
];

const CustomAlertPanel = ({ latestData = {} }) => {
  const [rules, setRules] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [formMetric, setFormMetric] = useState('speed');
  const [formCondition, setFormCondition] = useState('gte');
  const [formThreshold, setFormThreshold] = useState('');
  const [formSeverity, setFormSeverity] = useState('Warning');
  const [formLabel, setFormLabel] = useState('');
  const [lastNotified, setLastNotified] = useState({});

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  // Evaluate whether a rule is currently triggered
  const isTriggered = useCallback((rule) => {
    const val = latestData[rule.metric];
    if (val == null) return false;
    return rule.condition === 'gte' ? val >= rule.threshold : val <= rule.threshold;
  }, [latestData]);

  // Fire browser notifications for triggered rules (with cooldown)
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    rules.forEach(rule => {
      if (!rule.active || !isTriggered(rule)) return;

      const now = Date.now();
      const lastTime = lastNotified[rule.id] || 0;
      if (now - lastTime < NOTIFY_COOLDOWN) return;

      const m = METRICS.find(x => x.id === rule.metric);
      new Notification(`⚠ HeliosWatch: ${rule.label}`, {
        body: `${m?.label || rule.metric} ${rule.condition === 'gte' ? '≥' : '≤'} ${rule.threshold} ${m?.unit || ''}`,
        tag: rule.id,
      });
      setLastNotified(prev => ({ ...prev, [rule.id]: now }));
    });
  }, [latestData, rules, isTriggered, lastNotified]);

  const addRule = () => {
    const threshold = parseFloat(formThreshold);
    if (isNaN(threshold)) return;

    const m = METRICS.find(x => x.id === formMetric);
    const c = CONDITIONS.find(x => x.id === formCondition);
    const autoLabel = formLabel || `${m.shortLabel} ${c.symbol} ${threshold}`;

    setRules(prev => [...prev, {
      id: Date.now().toString(),
      metric: formMetric,
      condition: formCondition,
      threshold,
      severity: formSeverity,
      label: autoLabel,
      active: true,
    }]);

    setFormThreshold('');
    setFormLabel('');
    setShowForm(false);
  };

  const addPreset = (preset) => {
    const exists = rules.some(r =>
      r.metric === preset.metric && r.condition === preset.condition && r.threshold === preset.threshold
    );
    if (exists) return;
    setRules(prev => [...prev, { id: Date.now().toString(), ...preset, active: true }]);
  };

  const toggleRule = (id) => setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const deleteRule = (id) => setRules(prev => prev.filter(r => r.id !== id));

  const enableNotifications = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  const activeTriggered = rules.filter(r => r.active && isTriggered(r));

  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20">
            <Bell className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2
              className="text-lg font-semibold tracking-wide"
              style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}
            >
              Custom Alert Rules
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {rules.length} rule{rules.length !== 1 ? 's' : ''} configured
              {activeTriggered.length > 0 && (
                <span className="ml-2 text-red-400 font-semibold animate-pulse">
                  · {activeTriggered.length} triggered
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={enableNotifications}
            className="px-3 py-1.5 rounded-lg text-[10px] font-mono tracking-wider transition-all"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
            title="Enable browser notifications for triggered rules"
          >
            NOTIFY
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> NEW RULE
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-4 relative z-10">
        <p className="text-[9px] uppercase tracking-widest font-mono mb-2" style={{ color: 'var(--text-dim)' }}>Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset, i) => {
            const m = METRICS.find(x => x.id === preset.metric);
            const c = CONDITIONS.find(x => x.id === preset.condition);
            const exists = rules.some(r =>
              r.metric === preset.metric && r.condition === preset.condition && r.threshold === preset.threshold
            );
            return (
              <button
                key={i}
                onClick={() => addPreset(preset)}
                disabled={exists}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                  exists
                    ? 'bg-white/[0.02] border-white/[0.04] text-slate-600 cursor-default'
                    : preset.severity === 'Critical'
                      ? 'bg-red-500/[0.06] border-red-500/15 text-red-300/70 hover:bg-red-500/10 hover:text-red-300 cursor-pointer'
                      : 'bg-amber-500/[0.06] border-amber-500/15 text-amber-300/70 hover:bg-amber-500/10 hover:text-amber-300 cursor-pointer'
                }`}
              >
                {preset.label} ({m?.shortLabel} {c?.symbol}{' '}
                {preset.metric === 'xray' ? preset.threshold.toExponential(0) : preset.threshold})
                {exists && ' ✓'}
              </button>
            );
          })}
        </div>
      </div>

      {/* New Rule Form */}
      {showForm && (
        <div className="mb-5 p-4 rounded-xl relative z-10" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-dim)' }}>Metric</label>
              <select
                value={formMetric}
                onChange={e => setFormMetric(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              >
                {METRICS.map(m => (
                  <option key={m.id} value={m.id}>{m.shortLabel}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-dim)' }}>Condition</label>
              <select
                value={formCondition}
                onChange={e => setFormCondition(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              >
                {CONDITIONS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-dim)' }}>
                Threshold ({METRICS.find(m => m.id === formMetric)?.unit})
              </label>
              <input
                type="text"
                value={formThreshold}
                onChange={e => setFormThreshold(e.target.value)}
                placeholder={METRICS.find(m => m.id === formMetric)?.unit}
                className="rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-orange-500/50 transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
                onKeyDown={e => e.key === 'Enter' && addRule()}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase tracking-widest font-mono" style={{ color: 'var(--text-dim)' }}>Severity</label>
              <select
                value={formSeverity}
                onChange={e => setFormSeverity(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              >
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <button
              onClick={addRule}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30 transition-all"
            >
              Add Rule
            </button>
          </div>
          <div className="mt-3">
            <input
              type="text"
              value={formLabel}
              onChange={e => setFormLabel(e.target.value)}
              placeholder="Custom label (optional — auto-generated if left blank)"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-500/50 transition-colors"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-input)', color: 'var(--text-primary)' }}
              onKeyDown={e => e.key === 'Enter' && addRule()}
            />
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="relative z-10">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
            No custom rules configured. Add a preset above or create a new rule.
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => {
              const m = METRICS.find(x => x.id === rule.metric);
              const c = CONDITIONS.find(x => x.id === rule.condition);
              const triggered = rule.active && isTriggered(rule);
              const currentVal = latestData[rule.metric];

              return (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                    triggered
                      ? 'bg-red-500/[0.08] border-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                      : rule.active
                        ? 'bg-white/[0.02] border-white/[0.06]'
                        : 'bg-white/[0.01] border-white/[0.03] opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Toggle */}
                    <button onClick={() => toggleRule(rule.id)} className="flex-shrink-0" aria-label="Toggle rule">
                      {rule.active ? (
                        <div className="w-8 h-4 rounded-full bg-orange-500/30 flex items-center relative cursor-pointer">
                          <div className="absolute w-3 h-3 rounded-full bg-orange-400 right-0.5 shadow-[0_0_6px_rgba(249,115,22,0.5)]" />
                        </div>
                      ) : (
                        <div className="w-8 h-4 rounded-full bg-slate-800 flex items-center relative border border-slate-700 cursor-pointer">
                          <div className="absolute w-3 h-3 rounded-full bg-slate-600 left-0.5" />
                        </div>
                      )}
                    </button>

                    {/* Rule Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{rule.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider ${
                            rule.severity === 'Critical'
                              ? 'bg-red-500/15 text-red-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {rule.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {m?.shortLabel} {c?.symbol}{' '}
                        {rule.metric === 'xray' ? rule.threshold.toExponential(1) : rule.threshold} {m?.unit}
                        {currentVal != null && (
                          <span className="ml-2 text-slate-600">
                            now: {rule.metric === 'xray' ? currentVal.toExponential(1) : Number(currentVal).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status + Delete */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {triggered ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg animate-pulse">
                        <Zap className="w-3 h-3" /> ACTIVE
                      </span>
                    ) : rule.active ? (
                      <span className="text-[10px] font-mono text-emerald-500/50 px-2 py-1">OK</span>
                    ) : null}
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomAlertPanel;
