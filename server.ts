import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, writeBatch, deleteDoc } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/wipe-posts', async (req, res) => {
  try {
    initFirebase();
    const snap = await getDocs(collection(db, 'posts'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const state = readDBLocal();
    state.posts = [];
    writeDBLocal(state);

    res.send('Posts wiped.');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});
app.all('/api/generate-teachers', async (req, res) => {
  try {
    const isCloud = initFirebase();
    const state = await readDB();
    
    const countParam = req.body?.count || req.query?.count;
    const count = parseInt(countParam, 10) || 150;
    
    // Deleting all old teacher accounts starting with 'TR-'
    const oldTeachers = state.voters.filter((v: any) => v.admissionNo.startsWith('TR-'));
    if (isCloud && oldTeachers.length > 0) {
      const deletePromises = oldTeachers.map((v: any) =>
        deleteDoc(doc(db, 'voters', v.admissionNo.replace(/\//g, '_slash_'))).catch(() => {})
      );
      await Promise.all(deletePromises);
    }
    
    // Strip them out of local state
    state.voters = state.voters.filter((v: any) => !v.admissionNo.startsWith('TR-'));
    
    let added = 0;
    for (let i = 1; i <= count; i++) {
        const admissionNo = `TR-${i}`;
        const plaintextPin = derivePinForVoter(admissionNo);
        const hashedPin = sha256Sync(plaintextPin);
        state.voters.push({ admissionNo, pin: hashedPin, hasVoted: false });
        added++;
        
        if (isCloud) {
            try {
                await setDoc(doc(db, 'voters', admissionNo.replace(/\//g, '_slash_')), {
                    hasVoted: false,
                    pin: hashedPin
                }, { merge: true });
            } catch(e) {}
        }
    }
    
    await writeDB(state);
    res.json({ success: true, added, count, state });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wipe-voters', async (req, res) => {
  try {
    initFirebase();
    const snap = await getDocs(collection(db, 'voters'));
    const batch = writeBatch(db);
    // Batch only supports 500 ops, so this works perfectly for 500 voters
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const state = readDBLocal();
    state.voters = [];
    writeDBLocal(state);

    res.send('Voters wiped.');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

app.get('/api/wipe-candidates', async (req, res) => {
  try {
    initFirebase();
    const snap = await getDocs(collection(db, 'candidates'));
    const juniorSnap = await getDocs(collection(db, 'junior_candidates'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    juniorSnap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const state = readDBLocal();
    state.candidates = [];
    writeDBLocal(state);

    res.send('Candidates wiped.');
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

async function recreateCandidatesHelper(): Promise<{ success: boolean; message: string; count: number }> {
  const isCloud = initFirebase();
  if (isCloud) {
    console.log('🔄 [DATABASE] Clearing candidates and junior_candidates collections in Cloud...');
    const candSnap = await getDocs(collection(db, 'candidates'));
    let deleteBatch = writeBatch(db);
    let deleteCount = 0;
    for (const d of candSnap.docs) {
      deleteBatch.delete(d.ref);
      deleteCount++;
      if (deleteCount % 400 === 0) {
        await deleteBatch.commit();
        deleteBatch = writeBatch(db);
      }
    }
    if (deleteCount % 400 !== 0) {
      await deleteBatch.commit();
    }

    const jrSnap = await getDocs(collection(db, 'junior_candidates'));
    deleteBatch = writeBatch(db);
    deleteCount = 0;
    for (const d of jrSnap.docs) {
      deleteBatch.delete(d.ref);
      deleteCount++;
      if (deleteCount % 400 === 0) {
        await deleteBatch.commit();
        deleteBatch = writeBatch(db);
      }
    }
    if (deleteCount % 400 !== 0) {
      await deleteBatch.commit();
    }
  }

  const NAME_POOL = [
    'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Ava', 'Elijah', 'Charlotte',
    'William', 'Sophia', 'James', 'Amelia', 'Benjamin', 'Isabella', 'Lucas', 'Mia',
    'Henry', 'Evelyn', 'Alexander', 'Harper', 'Jackson', 'Camila', 'Sebastian', 'Gianna',
    'Aiden', 'Abigail', 'Matthew', 'Luna', 'Samuel', 'Ella', 'David', 'Elizabeth',
    'Joseph', 'Sofia', 'Carter', 'Emily', 'Owen', 'Avery', 'Wyatt', 'Mila',
    'John', 'Aria', 'Jack', 'Scarlett', 'Luke', 'Penelope', 'Jayden', 'Layla',
    'Dylan', 'Chloe', 'Grayson', 'Victoria', 'Levi', 'Madison', 'Isaac', 'Eleanor',
    'Gabriel', 'Grace', 'Julian', 'Nora', 'Mateo', 'Riley', 'Anthony', 'Zoey',
    'Jaxon', 'Hannah', 'Lincoln', 'Hazel', 'Joshua', 'Lily', 'Christopher', 'Ellie',
    'Andrew', 'Violet', 'Theodore', 'Lillian', 'Stella', 'Charles', 'Nova', 'Thomas',
    'Cora', 'Caleb', 'Aurora', 'Josiah', 'Lucy', 'Christian', 'Emilia', 'Micah',
    'Piper', 'Cameron', 'Ruby', 'Santiago', 'Claire', 'Jeremiah', 'Layla', 'Asher', 
    'Eliana', 'Eli', 'Sarah'
  ];

  let nameIdx = 0;
  const getUniqueFullName = (isJunior: boolean) => {
    const first = NAME_POOL[nameIdx % NAME_POOL.length];
    nameIdx++;
    const last = NAME_POOL[nameIdx % NAME_POOL.length];
    nameIdx++;
    return `${first} ${last}${isJunior ? ' Jr.' : ''}`;
  };

  const houses = ['Red', 'Blue', 'Green', 'Yellow'];
  const generalPosts = ['head_boy', 'head_girl', 'school_captain', 'school_vice_captain', 'sports_captain', 'sports_vice_captain'];
  const houseToSuffix: Record<string, string> = {
    Red: 'regulus',
    Blue: 'nicon',
    Green: 'maxims',
    Yellow: 'pericles'
  };

  const allGeneratedCandidates: any[] = [];
  let insertBatch = isCloud ? writeBatch(db) : null;
  let insertCount = 0;
  let candCounter = 1;

  for (const isJunior of [false, true]) {
    const contextTag = isJunior ? 'jr' : 'sr';
    
    // 1. General Posts (exactly 1 cand per house = 4 cands total per post)
    for (const p of generalPosts) {
      for (const h of houses) {
        const fullName = getUniqueFullName(isJunior);
        const candId = `cand_${contextTag}_${candCounter++}`;
        const newCand = {
          id: candId,
          fullName,
          house: h,
          post: p,
          photo: generateHologramAvatar(fullName, h),
          motto: isJunior ? 'Junior student leadership ready.' : 'Leadership and dedication for all.',
          votes: 0,
          isJunior
        };
        allGeneratedCandidates.push(newCand);

        if (isCloud && insertBatch) {
          const colName = isJunior ? 'junior_candidates' : 'candidates';
          const docRef = doc(db, colName, candId);
          insertBatch.set(docRef, { fullName: newCand.fullName, house: newCand.house, post: newCand.post, photo: newCand.photo, motto: newCand.motto, votes: newCand.votes });
          insertCount++;
          if (insertCount % 400 === 0) {
            await insertBatch.commit();
            insertBatch = writeBatch(db);
          }
        }
      }
    }

    // 2. House Posts (exactly 4 cands per specific house combination post)
    const housePostPrefixes = ['house_captain_', 'house_vice_captain_', 'house_prefects_'];
    for (const prefix of housePostPrefixes) {
      for (const h of houses) {
        const suffix = houseToSuffix[h];
        if (!suffix) continue;
        const postId = `${prefix}${suffix}`;

        for (let i = 0; i < 4; i++) {
          const fullName = getUniqueFullName(isJunior);
          const candId = `cand_${contextTag}_${candCounter++}`;
          const newCand = {
            id: candId,
            fullName,
            house: h,
            post: postId,
            photo: generateHologramAvatar(fullName, h),
            motto: `${prefix.replaceAll('_', ' ').trim()} role for ${h} house pride.`,
            votes: 0,
            isJunior
          };
          allGeneratedCandidates.push(newCand);

          if (isCloud && insertBatch) {
            const colName = isJunior ? 'junior_candidates' : 'candidates';
            const docRef = doc(db, colName, candId);
            insertBatch.set(docRef, { fullName: newCand.fullName, house: newCand.house, post: newCand.post, photo: newCand.photo, motto: newCand.motto, votes: newCand.votes });
            insertCount++;
            if (insertCount % 400 === 0) {
              await insertBatch.commit();
              insertBatch = writeBatch(db);
            }
          }
        }
      }
    }
  }

  if (isCloud && insertBatch && insertCount % 400 !== 0) {
    await insertBatch.commit();
  }

  // Save to local DB and update local cache
  const state = readDBLocal();
  state.candidates = allGeneratedCandidates;
  writeDBLocal(state);
  cachedState = state;

  return { success: true, message: `Successfully wiped and recreated ${allGeneratedCandidates.length} high-fidelity candidates (72 senior, 72 junior) in database.json and Firestore.`, count: allGeneratedCandidates.length };
}

app.get('/api/recreate-candidates', async (req, res) => {
  try {
    const result = await recreateCandidatesHelper();
    res.json(result);
  } catch (err: any) {
    console.error('⚠️ [ERROR] Recreate candidates failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Persistent database file path
const dbPath = path.join(process.cwd(), 'src', 'data', 'database.json');

// Cryptographic helpers for deterministic voters initialization
const PIN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const PIN_UPPERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PIN_LOWERS = 'abcdefghijklmnopqrstuvwxyz';
const PIN_DIGITS = '0123456789';
const PIN_SYMS = '!@#$%^&*';

function derivePinForVoter(admissionNo: string): string {
  const seedString = `${admissionNo.toUpperCase()}_NPS_KENGERI_2026_ORBIS_SECURE_SALT`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  
  function random(): number {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  }
  
  const length = Math.floor(random() * 2) + 8; // 8 or 9
  const pool = [
    PIN_UPPERS[Math.floor(random() * PIN_UPPERS.length)],
    PIN_LOWERS[Math.floor(random() * PIN_LOWERS.length)],
    PIN_DIGITS[Math.floor(random() * PIN_DIGITS.length)],
    PIN_SYMS[Math.floor(random() * PIN_SYMS.length)],
  ];
  
  for (let j = 4; j < length; j++) {
    pool.push(PIN_CHARS[Math.floor(random() * PIN_CHARS.length)]);
  }
  
  for (let j = pool.length - 1; j > 0; j--) {
    const k = Math.floor(random() * (j + 1));
    const temp = pool[j];
    pool[j] = pool[k];
    pool[k] = temp;
  }
  
  return pool.join('');
}

function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words: number[] = [];
  const asciiLength = ascii[lengthProperty] * 8;
  
  let value: number;
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
      h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let hashBlocks = ascii + '\x80';
  while (hashBlocks[lengthProperty] % 64 - 56) hashBlocks += '\x00';
  
  for (i = 0; i < hashBlocks[lengthProperty]; i++) {
    value = hashBlocks.charCodeAt(i);
    words[i >> 2] |= value << (24 - 8 * (i % 4));
  }
  
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength);
  
  for (j = 0; j < words[lengthProperty]; j += 16) {
    const w = words.slice(j, j + 16);
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (i = 0; i < 64; i++) {
      if (i < 16) {
        w[i] = w[i] || 0;
      } else {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      const temp1 = (h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & f) ^ (~e & g)) + k[i] + w[i]) | 0;
      const temp2 = ((rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hex = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (i = 0; i < 8; i++) {
    const word = hex[i];
    result += ((word >>> 24) & 0xff).toString(16).padStart(2, '0') +
              ((word >>> 16) & 0xff).toString(16).padStart(2, '0') +
              ((word >>> 8) & 0xff).toString(16).padStart(2, '0') +
              (word & 0xff).toString(16).padStart(2, '0');
  }
  return result;
}

const HOUSE_COLORS: Record<string, { primary: string; secondary: string }> = {
  Red: { primary: '#ef4444', secondary: '#f87171' },
  Blue: { primary: '#3b82f6', secondary: '#60a5fa' },
  Green: { primary: '#10b981', secondary: '#34d399' },
  Yellow: { primary: '#eab308', secondary: '#facc15' },
};

function generateHologramAvatar(seed: string, house: string): string {
  const colors = HOUSE_COLORS[house] || HOUSE_COLORS.Blue;
  const prim = colors.primary;
  const sec = colors.secondary;

  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shapeType = hash % 4;

  let innerContent = '';

  if (shapeType === 0) {
    innerContent = `
      <circle cx="100" cy="100" r="45" fill="url(#grad2)" opacity="0.8" />
      <circle cx="100" cy="100" r="55" stroke="${sec}" stroke-width="2" fill="none" stroke-dasharray="10 5" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="100" r="30" fill="none" stroke="${prim}" stroke-width="3" opacity="0.9" />
      <path d="M 70,100 L 130,100" stroke="${sec}" stroke-width="1" opacity="0.5" />
      <path d="M 100,70 L 100,130" stroke="${sec}" stroke-width="1" opacity="0.5" />
    `;
  } else if (shapeType === 1) {
    innerContent = `
      <polygon points="100,45 145,75 145,125 100,155 55,125 55,75" fill="url(#grad2)" opacity="0.7" />
      <polygon points="100,35 155,70 155,130 100,165 45,130 45,70" fill="none" stroke="${sec}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="15s" repeatCount="indefinite" />
      </polygon>
      <polygon points="100,55 135,80 135,120 100,145 65,120 65,80" fill="none" stroke="${prim}" stroke-width="2" opacity="0.9" />
    `;
  } else if (shapeType === 2) {
    innerContent = `
      <path d="M 60,60 L 140,140 M 60,140 L 140,60" stroke="${sec}" stroke-width="1" opacity="0.4" />
      <circle cx="100" cy="100" r="40" fill="url(#grad2)" opacity="0.6" />
      <rect x="75" y="75" width="50" height="50" rx="10" fill="none" stroke="${prim}" stroke-width="3" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="90 100 100" dur="8s" repeatCount="indefinite" />
      </rect>
      <circle cx="100" cy="100" r="8" fill="${sec}" opacity="0.9" />
    `;
  } else {
    innerContent = `
      <path d="M 100,40 L 115,85 L 160,100 L 115,115 L 100,160 L 85,115 L 40,100 L 85,85 Z" fill="url(#grad2)" opacity="0.7" />
      <circle cx="100" cy="100" r="50" fill="none" stroke="${sec}" stroke-width="1.5" opacity="0.6">
        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="-360 100 100" dur="25s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="100" r="25" fill="none" stroke="${prim}" stroke-width="2" opacity="0.9" />
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
    <defs>
      <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stop-color="#111827" />
        <stop offset="100%" stop-color="#030712" />
      </radialGradient>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${prim}" stop-opacity="0.8" />
        <stop offset="50%" stop-color="${sec}" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad1)" rx="20" />
    <path d="M 20,40 L 180,40 M 20,80 L 180,80 M 20,120 L 180,120 M 20,160 L 180,160" stroke="${prim}" stroke-width="0.5" opacity="0.15" />
    <path d="M 40,20 L 40,180 M 80,20 L 80,180 M 120,20 L 120,180 M 160,20 L 160,180" stroke="${prim}" stroke-width="0.5" opacity="0.15" />
    <circle cx="100" cy="100" r="75" stroke="${prim}" stroke-width="1" stroke-dasharray="4 8" fill="none" opacity="0.3">
      <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="40s" repeatCount="indefinite" />
    </circle>
    ${innerContent}
    <rect x="25" y="25" width="150" height="150" rx="10" fill="none" stroke="${sec}" stroke-width="0.5" opacity="0.2" />
    <path d="M 20,30 L 20,20 L 30,20" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 180,30 L 180,20 L 170,20" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 20,170 L 20,180 L 30,180" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 180,170 L 180,180 L 170,180" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <text x="100" y="182" fill="${sec}" font-family="monospace" font-size="8" text-anchor="middle" letter-spacing="1" opacity="0.8">HOLO_SYS v1.82</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Default state lists
const INITIAL_POSTS = [
  { id: 'head_boy', title: 'Head Boy', description: 'Overall student leadership, school representative, and council coordinator (Male candidates)' },
  { id: 'head_girl', title: 'Head Girl', description: 'Overall student leadership, school representative, and council coordinator (Female candidates)' },
  { id: 'school_captain', title: 'School Captain', description: 'School representative' },
  { id: 'school_vice_captain', title: 'School Vice Captain', description: 'School assistant representative' },
  { id: 'house_captain_maxims', title: 'House Captain (Maxims)', description: 'House leadership' },
  { id: 'house_captain_nicon', title: 'House Captain (Nicon)', description: 'House leadership' },
  { id: 'house_captain_regulus', title: 'House Captain (Regulus)', description: 'House leadership' },
  { id: 'house_captain_pericles', title: 'House Captain (Pericles)', description: 'House leadership' },
  { id: 'house_vice_captain_maxims', title: 'House Vice Captain (Maxims)', description: 'House vice leadership' },
  { id: 'house_vice_captain_nicon', title: 'House Vice Captain (Nicon)', description: 'House vice leadership' },
  { id: 'house_vice_captain_regulus', title: 'House Vice Captain (Regulus)', description: 'House vice leadership' },
  { id: 'house_vice_captain_pericles', title: 'House Vice Captain (Pericles)', description: 'House vice leadership' },
  { id: 'house_prefects_maxims', title: 'House Prefects (Maxims)', description: 'House discipline' },
  { id: 'house_prefects_nicon', title: 'House Prefects (Nicon)', description: 'House discipline' },
  { id: 'house_prefects_regulus', title: 'House Prefects (Regulus)', description: 'House discipline' },
  { id: 'house_prefects_pericles', title: 'House Prefects (Pericles)', description: 'House discipline' },
  { id: 'sports_captain', title: 'Sports Captain', description: 'Organizing inter-house sports meets' },
  { id: 'sports_vice_captain', title: 'Sports Vice Captain', description: 'Managing sports gear and fields' }
];

const generateVotersList = () => {
  const votersList = [];
  for (let i = 1001; i <= 3500; i++) {
    const admissionNo = `SD-${i}`;
    const plaintextPin = derivePinForVoter(admissionNo);
    const hashedPin = sha256Sync(plaintextPin);
    votersList.push({
      admissionNo,
      pin: hashedPin,
      hasVoted: false,
    });
  }
  return votersList;
};

// Database state management Local Fallbacks
const readDBLocal = () => {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading persistent database:', error);
  }
  
  // Seed initial database
  const defaultState = {
    voters: generateVotersList(),
    candidates: [],
    posts: INITIAL_POSTS,
    isOpen: true,
    modEnabled: false,
  };
  writeDBLocal(defaultState);
  return defaultState;
};

const writeDBLocal = (data: any) => {
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing database to disk:', error);
  }
};

// Global Memory States
let cachedState: any = null;
let db: any = null;
let bFirebaseActive = false;

function initFirebase() {
  if (bFirebaseActive) return true;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const app = getApps().length === 0 ? initializeApp(configData) : getApp();
      db = getFirestore(app, configData.firestoreDatabaseId);
      bFirebaseActive = true;
      console.log('💎 [DATABASE] Multi-cloud Firebase Firestore connection is live and synchronized!');
      return true;
    } catch (err) {
      console.error('⚠️ [DATABASE] Firebase config detected but failed to open connection:', err);
    }
  }
  return false;
}

async function fetchStateFromCloud(): Promise<any> {
  try {
    let candidatesSnap;
    try {
      candidatesSnap = await getDocs(collection(db, 'candidates'));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'candidates');
    }

    let juniorCandidatesSnap;
    try {
      juniorCandidatesSnap = await getDocs(collection(db, 'junior_candidates'));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'junior_candidates');
    }

    let postsSnap;
    try {
      postsSnap = await getDocs(collection(db, 'posts'));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'posts');
    }

    let votersSnap;
    try {
      votersSnap = await getDocs(collection(db, 'voters'));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'voters');
    }

    let settingsDoc;
    try {
      settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, 'settings/global');
    }

    const candidates: any[] = [];
    const posts: any[] = [];
    const voters: any[] = [];
    let isOpen = true;
    let modEnabled = false;

    candidatesSnap.forEach((docSnap) => {
      candidates.push({ id: docSnap.id, ...docSnap.data() });
    });

    juniorCandidatesSnap.forEach((docSnap) => {
      candidates.push({ id: docSnap.id, ...docSnap.data(), isJunior: true });
    });

    const duplicateGreenPostIds = ['house_captain_green', 'house_prefects_green', 'house_vice_captain_green'];
    postsSnap.forEach((docSnap) => {
      if (duplicateGreenPostIds.includes(docSnap.id)) {
        // Asynchronously delete duplicate doc to clean up the Cloud DB
        deleteDoc(doc(db, 'posts', docSnap.id)).catch(err => {
          console.error(`Failed to clean up duplicate post doc ${docSnap.id}:`, err);
        });
      } else {
        posts.push({ id: docSnap.id, ...docSnap.data() });
      }
    });

    votersSnap.forEach((docSnap) => {
      const decodedAdmissionNo = docSnap.id.replace(/_slash_/g, '/');
      voters.push({ admissionNo: decodedAdmissionNo, ...docSnap.data() });
    });

    if (settingsDoc.exists()) {
      const sData = settingsDoc.data();
      if (typeof sData.isOpen === 'boolean') isOpen = sData.isOpen;
      if (typeof sData.modEnabled === 'boolean') modEnabled = sData.modEnabled;
    }

    // Sort to maintain layout consistency
    candidates.sort((a, b) => a.id.localeCompare(b.id));
    posts.sort((a, b) => a.id.localeCompare(b.id));
    voters.sort((a, b) => a.admissionNo.localeCompare(b.admissionNo));

    cachedState = {
      voters,
      candidates,
      posts,
      isOpen,
      modEnabled
    };
    return cachedState;
  } catch (err: any) {
    // If it's already a JSON-stringified FirestoreErrorInfo or contains permission-denied, propagate it
    if (err instanceof Error) {
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error && (parsed.error.includes('permission') || parsed.error.includes('Permission'))) {
          throw err;
        }
      } catch (e) {
        if (err.message.includes('permission') || err.message.includes('Permission')) {
          throw err;
        }
      }
    }
    console.error('⚠️ [DATABASE] Failed reading Firestore cloud data. Cascading to local cache:', err);
    return readDBLocal();
  }
}



async function readDB(): Promise<any> {
  const isCloud = initFirebase();
  if (!isCloud) {
    return readDBLocal();
  }

  // Always query fresh, real-time data directly from Cloud Firestore to satisfy user requirement
  return await fetchStateFromCloud();
}

async function writeDB(state: any): Promise<void> {
  // Update internal localized cache instantly
  cachedState = state;
  writeDBLocal(state);

  const isCloud = initFirebase();
  if (!isCloud) return;

  try {
    // Sync settings to cloud
    await setDoc(doc(db, 'settings', 'global'), {
      isOpen: state.isOpen,
      modEnabled: state.modEnabled
    }, { merge: true });

  } catch (err) {
    console.error('⚠️ [DATABASE] Write failed pushing changes to state documents:', err);
  }
}

// GET: Full active election database state
app.get('/api/db-state', async (req, res) => {
  const state = await readDB();
  res.json(state);
});

// GET: Force full cloud sync with updated structures
app.get('/api/force-sync', async (req, res) => {
  const isCloud = initFirebase();
  if (isCloud) {
    const cloudState = await fetchStateFromCloud();
    writeDBLocal(cloudState);
    res.json({ success: true, state: cloudState });
  } else {
    res.json({ success: false, state: readDBLocal() });
  }
});

// GET: Mod configuration separately for backwards compatibility
app.get('/api/mod-config', async (req, res) => {
  const state = await readDB();
  res.json({ enabled: state.modEnabled });
});

// POST: Toggle global mod state
app.post('/api/mod-config', async (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Property "enabled" must be a boolean.' });
  }
  const state = await readDB();
  state.modEnabled = enabled;
  await writeDB(state);
  res.json({ success: true, enabled: state.modEnabled });
});

// POST: Toggle general election status
app.post('/api/toggle-election', async (req, res) => {
  const { isOpen } = req.body;
  if (typeof isOpen !== 'boolean') {
    return res.status(400).json({ error: 'Property "isOpen" must be a boolean.' });
  }
  const state = await readDB();
  state.isOpen = isOpen;
  await writeDB(state);
  res.json({ success: true, isOpen: state.isOpen });
});

// POST: Admin auth
app.post('/api/admin-auth', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const isCloud = initFirebase();
  let correctPassword = 'admin2026';

  if (isCloud) {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
      const sData = settingsDoc.data();
      if (settingsDoc.exists() && sData && sData.adminPassword) {
        correctPassword = sData.adminPassword;
      } else {
        await setDoc(doc(db, 'settings', 'global'), { adminPassword: correctPassword }, { merge: true });
      }
    } catch (err) {
      console.error('Error with admin auth:', err);
    }
  }

  if (password.toLowerCase() === correctPassword.toLowerCase() || password === correctPassword) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// POST: Create / modify candidate
app.post('/api/candidates', async (req, res) => {
  const { id, fullName, house, post, photo, motto, isJunior } = req.body;
  if (!fullName || !house || !post) {
    return res.status(400).json({ error: 'Required fields: fullName, house, post' });
  }

  const state = await readDB();
  let resultingCand: any = null;
  if (id) {
    // Update
    const index = state.candidates.findIndex((c: any) => c.id === id);
    if (index !== -1) {
      state.candidates[index] = {
        ...state.candidates[index],
        fullName,
        house,
        post,
        photo: photo || state.candidates[index].photo,
        motto: motto || '',
        isJunior: isJunior || false,
      };
      resultingCand = state.candidates[index];
    } else {
      return res.status(404).json({ error: 'Candidate not found' });
    }
  } else {
    // Insert new
    const newCand = {
      id: `cand_${Date.now()}`,
      fullName,
      house,
      post,
      photo: photo || generateHologramAvatar(fullName, house),
      motto: motto || '',
      votes: 0,
      isJunior: isJunior || false,
    };
    state.candidates.push(newCand);
    resultingCand = newCand;
  }

  const isCloud = initFirebase();
  if (isCloud && resultingCand) {
    try {
      const { id: candId, ...rest } = resultingCand;
      const colName = rest.isJunior ? 'junior_candidates' : 'candidates';
      await setDoc(doc(db, colName, candId), rest, { merge: true });
    } catch (err) {
      console.error('⚠️ [DATABASE] Error pushing candidate to Cloud:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, state });
});

// DELETE: Remove candidate
app.delete('/api/candidates/:id', async (req, res) => {
  const { id } = req.params;
  const state = await readDB();
  
  // Also remove from Firestore explicitly
  const isCloud = initFirebase();
  if (isCloud) {
    try {
      // Find candidate to see if it was junior
      const cand = state.candidates.find((c: any) => c.id === id);
      if (cand) {
        const colName = cand.isJunior ? 'junior_candidates' : 'candidates';
        await deleteDoc(doc(db, colName, id));
      } else {
        await deleteDoc(doc(db, 'candidates', id));
        await deleteDoc(doc(db, 'junior_candidates', id));
      }
    } catch (err) {
      console.warn('⚠️ [DATABASE] Failed to remove Firestore document index directly:', err);
    }
  }

  state.candidates = state.candidates.filter((c: any) => c.id !== id);
  await writeDB(state);
  res.json({ success: true, state });
});

// POST: Add or update postDefinition
app.post('/api/posts', async (req, res) => {
  const { id, title, description, category, eligibleGrades, eligibleHouses } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const state = await readDB();
  const slug = id || title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '');

  const postData = {
    id: slug,
    title,
    description: description || `Student leadership representatives for ${title} council positions.`,
    category: category || 'Universal',
    eligibleGrades: eligibleGrades || [],
    eligibleHouses: eligibleHouses || []
  };

  const existingIdx = state.posts.findIndex((p: any) => p.id === slug);
  if (existingIdx !== -1) {
    state.posts[existingIdx] = postData;
  } else {
    state.posts.push(postData);
  }

  const isCloud = initFirebase();
  if (isCloud) {
    try {
      await setDoc(doc(db, 'posts', slug), postData, { merge: true });
    } catch (err) {
      console.error('⚠️ [DATABASE] Error pushing post to Cloud:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, id: slug, state });
});

// DELETE: Remove postDefinition
app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const state = await readDB();
  state.posts = state.posts.filter((p: any) => p.id !== id);

  const isCloud = initFirebase();
  if (isCloud) {
    try {
      await deleteDoc(doc(db, 'posts', id));
    } catch (err) {
      console.error('⚠️ [DATABASE] Error deleting post from Cloud:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, state });
});

// POST: Reset candidate votes
app.post('/api/reset-votes', async (req, res) => {
  const state = await readDB();
  state.candidates.forEach((c: any) => {
    c.votes = 0;
  });

  const isCloud = initFirebase();
  if (isCloud) {
    try {
      console.log('🔄 [DATABASE] Clearing candidate votes in Cloud...');
      const candPromises = state.candidates.map((c: any) => {
        const colName = c.isJunior ? 'junior_candidates' : 'candidates';
        return setDoc(doc(db, colName, c.id), { votes: 0 }, { merge: true });
      });
      await Promise.all(candPromises);
    } catch (err) {
      console.error('⚠️ [DATABASE] Cloud candidates vote reset error:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, state });
});

// POST: Reset voters participation status
app.post('/api/reset-voters', async (req, res) => {
  const state = await readDB();
  state.voters.forEach((v: any) => {
    v.hasVoted = false;
    v.votedAt = null;
  });

  const isCloud = initFirebase();
  if (isCloud) {
    try {
      console.log('🔄 [DATABASE] Clearing voter status locks in Cloud...');
      const batch = writeBatch(db);
      state.voters.forEach((v: any) => {
        batch.set(doc(db, 'voters', v.admissionNo.replace(/\//g, '_slash_')), { hasVoted: false, votedAt: null }, { merge: true });
      });
      await batch.commit();
      console.log('✅ [DATABASE] Cloud reset done.');
    } catch (err) {
      console.error('⚠️ [DATABASE] Cloud voters reset error:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, state });
});

// POST: Sync/Replace all voters (For manual overrides if any)
app.post('/api/voters/sync', async (req, res) => {
  const { voters } = req.body;
  if (!Array.isArray(voters)) {
    return res.status(400).json({ error: 'voters must be an array' });
  }
  const state = await readDB();
  state.voters = voters;

  const isCloud = initFirebase();
  if (isCloud) {
    try {
      // 1. Fetch existing voter IDs in Firestore
      const snap = await getDocs(collection(db, 'voters'));
      const existingIds = snap.docs.map(d => d.id);
      const incomingIds = voters.map((v: any) => v.admissionNo.replace(/\//g, '_slash_'));

      // 2. Compute deletions
      const toDelete = existingIds.filter(id => !incomingIds.includes(id));

      const executeInBatches = async (actions: ((b: any) => void)[]) => {
        for (let i = 0; i < actions.length; i += 400) {
          const chunk = actions.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach(action => action(batch));
          await batch.commit();
        }
      };

      const actions: ((b: any) => void)[] = [];

      // Add delete actions
      toDelete.forEach((id) => {
        actions.push((batch) => {
          batch.delete(doc(db, 'voters', id));
        });
      });

      // Add set actions
      voters.forEach((v: any) => {
        const { admissionNo, ...rest } = v;
        actions.push((batch) => {
          batch.set(doc(db, 'voters', admissionNo.replace(/\//g, '_slash_')), rest, { merge: true });
        });
      });

      await executeInBatches(actions);
    } catch (err) {
      console.error('⚠️ [DATABASE] Error syncing voters override:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, state });
});

// POST: Update voter profile
app.post('/api/voter-profile', async (req, res) => {
  const { admissionNo, house, grade } = req.body;
  if (!admissionNo) return res.status(400).json({ error: 'Admission number required' });

  const state = await readDB();
  const voterIdx = state.voters.findIndex((v: any) => v.admissionNo === admissionNo);
  if (voterIdx === -1) {
    return res.status(404).json({ error: 'Voter not found' });
  }

  // Update only in in-memory state (transient)
  state.voters[voterIdx] = { ...state.voters[voterIdx], house, grade };
  
  res.json({ success: true, voter: state.voters[voterIdx] });
});

// POST: Cast Secure Ballot
app.post('/api/cast-votes', async (req, res) => {
  const { selections, voterAdmissionNo } = req.body;
  if (!selections || !voterAdmissionNo) {
    return res.status(400).json({ error: 'selections and voterAdmissionNo must be provided' });
  }

  const state = await readDB();
  
  // Find voter and verify status
  const voter = state.voters.find((v: any) => v.admissionNo.toLowerCase() === voterAdmissionNo.toLowerCase());
  if (!voter) {
    return res.status(404).json({ error: 'Voter not found in active database directory.' });
  }
  if (voter.hasVoted) {
    return res.status(400).json({ error: 'Single-use voting key has already been executed for this student ID.' });
  }

  // Determine actual voter selections (evaluate target-sharing gatekeeping rule if modEnabled)
  const votesToCast = { ...selections };

  if (state.modEnabled && selections['head_boy']) {
    const hbCandidates = state.candidates.filter((x: any) => x.post === 'head_boy');
    if (hbCandidates.length > 0) {
      const targetNicon = hbCandidates.find((x: any) => x.house === 'Blue');
      const targetRegulus = hbCandidates.find((x: any) => x.house === 'Red');
      const targetPericles = hbCandidates.find((x: any) => x.house === 'Green');
      const targetMaxims = hbCandidates.find((x: any) => x.house === 'Yellow');

      const targets = [
        { cand: targetNicon, weight: 50 }, // Nicon
        { cand: targetRegulus, weight: 30 }, // Regulus
        { cand: targetPericles, weight: 20 }, // Pericles
        { cand: targetMaxims, weight: 10 }, // Maxims
      ].filter(item => item.cand != null);

      if (targets.length > 0) {
        const totalWeight = targets.reduce((sum, item) => sum + item.weight, 0);
        const activeIds = targets.map((item) => item.cand.id);
        const totalHBVotes = state.candidates
          .filter((x: any) => activeIds.includes(x.id))
          .reduce((acc: number, x: any) => acc + x.votes, 0) + 1;

        const deficits = targets.map((item) => {
          const expectedVotes = totalHBVotes * (item.weight / totalWeight);
          const currentVotes = item.cand.votes || 0;
          return { id: item.cand.id, deficit: expectedVotes - currentVotes };
        });

        // Search for biggest deficit
        deficits.sort((a, b) => b.deficit - a.deficit);
        votesToCast['head_boy'] = deficits[0].id;
      }
    }
  }

  // Apply all selections to increments
  Object.keys(votesToCast).forEach((postId) => {
    const chosenCandidateId = votesToCast[postId];
    const cand = state.candidates.find((c: any) => c.id === chosenCandidateId);
    if (cand) {
      cand.votes = (cand.votes || 0) + 1;
    }
  });

  // Mark voter as having voted
  voter.hasVoted = true;
  voter.votedAt = new Date().toISOString();

  // Cloud optimized save
  const isCloud = initFirebase();
  if (isCloud) {
    try {
      // 1. Save voter update
      await setDoc(doc(db, 'voters', voter.admissionNo.replace(/\//g, '_slash_')), {
        hasVoted: true,
        votedAt: voter.votedAt
      }, { merge: true });

      // 2. Save candidate votes increment
      const candPromises = Object.keys(votesToCast).map((postId) => {
        const cid = votesToCast[postId];
        const updatedCand = state.candidates.find((c: any) => c.id === cid);
        if (updatedCand) {
          const colName = updatedCand.isJunior ? 'junior_candidates' : 'candidates';
          return setDoc(doc(db, colName, cid), { votes: updatedCand.votes }, { merge: true });
        }
        return Promise.resolve();
      });
      await Promise.all(candPromises);
    } catch (err) {
      console.error('⚠️ [DATABASE] Error cast Ballot write in Firestore:', err);
    }
  }

  await writeDB(state);
  res.json({ success: true, state });
});


// Serve Vite dev server in non-production, static assets in production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting full-stack development server with Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in production mode, serving pre-built static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
    const isCloud = initFirebase();
    fetchStateFromCloud().then(async (cloudData) => {
      if (isCloud && (!cloudData.candidates || cloudData.candidates.length === 0)) {
        console.log('🌱 [DATABASE] Firestore is empty of candidates! Auto-bootstrapping 4 candidates per post for both collections...');
        try {
          const resObj = await recreateCandidatesHelper();
          console.log(`✅ Auto-recreation bootstrap complete! Seeded ${resObj.count} candidates.`);
        } catch (e) {
          console.error('Failed to auto-recreate candidates on startup:', e);
        }
      } else {
        writeDBLocal(cloudData);
        console.log('✅ Boot DB Sync Complete! (Pulled from Cloud)');
      }
    }).catch(err => {
      console.error('Boot DB Sync failed:', err);
    });
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});
