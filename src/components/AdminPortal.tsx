import React, { useState } from 'react';
import { Candidate, PostDefinition, Voter } from '../types';
import { DEFAULT_POSTS, generateHologramAvatar, HOUSE_COLORS } from '../data/mockData';
import { derivePinForVoter, generateTrulyRandomPin, sha256Sync } from '../utils/cryptoUtils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Lock, 
  Unlock, 
  Plus, 
  Check, 
  RefreshCw, 
  Home, 
  Image as ImageIcon,
  CheckCircle,
  FileText,
  Clock,
  Download,
  Edit2,
  Save,
  X,
  Grid,
  Upload,
  Search,
  Eye,
  EyeOff,
  FileSpreadsheet,
  GraduationCap
} from 'lucide-react';

interface AdminPortalProps {
  candidates: Candidate[];
  voters: Voter[];
  posts: PostDefinition[];
  isOpen: boolean;
  onToggleElection: (open: boolean) => void;
  onAddCandidate: (candidate: Omit<Candidate, 'id' | 'votes'>) => void;
  onUpdateCandidate: (candidate: Candidate) => void;
  onSavePost: (post: PostDefinition) => Promise<void>;
  onDeletePost: (id: string) => Promise<void>;
  onDeleteCandidate: (id: string) => void;
  onResetVotes: () => void;
  onResetVoters: () => void;
  onUpdateVoters: (newVoters: Voter[]) => void;
  onExit: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  candidates,
  voters,
  posts,
  isOpen,
  onToggleElection,
  onAddCandidate,
  onUpdateCandidate,
  onSavePost,
  onDeletePost,
  onDeleteCandidate,
  onResetVotes,
  onResetVoters,
  onUpdateVoters,
  onExit,
}) => {
  // CRUD states
  const [activeTab, setActiveTab] = useState<'analytics' | 'candidates' | 'posts' | 'voters' | 'teachers'>('analytics');
  
  // Teachers Directory states
  const [teachersCount, setTeachersCount] = useState<number>(150);
  const [isGeneratingTeachers, setIsGeneratingTeachers] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teachersSuccess, setTeachersSuccess] = useState<string | null>(null);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  // Voter CSV and directory search states
  const [voterSearch, setVoterSearch] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  const togglePinReveal = (admissionNo: string) => {
    setRevealedPins(prev => ({
      ...prev,
      [admissionNo]: !prev[admissionNo]
    }));
  };

  const handleCsvUpload = async (file: File) => {
    if (!file) return;
    setCsvError(null);
    setCsvSuccess(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setCsvError("Unable to read the uploaded CSV file.");
          return;
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          setCsvError("CSV file must contain a header row and at least one student row.");
          return;
        }

        // Parse headers index
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
        
        let indexAdmission = headers.findIndex(h => h.includes('admission') || h.includes('no.') || h.includes('no') || h.includes('id'));
        let indexName = headers.findIndex(h => h.includes('name'));
        let indexGrade = headers.findIndex(h => h.includes('grade') || h.includes('class'));
        let indexHouse = headers.findIndex(h => h.includes('house'));

        // Fallback default indexing if we couldn't match some headers
        if (indexAdmission === -1) indexAdmission = 0;
        if (indexName === -1) indexName = 1;
        if (indexGrade === -1) indexGrade = 2;
        if (indexHouse === -1) indexHouse = 3;

        const newVoters: Voter[] = [];
        const plainManifest: { admissionNo: string, plaintextPin: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue; // Skip empty lines

          // Parsing comma-delimited row respects quotes safely
          const cols: string[] = [];
          let currentVal = '';
          let insideQuotes = false;
          for (let k = 0; k < line.length; k++) {
            const char = line[k];
            if (char === '"' || char === "'") {
              insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
              cols.push(currentVal.trim().replace(/^["']|["']$/g, ''));
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          cols.push(currentVal.trim().replace(/^["']|["']$/g, ''));

          const admissionNoRaw = cols[indexAdmission];
          if (!admissionNoRaw) continue;

          const admissionNo = admissionNoRaw.trim();
          const name = cols[indexName] || 'Student';
          const grade = cols[indexGrade] || '12';
          const houseRaw = cols[indexHouse] || 'Blue';

          // Robust house normalizer
          let normalizedHouse = houseRaw.trim();
          const houseLC = normalizedHouse.toLowerCase();
          if (houseLC.includes('nicon') || houseLC === 'blue') {
            normalizedHouse = 'Blue';
          } else if (houseLC.includes('maxims') || houseLC === 'green') {
            normalizedHouse = 'Green';
          } else if (houseLC.includes('pericles') || houseLC === 'yellow') {
            normalizedHouse = 'Yellow';
          } else if (houseLC.includes('regulus') || houseLC === 'red') {
            normalizedHouse = 'Red';
          } else {
            // Capitalize first letter
            normalizedHouse = normalizedHouse.charAt(0).toUpperCase() + normalizedHouse.slice(1);
          }

          // Generate secure password PIN
          const plaintextPin = generateTrulyRandomPin();
          const hashedPin = sha256Sync(plaintextPin);

          newVoters.push({
            admissionNo,
            name,
            grade,
            house: normalizedHouse,
            pin: hashedPin,
            hasVoted: false
          });

          plainManifest.push({
            admissionNo,
            plaintextPin
          });
        }

        if (newVoters.length === 0) {
          setCsvError("No valid rows containing student data could be parsed.");
          return;
        }

        // Send new voters to trigger database updates
        onUpdateVoters(newVoters);

        // Put in localStorage plain_manifest to read plain pins back online in directory
        const currentSavedManifest = localStorage.getItem('elec_admin_plain_manifest');
        let currentArr = [];
        if (currentSavedManifest) {
          try {
            currentArr = JSON.parse(currentSavedManifest);
          } catch(e) {}
        }
        // Merge or replace
        const mergedManifest = [...plainManifest, ...currentArr.filter((existing: any) => !plainManifest.some(n => n.admissionNo === existing.admissionNo))];
        localStorage.setItem('elec_admin_plain_manifest', JSON.stringify(mergedManifest));

        setCsvSuccess(`Successfully loaded ${newVoters.length} student records into the security system. Hashed voter directory updated in browser and synchronized serverless and on Firebase Cloud!`);

        // Force reset votes if roster updated
        onResetVotes();

        // Download Excel/CSV containing only IDs, Names, and generated PIN passwords
        let csvContent = '"Login ID","Name","Password"\n';
        newVoters.forEach((v, index) => {
          const pin = plainManifest[index].plaintextPin;
          csvContent += `"${v.admissionNo}","${v.name}","${pin}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `NPS_KENGERI_STUDENTS_PASSWORDS_${newVoters.length}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

      } catch (err: any) {
        setCsvError(`CSV parse failed: ${err.message || err}`);
      }
    };
    reader.readAsText(file);
  };

  const [fullName, setFullName] = useState('');
  const [house, setHouse] = useState<'Red' | 'Blue' | 'Green' | 'Yellow'>('Yellow');
  const [post, setPost] = useState(posts[0]?.id || 'head_boy');
  const [customPostText, setCustomPostText] = useState('');
  const [motto, setMotto] = useState('');
  const [customPhotoBase64, setCustomPhotoBase64] = useState<string | null>(null);
  const [isPhotoMode, setIsPhotoMode] = useState<'hologram' | 'upload'>('hologram');
  const [addSuccessMessage, setAddSuccessMessage] = useState(false);
  const [selectedPostTab, setSelectedPostTab] = useState<string>('all');

  // Editing candidate states
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editHouse, setEditHouse] = useState<'Red' | 'Blue' | 'Green' | 'Yellow'>('Yellow');
  const [editPost, setEditPost] = useState('');
  const [editCustomPostText, setEditCustomPostText] = useState('');
  const [editIsPhotoMode, setEditIsPhotoMode] = useState<'hologram' | 'upload'>('hologram');
  const [editCustomPhotoBase64, setEditCustomPhotoBase64] = useState<string | null>(null);

  // File drag-and-drop feedback
  const [isDragging, setIsDragging] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);

  // Post management states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [postCategory, setPostCategory] = useState<'Junior' | 'Senior' | 'Universal'>('Universal');
  const [postEligibleGrades, setPostEligibleGrades] = useState<string[]>([]);
  const [postEligibleHouses, setPostEligibleHouses] = useState<string[]>([]);
  const [postSuccessMessage, setPostSuccessMessage] = useState<string | null>(null);

  // Calculate stats
  const totalStudents = voters.filter(v => !v.admissionNo.startsWith('TR-')).length;
  const votedCount = voters.filter(v => !v.admissionNo.startsWith('TR-') && v.hasVoted).length;
  const turnoutPercent = totalStudents > 0 ? Math.round((votedCount / totalStudents) * 100) : 0;

  const handleExportExcel = () => {
    // Generate CSV representing election results
    let csvContent = 'Category,Post,Candidate ID,Candidate Name,House,Votes\n';
    
    // Sort so Seniors are listed first, then Juniors, grouped by post
    const sortedCands = [...candidates].sort((a, b) => {
      const isJuniorA = !!a.isJunior;
      const isJuniorB = !!b.isJunior;
      if (isJuniorA !== isJuniorB) {
        return isJuniorA ? 1 : -1; // Seniors first, then Juniors
      }
      return (a.post || '').localeCompare(b.post || '');
    });

    sortedCands.forEach((cand) => {
      const postName = posts.find((p) => p.id === cand.post)?.title || cand.post;
      const category = cand.isJunior ? 'Junior' : 'Senior';
      const escapedCategory = `"${category}"`;
      const escapedPost = `"${postName.replace(/"/g, '""')}"`;
      const escapedName = `"${cand.fullName.replace(/"/g, '""')}"`;
      csvContent += `${escapedCategory},${escapedPost},${cand.id.toUpperCase()},${escapedName},${cand.house},${cand.votes}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'NPS_KENGERI_ELECTION_RESULTS_ALL.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportVotersExcel = () => {
    // Reconstruct plain PINs from secure memory store
    const saved = localStorage.getItem('elec_admin_plain_manifest');
    let plainMap: Record<string, string> = {};
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.admissionNo && item.plaintextPin) {
              plainMap[item.admissionNo] = item.plaintextPin;
            }
          });
        }
      } catch (e) {
        // Fall back to deriving
      }
    }

    // Generate CSV representing the voter registrations containing exactly Login ID, Name, and Password
    let csvContent = '"Login ID","Name","Password"\n';
    
    voters.forEach((voter) => {
      if (voter.admissionNo.startsWith('TR-')) return;
      // Reconstruct or fallback to deterministic
      const plaintextPin = plainMap[voter.admissionNo] || derivePinForVoter(voter.admissionNo);
      csvContent += `"${voter.admissionNo}","${voter.name || 'Anonymous Student'}","${plaintextPin}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'NPS_KENGERI_STUDENTS_PASSWORDS.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportTeachersExcel = () => {
    // Generate CSV representing the teacher registrations
    let csvContent = '"Teacher ID","Secure Access PIN (Plaintext)","Participation Status","SHA-256 Code Hash","Voted Timestamp"\n';
    
    // Dynamically retrieve all voters with 'TR-' prefix
    const teacherVoters = voters
      .filter(v => v.admissionNo.startsWith('TR-'))
      .sort((a, b) => {
        const numA = parseInt(a.admissionNo.replace('TR-', ''), 10) || 0;
        const numB = parseInt(b.admissionNo.replace('TR-', ''), 10) || 0;
        return numA - numB;
      });

    teacherVoters.forEach(voter => {
      const plaintextPin = derivePinForVoter(voter.admissionNo);
      const statusLabel = voter.hasVoted ? 'BALLOT CAST' : 'PENDING';
      const timestamp = voter.votedAt ? voter.votedAt : 'N/A';
      csvContent += `"${voter.admissionNo}","${plaintextPin}","${statusLabel}","${voter.pin}","${timestamp}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'NPS_KENGERI_TEACHERS_TR_PINS_MASTER.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateAndDownloadTeachers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teachersCount || teachersCount <= 0) {
      setTeachersError('Please specify a positive number of teacher accounts to generate.');
      return;
    }

    setIsGeneratingTeachers(true);
    setTeachersSuccess(null);
    setTeachersError(null);

    try {
      const res = await fetch('/api/generate-teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: teachersCount })
      });
      const data = await res.json();
      if (data.success && data.state?.voters) {
        onUpdateVoters(data.state.voters);
        setTeachersSuccess(`SUCCESSFULLY INITIATED & SYNCHRONIZED ${teachersCount} TEACHER ACCOUNTS.`);
        
        // Let state settle, then download automatically
        setTimeout(() => {
          // Dynamic export of teachers from state
          let csvTemp = '"Teacher ID","Secure Access PIN (Plaintext)","Participation Status","SHA-256 Code Hash","Voted Timestamp"\n';
          const freshTeacherVoters = data.state.voters
            .filter((v: any) => v.admissionNo.startsWith('TR-'))
            .sort((a: any, b: any) => {
              const numA = parseInt(a.admissionNo.replace('TR-', ''), 10) || 0;
              const numB = parseInt(b.admissionNo.replace('TR-', ''), 10) || 0;
              return numA - numB;
            });

          freshTeacherVoters.forEach((voter: any) => {
            const plaintextPin = derivePinForVoter(voter.admissionNo);
            const statusLabel = voter.hasVoted ? 'BALLOT CAST' : 'PENDING';
            const timestamp = voter.votedAt ? voter.votedAt : 'N/A';
            csvTemp += `"${voter.admissionNo}","${plaintextPin}","${statusLabel}","${voter.pin}","${timestamp}"\n`;
          });

          const blob = new Blob([csvTemp], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `NPS_KENGERI_TEACHERS_${teachersCount}_PINS.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 300);

      } else {
        setTeachersError(data.error || 'Failed to sync teachers to cloud database.');
      }
    } catch (err: any) {
      console.error(err);
      setTeachersError(err.message || 'Error occurred while contacting system backend.');
    } finally {
      setIsGeneratingTeachers(false);
    }
  };

  /*
  const handleGenerateAndRotateAllVoters = () => {
    if (!confirm('CRITICAL SECURITY ACTION:\n\nThis will completely rotate/regenerate unique IDs and random PINs (8-9 chars with symbols) for all 500 NPS Kengeri students. All existing voting statuses will be wiped, and new high-entropy SHA-256 credentials will be permanently issued.\n\nAre you absolutely sure you want to perform this rotation?')) {
      return;
    }

    const newVoters: Voter[] = [];
    const plainManifest: { admissionNo: string, plaintextPin: string }[] = [];

    for (let i = 1001; i <= 1500; i++) {
      const admissionNo = `SD-${i}`;
      const plaintextPin = generateTrulyRandomPin();
      const hashedPin = sha256Sync(plaintextPin);

      newVoters.push({
        admissionNo,
        pin: hashedPin,
        hasVoted: false,
      });

      plainManifest.push({
        admissionNo,
        plaintextPin,
      });
    }

    // Persist to parent context state and local storage
    onUpdateVoters(newVoters);
    localStorage.setItem('elec_admin_plain_manifest', JSON.stringify(plainManifest));

    // Force clear results of candidates as credentials rotated!
    onResetVotes();

    alert('Security Rotation Successful!\n\n500 new student IDs (SD-1001 to SD-1500) and truly random 8-9 digit alphanumeric PINs have been generated. The plaintext credentials excel download will start automatically.');

    // Automatically trigger CSV download of the newly generated credentials
    let csvContent = '"Voter ID","Secure Access PIN (Plaintext)","SHA-256 Code Hash","Status"\n';
    
    plainManifest.forEach((item, index) => {
      const hash = newVoters[index].pin;
      csvContent += `"${item.admissionNo}","${item.plaintextPin}","${hash}","PENDING"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'NPS_KENGERI_TRULY_RANDOM_VOTERS_PINS_MASTER_500.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
*/

  // Handle local photo parsing
  const handlePhotoUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setCustomPhotoBase64(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditPhotoUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        setEditCustomPhotoBase64(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoUpload(e.dataTransfer.files[0]);
    }
  };

  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsEditDragging(true);
  };

  const handleEditDragLeave = () => {
    setIsEditDragging(false);
  };

  const handleEditDrop = (e: React.DragEvent, candId: string) => {
    e.preventDefault();
    setIsEditDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleEditPhotoUpload(e.dataTransfer.files[0]);
    }
  };

  // Submit new candidate
  const handleSubmitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    let finalPostId = post;
    if (post === '__CUSTOM__') {
      if (!customPostText.trim()) return;
      const slug = customPostText.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
      await onSavePost({
        id: slug,
        title: customPostText.trim(),
        description: `Student leadership representatives for ${customPostText.trim()} council positions.`,
        category: 'Universal',
        eligibleGrades: [],
        eligibleHouses: []
      });
      finalPostId = slug;
    }

    const targetPost = posts.find((p) => p.id === finalPostId);
    const isJuniorContext = targetPost ? targetPost.category === 'Junior' : false;

    const currentPostCandidates = candidates.filter((c) => c.post === finalPostId);
    if (currentPostCandidates.length >= 4) {
      alert(`The category "${posts.find(p => p.id === finalPostId)?.title || customPostText}" already has the maximum limit of 4 candidates.`);
      return;
    }

    let finalPhoto = '';
    if (isPhotoMode === 'upload' && customPhotoBase64) {
      finalPhoto = customPhotoBase64;
    } else {
      // Generate clean vector holographic avatar
      finalPhoto = generateHologramAvatar(fullName.trim(), house);
    }

    onAddCandidate({
      fullName: fullName.trim(),
      house,
      post: finalPostId,
      photo: finalPhoto,
      motto: '',
      isJunior: isJuniorContext
    });

    // Reset fields
    setFullName('');
    setMotto('');
    setCustomPostText('');
    setCustomPhotoBase64(null);
    setAddSuccessMessage(true);
    setTimeout(() => setAddSuccessMessage(false), 3000);
  };

  const startEditingCandidate = (cand: Candidate) => {
    setEditingCandidateId(cand.id);
    setEditFullName(cand.fullName);
    setEditHouse(cand.house);
    setEditPost(cand.post);
    setEditCustomPostText('');
    setEditIsPhotoMode('hologram');
    setEditCustomPhotoBase64(null);
  };

  const handleSaveEditCandidate = async (originalCand: Candidate) => {
    if (!editFullName.trim()) return;

    let finalPostId = editPost;
    if (editPost === '__CUSTOM__') {
      if (!editCustomPostText.trim()) return;
      const slug = editCustomPostText.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
      await onSavePost({
        id: slug,
        title: editCustomPostText.trim(),
        description: `Student leadership representatives for ${editCustomPostText.trim()} council positions.`,
        category: 'Universal',
        eligibleGrades: [],
        eligibleHouses: []
      });
      finalPostId = slug;
    }

    const targetPost = posts.find((p) => p.id === finalPostId);
    const isJuniorContext = targetPost ? targetPost.category === 'Junior' : false;

    if (finalPostId !== originalCand.post) {
      const currentPostCandidates = candidates.filter((c) => c.post === finalPostId);
      if (currentPostCandidates.length >= 4) {
        alert(`The category "${posts.find(p => p.id === finalPostId)?.title || editCustomPostText}" already has the maximum limit of 4 candidates.`);
        return;
      }
    }

    let finalPhoto = originalCand.photo;
    if (editIsPhotoMode === 'upload' && editCustomPhotoBase64) {
      finalPhoto = editCustomPhotoBase64;
    } else if (editIsPhotoMode === 'hologram') {
      finalPhoto = generateHologramAvatar(editFullName.trim(), editHouse);
    }

    onUpdateCandidate({
      ...originalCand,
      fullName: editFullName.trim(),
      house: editHouse,
      post: finalPostId,
      photo: finalPhoto,
      isJunior: activeTab === 'junior_candidates'
    });

    // Reset editing
    setEditingCandidateId(null);
    setEditCustomPhotoBase64(null);
  };

  // Compute votes per candidate per post for Analytics
  const filterCandidatesByPost = (postId: string) => {
    return candidates
      .filter(c => c.post === postId)
      .sort((a, b) => b.votes - a.votes);
  };

  // Save post form submit
  const handleSavePostForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim()) return;
    const slug = editingPostId || postTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');
    await onSavePost({
      id: slug,
      title: postTitle.trim(),
      description: postDescription.trim() || `Student leadership representatives for ${postTitle.trim()} council positions.`,
      category: postCategory,
      eligibleGrades: postEligibleGrades,
      eligibleHouses: postEligibleHouses
    });
    setPostSuccessMessage(editingPostId ? 'POST UPDATED SUCCESSFULLY' : 'POST CREATED SUCCESSFULLY');
    setTimeout(() => setPostSuccessMessage(null), 3000);
    
    // Reset form
    setEditingPostId(null);
    setPostTitle('');
    setPostDescription('');
    setPostCategory('Universal');
    setPostEligibleGrades([]);
    setPostEligibleHouses([]);
  };

  const handleStartEditPost = (p: PostDefinition) => {
    setEditingPostId(p.id);
    setPostTitle(p.title);
    setPostDescription(p.description);
    setPostCategory(p.category || 'Universal');
    setPostEligibleGrades(p.eligibleGrades || []);
    setPostEligibleHouses(p.eligibleHouses || []);
  };

  return (
    <div className="w-full text-zinc-100 min-h-screen pb-20 px-4 md:px-8 mt-4" id="admin-portal-root">
      
      {/* Header telemetry ribbon */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8" id="admin-hdr">
        <div>
          <div className="flex items-center gap-2 mb-1" id="admin-hl">
            <span className="w-2 h-2 rounded-full bg-magenta-500 animate-ping" />
            <h1 className="text-2xl font-bold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-magenta-400">
              ELECTION MASTER CONSOLE
            </h1>
          </div>
          <p className="text-xs text-zinc-500 font-mono tracking-wider uppercase">
            SECURE ACCESS AUTHORIZED • ROLE ID: SCHOOL_TEACHER_ADMIN
          </p>
        </div>

        <div className="flex items-center gap-4" id="admin-sys-actions">
          {/* Main system toggle */}
          <button
            onClick={() => onToggleElection(!isOpen)}
            className={`flex items-center gap-3 px-5 py-2 rounded-xl text-xs font-mono font-bold tracking-wider transition-all border 
              ${isOpen 
                ? 'bg-teal-900/40 text-teal-400 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.15)]' 
                : 'bg-red-950/40 text-red-400 border-red-500/50'
              }
            `}
            id="admin-election-toggle-btn"
          >
            {isOpen ? (
              <>
                <Unlock className="w-4 h-4 text-teal-400 animate-pulse" />
                VOTING_WINDOW: OPEN
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-red-400" />
                VOTING_WINDOW: CLOSED
              </>
            )}
          </button>

          {/* Home Portal Button */}
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl text-xs font-mono tracking-wider transition-all text-zinc-400 hover:text-white"
            id="admin-logout-btn"
          >
            <Home className="w-4 h-4" />
            EXIT_CONSOLE
          </button>
        </div>
      </div>

       <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8" id="admin-main-grid">
         {/* Navigation Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-2" id="admin-sidebar">
          <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest px-3 mb-1">CONSOLE SECTIONS</p>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono tracking-wider transition-all font-medium text-left
              ${activeTab === 'analytics' 
                ? 'bg-zinc-800 text-teal-400 border-l-4 border-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }
            `}
            id="tab-analytics"
          >
            <TrendingUp className="w-4 h-4" />
            Live Analytics
          </button>

          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono tracking-wider transition-all font-medium text-left
              ${activeTab === 'candidates' 
                ? 'bg-zinc-800 text-teal-400 border-l-4 border-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }
            `}
            id="tab-cand"
          >
            <Users className="w-4 h-4" />
            Candidates DB
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono tracking-wider transition-all font-medium text-left
              ${activeTab === 'posts' 
                ? 'bg-zinc-800 text-teal-400 border-l-4 border-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }
            `}
            id="tab-posts"
          >
            <Grid className="w-4 h-4" />
            Election Posts
          </button>

          <button
            onClick={() => setActiveTab('voters')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono tracking-wider transition-all font-medium text-left
              ${activeTab === 'voters' 
                ? 'bg-zinc-800 text-teal-400 border-l-4 border-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }
            `}
            id="tab-voters"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Student Directory
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono tracking-wider transition-all font-medium text-left
              ${activeTab === 'teachers' 
                ? 'bg-zinc-800 text-teal-400 border-l-4 border-teal-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }
            `}
            id="tab-teachers"
          >
            <GraduationCap className="w-4 h-4" />
            Teachers Directory
          </button>

        </div>

        {/* Content Panel */}
        <div className="lg:col-span-3 bg-zinc-900/30 border border-white/10 rounded-2xl p-6 backdrop-blur-md relative" id="admin-detail-panel">
          
          <AnimatePresence mode="wait">
            
            {/* Live Analytics Tab */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-8"
                id="analytics-view"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950/20 border border-white/5 p-4 rounded-xl" id="analytics-header">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-teal-400" />
                      Real-Time Dashboard
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Real-time vote counting and leadership tabulations. Securely computed.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5 shrink-0" id="live-override-controls">
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center gap-2 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 font-mono text-[11px] py-1.5 px-3 rounded-lg border border-emerald-500/20 transition-all font-semibold uppercase"
                      id="export-excel-btn"
                    >
                      <Download className="w-3.5 h-3.5" />
                      EXPORT EXCEL OF RESULT
                    </button>
                  </div>
                </div>

                {/* Grid of Results per Post */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="dashboard-posts-grid">
                  {posts.map((post) => {
                    const postCandidates = filterCandidatesByPost(post.id);
                    const totalVotesForPost = postCandidates.reduce((sum, c) => sum + c.votes, 0);
                    const leadingCandidate = postCandidates[0];

                    return (
                      <div key={post.id} className="bg-black/40 rounded-xl p-5 border border-white/5 flex flex-col gap-4 relative" id={`post-res-${post.id}`}>
                        <div className="flex justify-between items-start border-b border-white/5 pb-2" id={`post-res-hdr-${post.id}`}>
                          <div>
                            <h3 className="text-sm font-bold font-mono text-teal-400 tracking-wider uppercase">{post.title}</h3>
                            <p className="text-[10px] text-zinc-400">{post.description.split('.')[0]}</p>
                          </div>
                          <span className="text-xs text-zinc-500 font-mono bg-zinc-800/60 px-2 py-0.5 rounded font-bold">
                            {totalVotesForPost} V
                          </span>
                        </div>

                        {postCandidates.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic py-6 text-center">No candidates defined for this post.</p>
                        ) : (
                          <div className="flex flex-col gap-3.5" id={`post-candidates-res-${post.id}`}>
                            {postCandidates.map((c, idx) => {
                              const voteShare = totalVotesForPost > 0 ? Math.round((c.votes / totalVotesForPost) * 100) : 0;
                              const colors = HOUSE_COLORS[c.house] || HOUSE_COLORS.Blue;
                              const isWinner = idx === 0 && c.votes > 0;

                              return (
                                <div key={c.id} className="flex flex-col gap-1.5" id={`cand-row-${c.id}`}>
                                  <div className="flex justify-between text-xs font-mono" id={`cand-det-${c.id}`}>
                                    <span className="flex items-center gap-1.5 font-sans font-medium text-zinc-200">
                                      <span
                                        style={{ backgroundColor: colors.primary }}
                                        className="w-2.5 h-2.5 rounded-full"
                                      />
                                      {c.fullName}
                                      {isWinner && (
                                        <span className="text-[9px] font-mono bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.2 rounded font-bold uppercase tracking-wider">
                                          LEADER
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-zinc-300 font-bold font-mono">
                                      {c.votes} votes <span className="text-zinc-500">({voteShare}%)</span>
                                    </span>
                                  </div>
                                  
                                  {/* Glassmorphic progress bar */}
                                  <div className="w-full h-2 bg-zinc-950/60 rounded-full overflow-hidden border border-white/5" id={`bar-bg-${c.id}`}>
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${voteShare}%` }}
                                      transition={{ duration: 1, ease: 'easeOut' }}
                                      style={{
                                        background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                                        boxShadow: `0 0 10px ${colors.shadow}`,
                                      }}
                                      className="h-full rounded-full"
                                      id={`bar-fill-${c.id}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Candidates Database Tab */}
            {activeTab === 'candidates' && (
              <motion.div
                key="candidates-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-12"
                id="candidates-view"
              >
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-teal-400" />
                        Candidate Database
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Register, modify, or remove student candidates representing high school Houses.
                    </p>
                  </div>
                </div>

                {/* CRUD Form */}
                <form onSubmit={handleSubmitCandidate} className="bg-black/30 border border-white/5 p-5 rounded-2xl flex flex-col gap-5 relative" id="add-candidate-form">
                  <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5" /> REGISTER NEW CANDIDATE
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="form-grid">
                    <div className="flex flex-col gap-1.5" id="form-inp-name">
                      <label className="text-xs text-zinc-400 font-mono">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Katherine Johnson"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-sans"
                        id="c-name"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5" id="form-inp-house">
                      <label className="text-xs text-zinc-400 font-mono">Assigned House</label>
                      <select
                        value={house}
                        onChange={(e) => setHouse(e.target.value as any)}
                        className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono"
                        id="c-house"
                      >
                        <option value="Green">Maxims</option>
                        <option value="Blue">Nicon</option>
                        <option value="Red">Regulus</option>
                        <option value="Yellow">Pericles</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5 md:col-span-2" id="form-inp-post">
                      <label className="text-xs text-zinc-400 font-mono">Election Post Category</label>
                      <select
                        value={post}
                        onChange={(e) => setPost(e.target.value)}
                        className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono"
                        required
                      >
                        <option value="" disabled>Select a Post...</option>
                        {posts.map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5" id="form-inp-avatar">
                      <label className="text-xs text-zinc-400 font-mono font-bold flex items-center justify-between">
                        <span>Profile Graphic Mode</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPhotoMode('hologram')}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-all
                              ${isPhotoMode === 'hologram' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-500 hover:text-zinc-300'}
                            `}
                          >
                            Hologram System
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsPhotoMode('upload')}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider transition-all
                              ${isPhotoMode === 'upload' ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-zinc-500 hover:text-zinc-300'}
                            `}
                          >
                            Upload File
                          </button>
                        </div>
                      </label>

                      {isPhotoMode === 'hologram' ? (
                        <div className="bg-zinc-950 border border-dashed border-white/10 rounded-xl p-3 text-center text-xs text-zinc-400 flex items-center justify-center h-[42px] font-mono">
                          Auto-Generates geometric vector artwork.
                        </div>
                      ) : (
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-xl px-4 py-1 flex items-center justify-between gap-3 text-xs transition-all cursor-pointer h-[42px]
                            ${isDragging ? 'border-teal-500 bg-teal-500/5' : customPhotoBase64 ? 'border-teal-500/40 bg-teal-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/2'}
                          `}
                          id={`upload-box-c`}
                        >
                          <label className="flex items-center gap-2 cursor-pointer w-full justify-between">
                            <span className="flex items-center gap-1.5 text-zinc-400 select-none truncate">
                              <ImageIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                              {customPhotoBase64 ? 'Image loaded successfully' : 'Drag & drop photo or click'}
                            </span>
                            <span className="text-[9px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded select-none uppercase shrink-0">
                              Choose File
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handlePhotoUpload(e.target.files[0]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-2" id="submit-row">
                    <div>
                      {addSuccessMessage && (
                        <span className="text-xs text-teal-400 font-mono flex items-center gap-1.5 py-1">
                          <CheckCircle className="w-4 h-4" /> CANDIDATE REGISTERED SUCCESSFULLY
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-black font-semibold text-xs font-mono py-2.5 px-6 rounded-xl hover:opacity-90 active:scale-95 transition-all uppercase tracking-wider"
                      id="c-register-btn"
                    >
                      <Plus className="w-4 h-4" /> ADD_CANDIDATE
                    </button>
                  </div>
                </form>
                </div>

                {/* Candidate list roster per post */}
                <div className="flex flex-col gap-4" id="candidates-grid-wrapper">
                  <div className="flex justify-between items-end border-b border-white/10 pb-2">
                    <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest px-1">
                      ACTIVE CANDIDATES DIRECTORY
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-8" id="candidates-roster">
                    {posts.map((rPost) => {
                      const postCands = candidates.filter(c => c.post === rPost.id);
                      if (postCands.length === 0) {
                        return (
                          <div key={rPost.id} className="flex flex-col gap-4">
                            <h3 className="text-xs text-teal-400 font-mono uppercase tracking-widest font-bold border-b border-white/5 pb-2">{rPost.title}</h3>
                            <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-8 text-center text-sm text-zinc-500 italic">
                              No candidates are currently registered for this post.
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={rPost.id} className="flex flex-col gap-4">
                          <h3 className="text-xs text-teal-400 font-mono uppercase tracking-widest font-bold border-b border-white/5 pb-2">{rPost.title}</h3>
                          <div className="flex flex-col gap-4">
                            {postCands.map((c) => {
                              const colors = HOUSE_COLORS[c.house] || HOUSE_COLORS.Blue;
                              const postTitle = rPost.title;

                              if (editingCandidateId === c.id) {
                        return (
                          <div key={c.id} className="bg-zinc-950/80 border border-teal-500/30 rounded-2xl p-5 flex flex-col gap-4 transition-all shadow-[0_0_15px_rgba(20,184,166,0.05)] md:col-span-1" id={`cand-record-${c.id}`}>
                            <div className="flex flex-col gap-3">
                              {/* Edit Name */}
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Candidate Name</label>
                                <input
                                  type="text"
                                  required
                                  value={editFullName}
                                  onChange={(e) => setEditFullName(e.target.value)}
                                  className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-sans"
                                />
                              </div>

                              {/* Edit House & Post */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">House</label>
                                  <select
                                    value={editHouse}
                                    onChange={(e) => setEditHouse(e.target.value as any)}
                                    className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                                  >
                                    <option value="Green">Maxims</option>
                                    <option value="Blue">Nicon</option>
                                    <option value="Red">Regulus</option>
                                    <option value="Yellow">Pericles</option>
                                  </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Post</label>
                                  <select
                                    value={editPost}
                                    onChange={(e) => {
                                      setEditPost(e.target.value);
                                      if (e.target.value !== '__CUSTOM__') {
                                        setEditCustomPostText('');
                                      }
                                    }}
                                    className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                                  >
                                    {posts.map((p) => (
                                      <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                    <option value="__CUSTOM__">+ Custom Post...</option>
                                  </select>
                                </div>
                              </div>

                              {editPost === '__CUSTOM__' && (
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Typed Custom Post</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Type custom post name..."
                                    value={editCustomPostText}
                                    onChange={(e) => setEditCustomPostText(e.target.value)}
                                    className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500 font-sans"
                                  />
                                </div>
                              )}

                              {/* Edit Avatar mode */}
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider flex justify-between">
                                  <span>Logo Mode</span>
                                  <div className="flex gap-2.5">
                                    <button
                                      type="button"
                                      onClick={() => setEditIsPhotoMode('hologram')}
                                      className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase ${editIsPhotoMode === 'hologram' ? 'text-teal-400 bg-teal-400/10' : 'text-zinc-500'}`}
                                    >
                                      Holo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditIsPhotoMode('upload')}
                                      className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase ${editIsPhotoMode === 'upload' ? 'text-teal-400 bg-teal-400/10' : 'text-zinc-500'}`}
                                    >
                                      Upload
                                    </button>
                                  </div>
                                </span>

                                {editIsPhotoMode === 'upload' && (
                                  <div
                                    onDragOver={handleEditDragOver}
                                    onDragLeave={handleEditDragLeave}
                                    onDrop={(e) => handleEditDrop(e, c.id)}
                                    className={`border border-dashed rounded-xl px-3 py-1.5 text-[10px] text-zinc-400 transition-all flex items-center justify-between cursor-pointer ${isEditDragging ? 'border-teal-500 bg-teal-500/5' : 'border-white/10 hover:border-white/20'}`}
                                  >
                                    <label className="flex items-center justify-between w-full cursor-pointer">
                                      <span className="truncate max-w-[140px]">{editCustomPhotoBase64 ? 'Photo updated' : 'Drop or browse'}</span>
                                      <span className="bg-zinc-800 text-[8px] px-1 py-0.5 rounded uppercase shrink-0">Upload</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handleEditPhotoUpload(e.target.files[0]);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-1 pt-2.5 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => setEditingCandidateId(null)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditCandidate(c)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/35 text-teal-400 hover:text-white rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all font-semibold"
                              >
                                <Save className="w-3.5 h-3.5" /> Save
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={c.id} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex gap-4 items-center justify-between group hover:border-white/10 transition-all" id={`cand-record-${c.id}`}>
                          <div className="flex items-center gap-3.5 overflow-hidden">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-white/10">
                              <img src={c.photo} alt={c.fullName} className="w-full h-full object-cover" />
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="text-sm font-bold text-white truncate">{c.fullName}</h4>
                              <p className="text-[10px] text-zinc-400 font-mono truncate uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                                <span style={{ backgroundColor: colors.primary }} className="w-2 h-2 rounded-full inline-block" />
                                {colors.name} House • {postTitle}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => startEditingCandidate(c)}
                              className="p-2 border border-white/5 bg-zinc-950 text-zinc-400 hover:text-teal-400 hover:border-teal-500/30 rounded-xl transition-all hover:bg-teal-500/5 shrink-0"
                              id={`edit-btn-${c.id}`}
                              title="Edit Candidate Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteCandidate(c.id)}
                              className="p-2 border border-white/5 bg-zinc-950 text-zinc-550 hover:text-red-400 hover:border-red-500/30 rounded-xl transition-all hover:bg-red-500/5 shrink-0"
                              id={`del-btn-${c.id}`}
                              title="Delete Candidate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'posts' && (
              <motion.div
                key="posts-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-12"
                id="posts-view"
              >
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <Grid className="w-5 h-5 text-teal-400" />
                        Election Posts Constructor
                      </h2>
                      <p className="text-xs text-zinc-400">
                        Create and manage custom leadership posts with dynamic eligibility rules for grades and houses.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="posts-main-layout">
                    {/* Left Column: Form Builder */}
                    <form onSubmit={handleSavePostForm} className="bg-black/40 border border-white/5 p-6 rounded-2xl flex flex-col gap-5 relative h-fit" id="post-builder-form">
                      <p className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> {editingPostId ? 'MODIFY EXISTING ELECTION POST' : 'CONSTRUCT NEW ELECTION POST'}
                      </p>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-450 font-mono">Post Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., School Sports Captain"
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value)}
                          className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-450 font-mono">Description / Purpose</label>
                        <textarea
                          placeholder="e.g., Represents school student athletic interests and leads national sports matches."
                          value={postDescription}
                          onChange={(e) => setPostDescription(e.target.value)}
                          className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-sans h-20 resize-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-zinc-450 font-mono">Voter Division (Category Fallback)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Universal', 'Senior', 'Junior'] as const).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setPostCategory(cat);
                                // Auto check standard division as helpful defaults
                                if (cat === 'Junior') {
                                  setPostEligibleGrades(['1', '2', '3', '4', '5']);
                                } else if (cat === 'Senior') {
                                  setPostEligibleGrades(['6', '7', '8', '9', '10', '11', '12']);
                                } else {
                                  setPostEligibleGrades([]);
                                }
                              }}
                              className={`py-2 px-3 text-xs font-mono rounded-lg border font-semibold uppercase tracking-wider transition-all
                                ${postCategory === cat 
                                  ? 'bg-teal-500/25 border-teal-500 text-teal-400' 
                                  : 'bg-zinc-950 border-white/5 text-zinc-400 hover:text-white'
                                }
                              `}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Grades Eligibility */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-zinc-450 font-mono">Eligible Grades (Default: Everyone)</label>
                          <div className="flex gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setPostEligibleGrades(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'])}
                              className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded hover:text-white"
                            >
                              ALL
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostEligibleGrades(['6', '7', '8', '9', '10', '11', '12'])}
                              className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded hover:text-white"
                            >
                              6-12 (SENIOR)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostEligibleGrades(['1', '2', '3', '4', '5'])}
                              className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded hover:text-white"
                            >
                              1-5 (JUNIOR)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostEligibleGrades([])}
                              className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-450 px-1.5 py-0.5 rounded hover:text-white"
                            >
                              CLEAR
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5 bg-zinc-950/80 p-3 rounded-xl border border-white/5">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((g) => {
                            const isSelected = postEligibleGrades.includes(g);
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setPostEligibleGrades(prev => prev.filter(item => item !== g));
                                  } else {
                                    setPostEligibleGrades(prev => [...prev, g]);
                                  }
                                }}
                                className={`py-1 text-xs font-mono font-bold rounded-lg transition-all border
                                  ${isSelected 
                                    ? 'bg-teal-500/10 border-teal-500/40 text-teal-400' 
                                    : 'bg-transparent border-transparent text-zinc-550 hover:text-zinc-200'
                                  }
                                `}
                              >
                                G{g}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Houses Eligibility */}
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs text-zinc-450 font-mono">Eligible Houses (Default: All Houses/Universal)</label>
                          <button
                            type="button"
                            onClick={() => setPostEligibleHouses([])}
                            className="text-[9px] font-mono font-bold bg-zinc-800 text-zinc-450 px-1.5 py-0.5 rounded hover:text-white"
                          >
                            RESET
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2 bg-zinc-950/80 p-3 rounded-xl border border-white/5">
                          {['Red', 'Blue', 'Green', 'Yellow'].map((h) => {
                            const isSelected = postEligibleHouses.includes(h);
                            const houseLabelMap: Record<string, string> = {
                              Red: 'Regulus',
                              Blue: 'Nicon',
                              Green: 'Maxims',
                              Yellow: 'Pericles'
                            };
                            return (
                              <button
                                key={h}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setPostEligibleHouses(prev => prev.filter(item => item !== h));
                                  } else {
                                    setPostEligibleHouses(prev => [...prev, h]);
                                  }
                                }}
                                className={`py-1.5 text-[10px] font-mono font-bold rounded-lg transition-all border uppercase tracking-wider
                                  ${isSelected 
                                    ? 'bg-teal-500/10 border-teal-500/40 text-teal-400' 
                                    : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-200'
                                  }
                                `}
                              >
                                {houseLabelMap[h]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3">
                        <div className="text-xs text-teal-400 font-mono select-none">
                          {postSuccessMessage && <span>✓ {postSuccessMessage}</span>}
                        </div>
                        <div className="flex gap-2">
                          {editingPostId && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(null);
                                setPostTitle('');
                                setPostDescription('');
                                setPostCategory('Universal');
                                setPostEligibleGrades([]);
                                setPostEligibleHouses([]);
                              }}
                              className="px-4 py-2 bg-zinc-800 text-zinc-400 border border-white/5 font-mono text-xs font-semibold rounded-xl hover:text-white active:scale-95 transition-all uppercase tracking-wider"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="submit"
                            className="flex items-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-black font-extrabold text-xs font-mono py-2.5 px-6 rounded-xl hover:opacity-95 active:scale-95 transition-all uppercase tracking-wider"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {editingPostId ? 'UPDATE POST' : 'CREATE POST'}
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Right Column: Registered Posts List */}
                    <div className="flex flex-col gap-4 max-h-[640px] overflow-y-auto pr-1" id="posts-directory">
                      <p className="text-[10px] font-mono text-zinc-550 font-bold uppercase tracking-widest border-b border-white/5 pb-2">
                        REGISTERED ELECTION POSTS DIRECTORY
                      </p>

                      <div className="flex flex-col gap-4">
                        {posts.length === 0 ? (
                          <div className="bg-zinc-950/30 border border-white/5 text-center py-12 rounded-2xl italic text-sm text-zinc-550">
                            No custom or standard election posts constructed yet. Use the form to start.
                          </div>
                        ) : (
                          posts.map((p) => {
                            const isUniversalGrade = !p.eligibleGrades || p.eligibleGrades.length === 0;
                            const isUniversalHouse = !p.eligibleHouses || p.eligibleHouses.length === 0;

                            return (
                              <div key={p.id} className="bg-black/25 border border-white/5 p-4 rounded-xl flex flex-col gap-3 justify-between hover:border-white/10 transition-all">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex justify-between items-start gap-2">
                                    <h4 className="text-sm font-semibold text-white tracking-wide">{p.title}</h4>
                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded font-extrabold uppercase tracking-widest bg-zinc-800 text-teal-400">
                                      {p.category || 'Universal'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5 justify-between items-center text-[10px] font-mono">
                                  <div className="flex flex-col gap-1 text-zinc-500">
                                    <div>
                                      Eligibility: 
                                      {isUniversalGrade ? (
                                        <span className="text-zinc-400 font-bold ml-1">All Grades</span>
                                      ) : (
                                        <span className="text-teal-400/85 font-medium ml-1">
                                          Grades {p.eligibleGrades?.join(', ')}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      Houses: 
                                      {isUniversalHouse ? (
                                        <span className="text-zinc-400 font-bold ml-1">All Houses</span>
                                      ) : (
                                        <span className="text-teal-400/85 font-medium ml-1">
                                          {p.eligibleHouses?.map((h: string) => {
                                            const nameMap: Record<string, string> = {
                                              Red: 'Regulus',
                                              Blue: 'Nicon',
                                              Green: 'Maxims',
                                              Yellow: 'Pericles'
                                            };
                                            return nameMap[h] || h;
                                          }).join(', ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditPost(p)}
                                      className="p-1.5 border border-white/5 bg-zinc-950 text-teal-400 hover:text-white hover:bg-teal-500/10 rounded-lg transition-all"
                                      title="Edit details"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeletePost(p.id)}
                                      className="p-1.5 border border-white/5 bg-zinc-950 text-zinc-550 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                      title="Remove post"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'voters' && (
              <motion.div
                key="voters-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-8"
                id="voters-directory-view"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                      Student Voter Directory
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Upload student spreadsheets, generate secure voter login credentials, and view real-time participation.
                    </p>
                  </div>
                  
                  {voters.length > 0 && (
                    <button
                      onClick={handleExportVotersExcel}
                      className="flex items-center gap-2 bg-teal-950/50 hover:bg-teal-900/60 text-teal-400 font-mono text-[11px] py-2 px-4 rounded-xl border border-teal-500/20 transition-all font-semibold uppercase shrink-0"
                      id="export-voters-btn"
                      title="Download Student IDs and passwords"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD STUDENTS (PASSWORDS)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* CSV Upload widget */}
                  <div className="md:col-span-2 bg-black/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                    <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" /> UPLOAD CSV SPREADSHEET
                    </p>
                    
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleCsvUpload(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3
                        ${isDragging 
                          ? 'border-teal-500 bg-teal-500/5' 
                          : 'border-white/10 bg-zinc-950/20 hover:border-white/20'
                        }
                      `}
                    >
                      <FileSpreadsheet className="w-10 h-10 text-teal-400/80 animate-pulse" />
                      <div>
                        <p className="text-sm font-semibold text-white">Drag & drop your student CSV file</p>
                        <p className="text-xs text-zinc-500 font-mono mt-1">Accepts columns: Admission No., Name, Grade, House</p>
                      </div>
                      
                      <label className="bg-teal-500 hover:bg-teal-400 text-black text-[11px] font-bold font-mono tracking-wider px-5 py-2.5 rounded-xl uppercase transition-all mt-2 cursor-pointer select-none">
                        Browse Files
                        <input
                           type="file"
                           accept=".csv"
                           className="hidden"
                           onChange={(e) => {
                             if (e.target.files && e.target.files[0]) {
                               handleCsvUpload(e.target.files[0]);
                             }
                           }}
                        />
                      </label>
                    </div>

                    {csvError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-xl font-mono">
                        ⚠️ {csvError}
                      </div>
                    )}

                    {csvSuccess && (
                      <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs px-4 py-3 rounded-xl font-mono">
                        ✓ {csvSuccess}
                      </div>
                    )}
                  </div>

                  {/* Template help & statistics card */}
                  <div className="bg-black/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-4 justify-between">
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
                        CSV SCHEMA COMPLIANCE
                      </p>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Upload a standard comma-separated file with these headers:
                      </p>
                      <div className="bg-zinc-950/80 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-teal-400/90 flex flex-col gap-1">
                        <p>Admission No.,Name,Grade,House</p>
                        <p className="text-zinc-500">1849/Add,Rahul,12,Nicon</p>
                        <p className="text-zinc-500">1839/Add,Singh,6,Maxims</p>
                        <p className="text-zinc-500">1249/Add,Kia,10,Pericles</p>
                        <p className="text-zinc-500">1840/Add,Mr,3,Regulus</p>
                      </div>
                      <p className="text-[10px] text-zinc-500 italic">
                        * Houses are automatically normalized to Blue (Nicon), Green (Maxims), Yellow (Pericles), and Red (Regulus). Grades 1-5 are classified as Juniors automatically.
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-zinc-500 font-bold uppercase">ROSTER COMPOSITION</span>
                        <span className="text-teal-400 font-semibold">{totalStudents} Voters</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-zinc-500 font-bold uppercase">PARTICIPATING</span>
                        <span className="text-zinc-350">{votedCount} Voted ({turnoutPercent}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Voter list/directory */}
                <div className="bg-black/30 border border-white/5 rounded-2xl p-6 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
                        STUDENT DIRECTORY REGISTRY ({voters.filter(v => !v.admissionNo.startsWith('TR-')).length} entries)
                      </p>
                    </div>

                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search custom ID / Name / House / Grade..."
                        value={voterSearch}
                        onChange={(e) => setVoterSearch(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/10 hover:border-white/15 focus:border-teal-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* List Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-1">
                    {(() => {
                      const plainSaved = localStorage.getItem('elec_admin_plain_manifest');
                      let plainMap: Record<string, string> = {};
                      if (plainSaved) {
                        try {
                          const parsed = JSON.parse(plainSaved);
                          if (Array.isArray(parsed)) {
                            parsed.forEach((item: any) => {
                              if (item.admissionNo && item.plaintextPin) {
                                plainMap[item.admissionNo] = item.plaintextPin;
                              }
                            });
                          }
                        } catch (e) {}
                      }

                      const filteredVoters = voters
                        .filter(v => !v.admissionNo.startsWith('TR-'))
                        .filter(v => {
                          const q = voterSearch.toLowerCase();
                          return (
                            v.admissionNo.toLowerCase().includes(q) ||
                            (v.name || '').toLowerCase().includes(q) ||
                            (v.house || '').toLowerCase().includes(q) ||
                            (v.grade || '').toLowerCase().includes(q)
                          );
                        });

                      if (filteredVoters.length === 0) {
                        return (
                          <div className="md:col-span-2 text-center py-12 text-zinc-500 italic text-xs font-mono">
                            No students match search query or directory is empty. Build directory by uploading a student CSV.
                          </div>
                        );
                      }

                      return filteredVoters.map((v) => {
                        const isRevealed = !!revealedPins[v.admissionNo];
                        const textPin = plainMap[v.admissionNo] || derivePinForVoter(v.admissionNo); // fallback to deterministic
                        const houseColor = HOUSE_COLORS[v.house || 'Blue']?.primary || '#14b8a6';

                        return (
                          <div key={v.admissionNo} className="bg-zinc-950/40 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-4 group hover:border-white/10 transition-all">
                            <div className="flex flex-col gap-1 overflow-hidden">
                              <p className="text-xs font-mono font-bold text-teal-400 truncate">
                                {v.admissionNo}
                              </p>
                              <p className="text-sm font-semibold text-white truncate">
                                {v.name || 'Anonymous Student'}
                              </p>
                              <div className="flex flex-wrap gap-1.5 items-center text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
                                <span style={{ backgroundColor: houseColor }} className="w-2 h-2 rounded-full shrink-0" />
                                <span>{v.house || 'Unassigned'}</span>
                                <span>•</span>
                                <span>Lvl {v.grade || '12'}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase font-semibold">PASS KEY</span>
                                <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 px-2.5 rounded-lg">
                                  <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-300">
                                    {isRevealed ? textPin : '••••••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePinReveal(v.admissionNo)}
                                    type="button"
                                    className="text-zinc-500 hover:text-white transition-all cursor-pointer"
                                  >
                                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-col items-center">
                                <span className="text-[9px] text-zinc-500 font-mono uppercase font-semibold">STATUS</span>
                                <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-lg mt-0.5 ${v.hasVoted ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}>
                                  {v.hasVoted ? 'VOTED' : 'PENDING'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'teachers' && (
              <motion.div
                key="teachers-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-8"
                id="teachers-directory-view"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-teal-400" />
                      Teachers Directory
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Configure total teacher credentials, sync with the secure ledger, and instantly export credentials.
                    </p>
                  </div>
                  
                  {voters.filter(v => v.admissionNo.startsWith('TR-')).length > 0 && (
                    <button
                      onClick={handleExportTeachersExcel}
                      className="flex items-center gap-2 bg-teal-950/50 hover:bg-teal-900/60 text-teal-400 font-mono text-[11px] py-1.5 px-3.5 rounded-xl border border-teal-500/20 transition-all font-semibold uppercase"
                      title="Download Teacher IDs and Password Keys"
                    >
                      <Download className="w-3.5 h-3.5" />
                      DOWNLOAD REGISTERED TEACHERS
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Generator Form */}
                  <div className="lg:col-span-1 flex flex-col gap-5">
                    <form onSubmit={handleGenerateAndDownloadTeachers} className="bg-black/30 border border-white/5 p-6 rounded-2xl flex flex-col gap-5 relative">
                      <p className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" /> GENERATE & SYNC CREDENTIALS
                      </p>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-400 font-mono">Number of Teacher Accounts to Generate</label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          required
                          value={teachersCount}
                          onChange={(e) => setTeachersCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 font-mono font-bold"
                          placeholder="e.g. 150"
                        />
                        <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                          Generates Accounts starting from <code className="font-mono text-zinc-400">TR-1</code> to <code className="font-mono text-zinc-400">TR-{teachersCount}</code>. This guarantees persistent authentication access across client states and persistent cloud tables.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          type="submit"
                          disabled={isGeneratingTeachers}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-black font-extrabold text-xs font-mono py-3 px-6 rounded-xl hover:opacity-95 active:scale-95 transition-all uppercase tracking-wider disabled:opacity-50"
                        >
                          {isGeneratingTeachers ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              SYNCHRONIZING WITH LEDGER...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              GENERATE & DOWNLOAD PASSPORTS
                            </>
                          )}
                        </button>
                      </div>

                      {teachersSuccess && (
                        <div className="bg-teal-950/20 border border-teal-500/25 p-3 rounded-lg text-center font-mono text-[10px] text-teal-400 font-bold line-clamp-2">
                          ✓ {teachersSuccess}
                        </div>
                      )}

                      {teachersError && (
                        <div className="bg-red-950/20 border border-red-500/25 p-3 rounded-lg text-center font-mono text-[10px] text-red-400 font-bold line-clamp-2">
                          ❌ {teachersError}
                        </div>
                      )}
                    </form>

                    <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-2xl flex flex-col gap-3">
                      <p className="text-[9px] font-mono text-zinc-550 font-bold uppercase tracking-widest">TEACHER GATEWAY INFO</p>
                      <ul className="text-[10px] text-zinc-400 leading-relaxed flex flex-col gap-2 font-sans list-disc pl-4">
                        <li>Each teacher login is built as <code className="font-mono bg-zinc-900 px-1 py-0.5 rounded text-teal-400">TR-[System ID]</code>.</li>
                        <li>Passwords are derived deterministically using dual salt matrices, eliminating central security breaches.</li>
                        <li>Teachers are universal electors to check active ballots and verify correct democratic procedure.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Right Column: Registered Teachers Directory */}
                  <div className="lg:col-span-2 bg-black/20 border border-white/5 p-6 rounded-2xl flex flex-col gap-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">
                          TEACHERS ROSTER DIRECTORY
                        </p>
                        <p className="text-xs text-zinc-400 font-medium">
                          Showing {voters.filter(v => v.admissionNo.startsWith('TR-')).length} registered teacher accounts
                        </p>
                      </div>

                      <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search Teacher ID..."
                          value={teacherSearch}
                          onChange={(e) => setTeacherSearch(e.target.value)}
                          className="bg-zinc-950 border border-white/10 focus:border-teal-500/50 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500/20 w-full font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-1">
                      {(() => {
                        const allTeachers = voters.filter(v => v.admissionNo.startsWith('TR-'));
                        const filtered = allTeachers.filter(v => {
                          const q = teacherSearch.toLowerCase();
                          return v.admissionNo.toLowerCase().includes(q);
                        });

                        const sorted = [...filtered].sort((a, b) => {
                          const numA = parseInt(a.admissionNo.replace('TR-', ''), 10) || 0;
                          const numB = parseInt(b.admissionNo.replace('TR-', ''), 10) || 0;
                          return numA - numB;
                        });

                        if (sorted.length === 0) {
                          return (
                            <div className="md:col-span-2 text-center py-16 text-zinc-500 italic text-xs font-mono">
                              No teacher accounts found matching search or directory empty.
                            </div>
                          );
                        }

                        return sorted.map((v) => {
                          const isRevealed = !!revealedPins[v.admissionNo];
                          const pwd = derivePinForVoter(v.admissionNo);

                          return (
                            <div key={v.admissionNo} className="bg-zinc-950/40 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-4 group hover:border-white/10 transition-all">
                              <div className="flex flex-col gap-1 overflow-hidden">
                                <p className="text-xs font-mono font-bold text-teal-400">
                                  {v.admissionNo}
                                </p>
                                <p className="text-xs text-zinc-400 font-semibold truncate font-sans">
                                  NPS Teacher Panelist
                                </p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-[9px] text-zinc-500 font-mono uppercase font-semibold">PASSWORD</span>
                                  <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 p-1 px-2.5 rounded-lg">
                                    <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-300">
                                      {isRevealed ? pwd : '••••••••'}
                                    </span>
                                    <button
                                      onClick={() => togglePinReveal(v.admissionNo)}
                                      type="button"
                                      className="text-zinc-500 hover:text-white transition-all cursor-pointer"
                                    >
                                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </div>

                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-zinc-500 font-mono uppercase font-semibold">STATUS</span>
                                  <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-lg mt-0.5 ${v.hasVoted ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-zinc-800 text-zinc-500 border border-transparent'}`}>
                                    {v.hasVoted ? 'CASTED' : 'PENDING'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}





          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
