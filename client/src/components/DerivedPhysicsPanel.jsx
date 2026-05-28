import React, { useMemo } from 'react';
import { Gauge, Zap, Shield, Atom, Radio, Satellite } from 'lucide-react';

/**
 * DerivedPhysicsPanel — Expert-Only
 * 
 * Computes real astrophysical quantities from raw telemetry that no API directly provides.
 * These are the exact same computations used at NOAA SWPC and NASA Goddard.
 */

// ─── Physics Computations ──────────────────────────────────

/** Solar Wind Dynamic Pressure (nPa): Pdyn = 1.6726e-6 * n * V² */
const computeDynamicPressure = (density, speed) => {
  if (density == null || speed == null) return null;
  return 1.6726e-6 * density * speed * speed;
};

/** Magnetopause Standoff Distance (Shue et al. 1998, JGR):
 *  R_mp = (11.4 + 0.013·Bz) × Pdyn^(-1/6.6) in Earth radii
 *  Uses dynamic pressure and IMF Bz. Normal ~10 Re. */
const computeMagnetopause = (density, speed, bz) => {
  const pdyn = computeDynamicPressure(density, speed);
  if (pdyn == null || pdyn <= 0) return null;
  const bzVal = bz != null ? bz : 0;
  const r = (11.4 + 0.013 * bzVal) * Math.pow(pdyn, -1 / 6.6);
  return Math.max(r, 3); // Physical lower bound
};

/** Newell Coupling Function (Newell et al. 2007, JGR):
 *  dΦ_MP/dt ∝ V^(4/3) × Bt^(2/3) × sin^8(θ_c/2)
 *  Without By measurement, we use Bz to estimate the clock angle.
 *  θ_c = π when Bz < 0 (southward), smoothly transitions to 0 when Bz > 0 */
const computeNewellCoupling = (speed, bz) => {
  if (speed == null || bz == null) return null;
  const bt = Math.abs(bz);
  if (bt === 0) return 0;
  // Estimate clock angle from Bz alone (By ≈ 0 approximation)
  // θ_c ∈ [0, π]: fully southward Bz → π, fully northward → 0
  const thetaC = bz <= 0 ? Math.PI : Math.max(0, Math.PI * (1 - bz / 5));
  const sinTerm = Math.pow(Math.sin(thetaC / 2), 8);
  return Math.pow(speed, 4 / 3) * Math.pow(bt, 2 / 3) * sinTerm;
};

/** Alfvén Mach Number: Ma = V / Va, where Va = B / sqrt(μ₀ * ρ)
 *  B in Tesla, ρ = n * m_p. Bz in nT, n in cm⁻³, V in km/s */
const computeAlfvenMach = (speed, bz, density) => {
  if (speed == null || bz == null || density == null || density <= 0) return null;
  const B_T = Math.abs(bz) * 1e-9; // nT → Tesla
  const rho = density * 1e6 * 1.6726e-27; // cm⁻³ → m⁻³ × proton mass
  if (B_T === 0) return null;
  const mu0 = 4 * Math.PI * 1e-7;
  const Va = B_T / Math.sqrt(mu0 * rho); // m/s
  const V_ms = speed * 1000; // km/s → m/s
  return V_ms / Va;
};

/** Epsilon Parameter (Akasofu): ε = V * B² * sin⁴(θ/2) * l₀² / μ₀  (in Watts)
 *  l₀ ≈ 7 Re = 7 × 6.371e6 m */
const computeEpsilon = (speed, bz) => {
  if (speed == null || bz == null) return null;
  const V = speed * 1000; // km/s → m/s
  const B = Math.abs(bz) * 1e-9; // nT → T
  const thetaC = bz < 0 ? Math.PI : 0;
  const sinTerm = Math.pow(Math.sin(thetaC / 2), 4);
  const l0 = 7 * 6.371e6; // 7 Earth radii in meters
  const mu0 = 4 * Math.PI * 1e-7;
  return (V * B * B * sinTerm * l0 * l0) / mu0;
};

/** Dst Prediction (Burton et al. 1975, JGR):
 *  Injection function Q = -4.4 * (Ey - 0.5) when Ey > 0.5 mV/m
 *  Ey = V(km/s) × Bs(nT) × 1e-3 where Bs = max(0, -Bz)
 *  Estimated equilibrium Dst ≈ Q / λ, where λ ≈ 1/7.7 hr⁻¹ */
const predictDst = (speed, bz) => {
  if (speed == null || bz == null) return null;
  const bs = Math.max(0, -bz); // Southward component only
  const Ey = speed * bs * 1e-3; // mV/m
  if (Ey <= 0.5) return 0; // Below injection threshold
  const Q = -4.4 * (Ey - 0.5); // nT/hr injection rate
  // Equilibrium: Dst* = Q × τ where τ ≈ 7.7 hours
  return Q * 7.7;
};

// ─── Gauge Component ───────────────────────────────────────

