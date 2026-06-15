import React, { useState } from 'react';
import { Candidate, PostDefinition, Voter } from '../types';
import { HologramCard } from './HologramCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  RotateCcw, 
  Check, 
  Fingerprint, 
  ChevronRight, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  LogOut
} from 'lucide-react';

interface VoterPortalProps {
  voter: Voter;
  posts: PostDefinition[];
  candidates: Candidate[];
  isOpen: boolean;
  onCastVotes: (selections: Record<string, string>) => void; // Map of postId -> candidateId
  onLogout: () => void;
}

export const VoterPortal: React.FC<VoterPortalProps> = ({
  voter,
  posts,
  candidates,
  isOpen,
  onCastVotes,
  onLogout,
}) => {
  // Current voting step (post index)
  const [currentStep, setCurrentStep] = useState(0);

  // Selections: Record<postId, candidateId>
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Active validation state
  const activePost = posts[currentStep];

  // Filter candidates running for the active post
  const activeCandidates = candidates.filter((c) => c.post === activePost?.id);

  const selectedCandidateId = activePost ? selections[activePost.id] : undefined;

  const handleSelectCandidate = (candidateId: string) => {
    if (isSubmitting || isFinished) return;
    setSelections((prev) => ({
      ...prev,
      [activePost.id]: candidateId,
    }));
  };

  const handleNextStep = () => {
    if (!selectedCandidateId) return;

    if (currentStep < posts.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Final vote lock verification
      triggerFinalSubmit();
    }
  };

  const triggerFinalSubmit = () => {
    setIsSubmitting(true);
    // Simulate high-tech ledger synchronization and security lock-in
    setTimeout(() => {
      onCastVotes(selections);
      setIsSubmitting(false);
      setIsFinished(true);

      // Auto security session kill & full system reload after 3.5 seconds
      setTimeout(() => {
        onLogout();
        window.location.reload();
      }, 3500);
    }, 2000);
  };

  const handleResetSelections = () => {
    setSelections({});
    setCurrentStep(0);
  };

  // Check if election is suddenly closed by admin
  if (!isOpen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center" id="election-closed-voter">
        <div className="relative w-24 h-24 mb-6" id="lock-voter-frame">
          <div className="absolute inset-0 rounded-full border border-red-500/30 animate-pulse" />
          <div className="absolute inset-2 rounded-full border border-dashed border-red-500/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">ELECTION GATE CLOSED</h2>
        <p className="text-sm text-zinc-500 max-w-md font-mono mb-6">
          The administrator has closed the active voting window. No further entries or revisions can be recorded on this terminal.
        </p>
        <button
          onClick={onLogout}
          className="px-6 py-2.5 bg-zinc-900 border border-white/15 hover:border-white/30 rounded-xl text-xs font-mono tracking-widest text-zinc-300 transition-all"
          id="logout-btn-closed"
        >
          RETURN_TO_STATION
        </button>
      </div>
    );
  }

  return (
    <div className="w-full text-zinc-200 min-h-screen pb-24 px-4 md:px-8 mt-4" id="voter-portal-root">
      
      {/* Top minimalistic HUD Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between border-b border-white/10 pb-4 mb-8" id="voter-hud-hdr">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-5 h-5 text-magenta-500 animate-pulse" />
          <div>
            <p className="text-xs font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-magenta-400 to-teal-400">
              VOTER_AUTHENTICATED: {voter.admissionNo}
            </p>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              LOCKED SESSION • TEMPORARY SECURE LEDGER ID
            </p>
          </div>
        </div>

        {/* Escape session */}
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-zinc-500 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 hover:bg-red-500/5 px-3 py-1.5 rounded-xl"
          id="force-cancel-session-btn"
        >
          <LogOut className="w-3.5 h-3.5" />
          ABORT_VOTE
        </button>
      </div>

      <AnimatePresence mode="wait">
        {isFinished ? (
          /* Final session lock success overlay */
          <motion.div
            key="success-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto bg-black/60 border border-magenta-500/30 rounded-2xl p-8 backdrop-blur-md text-center py-12 relative overflow-hidden shadow-[0_0_50px_rgba(217,70,239,0.15)]"
            id="voter-finish-screen"
          >
            {/* Holographic scanner laser */}
            <div className="absolute inset-0 bg-radial-gradient from-magenta-500/5 to-transparent pointer-events-none" />

            <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center" id="scan-succ-badge">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-magenta-500/50"
              />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-2 rounded-full bg-magenta-500/10"
              />
              <ShieldCheck className="w-10 h-10 text-magenta-400 relative z-10" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">VOTE ENCRYPTED & LOCKED</h2>
            <p className="text-xs text-magenta-300 font-mono tracking-wider uppercase mb-5">
              LEDGER_TRANSACTION: SUCCESS
            </p>
            
            <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-8 font-sans leading-relaxed">
              Your selections have been recorded anonymously. Your student credential ID has been safely flagged to prevent double voting.
            </p>

            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-white/5 py-2 px-4 rounded-xl text-[10px] font-mono text-zinc-500 uppercase tracking-widest" id="timeout-notif">
              <Clock className="w-4 h-4 text-zinc-600 animate-spin" />
              RELOADING SECURE HOME PORTAL IN 3s...
            </div>
          </motion.div>
        ) : isSubmitting ? (
          /* High-Tech Wireframe Ledger loading state */
          <motion.div
            key="loading-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-md mx-auto text-center py-20 flex flex-col items-center justify-center"
            id="voter-submitting-screen"
          >
            <div className="relative w-16 h-16 mb-6" id="wireframe-spinner">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                className="absolute inset-0 border-2 border-t-teal-500 border-r-transparent border-b-magenta-500 border-l-transparent rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                className="absolute inset-2 border border-dashed border-teal-500/30 rounded-full"
              />
            </div>
            <h3 className="text-lg font-bold font-mono tracking-widest uppercase text-teal-400 mb-1">
              SYNCING WITH LEDGER
            </h3>
            <p className="text-[10px] font-mono text-zinc-500 tracking-wider">
              INJECTING SECURE CRYPTO_KEY • ENCRYPTION: SHA-256
            </p>
          </motion.div>
        ) : (
          /* Main election sequential card views */
          <motion.div
            key={`step-${currentStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="max-w-5xl mx-auto flex flex-col gap-6"
            id={`step-${activePost?.id}`}
          >
            {/* Step navigation indicator */}
            <div className="flex items-center justify-between" id="portal-step-hdr">
              <div id="portal-title-float">
                <span className="text-[10px] font-mono text-magenta-400 font-bold tracking-widest uppercase mb-1 block">
                  CATEGORY {currentStep + 1} OF {posts.length}
                </span>
                <h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">
                  Vote for {activePost?.title}
                </h2>
                <p className="text-sm text-zinc-400 max-w-2xl font-sans">
                  {activePost?.description}
                </p>
              </div>

              {/* Steps pills */}
              <div className="hidden md:flex gap-1.5" id="steps-pills">
                {posts.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`h-1.5 w-6 rounded-full transition-all duration-300
                      ${idx === currentStep 
                        ? 'bg-magenta-500 shadow-[0_0_8px_#d946ef]' 
                        : idx < currentStep 
                        ? 'bg-teal-500/45' 
                        : 'bg-zinc-800'
                      }
                    `}
                  />
                ))}
              </div>
            </div>

            {/* Candidate selection cards flex */}
            {activeCandidates.length === 0 ? (
              <div className="bg-black/30 border border-white/5 py-20 rounded-2xl text-center text-zinc-500 font-mono text-xs" id="no-cands-view">
                No verified candidates registered for this post in standard parameters.
              </div>
            ) : (
              <div 
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-6"
                id="cards-viewport"
              >
                {activeCandidates.map((cand) => (
                  <HologramCard
                    key={cand.id}
                    candidate={cand}
                    isSelected={selectedCandidateId === cand.id}
                    onSelect={() => handleSelectCandidate(cand.id)}
                  />
                ))}
              </div>
            )}

            {/* Bottom floating button rail */}
            <div className="flex items-center justify-between border-t border-white/10 pt-6 mt-4" id="vote-hud-actions">
              <button
                onClick={() => {
                  if (currentStep > 0) {
                    setCurrentStep((prev) => prev - 1);
                  }
                }}
                disabled={currentStep === 0}
                className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-zinc-400 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                id="go-back-step-btn"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                GO_BACK
              </button>

              <div className="flex items-center gap-4" id="right-rail-action">
                {selectedCandidateId ? (
                  <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest animate-pulse" id="biometrics-accepted-badge">
                    ● SELECTION_LOCKED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-widest" id="selection-pending-badge">
                    ● PENDING_SELECTION
                  </span>
                )}

                <button
                  onClick={handleNextStep}
                  disabled={!selectedCandidateId}
                  className={`flex items-center gap-2 font-mono text-xs font-bold py-3 px-6 rounded-xl transition-all uppercase tracking-widest
                    ${selectedCandidateId
                      ? 'bg-gradient-to-r from-magenta-500 to-indigo-600 text-white shadow-[0_4px_20px_rgba(217,70,239,0.35)] active:scale-95'
                      : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed'
                    }
                  `}
                  id="confirm-post-vote-btn"
                >
                  {currentStep < posts.length - 1 ? (
                    <>
                      CONFIRM_VOTE_STEP
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      SUBMIT_FINAL_LEDGER_VOTE
                      <ShieldCheck className="w-4 h-4 animate-pulse" />
                    </>
                  )}
                </button>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
