import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, Info, HelpCircle } from 'lucide-react';
import { Candidate, Voter } from '../types';

interface Message {
  sender: 'user' | 'orbis';
  text: string;
  timestamp: Date;
}

interface OrbisBotProps {
  candidates: Candidate[];
  voter?: Voter | null;
}

export const OrbisBot: React.FC<OrbisBotProps> = ({ candidates, voter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'orbis',
      text: "HELLO! I am ORBIS, the secure intelligent helper bot for the National Public School Kengeri elections. How can I assist you with your digital voting process today?",
      timestamp: new Date(),
    }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [hasUnread, setHasUnread] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    const newMsg: Message = {
      sender: 'user',
      text: userText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputVal('');

    // Generate response from Orbis
    setTimeout(() => {
      const responseText = generateResponse(userText);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'orbis',
          text: responseText,
          timestamp: new Date(),
        },
      ]);
    }, 700);
  };

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();

    // Greeting
    if (q.includes('hello') || q.includes('hi ') || q.includes('hey') || q.includes('who are you')) {
      return "Greetings! I'm ORBIS, the specialized helper agent for this election cycle. Ask me about candidate manifestos, secure voting procedures, or how to submit your digital ballot.";
    }

    // Candidates
    if (q.includes('candidate') || q.includes('who is contesting') || q.includes('posts') || q.includes('who are they')) {
      return "The active election roles are Head Boy, Head Girl, Sports Captain, and Cultural Secretary. You can explore details about the candidates (their House, mottos, and details) inside each post selection panel.";
    }

    // Specific candidate info
    if (q.includes('alexander') || q.includes('vance')) {
      const cand = candidates.find((c) => c.fullName.toLowerCase().includes('alexander'));
      return cand 
        ? `Alexander Vance is contesting for Head Boy (Regulus House). Motto: "${cand.motto}"`
        : "Alexander Vance is contesting for Head Boy under the Regulus House, driving House collaborations.";
    }
    if (q.includes('ryan') || q.includes('sterling')) {
      return "Ryan Sterling is contesting for Head Boy (Nicon House). Motto: 'Unifying classes under a single vision. Streamlining grievance procedures and tech infrastructure.'";
    }
    if (q.includes('vikram') || q.includes('aditya')) {
      return "Vikram Aditya is contesting for Head Boy (Pericles House). Motto: 'Leadership with integrity. Elevating community service, environmental drives.'";
    }
    if (q.includes('elena') || q.includes('rostova')) {
      return "Elena Rostova is running for Head Girl (Nicon House). Motto: 'Reimagining leadership with complete transparency, academic-social balance.'";
    }
    if (q.includes('sophia') || q.includes('patel')) {
      return "Sophia Patel is running for Head Girl (Maxims House). Motto: 'Nurturing talent, organizing student guilds, and peer-led support.'";
    }
    if (q.includes('meera') || q.includes('nair')) {
      return "Meera Nair is running for Head Girl (Pericles House). Motto: 'Sustainability at the core. Pushing for campus carbon-neutrality.'";
    }
    if (q.includes('marcus') || q.includes('kane')) {
      return "Marcus Kane is contesting for Sports Captain (Regulus House). Motto: 'Instilling house pride, organizing weekly bootcamps.'";
    }
    if (q.includes('clara') || q.includes('oswald')) {
      return "Clara Oswald is contesting for Sports Captain (Yellow House). Motto: 'Diversifying sports, introducing e-athletics.'";
    }

    // How to vote / procedures
    if (q.includes('how to vote') || q.includes('steps') || q.includes('vote') || q.includes('process')) {
      return "Voting is simple: \n1. Login using your SD-XXXX Admission Number and unique Secure PIN.\n2. Tap 'Select Candidate' under your choices for each leadership role.\n3. Verify your selections on the Review panel, then finalize by tapping 'Cast Secure Ballot'.\nNote: Once cast, your key is locked to prevent double voting.";
    }

    // Security / Ledger questions
    if (q.includes('secure') || q.includes('safe') || q.includes('hacked') || q.includes('ledger') || q.includes('pin')) {
      return "This system is protected with localized client state synchronization, AES_256 simulation constraints, and individual student single-use authentication PINs. Your vote is anonymized and securely tabulated.";
    }

    // NPS Kengeri details
    if (q.includes('school') || q.includes('kengeri') || q.includes('nps')) {
      return "This portal is customized exclusively for National Public School Kengeri Year 2026 Student Council Elections.";
    }

    // Default response
    return "I appreciate your response. I am continuously learning election guidelines. Please enter a question regarding voting steps, candidate lists, or secure ledger configurations.";
  };

  const selectQuickQuestion = (qn: string) => {
    setInputVal(qn);
  };

  return (
    <>
      {/* Floating interactive bot avatar */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setHasUnread(false);
        }}
        className="fixed bottom-6 right-6 z-40 bg-zinc-950/90 hover:bg-black text-[#EFF4FF] hover:text-neon border border-white/10 hover:border-neon/40 h-14 w-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.6)] cursor-pointer transition-all duration-350"
        id="orbis-assistant-trigger"
        title="Ask Orbis Assistant"
      >
        <div className="relative">
          <Bot className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-neon rounded-full border border-zinc-950 flex items-center justify-center" id="orbis-unread-indicator">
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" />
            </span>
          )}
        </div>
      </button>

      {/* Expanded Floating Chat Panel */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-50 w-[350px] sm:w-[390px] h-[500px] bg-zinc-950/95 border border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          id="orbis-assistant-panel"
        >
          {/* Header */}
          <div className="bg-zinc-900 border-b border-white/5 py-3.5 px-4 flex items-center justify-between" id="ob-header">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neon/10 border border-neon/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-neon" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#EFF4FF]">ORBIS_ASSISTANT</h3>
                <p className="text-[9px] font-mono text-zinc-500 uppercase">Interactive Digital Helper • Online</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              id="ob-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroller */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs"
            id="ob-scroller"
          >
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`flex flex-col max-w-[85%] ${m.sender === 'user' ? 'self-end bg-teal-500/10 text-teal-300 border border-teal-500/20' : 'self-start bg-zinc-900/80 text-zinc-300 border border-white/5'} p-3 rounded-xl`}
              >
                <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase tracking-wider">
                  {m.sender === 'user' ? (voter?.admissionNo || 'Voter') : 'ORBIS'} • {m.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <p className="whitespace-pre-line leading-relaxed font-sans">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Quick FAQ Helpers */}
          <div className="px-4 py-2 border-t border-white/5 bg-zinc-900/30" id="ob-quick-pills">
            <p className="text-[9px] font-mono text-zinc-500 uppercase mb-1.5 tracking-widest flex items-center gap-1">
              <Info className="w-3 h-3 text-neon" /> Quick Topics
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button 
                onClick={() => selectQuickQuestion("How do I cast my school vote?")}
                className="text-[9px] font-mono bg-zinc-900 hover:bg-neon/10 border border-white/5 hover:border-neon/20 px-2.5 py-1 rounded text-zinc-400 hover:text-[#EFF4FF] transition-all cursor-pointer uppercase"
              >
                How to Vote
              </button>
              <button 
                onClick={() => selectQuickQuestion("Who is Elena Rostova?")}
                className="text-[9px] font-mono bg-zinc-900 hover:bg-neon/10 border border-white/5 hover:border-neon/20 px-2.5 py-1 rounded text-zinc-400 hover:text-[#EFF4FF] transition-all cursor-pointer uppercase"
              >
                Elena Rostova
              </button>
              <button 
                onClick={() => selectQuickQuestion("Is this voting ledger secure?")}
                className="text-[9px] font-mono bg-zinc-900 hover:bg-neon/10 border border-white/5 hover:border-neon/20 px-2.5 py-1 rounded text-zinc-400 hover:text-[#EFF4FF] transition-all cursor-pointer uppercase"
              >
                Security & ledger
              </button>
            </div>
          </div>

          {/* Chat Form Input */}
          <form 
            onSubmit={handleSendMessage} 
            className="p-3 border-t border-white/5 bg-zinc-900 flex items-center gap-2"
            id="ob-form"
          >
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask Orbis secure helper..."
              className="flex-1 bg-black text-white text-xs border border-white/5 focus:border-neon/40 px-3 py-2 rounded-lg font-mono placeholder-zinc-600 focus:outline-none"
              id="ob-input"
            />
            <button
              type="submit"
              className="bg-neon/10 hover:bg-neon hover:text-black border border-neon/20 hover:border-neon/30 text-neon p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
              id="ob-submit"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
