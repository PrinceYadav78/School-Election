import React, { useEffect, useState } from 'react';
import { Shield, Cpu, CloudLightning, Key } from 'lucide-react';

interface HurricaneTransitionProps {
  onComplete: () => void;
}

export const HurricaneTransition: React.FC<HurricaneTransitionProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);

  const logs = [
    'CONNECTING TO CLOUDFLARE SECURE TUNNEL PROTOCOLS...',
    'ESTABLISHING ENCRYPTED SSL-EDGE HANDSHAKE...',
    'GENERATING AES-GCM-256 SESSION KEYRING...',
    'SHA-256 HASH COMPILING: NPS STUDENT DIRECTORY [500 RECORDS]...',
    'DECRYPTING HARDENED HARDWARE LEDGER VECTOR...',
    'ORBIS CORE: INTEGRITY CONFIRMED 100% SECURE.',
    'ROUTING TRAFFIC... WELCOME TO PORTAL.'
  ];

  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // 3.2 second total load
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    const logTimer = setInterval(() => {
      setLogIndex((p) => (p < logs.length - 1 ? p + 1 : p));
    }, 450);

    const completeTimer = setTimeout(() => {
      onCompleteRef.current();
    }, 3500);

    return () => {
      clearInterval(progressTimer);
      clearInterval(logTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] text-[#EFF4FF] flex flex-col justify-center items-center overflow-hidden font-mono" id="hurricane-transition-overlay">
      
      {/* Inline styles provided by the user for perfect pixel-accurate render */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Main container holding the hurricane layers */
        .hurricane-container {
          position: relative;
          width: 320px;
          height: 320px;
          display: flex;
          justify-content: center;
          align-items: center;
          filter: blur(8px) contrast(1.5); /* Blurs and merges the layers for a cloud effect */
        }

        /* Base styling for all swirling storm arms */
        .storm-layer {
          position: absolute;
          border-radius: 50%;
          mix-blend-mode: screen;
          animation: spin linear infinite;
        }

        /* Outer massive cloud arms */
        .layer-outer {
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 60%),
                      radial-gradient(circle at 70% 70%, rgba(255,255,255,0.15) 0%, transparent 60%);
          animation-duration: 6s;
        }

        /* Mid-level faster spiraling arms */
        .layer-mid {
          width: 75%;
          height: 75%;
          background: radial-gradient(circle at 40% 20%, rgba(255,255,255,0.2) 0%, transparent 50%),
                      radial-gradient(circle at 60% 80%, rgba(255,255,255,0.2) 0%, transparent 50%);
          animation-duration: 4s;
          animation-direction: reverse; /* Counter-rotation creates turbulence */
        }

        /* Inner intense wall near the eye */
        .layer-inner {
          width: 45%;
          height: 45%;
          background: radial-gradient(circle at 50% 15%, rgba(200,220,255,0.4) 0%, transparent 40%),
                      radial-gradient(circle at 50% 85%, rgba(200,220,255,0.4) 0%, transparent 40%);
          animation-duration: 2s;
        }

        /* Clear storm eye in the center */
        .hurricane-eye {
          position: absolute;
          width: 40px;
          height: 40px;
          background-color: #0f172a; /* Matches the page background */
          border-radius: 50%;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
          z-index: 10;
        }

        /* Spin animation logic */
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}} />

      {/* Header telemetry details */}
      <div className="absolute top-8 left-8 flex items-center gap-3 opacity-60 text-xs tracking-wider" id="h-tel-left">
        <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
        <span>NODE: ORBIS_SSL_PRIMARY</span>
        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-emerald-300">ACTIVE</span>
      </div>

      <div className="absolute top-8 right-8 flex items-center gap-3 opacity-60 text-xs tracking-wider" id="h-tel-right">
        <Shield className="w-4 h-4 text-cyan-400" />
        <span>SECURED OVER: CLOUDFLARE_WARP</span>
      </div>

      {/* Main Hurricane visual frame */}
      <div className="flex flex-col items-center justify-center p-12 bg-slate-950/45 border border-white/5 rounded-3xl backdrop-blur-md shadow-2xl relative" id="h-main-box">
        
        {/* Subtle pulsing glow ring around the hurricane */}
        <div className="absolute inset-0 rounded-3xl border border-teal-500/15 animate-pulse -z-10 pointer-events-none" />

        {/* Hurricane Elements matching the exact user layout */}
        <div className="hurricane-container scale-110 mb-8" id="hurricane-v-container">
          <div className="storm-layer layer-outer"></div>
          <div className="storm-layer layer-mid"></div>
          <div className="storm-layer layer-inner"></div>
          <div className="hurricane-eye"></div>
        </div>

        {/* Dynamic secure decryption info */}
        <div className="flex flex-col items-center text-center gap-1.5" id="h-info">
          <div className="flex items-center gap-2 text-teal-400 font-bold uppercase text-xs tracking-widest">
            <CloudLightning className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>ORBIS WEATHER STORM SYSTEM</span>
          </div>
          <h1 className="text-sm font-black text-white uppercase tracking-widest mt-1">
            INITIALIZING SECURE VOTING TUNNEL...
          </h1>
          <p className="text-[10px] text-zinc-500 max-w-sm h-4">
            {logs[logIndex]}
          </p>
        </div>

        {/* Custom Progress bar */}
        <div className="w-[280px] bg-slate-900 border border-white/10 h-1.5 rounded-full mt-6 overflow-hidden relative" id="h-pbar">
          <div 
            className="h-full bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 transition-all duration-75 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between w-[280px] mt-2 text-[9px] text-zinc-500 uppercase">
          <span>PROGRESS ENTROPY</span>
          <span className="text-teal-400 font-bold">{progress}%</span>
        </div>
      </div>

      {/* Manual pass through eye bypass */}
      <button 
        onClick={onComplete}
        className="mt-10 flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white px-5 py-2 rounded-xl text-[10px] tracking-widest hover:border-teal-500/30 transition-all uppercase"
        id="pass-through-eye-btn"
      >
        <Key className="w-3.5 h-3.5 text-teal-400" />
        PASS_THROUGH_EYE
      </button>

      {/* Bottom encryption protocol banner */}
      <footer className="absolute bottom-6 flex items-center gap-2 text-[9px] text-zinc-600 tracking-widest uppercase" id="h-footer">
        <span>ENCRYPTED USING REVERSIBILITY-ZERO SHA256 ALGORITHM</span>
        <span>•</span>
        <span>AES-GCM BYPASS LOCKED</span>
      </footer>

    </div>
  );
};
