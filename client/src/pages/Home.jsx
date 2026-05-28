import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useAuth } from '../context/AuthContext';
import AuthPage from './AuthPage';

gsap.registerPlugin(ScrollToPlugin);

/* ═══════════════════════════════════════════════════════════
   CONFIGURATION
   ═══════════════════════════════════════════════════════════ */
const ZOOM_FACTOR   = 1.35;        // Crop into frames to hide letterbox bars
const PARALLAX_PX   = 22;          // Mouse parallax max offset in px
const LERP_SPEED    = 0.08;        // Frame interpolation speed (lower = smoother)
const SCROLL_VH     = 500;         // Total scrollable height

const sections = [
  { id: 'welcome',   heading: 'Welcome to HeliosWatch',   body: 'An interactive educational platform powered by real satellite data — making space weather science accessible to everyone.' },
  { id: 'dashboard', heading: 'Live Mission Dashboard',   body: 'Track solar wind speed, proton density, X-ray flux and more — streamed in real time from NOAA\'s DSCOVR and ACE satellites.' },
  { id: 'learn',     heading: 'Learn Space Science',       body: 'Explore solar physics, geomagnetic storms, and the heliosphere through guided lessons and hands-on data analysis.', tags: ['Interactive Lessons', 'Solar System Science', 'Real NASA Data'] },
  { id: 'explore',   heading: 'Start Your Journey',        body: 'Dive into the live dashboard for real-time data, or explore the education centre to learn the science behind it all.', cta: true },
];

const NUM_SECTIONS = sections.length;
const ACCENTS = ['#60a5fa', '#818cf8', '#c084fc', '#38bdf8'];

/* ═══════════════════════════════════════════════════════════
   FRAME PRELOADING (from client/data/back/)
   Vite import.meta.glob resolves every jpg at build time.
   ═══════════════════════════════════════════════════════════ */
const frameModules = import.meta.glob('../../data/back/*.jpg', { eager: true });
const ALL_FRAME_URLS = Object.keys(frameModules).sort().map(k => frameModules[k].default || frameModules[k]);
const FRAME_URLS   = ALL_FRAME_URLS.slice(75); // Skip first 75 frames
const TOTAL_FRAMES = FRAME_URLS.length; // 225

/* ═══════════════════════════════════════════════════════════
   HOME COMPONENT
   ═══════════════════════════════════════════════════════════ */
