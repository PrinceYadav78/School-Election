import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Candidate } from '../types';
import { HOUSE_COLORS } from '../data/mockData';
import { Scan, Shield, Flame, Sparkles, Compass } from 'lucide-react';

interface HologramCardProps {
  candidate: Candidate;
  isSelected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
}

export const HologramCard: React.FC<HologramCardProps> = ({
  candidate,
  isSelected = false,
  onSelect,
  disabled = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Motion values for realistic 3D tilt
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [15, -15]), { damping: 25, stiffness: 180 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-15, 15]), { damping: 25, stiffness: 180 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || disabled) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    x.set(0.5);
    y.set(0.5);
  };

  const handleMouseEnter = () => {
    if (disabled) return;
    setHovered(true);
  };

  const houseStyles = HOUSE_COLORS[candidate.house] || HOUSE_COLORS.Blue;

  // Icon depending on house
  const renderHouseIcon = () => {
    switch (candidate.house) {
      case 'Red':
        return <Flame className="w-4 h-4 text-red-400" id="house-icon-red" />;
      case 'Green':
        return <Compass className="w-4 h-4 text-emerald-400" id="house-icon-green" />;
      case 'Yellow':
        return <Sparkles className="w-4 h-4 text-yellow-400" id="house-icon-yellow" />;
      default:
        return <Shield className="w-4 h-4 text-blue-400" id="house-icon-blue" />;
    }
  };

  return (
    <div
      className="perspective-1000 py-4 w-full max-w-sm justify-self-center"
      style={{ perspective: '1200px' }}
      id={`container-card-${candidate.id}`}
    >
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          if (!disabled && onSelect) onSelect();
        }}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{
          scale: isSelected ? 1.03 : hovered ? 1.01 : 1,
          borderColor: isSelected
            ? '#d946ef' // Neon magenta glow for lock-in
            : hovered
            ? houseStyles.secondary
            : 'rgba(255, 255, 255, 0.08)',
        }}
        className={`relative w-full rounded-2xl border-2 cursor-pointer transition-shadow duration-300 select-none overflow-hidden
          ${isSelected 
            ? 'shadow-[0_0_35px_rgba(217,70,239,0.25)] bg-slate-900/90 border-[#d946ef]' 
            : 'shadow-[0_20px_40px_rgba(0,0,0,0.5)] bg-black/40 border-white/10 backdrop-blur-md'
          }
        `}
        id={`holo-card-${candidate.id}`}
      >
        {/* Futuristic Laser Scanner Overlay */}
        {isSelected && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '200%' }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'easeInOut',
              }}
              style={{
                background: `linear-gradient(to bottom, transparent, #d946ef, transparent)`,
                height: '8px',
                opacity: 0.6,
                boxShadow: '0 0 15px #d946ef',
              }}
              className="w-full absolute left-0"
              id={`laser-${candidate.id}`}
            />
            {/* Holographic matrix background dots */}
            <div 
              className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#d946ef_1px,transparent_1px)] bg-[size:10px_10px]"
              id={`matrix-${candidate.id}`}
            />
          </div>
        )}

        {/* 3D Content Container */}
        <div 
          className="p-6 flex flex-col gap-5 h-full relative"
          style={{ transform: 'translateZ(30px)' }}
          id={`content-wrapper-${candidate.id}`}
        >
          {/* House Ribbon Tag with Dynamic Glow */}
          <div className="flex justify-between items-center" id={`header-row-${candidate.id}`}>
            <span
              style={{
                borderColor: houseStyles.primary,
                boxShadow: hovered || isSelected ? `0 0 12px ${houseStyles.shadow}` : 'none',
                backgroundColor: `${houseStyles.primary}15`,
              }}
              className="px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase border rounded flex items-center gap-1.5 font-bold"
              id={`house-badge-${candidate.id}`}
            >
              {renderHouseIcon()}
              <span className="text-white/90">{houseStyles.name}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider" id={`id-badge-${candidate.id}`}>
              {candidate.id.toUpperCase()}
            </span>
          </div>

          {/* holographic Avatar Frame */}
          <div 
            className="relative aspect-square w-full rounded-xl overflow-hidden group bg-gradient-to-br from-zinc-900 to-black border border-white/5 mx-auto"
            style={{ transform: 'translateZ(50px)' }}
            id={`avatar-frame-${candidate.id}`}
          >
            {/* Hologram scan lines */}
            <div 
              className="absolute inset-0 z-10 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%]"
              id={`scanlines-${candidate.id}`}
            />

            {/* Glowing Backdrop Circle */}
            <div
              style={{
                background: `radial-gradient(circle, ${houseStyles.primary}40 0%, transparent 70%)`
              }}
              className="absolute inset-x-0 top-1/4 h-3/5 w-4/5 mx-auto rounded-full filter blur-xl opacity-80"
              id={`glow-back-${candidate.id}`}
            />

            {/* Real Base64 / SVG Image */}
            <img
              src={candidate.photo}
              alt={candidate.fullName}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover relative z-10 transition-transform duration-500 
                ${isSelected ? 'scale-105 saturate-120' : hovered ? 'scale-105 saturate-110' : 'scale-100 opacity-90'}
              `}
              id={`img-${candidate.id}`}
            />

            {/* Futuristic target sight lines */}
            <div className="absolute inset-4 border border-teal-500/10 pointer-events-none z-10" id={`target-lines-${candidate.id}`}>
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-teal-500/40" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-teal-500/40" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-teal-500/40" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-teal-500/40" />
            </div>
          </div>

          {/* Candidate Meta */}
          <div 
            className="flex flex-col text-center" 
            style={{ transform: 'translateZ(40px)' }}
            id={`meta-info-${candidate.id}`}
          >
            <h3 className="text-lg font-bold font-sans tracking-tight text-white mb-1">
              {candidate.fullName}
            </h3>
          </div>

          {/* interactive lock button */}
          <div 
            className="mt-1" 
            style={{ transform: 'translateZ(60px)' }}
            id={`action-block-${candidate.id}`}
          >
            <button
              style={{
                backgroundColor: isSelected ? 'rgba(217, 70, 239, 0.15)' : 'rgba(255,255,255,0.02)',
                borderColor: isSelected ? '#d946ef' : 'rgba(255, 255, 255, 0.1)',
                color: isSelected ? '#ff85ff' : '#ffffff',
              }}
              disabled={disabled}
              className={`w-full py-2.5 rounded-lg border text-xs font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2
                ${isSelected ? 'shadow-[inset_0_0_15px_rgba(217,70,239,0.3)]' : 'hover:bg-white/5'}
              `}
              id={`lock-button-${candidate.id}`}
            >
              {isSelected ? (
                <>
                  <Scan className="w-3.5 h-3.5 text-magenta-400 animate-pulse" />
                  LOCKED
                </>
              ) : (
                'SELECT CANDIDATE'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
