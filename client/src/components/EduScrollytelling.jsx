import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import introVideo from '../../data/3.mp4';

gsap.registerPlugin(ScrollToPlugin);

// Import all frames from edu directory
const frameModules = import.meta.glob('../../data/edu/*.jpg', { eager: true });
const frameUrls = Object.keys(frameModules)
  .sort()
  .map(key => frameModules[key].default || frameModules[key]);

// We use all available frames (which should be 80 based on the directory)
const totalFramesCount = frameUrls.length;
const activeFrameUrls = frameUrls;

const EduScrollytelling = ({ children }) => {
  const canvasRef = useRef(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoFinished, setVideoFinished] = useState(() => {
    return sessionStorage.getItem('eduIntroPlayed') === 'true';
  });
  const imagesRef = useRef([]);

  const ZOOM_FACTOR = 1.0;

  const handleVideoEnd = () => {
    setVideoFinished(true);
    sessionStorage.setItem('eduIntroPlayed', 'true');
  };

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const images = [];

    activeFrameUrls.forEach((url, index) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === totalFramesCount) {
          setIsLoaded(true);
        }
      };
      // In case an image fails to load, still count it to not get stuck
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === totalFramesCount) {
          setIsLoaded(true);
        }
      };
      images[index] = img;
    });

    imagesRef.current = images;
  }, []);

  // Canvas drawing & Scroll logic
  useEffect(() => {
    if (!isLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const drawFrame = (index) => {
      const img = imagesRef.current[index];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = img.width;
      const imgHeight = img.height;

      // Manual object-fit: cover with ZOOM_FACTOR
      const imgRatio = imgWidth / imgHeight;
      const canvasRatio = canvasWidth / canvasHeight;

      let renderWidth;
      let renderHeight;

      if (canvasRatio > imgRatio) {
        renderWidth = canvasWidth * ZOOM_FACTOR;
        renderHeight = (canvasWidth / imgRatio) * ZOOM_FACTOR;
      } else {
        renderWidth = (canvasHeight * imgRatio) * ZOOM_FACTOR;
        renderHeight = canvasHeight * ZOOM_FACTOR;
      }

      const xOffset = (canvasWidth - renderWidth) / 2;
      const yOffset = (canvasHeight - renderHeight) / 2;

      // Fill black background first
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Re-draw current frame based on scroll
      handleScroll();
    };

    const handleScroll = () => {
      // Calculate scroll fraction
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollFraction = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      
      // Map to frame index
      const frameIndex = Math.min(
        totalFramesCount - 1,
        Math.floor(scrollFraction * totalFramesCount)
      );

      animationFrameId = requestAnimationFrame(() => drawFrame(frameIndex));
    };

    // Initialize canvas size and draw first frame
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isLoaded]);

  // Mouse Parallax Logic
  useEffect(() => {
    if (!isLoaded) return;
    
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const xPos = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const yPos = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

      // Move in opposite direction of mouse
      gsap.to(canvasRef.current, {
        x: xPos * -20, // 20px max movement
        y: yPos * -20,
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isLoaded]);

  const scrollToTop = () => {
    gsap.to(window, { scrollTo: 0, duration: 1.5, ease: 'power2.inOut' });
  };

  const loadingPercentage = Math.round((loadedCount / totalFramesCount) * 100) || 0;

  return (
    <div className="relative w-full min-h-screen" style={{ backgroundColor: '#000' }}>
      {/* Video Loading / Intro Overlay */}
      {(!isLoaded || !videoFinished) && (
        <div className="fixed inset-0 z-[100] bg-black">
          <video 
            src={introVideo}
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover"
            onEnded={handleVideoEnd}
          />
          {!isLoaded && (
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center">
              <span className="font-mono text-xs tracking-[0.4em] text-white/60 drop-shadow-md">
                LOADING EXPERIENCE · {loadingPercentage}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* Canvas Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ scale: '1.05', transformOrigin: 'center center' }}
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 w-full" style={{ opacity: isLoaded && videoFinished ? 1 : 0, transition: 'opacity 1s ease-in-out' }}>
        {isLoaded && videoFinished && children}
      </div>
    </div>
  );
};

export default EduScrollytelling;
