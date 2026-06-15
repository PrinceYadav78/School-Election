import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, UserSquare } from 'lucide-react';
import { Voter } from '../types';

interface StudentSetupProps {
  voter: Voter;
  onComplete: (house: string, grade: string) => void;
}

export const StudentSetup: React.FC<StudentSetupProps> = ({ voter, onComplete }) => {
  const [house, setHouse] = useState('');
  const [grade, setGrade] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!house || !grade) return;
    onComplete(house, grade);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[85vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-black/50 border border-teal-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-md relative"
      >
        <div className="absolute top-0 right-0 w-12 h-12 border-t border-r border-teal-500/10 pointer-events-none" />

        <div className="flex items-center gap-2 mb-6">
          <UserSquare className="w-5 h-5 text-teal-400" />
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">Student Profile</h2>
            <p className="text-[9px] font-mono text-zinc-500 tracking-widest uppercase">SETUP REQUIRED</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-mono">SELECT YOUR HOUSE</label>
            <select
              required
              value={house}
              onChange={(e) => setHouse(e.target.value)}
              className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono"
            >
              <option value="" disabled>Select a House...</option>
              <option value="Blue">Nicon (Blue)</option>
              <option value="Green">Maxims (Green)</option>
              <option value="Yellow">Pericles (Yellow)</option>
              <option value="Red">Regulus (Red)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-mono">SELECT YOUR GRADE</label>
            <select
              required
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono"
            >
              <option value="" disabled>Select Grade...</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={(i + 1).toString()}>Grade {i + 1}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end border-t border-white/5 pt-4 mt-2">
            <button
              type="submit"
              disabled={!house || !grade}
              className="flex items-center gap-2 bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-teal-400 text-black font-semibold text-xs font-mono py-2.5 px-6 rounded-xl select-none transition-all uppercase tracking-wider"
            >
              CONTINUE_TO_VOTE
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