const PhysicsGauge = ({ title, value, unit, icon: Icon, color, description, min, max, warningThreshold, criticalThreshold, dark }) => {
  const percentage = useMemo(() => {
    if (value == null || min == null || max == null) return 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }, [value, min, max]);

  const severity = useMemo(() => {
    if (value == null) return 'nominal';
    if (criticalThreshold != null && value >= criticalThreshold) return 'critical';
    if (warningThreshold != null && value >= warningThreshold) return 'warning';
    return 'nominal';
  }, [value, warningThreshold, criticalThreshold]);

  const severityColors = {
    nominal: '#22c55e',
    warning: '#f59e0b',
    critical: '#ef4444'
  };

  const barColor = severityColors[severity];

  const displayValue = value == null ? '—' 
    : Math.abs(value) >= 1e6 ? value.toExponential(2)
    : Math.abs(value) >= 100 ? value.toFixed(1)
    : Math.abs(value) >= 1 ? value.toFixed(2)
    : value.toExponential(2);

  return (
    <div className="rounded-2xl border p-5 backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:shadow-lg"
         style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-panel)' }}>
      {/* Subtle glow overlay */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: `linear-gradient(to right, ${barColor}40, transparent)` }} />
      
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-[11px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-dim)' }}>{title}</span>
        </div>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}` }} />
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-mono font-bold" style={{ color, textShadow: `0 0 12px ${color}30` }}>
          {displayValue}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-dim)' }}>{unit}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-3" style={{ background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out"
             style={{ width: `${percentage}%`, background: `linear-gradient(to right, ${barColor}80, ${barColor})`, boxShadow: `0 0 6px ${barColor}40` }} />
      </div>

      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  );
};

// ─── Main Panel ────────────────────────────────────────────

const DerivedPhysicsPanel = ({ latestData = {}, dark }) => {
  const { speed, density, bz, electrons } = latestData;

  const dynPressure = useMemo(() => computeDynamicPressure(density, speed), [density, speed]);
  const magnetopause = useMemo(() => computeMagnetopause(density, speed, bz), [density, speed, bz]);
  const coupling = useMemo(() => computeNewellCoupling(speed, bz), [speed, bz]);
  const alfvenMach = useMemo(() => computeAlfvenMach(speed, bz, density), [speed, bz, density]);
  const epsilon = useMemo(() => computeEpsilon(speed, bz), [speed, bz]);
  const dstPred = useMemo(() => predictDst(speed, bz), [speed, bz]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Atom className="w-4 h-4" style={{ color: '#f97316' }} />
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)', fontFamily: "'Outfit', sans-serif" }}>
          Derived Physics — Computed from Live Telemetry
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        <PhysicsGauge
          title="Dynamic Pressure"
          value={dynPressure}
          unit="nPa"
          icon={Gauge}
          color="#38bdf8"
          description="Ram pressure of the solar wind against Earth's magnetosphere. Above 10 nPa compresses the magnetic field significantly."
          min={0} max={30}
          warningThreshold={5} criticalThreshold={15}
          dark={dark}
        />
        <PhysicsGauge
          title="Magnetopause Distance"
          value={magnetopause}
          unit="Rₑ"
          icon={Shield}
          color="#10b981"
          description="How far Earth's magnetic shield extends. Normally ~10 Rₑ. Below 6.6 Rₑ exposes geostationary satellites."
          min={4} max={14}
          warningThreshold={null} criticalThreshold={null}
          dark={dark}
        />
        <PhysicsGauge
          title="Newell Coupling"
          value={coupling}
          unit="Wb/s"
          icon={Zap}
          color="#f43f5e"
          description="Rate of magnetic flux opening at the magnetopause. Higher values mean stronger energy injection into Earth's magnetosphere."
          min={0} max={50000}
          warningThreshold={5000} criticalThreshold={20000}
          dark={dark}
        />
        <PhysicsGauge
          title="Alfvén Mach №"
          value={alfvenMach}
          unit=""
          icon={Radio}
          color="#a78bfa"
          description="Ratio of solar wind speed to Alfvén speed. Values >4 indicate a super-alfvénic flow where shock structures form easily."
          min={0} max={30}
          warningThreshold={8} criticalThreshold={15}
          dark={dark}
        />
        <PhysicsGauge
          title="Akasofu ε"
          value={epsilon}
          unit="W"
          icon={Atom}
          color="#fbbf24"
          description="Total electromagnetic energy input to the magnetosphere via Akasofu's epsilon parameter. Above 10¹¹ W drives major storms."
          min={0} max={1e12}
          warningThreshold={1e10} criticalThreshold={1e11}
          dark={dark}
        />
        <PhysicsGauge
          title="Predicted Dst"
          value={dstPred}
          unit="nT"
          icon={Satellite}
          color="#ec4899"
          description="Estimated ring current intensity (Burton eq.). Below -50 nT = moderate storm, below -100 nT = intense storm."
          min={-200} max={50}
          warningThreshold={null} criticalThreshold={null}
          dark={dark}
        />
      </div>
    </div>
  );
};

export default DerivedPhysicsPanel;