const Home = () => {
  const { user } = useAuth();

  /* ── Refs ─────────────────────────────────────────────── */
  const containerRef    = useRef(null);
  const canvasRef       = useRef(null);
  const scrollFracRef   = useRef(0);       // raw scroll fraction 0‒1
  const smoothFrameRef  = useRef(0);       // interpolated frame index
  const lastDrawnRef    = useRef(-1);      // avoid redundant draws
  const rafRef          = useRef(null);
  const sectionEls      = useRef([]);
  const imagesRef       = useRef([]);

  /* ── State ───────────────────────────────────────────── */
  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady]         = useState(false);
  const [scrollProg, setScrollProg]   = useState(0);
  const [isPlayingCutscene, setIsPlayingCutscene] = useState(false);

  // Disable scrolling if not logged in and not playing cutscene
  useEffect(() => {
    if (!user && !isPlayingCutscene) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [user, isPlayingCutscene]);

  const handleLoginSuccess = () => {
    setIsPlayingCutscene(true);
    document.body.style.overflow = 'auto'; // Force unlock immediately
  };
  useEffect(() => {
    let mounted = true;
    let loaded  = 0;
    const imgs  = new Array(TOTAL_FRAMES);

    FRAME_URLS.forEach((url, i) => {
      const img = new Image();
      img.src   = url;
      img.onload = img.onerror = () => {
        if (!mounted) return;
        imgs[i] = img;
        loaded++;
        setLoadedCount(loaded);
        if (loaded === TOTAL_FRAMES) {
          imagesRef.current = imgs;
          setIsReady(true);
        }
      };
    });

    return () => { mounted = false; };
  }, []);

  /* ══════════════════════════════════════════════════════
     2. drawFrame — object-fit:cover + zoom
     ══════════════════════════════════════════════════════ */
  const drawFrame = useCallback((idx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = imagesRef.current[idx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // object-fit: cover with zoom
    const imgRatio    = iw / ih;
    const canvasRatio = cw / ch;
    let rw, rh;
    if (canvasRatio > imgRatio) {
      rw = cw * ZOOM_FACTOR;
      rh = (cw / imgRatio) * ZOOM_FACTOR;
    } else {
      rw = (ch * imgRatio) * ZOOM_FACTOR;
      rh = ch * ZOOM_FACTOR;
    }
    const ox = (cw - rw) / 2;
    const oy = (ch - rh) / 2;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, ox, oy, rw, rh);
  }, []);

  /* ══════════════════════════════════════════════════════
     3. CANVAS SIZE + ANIMATION LOOP
     ══════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize handler
    const syncSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
        lastDrawnRef.current = -1; // force redraw after resize
      }
    };
    syncSize();
    window.addEventListener('resize', syncSize);

    // rAF tick — smooth frame interpolation
    const tick = () => {
      const target = scrollFracRef.current * (TOTAL_FRAMES - 1);
      smoothFrameRef.current += (target - smoothFrameRef.current) * LERP_SPEED;

      const idx = Math.round(
        Math.max(0, Math.min(TOTAL_FRAMES - 1, smoothFrameRef.current))
      );

      if (idx !== lastDrawnRef.current) {
        drawFrame(idx);
        lastDrawnRef.current = idx;
      }

      updateSections(scrollFracRef.current);
      setScrollProg(scrollFracRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', syncSize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isReady, drawFrame]);

  /* ══════════════════════════════════════════════════════
     4. SCROLL → FRACTION
     ══════════════════════════════════════════════════════ */
  useEffect(() => {
    const onScroll = () => {
      const el = containerRef.current;
      if (!el) return;
      const max = el.scrollHeight - window.innerHeight;
      scrollFracRef.current = Math.max(0, Math.min(1, window.scrollY / max));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ══════════════════════════════════════════════════════
     5. MOUSE PARALLAX (GSAP)
     ══════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isReady) return;
    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth  - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      gsap.to(canvasRef.current, {
        x: nx * -PARALLAX_PX,
        y: ny * -PARALLAX_PX,
        duration: 0.6,
        ease: 'power2.out',
        overwrite: true,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [isReady]);

  /* ══════════════════════════════════════════════════════
     6. SECTION OPACITY + PARALLAX
     ══════════════════════════════════════════════════════ */
  const updateSections = useCallback((p) => {
    sectionEls.current.forEach((el, i) => {
      if (!el) return;
      const peak  = NUM_SECTIONS > 1 ? i / (NUM_SECTIONS - 1) : 0;
      const range = NUM_SECTIONS > 1 ? 1 / (NUM_SECTIONS - 1) : 1;
      let opacity = Math.max(0, 1 - Math.abs(p - peak) / (range * 0.45));
      opacity = Math.pow(opacity, 0.9);
      el.style.opacity       = opacity;
      el.style.transform     = `translate3d(0,${(p - peak) * -80}px,0)`;
      el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none';
    });
  }, []);

  /* ── Derived ─────────────────────────────────────────── */
  const activeIdx = (() => {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < NUM_SECTIONS; i++) {
      const d = Math.abs(scrollProg - i / (NUM_SECTIONS - 1));
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  })();

  const overlayAlpha = 0.7 + scrollProg * 0.2;
  const loadPct      = Math.round((loadedCount / (TOTAL_FRAMES || 1)) * 100);

  /* ══════════════════════════════════════════════════════
     LOADING SCREEN
     ══════════════════════════════════════════════════════ */
  if (!isReady) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
        <h2
          className="text-3xl font-bold tracking-widest mb-6"
          style={{ color: '#93c5fd', fontFamily: "'Outfit', sans-serif" }}
        >
          HELIOSWATCH
        </h2>
        <div className="w-64 h-[2px] bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${loadPct}%`,
              background: 'linear-gradient(90deg, #2563eb, #3b82f6, #93c5fd)',
              transition: 'width 120ms linear',
            }}
          />
        </div>
        <span className="mt-4 font-mono text-xs tracking-[0.4em] text-white/30">
          LOADING FRAMES · {loadPct}%
        </span>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div ref={containerRef} className="relative" style={{ height: `${SCROLL_VH}vh` }}>

      {/* ── Fixed background: canvas + overlay ──────── */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-black">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ scale: '1.05', transformOrigin: 'center center', willChange: 'transform' }}
        />
        <div
          className="absolute inset-0 pointer-events-none transition-colors duration-700"
          style={{
            background: `linear-gradient(180deg,
              rgba(2,2,12,${overlayAlpha * 0.5}) 0%,
              rgba(2,2,12,${overlayAlpha * 0.8}) 30%,
              rgba(2,2,12,${overlayAlpha}) 55%,
              rgba(2,2,12,${Math.min(1, overlayAlpha * 1.1)}) 100%)`,
          }}
        />
      </div>

      {/* ── AuthPage Overlay (When not logged in) ───── */}
      {!user && !isPlayingCutscene && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <AuthPage onSuccess={handleLoginSuccess} />
        </div>
      )}

      {/* ── Progress bar under navbar ──────────────── */}
      <div className="fixed top-14 left-0 z-40 w-full h-px" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div
          className="h-full"
          style={{
            width: `${scrollProg * 100}%`,
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #93c5fd)',
            transition: 'width 80ms linear',
          }}
        />
      </div>

      {/* ── Section dots (desktop right rail) ──────── */}
      <div className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2.5 ${(!user && !isPlayingCutscene) ? 'opacity-0 pointer-events-none' : ''}`}>
        {sections.map((s, i) => (
          <div key={s.id} className="relative flex items-center justify-end">
            <span
              className="absolute right-5 text-[8px] font-mono tracking-[0.25em] uppercase transition-all duration-700"
              style={{
                opacity: activeIdx === i ? 0.5 : 0,
                transform: activeIdx === i ? 'translateX(0)' : 'translateX(4px)',
                color: ACCENTS[i],
              }}
            >
              {s.id}
            </span>
            <div
              className="rounded-full transition-all duration-500"
              style={{
                width:  activeIdx === i ? '7px' : '3px',
                height: activeIdx === i ? '7px' : '3px',
                background: activeIdx === i ? ACCENTS[i] : 'rgba(255,255,255,0.06)',
                boxShadow:  activeIdx === i ? `0 0 6px ${ACCENTS[i]}50` : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Content sections ──────────────────────── */}
      {sections.map((s, i) => (
        <section key={s.id} className={`sticky top-0 h-screen flex items-center justify-center z-10 ${(!user && !isPlayingCutscene) ? 'hidden' : ''}`}>
          <div
            ref={el => (sectionEls.current[i] = el)}
            className="max-w-3xl mx-auto text-center px-6"
            style={{ opacity: 0, willChange: 'transform, opacity' }}
          >
            <div
              className="mx-auto mb-6 w-2 h-2 rounded-full"
              style={{ background: ACCENTS[i], boxShadow: `0 0 12px ${ACCENTS[i]}60` }}
            />
            <h2
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white/90 mb-5 leading-tight"
              style={{ fontFamily: "'Outfit', sans-serif", textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
            >
              {s.heading}
            </h2>
            <div
              className="mx-auto mb-6 h-px w-16"
              style={{ background: `linear-gradient(to right, transparent, ${ACCENTS[i]}90, transparent)` }}
            />
            <p
              className="text-lg sm:text-xl text-white/50 leading-relaxed max-w-2xl mx-auto"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
            >
              {s.body}
            </p>

            {s.tags && (
              <div className="flex flex-wrap justify-center gap-3 mt-8">
                {s.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-4 py-2 rounded-md text-sm font-semibold text-white/50 hover:text-white/80 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {s.cta && (
              <div className="flex flex-wrap justify-center gap-4 mt-10">
                <Link
                  to="/dashboard"
                  className="px-8 py-3.5 rounded-xl text-base font-bold text-white tracking-wide transition-all duration-300 hover:scale-[1.03]"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)', boxShadow: '0 0 20px rgba(59,130,246,0.3)' }}
                >
                  Launch Dashboard →
                </Link>
                <Link
                  to="/education"
                  className="px-8 py-3.5 rounded-xl text-base font-bold tracking-wide transition-all duration-300 hover:scale-[1.03]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)' }}
                >
                  Education Centre
                </Link>
              </div>
            )}
          </div>
        </section>
      ))}

      {/* ── Scroll-to-top button ──────────────────── */}
      <button
        onClick={() => gsap.to(window, { duration: 1.5, scrollTo: 0, ease: 'power2.inOut' })}
        className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors backdrop-blur-md flex items-center justify-center group pointer-events-auto"
      >
        <span className="text-white text-xs font-bold tracking-[0.2em] uppercase w-0 overflow-hidden group-hover:w-auto opacity-0 group-hover:opacity-100 group-hover:!mr-2 whitespace-nowrap transition-all duration-300">
          Top
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
};

export default Home;
