import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, deleteDoc, writeBatch, doc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

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

const names = [
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
function getUniqueFullName(isJunior: boolean): string {
  const first = names[nameIdx % names.length];
  nameIdx++;
  const last = names[nameIdx % names.length];
  nameIdx++;
  return `${first} ${last}${isJunior ? ' Jr.' : ''}`;
}

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

const houses = ['Red', 'Blue', 'Green', 'Yellow'];
const generalPosts = ['head_boy', 'head_girl', 'school_captain', 'school_vice_captain', 'sports_captain', 'sports_vice_captain'];

// Mappings from house name to suffix
const houseToSuffix: Record<string, string> = {
  Red: 'regulus',
  Blue: 'nicon',
  Green: 'maxims',
  Yellow: 'pericles'
};

async function seedData() {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error("No firebase config found.");
    process.exit(1);
  }
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(configData);
  const db = getFirestore(app, configData.firestoreDatabaseId);

  console.log("Wiping existing 'candidates' and 'junior_candidates' databases...");
  
  // Wipe candidates in optimized batches
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
  console.log(`Deleted ${deleteCount} documents from 'candidates' collection.`);

  // Wipe junior_candidates in optimized batches
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
  console.log(`Deleted ${deleteCount} documents from 'junior_candidates' collection.`);

  const allGeneratedCandidates: any[] = [];
  
  // Set up write batches for insertions, capped at 400 operations per batch
  let insertBatch = writeBatch(db);
  let insertCount = 0;

  let candCounter = 1;

  // We generate candidates for both Senior and Junior context.
  for (const isJunior of [false, true]) {
    const contextTag = isJunior ? 'jr' : 'sr';
    
    // 1. General Posts - exactly 4 candidates per post (one for each house)
    for (const p of generalPosts) {
      for (const h of houses) {
        const fullName = getUniqueFullName(isJunior);
        const candId = `cand_${contextTag}_${candCounter++}`;
        const newCand = {
          fullName,
          house: h,
          post: p,
          photo: generateHologramAvatar(fullName, h),
          motto: isJunior ? 'Junior student leadership ready.' : 'Leadership and dedication for all.',
          votes: 0,
          isJunior
        };
        allGeneratedCandidates.push({ id: candId, ...newCand });

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

    // 2. House Posts - exactly 4 candidates for each specific house post
    const housePostPrefixes = ['house_captain_', 'house_vice_captain_', 'house_prefects_'];

    for (const prefix of housePostPrefixes) {
      for (const h of houses) {
        const suffix = houseToSuffix[h];
        if (!suffix) continue;
        const postId = `${prefix}${suffix}`;

        // Create exactly 4 candidates for this post (all must be in house `h`)
        for (let i = 0; i < 4; i++) {
          const fullName = getUniqueFullName(isJunior);
          const candId = `cand_${contextTag}_${candCounter++}`;
          const newCand = {
            fullName,
            house: h,
            post: postId,
            photo: generateHologramAvatar(fullName, h),
            motto: `${prefix.replaceAll('_', ' ').trim()} role for ${h} house pride.`,
            votes: 0,
            isJunior
          };
          allGeneratedCandidates.push({ id: candId, ...newCand });

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

  if (insertCount % 400 !== 0) {
    await insertBatch.commit();
  }

  console.log(`Saved ${allGeneratedCandidates.length} high-fidelity candidates in Firestore.`);

  // Also, we update the local persistent cache database.json
  const dbPath = path.join(process.cwd(), 'src', 'data', 'database.json');
  if (fs.existsSync(dbPath)) {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    data.candidates = allGeneratedCandidates;
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    console.log("Successfully updated local src/data/database.json.");
  }
}

seedData().catch(console.error);
