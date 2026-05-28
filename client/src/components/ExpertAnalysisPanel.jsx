import React, { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Metric metadata for display ───────────────────────
const METRIC_META = {
  speed:     { label: 'Speed',     unit: 'km/s',  rateUnit: 'km/s/hr' },
  density:   { label: 'Density',   unit: 'p/cm³', rateUnit: 'p/cm³/hr' },
  bz:        { label: 'Bz',        unit: 'nT',    rateUnit: 'nT/hr' },
  xray:      { label: 'X-Ray',     unit: 'W/m²',  rateUnit: 'W/m²/hr' },
  kp:        { label: 'Kp',        unit: '',       rateUnit: '/hr' },
  electrons: { label: 'Electrons', unit: 'pfu',   rateUnit: 'pfu/hr' },
};

const METRIC_IDS = ['speed', 'density', 'bz', 'xray', 'kp', 'electrons'];

// ─── Derived parameter computations ────────────────────

/**
 * Solar wind dynamic pressure: Pdyn (nPa) ≈ 1.6726e-6 × n(cm⁻³) × V²(km/s)
 * Typical quiet: ~2 nPa. CME events: 10-50+ nPa.
 */
const computeDynamicPressure = (speed, density) => {
  if (speed == null || density == null) return null;
  return 1.6726e-6 * density * speed * speed;
};

/**
 * Simplified Newell coupling function: dΦ_MP/dt ∝ V^(4/3) × |Bz|^(2/3)
 * Only significant when Bz is southward (negative).
 * Ref: Newell et al. 2007, JGR
 */
const computeCoupling = (speed, bz) => {
  if (speed == null || bz == null) return null;
  if (bz >= 0) return { value: 0, normalized: 0, level: 'Minimal', color: '#22c55e' };

  const coupling = Math.pow(speed, 4 / 3) * Math.pow(Math.abs(bz), 2 / 3);
  const normalized = Math.min(coupling / 50000, 1);
  let level, color;
  if (coupling < 5000)       { level = 'Low';      color = '#22c55e'; }
  else if (coupling < 15000) { level = 'Moderate';  color = '#eab308'; }
  else if (coupling < 40000) { level = 'Strong';    color = '#f59e0b'; }
  else                       { level = 'Extreme';   color = '#dc2626'; }

  return { value: coupling, normalized, level, color };
};

/**
 * Dawn-dusk interplanetary electric field: Ey = V × (−Bz) × 10⁻³ (mV/m)
 * Drives magnetospheric convection when Bz < 0.
 */
const computeElectricField = (speed, bz) => {
  if (speed == null || bz == null) return null;
  return speed * (-bz) * 1e-3;
};

/**
 * Magnetopause standoff distance (Shue et al. 1998):
 * R_mp = (11.4 + 0.013·Bz) × Pdyn^(-1/6.6) [Earth radii]
 * Normal: ~10 Re. Compressed < 6.6 Re during strong CME.
 */
const computeMagnetopause = (speed, density, bz) => {
  const pdyn = computeDynamicPressure(speed, density);
  if (pdyn == null || pdyn <= 0) return null;
  const bzVal = bz != null ? bz : 0;
  const r = (11.4 + 0.013 * bzVal) * Math.pow(pdyn, -1 / 6.6);
  return Math.max(r, 3); // Physical lower bound
};

/**
 * Estimated Dst proxy via simplified Burton equation:
 * Dst* ∝ -(V × Bs × some_factor)
 * Bs = max(0, -Bz) [southward component only]
 * Rough proxy: Dst ~ -0.01 × V × Bs (order-of-magnitude estimate in nT)
 * Ref: Burton et al. 1975, JGR
 */
const computeDstProxy = (speed, bz) => {
  if (speed == null || bz == null) return null;
  const bs = Math.max(0, -bz); // Southward component
  if (bs === 0) return 0;
  // Empirical scaling: during moderate storms V~500, Bs~10 → Dst ~ -50 nT
  return -0.01 * speed * bs;
};

/**
 * Reconnection clock angle (IMF clock angle):
 * θ_c = atan2(|By|, Bz) — since we don't have By, approximate with Bz alone.
 * When Bz < 0: θ ~ 180° (fully southward, maximum reconnection)
 * When Bz > 0: θ ~ 0° (northward, shielded)
 * Reconnection efficiency ∝ sin⁴(θ/2)
 */
const computeClockAngle = (bz) => {
  if (bz == null) return null;
  // Without By, estimate: θ = 180° when Bz < 0, scaled by magnitude
  // Using atan2(0, bz) for simplicity → gives 0 for bz>0, π for bz<0
  const theta = Math.atan2(0, bz); // Returns 0 or π
  // More nuanced: smooth transition around 0
  const thetaSmooth = bz <= 0 ? Math.PI : Math.max(0, Math.PI * (1 - bz / 5));
  const thetaDeg = (bz <= 0 ? 180 : Math.max(0, 180 * (1 - bz / 5)));
  const efficiency = Math.pow(Math.sin(thetaSmooth / 2), 4);
  return {
    degrees: Math.min(180, Math.max(0, thetaDeg)),
    efficiency,
  };
};

/**
 * Rate of change per hour from recent data.
 */
const computeRate = (data, metricId) => {
  const points = data
    .filter(d => d[metricId] != null && d._ts != null)
    .slice(-20)
    .map(d => ({ val: d[metricId], ts: d._ts }));

  if (points.length < 4) return null;

  const q = Math.max(Math.floor(points.length / 4), 1);
  const recent = points.slice(-q);
  const earlier = points.slice(0, q);

  const recentAvg = recent.reduce((s, p) => s + p.val, 0) / recent.length;
  const earlierAvg = earlier.reduce((s, p) => s + p.val, 0) / earlier.length;

  const timeSpanHrs = (recent[recent.length - 1].ts - earlier[0].ts) / 3.6e6;
  if (timeSpanHrs <= 0) return null;

  return (recentAvg - earlierAvg) / timeSpanHrs;
};

/**
 * Aurora equatorward boundary from Kp (empirical).
 */
const getAuroraLatitude = (kp) => {
  if (kp == null) return null;
  return Math.max(41, Math.round(67 - 2.9 * kp));
};

const getReferenceCityForLatitude = (lat) => {
  if (lat >= 65) return 'Tromsø, Norway';
  if (lat >= 62) return 'Fairbanks, Alaska';
  if (lat >= 59) return 'Stockholm, Sweden';
  if (lat >= 56) return 'Edinburgh, Scotland';
  if (lat >= 53) return 'Berlin, Germany';
  if (lat >= 50) return 'Vancouver, Canada';
  if (lat >= 47) return 'Seattle, USA';
  if (lat >= 44) return 'Portland, USA';
  return 'New York, USA';
};

/**
 * Impact assessment from NOAA G-scale (Kp) and R-scale (X-ray).
 */
const computeImpacts = (kp, xray) => {
  const g = kp == null ? 0 : kp >= 9 ? 5 : kp >= 8 ? 4 : kp >= 7 ? 3 : kp >= 6 ? 2 : kp >= 5 ? 1 : 0;
  const r = xray == null ? 0 : xray >= 2e-3 ? 5 : xray >= 1e-3 ? 4 : xray >= 1e-4 ? 3 : xray >= 5e-5 ? 2 : xray >= 1e-5 ? 1 : 0;

  return [
    { label: 'HF Radio',    level: Math.min(r + (g >= 3 ? 1 : 0), 5), icon: '📻' },
    { label: 'GPS / Nav',   level: Math.min(Math.max(g, r >= 3 ? 2 : 0), 5), icon: '📡' },
    { label: 'Satellites',  level: Math.min(g + (r >= 3 ? 1 : 0), 5), icon: '🛰' },
    { label: 'Power Grid',  level: Math.min(g, 5), icon: '⚡' },
    { label: 'Aviation',    level: Math.min(Math.max(r, g >= 4 ? 2 : 0), 5), icon: '✈️' },
  ];
};

const getImpactLabel = (level) => {
  if (level >= 4) return 'Severe';
  if (level >= 3) return 'High';
  if (level >= 2) return 'Moderate';
  if (level >= 1) return 'Low';
  return 'Minimal';
};

const getImpactColor = (level) => {
  if (level >= 4) return '#dc2626';
  if (level >= 3) return '#f59e0b';
  if (level >= 2) return '#eab308';
  if (level >= 1) return '#84cc16';
  return '#22c55e';
};

const getDataAge = (data, metricId) => {
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][metricId] != null && data[i]._ts) {
      const ageMins = Math.floor((Date.now() - data[i]._ts) / 60000);
      if (ageMins < 1) return { text: 'Just now', fresh: true };
      if (ageMins < 60) return { text: `${ageMins}m ago`, fresh: ageMins < 15 };
      const ageHrs = Math.floor(ageMins / 60);
      return { text: `${ageHrs}h ${ageMins % 60}m`, fresh: false };
    }
  }
  return { text: 'No data', fresh: false };
};

