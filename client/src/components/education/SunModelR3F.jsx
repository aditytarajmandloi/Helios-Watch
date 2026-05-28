import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════
   3D R3F LAYER DEFINITIONS (Parametric Sizes & Materials)
   ═══════════════════════════════════════════════════════════ */
const R3F_LAYERS = [
  { id: 'core', name: 'Core', radius: 0.8, color: '#ffffff', emissive: '#fde047', emissiveIntensity: 2.5 },
  { id: 'radiative', name: 'Radiative Zone', radius: 1.4, color: '#fef08a', emissive: '#facc15', emissiveIntensity: 1.2 },
  { id: 'tachocline', name: 'Tachocline', radius: 1.5, color: '#facc15', emissive: '#ca8a04', emissiveIntensity: 1.0 },
  { id: 'convective', name: 'Convective Zone', radius: 2.1, color: '#f59e0b', emissive: '#b45309', emissiveIntensity: 0.8 },
  { id: 'photosphere', name: 'Photosphere', radius: 2.25, color: '#fb923c', emissive: '#ea580c', emissiveIntensity: 0.6 },
  { id: 'chromosphere', name: 'Chromosphere', radius: 2.4, color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 0.4 },
  { id: 'corona', name: 'Corona', radius: 3.2, color: '#a78bfa', emissive: '#8b5cf6', emissiveIntensity: 0.2 },
];

/* ═══════════════════════════════════════════════════════════
   INDIVIDUAL ANIMATED SPHERE
   ═══════════════════════════════════════════════════════════ */
const AnimatedLayer = ({ layer, activeLayer }) => {
  const meshRef = useRef();
  const materialRef = useRef();

  // Rotation Animation Frame
  useFrame(({ clock }) => {
    if (meshRef.current) {
      // Different layers rotate at different mathematical speeds
      meshRef.current.rotation.y = clock.getElapsedTime() * (0.8 / layer.radius);
      meshRef.current.rotation.z = clock.getElapsedTime() * (0.1 / layer.radius);
    }
  });

  // Calculate Visibility Logic (The "Peeling" Effect)
  const activeObj = R3F_LAYERS.find(l => l.id === activeLayer);
  let targetOpacity = 1;
  let isWireframe = false;
  const isActive = activeLayer === layer.id;
  
  if (activeObj) {
    if (layer.radius > activeObj.radius) {
      // Turn outer shells into transparent holographic wireframes
      targetOpacity = 0.08;
      isWireframe = true;
    } else if (layer.radius < activeObj.radius) {
      targetOpacity = 1;
    } else {
      targetOpacity = 1; // It is the active layer
    }
  } else {
    // Default Sun State (Outer layers are transparent plasma)
    if (layer.id === 'corona') targetOpacity = 0.15;
    else if (layer.id === 'chromosphere') targetOpacity = 0.5;
    else if (layer.id === 'photosphere') targetOpacity = 0.9;
    else targetOpacity = 1;
  }

  // Smooth lerping of emissive intensity for transitions
  useFrame((state, delta) => {
    if (materialRef.current) {
      const targetIntensity = isActive ? layer.emissiveIntensity * 2.5 : layer.emissiveIntensity * 0.4;
      materialRef.current.emissiveIntensity = THREE.MathUtils.lerp(
        materialRef.current.emissiveIntensity, 
        targetIntensity, 
        delta * 3
      );
      
      materialRef.current.opacity = THREE.MathUtils.lerp(
        materialRef.current.opacity,
        targetOpacity,
        delta * 5
      );
    }
  });

  return (
    <group>
      <Sphere args={[layer.radius, 64, 64]} ref={meshRef}>
        <meshPhysicalMaterial 
          ref={materialRef}
          color={layer.color}
          emissive={layer.emissive}
          emissiveIntensity={layer.emissiveIntensity}
          transparent={true}
          opacity={targetOpacity}
          wireframe={isWireframe}
          roughness={isActive ? 0.1 : 0.6}
          transmission={isWireframe ? 0 : 0.5} 
          thickness={isActive ? 1.0 : 0.2}
          side={THREE.DoubleSide}
          depthWrite={!isWireframe && targetOpacity > 0.8} 
        />
      </Sphere>

      {/* 3D Floating HTML Title Label on Active Layer */}
      {isActive && (
        <Html position={[layer.radius * 1.1, layer.radius * 0.5, 0]} center className="pointer-events-none">
          <div className="flex items-center gap-2 animate-fadeInLeft pointer-events-none">
             <div className="w-12 h-[1px] bg-white opacity-50" />
             <div 
               className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg border border-white/20 whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.1)]"
             >
               <span className="text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                 {layer.name}
               </span>
             </div>
          </div>
        </Html>
      )}
    </group>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN 3D CANVAS COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function SunModelR3F({ activeLayer }) {
  return (
    <div className="w-full h-full relative cursor-move">
        <Canvas camera={{ position: [0, 0, 7.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#a78bfa" />
          
          {R3F_LAYERS.map((layer) => (
            <AnimatedLayer key={layer.id} layer={layer} activeLayer={activeLayer} />
          ))}

          {/* Interactive physics controls */}
          <OrbitControls 
            enablePan={false} 
            minDistance={4} 
            maxDistance={12} 
            // Auto rotate unless user is digging into a specific layer
            autoRotate={!activeLayer} 
            autoRotateSpeed={0.8}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Canvas>

        {/* CSS Keyframes for HTML Tag */}
        <style>{`
          @keyframes fadeInLeft {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fadeInLeft { animation: fadeInLeft 0.5s ease-out forwards; }
        `}</style>
    </div>
  );
}
