import React from 'react';

interface OrbisIntroProps {
  onProceed: () => void;
}

export const OrbisIntro: React.FC<OrbisIntroProps> = ({ onProceed }) => {
  return (
    <section 
      className="relative overflow-hidden min-h-screen cursor-pointer select-none" 
      onClick={onProceed}
      id="orbis-intro-section"
    >
      {/* Background video */}
      <video 
        className="absolute inset-0 w-full h-full object-cover" 
        autoPlay 
        loop 
        muted 
        playsInline
        id="orbis-bg-video"
      >
        <source 
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4" 
          type="video/mp4" 
        />
      </video>

      {/* Floating Prompt Overlay - Sleek, distinct, elegant */}
      <div className="absolute top-6 right-6 z-30 bg-black/65 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 pointer-events-auto">
        <span className="w-2 h-2 rounded-full bg-neon animate-ping" />
        <span className="text-[10px] font-mono tracking-widest text-[#EFF4FF] uppercase">
          CLICK ANYWHERE TO ENTER PORTAL
        </span>
      </div>

      {/* Content wrapper */}
      <div className="relative max-w-[1831px] mx-auto px-4 sm:px-6 md:px-8 py-16 sm:py-20 md:py-24 z-10 flex flex-col justify-between min-h-screen">
        
        {/* ROW 1 (top) */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-12 mb-12 sm:mb-16 md:mb-20">
          
          {/* Child A -- The heading */}
          <h2 className="font-grotesk text-[32px] sm:text-[48px] md:text-[60px] font-normal uppercase leading-[1.05] sm:leading-[1] md:leading-[1] text-cream relative">
            Hello!<br />
            I'm orbis
            
            {/* Absolute overlay Orbis badge override */}
            <span className="font-condiment text-[36px] sm:text-[52px] md:text-[68px] font-normal normal-case text-neon mix-blend-exclusion leading-[0.79] tracking-[0.03em] absolute right-[-8px] bottom-[-20px] sm:bottom-[-30px] md:bottom-[-40px] -rotate-1 opacity-90">
              Orbis
            </span>
          </h2>

          {/* Child B -- The paragraph */}
          <p className="font-mono text-[14px] sm:text-[15px] md:text-[16px] uppercase text-cream max-w-[266px] leading-relaxed">
            Orbis is responsible for the security, cryptographic integrity, and real-time tabulation of this digital election portal
          </p>

        </div>

        {/* ROW 2 (bottom) */}
        <div className="flex justify-between items-start mt-auto">
          
          {/* Child A -- Left text column */}
          <div className="flex flex-col gap-5 max-w-[335px]">
            <p className="font-mono text-[14px] sm:text-[15px] md:text-[16px] uppercase lg:text-cream text-[#010828] opacity-10 leading-relaxed">
              Orbis is responsible for the security, cryptographic integrity, and real-time tabulation of this digital election portal
            </p>
            <p className="font-mono text-[14px] sm:text-[15px] md:text-[16px] uppercase lg:text-cream text-[#010828] opacity-10 leading-relaxed">
              Orbis is responsible for the security, cryptographic integrity, and real-time tabulation of this digital election portal
            </p>
          </div>

          {/* Child B -- Right text column */}
          <div className="hidden lg:flex flex-col gap-5 max-w-[335px]">
            <p className="font-mono text-[14px] sm:text-[15px] md:text-[16px] uppercase lg:text-cream text-[#010828] opacity-10 leading-relaxed">
              Orbis is responsible for the security, cryptographic integrity, and real-time tabulation of this digital election portal
            </p>
            <p className="font-mono text-[14px] sm:text-[15px] md:text-[16px] uppercase lg:text-cream text-[#010828] opacity-10 leading-relaxed">
              Orbis is responsible for the security, cryptographic integrity, and real-time tabulation of this digital election portal
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