// ─── Sub-components ────────────────────────────────────

const ImpactBar = ({ level }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="w-3 h-[7px] rounded-[2px] transition-colors duration-300"
        style={{
          backgroundColor: i < level ? getImpactColor(level) : 'var(--bg-card)',
          boxShadow: i < level && level >= 3 ? `0 0 4px ${getImpactColor(level)}40` : 'none',
        }}
      />
    ))}
  </div>
);

const ProgressBar = ({ value, color }) => (
  <div className="w-full h-1.5 rounded-full overflow-hidden mt-1.5" style={{ background: 'var(--bg-card)' }}>
    <div
      className="h-full rounded-full transition-all duration-500"
      style={{
        width: `${Math.min(value * 100, 100)}%`,
        background: `linear-gradient(90deg, ${color}80, ${color})`,
        boxShadow: `0 0 8px ${color}40`,
      }}
    />
  </div>
);

const SectionHeader = ({ children }) => (
  <p className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold mb-3 pb-1.5"
     style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border-card)' }}>
    {children}
  </p>
);

const StatRow = ({ label, children }) => (
  <div className="flex items-center justify-between">
    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
    {children}
  </div>
);

// ─── Main Component ────────────────────────────────────
const ExpertAnalysisPanel = ({ latestData = {}, chartData = [] }) => {
  const { speed, density, bz, xray, kp, electrons } = latestData;

  const clockAngle = useMemo(() => computeClockAngle(bz), [bz]);

  const rates = useMemo(() => {
    const result = {};
    METRIC_IDS.forEach(id => { result[id] = computeRate(chartData, id); });
    return result;
  }, [chartData]);

  const impacts = useMemo(() => computeImpacts(kp, xray), [kp, xray]);
  const auroraLat = useMemo(() => getAuroraLatitude(kp), [kp]);
  const auroraCity = useMemo(() => auroraLat ? getReferenceCityForLatitude(auroraLat) : null, [auroraLat]);

  const freshness = useMemo(() => {
    const result = {};
    METRIC_IDS.forEach(id => { result[id] = getDataAge(chartData, id); });
    return result;
  }, [chartData]);

  const formatRate = (id, rate) => {
    if (rate == null) return '—';
    const prefix = rate >= 0 ? '+' : '';
    if (id === 'xray') return `${prefix}${rate.toExponential(1)}`;
    return `${prefix}${rate.toFixed(2)}`;
  };

  return (
    <div className="glass-panel p-5 rounded-2xl h-[600px] xl:h-full flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, var(--glow-overlay), transparent)' }} />

      <h2 className="text-lg font-semibold mb-4 pb-3 border-b relative z-10 tracking-wide"
          style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif", borderColor: 'var(--border-card)' }}>
        Advanced Analysis
      </h2>

      <div className="overflow-y-auto flex-1 pr-1 space-y-5 relative z-10">

        {/* ── Section 1: Solar Flare Prediction (Rate-of-Change) ── */}
        <section>
          <SectionHeader>Solar Flare Prediction (dX-Ray/dt)</SectionHeader>
          {(() => {
            const xrayRate = rates['xray'];
            const currentXray = xray;

            // Classify current flare class
            const getFlareClass = (flux) => {
              if (flux == null) return { letter: '—', color: '#475569' };
              if (flux >= 1e-4) return { letter: 'X', color: '#dc2626' };
              if (flux >= 1e-5) return { letter: 'M', color: '#f59e0b' };
              if (flux >= 1e-6) return { letter: 'C', color: '#eab308' };
              if (flux >= 1e-7) return { letter: 'B', color: '#84cc16' };
              return { letter: 'A', color: '#22c55e' };
            };

            // Predict flux in 1 hour based on rate
            const predictedFlux = (currentXray != null && xrayRate != null)
              ? currentXray + xrayRate * 1
              : null;

            const currentClass = getFlareClass(currentXray);
            const predictedClass = getFlareClass(predictedFlux);

            // Is flux accelerating toward a higher class?
            const isEscalating = xrayRate != null && xrayRate > 0 && currentXray != null;
            const escalationRisk = xrayRate != null && currentXray != null
              ? Math.min(Math.max((Math.log10(Math.abs(xrayRate / currentXray) + 1e-20) + 2) / 4, 0), 1)
              : 0;

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Current Class</span>
                  <span className="text-lg font-mono font-black" style={{ color: currentClass.color }}>
                    {currentClass.letter}
                    {currentXray != null && <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-dim)' }}>{currentXray.toExponential(1)} W/m²</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>1-Hour Forecast</span>
                  <span className="text-lg font-mono font-black" style={{ color: predictedClass.color }}>
                    {predictedClass.letter}
                    {predictedFlux != null && <span className="text-[10px] font-normal ml-1" style={{ color: 'var(--text-dim)' }}>{Math.max(predictedFlux, 0).toExponential(1)}</span>}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Rate (dFlux/dt)</span>
                  <span className="text-[12px] font-mono font-bold" style={{ color: isEscalating ? '#f87171' : '#4ade80' }}>
                    {xrayRate != null ? `${xrayRate >= 0 ? '+' : ''}${xrayRate.toExponential(1)}` : '—'}
                    <span className="text-[9px] ml-1" style={{ color: 'var(--text-dim)' }}>W/m²/hr</span>
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Escalation Risk</span>
                    <span className="text-[11px] font-bold" style={{ color: escalationRisk > 0.6 ? '#dc2626' : escalationRisk > 0.3 ? '#f59e0b' : '#22c55e' }}>
                      {escalationRisk > 0.6 ? 'HIGH' : escalationRisk > 0.3 ? 'MODERATE' : 'LOW'}
                    </span>
                  </div>
                  <ProgressBar
                    value={escalationRisk}
                    color={escalationRisk > 0.6 ? '#dc2626' : escalationRisk > 0.3 ? '#f59e0b' : '#22c55e'}
                  />
                </div>

                <p className="text-[9px] font-mono" style={{ color: 'var(--text-dim)' }}>
                  Linear extrapolation from GOES XRS rate of change. {isEscalating
                    ? 'X-ray flux is rising — monitor for class escalation.'
                    : 'X-ray flux is stable or declining.'}
                </p>
              </div>
            );
          })()}
        </section>

        {/* ── Section 2: Rate of Change ── */}
        <section>
          <SectionHeader>Rate of Change (dX/dt)</SectionHeader>
          <div className="space-y-2">
            {METRIC_IDS.map(id => {
              const rate = rates[id];
              const meta = METRIC_META[id];
              const isRising = rate != null && rate > 0.01;
              const isFalling = rate != null && rate < -0.01;

              return (
                <div key={id} className="flex items-center justify-between">
                  <span className="text-[11px] w-16" style={{ color: 'var(--text-muted)' }}>{meta.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-mono font-semibold`} style={{
                      color: isRising ? '#f87171' : isFalling ? '#4ade80' : 'var(--text-dim)'
                    }}>
                      {formatRate(id, rate)}
                    </span>
                    <span className="text-[9px] font-mono w-16 text-right" style={{ color: 'var(--text-dim)' }}>{meta.rateUnit}</span>
                    <span className="w-4">
                      {isRising && <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
                      {isFalling && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
                      {!isRising && !isFalling && <Minus className="w-3.5 h-3.5" style={{ color: 'var(--text-dim)' }} />}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section 3: Impact Assessment ── */}
        <section>
          <SectionHeader>Impact Assessment</SectionHeader>
          <div className="space-y-2.5">
            {impacts.map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 w-24">
                  <span className="text-[12px]">{item.icon}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ImpactBar level={item.level} />
                  <span className="text-[10px] font-semibold w-14 text-right" style={{ color: getImpactColor(item.level) }}>
                    {getImpactLabel(item.level)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 4: Aurora Forecast ── */}
        <section>
          <SectionHeader>Aurora Visibility</SectionHeader>
          {auroraLat != null ? (
            <div>
              <StatRow label="Equatorward Edge">
                <span className="text-sm font-mono font-bold text-emerald-400">{auroraLat}°N</span>
              </StatRow>
              <StatRow label="Reference">
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{auroraCity}</span>
              </StatRow>
              <div className="relative h-2 rounded-full overflow-hidden mt-2" style={{ background: 'var(--bg-card)' }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(((90 - auroraLat) / 50) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #22c55e60, #22c55e)',
                    boxShadow: '0 0 8px rgba(34,197,94,0.3)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] font-mono" style={{ color: 'var(--text-dim)' }}>90°N Pole</span>
                <span className="text-[8px] font-mono" style={{ color: 'var(--text-dim)' }}>40°N</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>No Kp data available</p>
          )}
        </section>

        {/* ── Section 5: Data Freshness ── */}
        <section>
          <SectionHeader>Data Freshness</SectionHeader>
          <div className="space-y-1.5">
            {METRIC_IDS.map(id => {
              const age = freshness[id];
              const meta = METRIC_META[id];
              return (
                <div key={id} className="flex items-center justify-between">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{meta.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono" style={{ color: age.fresh ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                      {age.text}
                    </span>
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: age.fresh ? '#22c55e' : 'var(--text-dim)',
                        boxShadow: age.fresh ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[8px] mt-2 font-mono" style={{ color: 'var(--text-faint)' }}>
            Sources: NOAA SWPC (plasma, mag, Kp, GOES XRS, electrons) · NASA DONKI (flares)
          </p>
        </section>
      </div>
    </div>
  );
};

export default ExpertAnalysisPanel;
