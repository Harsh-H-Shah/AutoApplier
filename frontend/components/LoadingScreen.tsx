'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';

const MAPS = [
  { name: 'ASCENT', uuid: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319', coordinates: '45°26\'BF" N, 12°20\'Q" E' },
  { name: 'BIND', uuid: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba', coordinates: '34°02\'A" N, 6°51\'Z" W' },
  { name: 'SPLIT', uuid: 'd960549e-485c-e861-8d71-aa9d1aed12a2', coordinates: '35°41\'CD" N, 139°41\'WX" E' },
  { name: 'HAVEN', uuid: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047', coordinates: '27°28\'A" N, 89°38\'WZ" E' },
  { name: 'ICEBOX', uuid: 'e2ad5c54-4114-a870-9641-8ea21279579a', coordinates: '76°44\'A" N, 149°30\'Z" E' },
];

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [map, setMap] = useState(MAPS[0]);
  const [progress, setProgress] = useState(0);
  
  // Motion values for parallax
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const moveX = useTransform(x, [0, typeof window !== 'undefined' ? window.innerWidth : 1920], [-20, 20]);
  const moveY = useTransform(y, [0, typeof window !== 'undefined' ? window.innerHeight : 1080], [-20, 20]);

  useEffect(() => {
    // Select random map
    setMap(MAPS[Math.floor(Math.random() * MAPS.length)]);

    // Progress bar animation
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const val = Math.min(100, (currentStep / steps) * 100);
      setProgress(val);
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(onComplete, 800);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  const handleMouseMove = (e: React.MouseEvent) => {
    x.set(e.clientX);
    y.set(e.clientY);
  };

  return (
    <div 
      onMouseMove={handleMouseMove}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between text-white overflow-hidden cursor-crosshair"
    >
      {/* Background with Parallax */}
      <motion.div 
        className="parallax-bg absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url('https://media.valorant-api.com/maps/${map.uuid}/splash.png')`,
          x: moveX,
          y: moveY,
          scale: 1.1
        }}
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: 1, scale: 1.1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      
      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/40 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid-pattern.png')] opacity-20 pointer-events-none mix-blend-overlay" />

      {/* Map Name (Side Layout) */}
      <div className="absolute top-0 left-0 bottom-0 flex items-center z-0">
          <motion.h1 
            className="font-display text-[20vh] font-bold tracking-tighter opacity-10 select-none leading-none -ml-8 vertical-rl" 
            style={{ writingMode: 'vertical-rl' }}
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 0.1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {map.name}
          </motion.h1>
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full">
        
        {/* Main Title */}
        <div className="flex flex-col items-center justify-center scale-110">
            <motion.h2 
              className="font-display text-9xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 drop-shadow-2xl glitch-text"
              initial={{ scale: 2, opacity: 0, letterSpacing: "0.5em" }}
              animate={{ scale: 1, opacity: 1, letterSpacing: "0.1em" }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            >
              MATCH FOUND
            </motion.h2>
            
            <motion.div 
              className="mt-8 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
               <div className="h-[1px] w-12 bg-[var(--valo-red)]"></div>
               <div className="text-[var(--valo-red)] font-mono tracking-[0.3em] text-lg">
                  {map.coordinates}
               </div>
               <div className="h-[1px] w-12 bg-[var(--valo-red)]"></div>
            </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 w-full pb-8">
        <div className="flex justify-between items-end mb-2 px-12">
          <div className="flex flex-col gap-1">
             <motion.span 
               className="font-display text-4xl text-white/80"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 1 }}
             >
               LOADING ASSETS
             </motion.span>
             <span className="text-[var(--valo-red)] text-sm font-mono animate-pulse">ESTABLISHING CONNECTION...</span>
          </div>
          <div className="font-mono text-6xl font-bold text-white/50">
            {Math.floor(progress)}%
          </div>
        </div>
        
        {/* Progress Bar - Full Width */}
        <div className="w-full h-4 bg-white/10 relative overflow-hidden">
          <motion.div 
            className="h-full bg-[var(--valo-red)] box-shadow-[0_0_20px_var(--valo-red)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "tween", ease: "linear", duration: 0.05 }}
          />
        </div>
      </div>
    </div>
  );
}
