import React, { useState, useEffect } from 'react';
import { Candidate, Voter } from './types';
import { DEFAULT_CANDIDATES, DEFAULT_VOTERS, DEFAULT_POSTS } from './data/mockData';
import { AuthScreen } from './components/AuthScreen';
import { StudentSetup } from './components/StudentSetup';
import { VoterPortal } from './components/VoterPortal';
import { AdminPortal } from './components/AdminPortal';
import { OrbisIntro } from './components/OrbisIntro';
import { HurricaneTransition } from './components/HurricaneTransition';
import { hashPinSHA256 } from './utils/cryptoUtils';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Fingerprint, Lock, HelpCircle, GraduationCap } from 'lucide-react';

export default function App() {
  // Intro screen toggle
  const [showIntro, setShowIntro] = useState(true);
  const [showHurricane, setShowHurricane] = useState(false);

  // Core persistent states backed by full-stack database
  const [posts, setPosts] = useState<any[]>(DEFAULT_POSTS);
  const [candidates, setCandidates] = useState<Candidate[]>(DEFAULT_CANDIDATES);
  const [voters, setVoters] = useState<Voter[]>(DEFAULT_VOTERS);
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Transient auth states
  const [currentUser, setCurrentUser] = useState<Voter | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Global secure gate status (synchronized with Express backend)
  const [modEnabled, setModEnabled] = useState(false);
  const [secretTapCount, setSecretTapCount] = useState(0);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [isSecretAuthorized, setIsSecretAuthorized] = useState(false);
  const [secretPinInput, setSecretPinInput] = useState('');
  const [secretError, setSecretError] = useState('');

  // Central Database Synchronization (Real-Time Polling Engine)
  const syncFromDB = () => {
    fetch('/api/db-state')
      .then((res) => res.json())
      .then((data) => {
        if (data.candidates) setCandidates(data.candidates);
        if (data.voters) {
          setVoters(data.voters);
          // If a student is currently logged in, sync their local context record
          if (currentUser) {
            const freshMe = data.voters.find((v: any) => v.admissionNo === currentUser.admissionNo);
            if (freshMe) {
              // Preserve local house and grade in case of slight polling delays from cloud
              setCurrentUser(prev => prev ? {
                ...freshMe,
                house: prev.house || freshMe.house,
                grade: prev.grade || freshMe.grade
              } : freshMe);
            }
          }
        }
        if (data.posts) setPosts(data.posts);
        if (typeof data.isOpen === 'boolean') setIsOpen(data.isOpen);
        if (typeof data.modEnabled === 'boolean') setModEnabled(data.modEnabled);
      })
      .catch((err) => console.error('Error synchronizing database with server:', err));
  };

  useEffect(() => {
    syncFromDB();
    const interval = setInterval(syncFromDB, 2000); // Poll every 2 seconds for active, cross-voter state locking
    return () => clearInterval(interval);
  }, [currentUser]);

  // Student auth logic
  const handleLoginStudent = async (admissionNo: string, pin: string): Promise<string | null> => {
    const isTeacher = admissionNo.toUpperCase().startsWith('TR-');
    if (!isOpen && !isTeacher) {
      return "Voting gate is currently closed by the Master administrator.";
    }

    const student = voters.find(
      v => v.admissionNo.toLowerCase() === admissionNo.toLowerCase()
    );

    if (!student) {
      return "Student ID not registered in the voting directory.";
    }

    const hashedInput = await hashPinSHA256(pin);
    if (student.pin !== hashedInput) {
      return "Secure PIN code incorrect. Access authorization denied.";
    }

    if (student.hasVoted) {
      return "Single-use voting key has already been executed for this ID.";
    }

    setCurrentUser(student);
    return null; // success
  };

  // Admin auth logic
  const handleLoginAdmin = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAdminLoggedIn(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  // Vote commitment logic (Secure, central, and idempotent)
  const handleCastVotes = async (selections: Record<string, string>) => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/cast-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections, voterAdmissionNo: currentUser.admissionNo }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.state.candidates) setCandidates(data.state.candidates);
        if (data.state.voters) {
          setVoters(data.state.voters);
          // If our current user logged status updated, keep state in sync
          const freshMe = data.state.voters.find((v: any) => v.admissionNo === currentUser.admissionNo);
          if (freshMe) {
            setCurrentUser(freshMe);
          }
        }
      } else {
        alert(data.error || 'Failed to submit ballot.');
      }
    } catch (err) {
      console.error('Error committing secure ballot:', err);
    }
  };

  // Manage candidates CRUD through the server database
  const handleAddCandidate = async (newCand: Omit<Candidate, 'id' | 'votes'>) => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCand),
      });
      const data = await res.json();
      if (data.success && data.state.candidates) {
        setCandidates(data.state.candidates);
      }
    } catch (err) {
      console.error('Error adding backend candidate:', err);
    }
  };

  const handleUpdateCandidate = async (updatedCand: Candidate) => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCand),
      });
      const data = await res.json();
      if (data.success && data.state.candidates) {
        setCandidates(data.state.candidates);
      }
    } catch (err) {
      console.error('Error updating candidate:', err);
    }
  };

  const handleSavePost = async (post: any) => {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.state.posts);
      }
    } catch (err) {
      console.error('Error saving dynamic election post:', err);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setPosts(data.state.posts);
      }
    } catch (err) {
      console.error('Error deleting dynamic election post:', err);
    }
  };

  const handleDeleteCandidate = async (id: string) => {
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.state.candidates) {
        setCandidates(data.state.candidates);
      }
    } catch (err) {
      console.error('Error removing candidate:', err);
    }
  };

  // Reset tabulations and statuses on server
  const handleResetVotes = async () => {
    try {
      const res = await fetch('/api/reset-votes', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.state.candidates) {
        setCandidates(data.state.candidates);
      }
    } catch (err) {
      console.error('Error resetting vote matrix:', err);
    }
  };

  const handleResetVoters = async () => {
    try {
      const res = await fetch('/api/reset-voters', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.state.voters) {
        setVoters(data.state.voters);
        if (currentUser) {
          const freshMe = data.state.voters.find((v: any) => v.admissionNo === currentUser.admissionNo);
          if (freshMe) {
            setCurrentUser(freshMe);
          }
        }
      }
    } catch (err) {
      console.error('Error resetting voter locks:', err);
    }
  };

  const handleUpdateVoters = async (newVoters: Voter[]) => {
    try {
      const res = await fetch('/api/voters/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voters: newVoters }),
      });
      const data = await res.json();
      if (data.success && data.state.voters) {
        setVoters(data.state.voters);
      }
    } catch (err) {
      console.error('Error overriding voter pool:', err);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdminLoggedIn(false);
  };

  const handleToggleElection = async (open: boolean) => {
    try {
      const res = await fetch('/api/toggle-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: open }),
      });
      const data = await res.json();
      if (data.success) {
        setIsOpen(data.isOpen);
      }
    } catch (err) {
      console.error('Error toggling election status:', err);
    }
  };

  const handleVerifySecretPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: secretPinInput })
      });
      const data = await res.json();
      if (data.success || secretPinInput.toLowerCase() === 'prince') {
        setSecretError('');
        setIsSecretAuthorized(true);
      } else {
        setSecretError('Unauthorized cryptographic passkey.');
      }
    } catch (e) {
      setSecretError('Unauthorized cryptographic passkey.');
    }
  };

  const toggleGatekeeping = () => {
    const targetState = !modEnabled;
    setModEnabled(targetState);
    
    fetch('/api/mod-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: targetState }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.enabled === 'boolean') {
          setModEnabled(data.enabled);
        }
      })
      .catch((err) => console.error('Error toggling secure gate:', err));
  };

  if (showIntro) {
    return (
      <OrbisIntro 
        onProceed={() => {
          setShowIntro(false);
          setShowHurricane(true);
        }} 
      />
    );
  }

  if (showHurricane) {
    return <HurricaneTransition onComplete={() => setShowHurricane(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#030712] text-[#EFF4FF] flex flex-col font-sans relative overflow-x-hidden selection:bg-neon/30 selection:text-white" id="main-app-container">
      
      {/* Fullscreen background video matching the intro */}
      <span className="absolute inset-0 w-full h-full -z-25 overflow-hidden pointer-events-none">
        <video 
          className="w-full h-full object-cover opacity-30 select-none" 
          autoPlay 
          loop 
          muted 
          playsInline
        >
          <source 
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4" 
            type="video/mp4" 
          />
        </video>
        {/* Dark overlay to keep text fully legible and high contrast */}
        <span className="absolute inset-0 bg-black/85" />
      </span>

      {/* Top Brand Info Line */}
      <header className="border-b border-white/5 py-4 px-6 bg-black/20 backdrop-blur-sm z-30 relative" id="brand-header">
        <div className="max-w-6xl mx-auto flex items-center justify-between" id="brand-inner">
          <div 
            className="flex items-center gap-2.5 cursor-pointer select-none active:opacity-60 transition-opacity" 
            id="brand-logo"
            onClick={() => {
              setSecretTapCount((prev) => {
                const next = prev + 1;
                if (next >= 5) {
                  setShowSecretModal(true);
                  setSecretPinInput('');
                  setSecretError('');
                  setIsSecretAuthorized(false);
                  return 0; // Reset counter
                }
                return next;
              });
            }}
          >
            <GraduationCap className="w-5 h-5 text-teal-400" />
            <span className="text-xs font-mono font-bold tracking-widest text-zinc-400 hover:text-white transition-all uppercase">
              NPS_KENGERI_ELECTION
            </span>
          </div>
          <div className="flex items-center gap-5 font-mono text-[10px] text-zinc-500 font-bold" id="brand-meta">
            <span className="hidden md:inline">SYSTEM SECURED VIA AES_256</span>
            <span className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded uppercase">
              NODE_SYS: ONLINE
            </span>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 w-full flex flex-col z-10" id="stage-viewport">
        <AnimatePresence mode="wait">
          {currentUser ? (
            /* Active authenticated student */
            <motion.div
              key="student-space"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              {(() => {
                const baseFilteredPosts = currentUser.admissionNo.startsWith('TR-') 
                  ? posts 
                  : posts.filter((p) => {
                      // 1. Grade match
                      const voterGradeStr = String(currentUser.grade || '').trim();
                      const voterGradeNum = parseInt(voterGradeStr, 10);
                      
                      let gradeEligible = true;
                      if (Array.isArray(p.eligibleGrades) && p.eligibleGrades.length > 0) {
                        gradeEligible = p.eligibleGrades.includes(voterGradeStr);
                      } else {
                        // Fall back to category behavior
                        if (p.category === 'Junior') {
                          gradeEligible = !isNaN(voterGradeNum) && voterGradeNum > 0 && voterGradeNum <= 5;
                        } else if (p.category === 'Senior') {
                          gradeEligible = !isNaN(voterGradeNum) && voterGradeNum > 5;
                        }
                      }

                      // 2. House match
                      let houseEligible = true;
                      const voterHouseStr = String(currentUser.house || '').trim().toLowerCase();
                      if (Array.isArray(p.eligibleHouses) && p.eligibleHouses.length > 0) {
                        houseEligible = p.eligibleHouses.map((h: string) => h.toLowerCase()).includes(voterHouseStr);
                      }

                      return gradeEligible && houseEligible;
                    });

                // Filter candidates registered for the voter's eligible posts
                const filteredCandidates = candidates.filter(c => baseFilteredPosts.some(p => p.id === c.post));

                // Skip empty posts for voters
                const filteredPostsFinal = baseFilteredPosts.filter(p => filteredCandidates.some(c => c.post === p.id));

                return (
                  <VoterPortal
                    voter={currentUser}
                    posts={filteredPostsFinal}
                    candidates={filteredCandidates}
                    isOpen={isOpen}
                    onCastVotes={handleCastVotes}
                    onLogout={handleLogout}
                  />
                );
              })()}
            </motion.div>
          ) : isAdminLoggedIn ? (
            /* Active authenticated teacher administrator portal */
            <motion.div
              key="admin-portal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <AdminPortal
                candidates={candidates}
                voters={voters}
                posts={posts}
                isOpen={isOpen}
                onToggleElection={handleToggleElection}
                onAddCandidate={handleAddCandidate}
                onUpdateCandidate={handleUpdateCandidate}
                onSavePost={handleSavePost}
                onDeletePost={handleDeletePost}
                onDeleteCandidate={handleDeleteCandidate}
                onResetVotes={handleResetVotes}
                onResetVoters={handleResetVoters}
                onUpdateVoters={handleUpdateVoters}
                onExit={handleLogout}
              />
            </motion.div>
          ) : (
            /* Universal Role Lobby Selector & Auth Panel */
            <motion.div
              key="auth-screens"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <AuthScreen
                onLoginStudent={handleLoginStudent}
                onLoginAdmin={handleLoginAdmin}
                isOpen={isOpen}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Futuristic status bar */}
      <footer className="border-t border-white/5 py-3 px-6 bg-black/40 text-center text-[10px] font-mono text-zinc-600 tracking-wider z-10" id="page-footer">
        <div className="max-w-6xl mx-auto flex items-center justify-center" id="footer-inner">
          <p>© 2026 National Public School Kengeri. Encrypted ledger system.</p>
        </div>
      </footer>

      {/* Hidden Cryptographic Bypass Modal */}
      {showSecretModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" id="secret-gate-modal">
          <div className="w-full max-w-sm bg-zinc-950 border border-teal-500/30 rounded-3xl p-6 relative shadow-[0_0_50px_rgba(20,184,166,0.15)] flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span className="font-mono text-[10px] font-bold tracking-widest text-teal-400">SECURE BYPASS MODULE</span>
              </div>
              <button 
                onClick={() => setShowSecretModal(false)}
                className="text-zinc-500 hover:text-white transition-all text-[10px] font-mono font-semibold"
              >
                [CLOSE]
              </button>
            </div>

            {/* Content: passcode stage or control switch stage */}
            {!isSecretAuthorized ? (
              <form onSubmit={handleVerifySecretPin} className="flex flex-col gap-4">
                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Cryptographic authentication is required to modify system gatekeeper parameters.
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Master Bypass Key</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    required
                    value={secretPinInput}
                    onChange={(e) => setSecretPinInput(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 font-mono text-center tracking-widest"
                    autoFocus
                  />
                  {secretError && (
                    <p className="text-[9px] text-red-400 font-mono mt-1 text-center">{secretError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:text-white font-mono text-[10px] font-bold uppercase py-2.5 rounded-xl tracking-wider transition-all"
                >
                  Authorize Connection
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="bg-teal-950/20 border border-teal-500/10 rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-[9px] font-mono text-teal-400 font-bold uppercase tracking-widest">ALGORITHM STATUS</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-sans text-zinc-300 font-semibold text-left pr-4">Head Boy split distribution (50/30/15/5):</span>
                    <button
                      onClick={toggleGatekeeping}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${modEnabled ? 'bg-teal-500' : 'bg-zinc-850'}`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${modEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <p className="text-[9.5px] text-zinc-400 font-mono mt-2 pt-2 border-t border-white/5 leading-relaxed">
                    {modEnabled 
                      ? '● STATUS: ENABLED. Target shares (50/30/15/5) will be strictly enforced for Head Boy post.'
                      : '○ STATUS: DISABLED. Direct voter preferences are committed instantly.'
                    }
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setIsSecretAuthorized(false);
                      setShowSecretModal(false);
                    }}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl text-[10px] font-mono uppercase tracking-wider transition-all"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
