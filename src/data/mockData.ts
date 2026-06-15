import { Candidate, Voter, PostDefinition } from '../types';
import { derivePinForVoter, sha256Sync } from '../utils/cryptoUtils';


export const DEFAULT_POSTS: PostDefinition[] = [
  { id: 'head_boy', title: 'Head Boy', description: 'Overall student leadership, school representative, and council coordinator (Male candidates)' },
  { id: 'head_girl', title: 'Head Girl', description: 'Overall student leadership, school representative, and council coordinator (Female candidates)' },
  { id: 'sports_captain', title: 'Sports Captain', description: 'Organizing inter-house sports meets, fostering physical education, and leading squad morale' },
  { id: 'cultural_secretary', title: 'Cultural Secretary', description: 'Managing arts festivals, debater symposiums, musical galleries, and stage productions' },
];

export const HOUSE_COLORS: Record<string, { primary: string; secondary: string; shadow: string; name: string }> = {
  Red: {
    name: 'Regulus',
    primary: '#ef4444',
    secondary: '#f87171',
    shadow: 'rgba(239, 68, 68, 0.4)',
  },
  Blue: {
    name: 'Nicon',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    shadow: 'rgba(59, 130, 246, 0.4)',
  },
  Green: {
    name: 'Maxims',
    primary: '#10b981',
    secondary: '#34d399',
    shadow: 'rgba(16, 185, 129, 0.4)',
  },
  Yellow: {
    name: 'Pericles',
    primary: '#eab308',
    secondary: '#facc15',
    shadow: 'rgba(234, 179, 8, 0.4)',
  },
};

// Generates an interactive, 3D looking futuristic SVG Avatar
export function generateHologramAvatar(seed: string, house: string): string {
  const colors = HOUSE_COLORS[house] || HOUSE_COLORS.Blue;
  const prim = colors.primary;
  const sec = colors.secondary;

  // Generate some geometric shapes based on candidate seed to make them look custom
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shapeType = hash % 4; // 0: Orb, 1: Polygon, 2: Cyber-Grid, 3: Core Ring

  let innerContent = '';

  if (shapeType === 0) {
    // Holographic Orb with overlapping glowing rings
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
    // Hyper-Cube / Shield pattern
    innerContent = `
      <polygon points="100,45 145,75 145,125 100,155 55,125 55,75" fill="url(#grad2)" opacity="0.7" />
      <polygon points="100,35 155,70 155,130 100,165 45,130 45,70" fill="none" stroke="${sec}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.5">
        <animateTransform attributeName="transform" type="rotate" from="360 100 100" to="0 100 100" dur="15s" repeatCount="indefinite" />
      </polygon>
      <polygon points="100,55 135,80 135,120 100,145 65,120 65,80" fill="none" stroke="${prim}" stroke-width="2" opacity="0.9" />
    `;
  } else if (shapeType === 2) {
    // Cyber-Grid with core node
    innerContent = `
      <path d="M 60,60 L 140,140 M 60,140 L 140,60" stroke="${sec}" stroke-width="1" opacity="0.4" />
      <circle cx="100" cy="100" r="40" fill="url(#grad2)" opacity="0.6" />
      <rect x="75" y="75" width="50" height="50" rx="10" fill="none" stroke="${prim}" stroke-width="3" opacity="0.9">
        <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="90 100 100" dur="8s" repeatCount="indefinite" />
      </rect>
      <circle cx="100" cy="100" r="8" fill="${sec}" opacity="0.9" />
    `;
  } else {
    // Double Star / Plasma Ring
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
    
    <!-- Deep Space Background -->
    <rect width="100%" height="100%" fill="url(#grad1)" rx="20" />
    
    <!-- Neon grid background accent -->
    <path d="M 20,40 L 180,40 M 20,80 L 180,80 M 20,120 L 180,120 M 20,160 L 180,160" stroke="${prim}" stroke-width="0.5" opacity="0.15" />
    <path d="M 40,20 L 40,180 M 80,20 L 80,180 M 120,20 L 120,180 M 160,20 L 160,180" stroke="${prim}" stroke-width="0.5" opacity="0.15" />
    
    <!-- Rotating background lock-ring -->
    <circle cx="100" cy="100" r="75" stroke="${prim}" stroke-width="1" stroke-dasharray="4 8" fill="none" opacity="0.3">
      <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="40s" repeatCount="indefinite" />
    </circle>
    
    <!-- Main Holo Body (Rendered Interactive) -->
    ${innerContent}
    
    <!-- Scanline effect -->
    <rect x="25" y="25" width="150" height="150" rx="10" fill="none" stroke="${sec}" stroke-width="0.5" opacity="0.2" />
    
    <!-- Corner futuristic alignment vectors -->
    <path d="M 20,30 L 20,20 L 30,20" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 180,30 L 180,20 L 170,20" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 20,170 L 20,180 L 30,180" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    <path d="M 180,170 L 180,180 L 170,180" stroke="${sec}" stroke-width="2" fill="none" opacity="0.7" />
    
    <!-- Biometric HUD Text indicator -->
    <text x="100" y="182" fill="${sec}" font-family="monospace" font-size="8" text-anchor="middle" letter-spacing="1" opacity="0.8">HOLO_SYS v1.82</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_CANDIDATES: Candidate[] = [
  // --- Head Boy ---
  {
    id: 'hb-1',
    fullName: 'Alexander Vance',
    house: 'Maxims',
    post: 'head_boy',
    photo: generateHologramAvatar('Alexander Vance', 'Maxims'),
    motto: 'Empowering action over empty promises. Fostering House collaborations and civic engagement.',
    votes: 0,
  },
  {
    id: 'hb-2',
    fullName: 'Ryan Sterling',
    house: 'Yellow', // Moved to Pericles (Yellow)
    post: 'head_boy',
    photo: generateHologramAvatar('Ryan Sterling', 'Yellow'),
    motto: 'Unifying classes under a single vision. Streamlining grievance procedures and tech infrastructure.',
    votes: 0,
  },
  {
    id: 'hb-3',
    fullName: 'Vikram Aditya',
    house: 'Green',
    post: 'head_boy',
    photo: generateHologramAvatar('Vikram Aditya', 'Green'),
    motto: 'Leadership with integrity. Elevating community service, environmental drives, and design thinking.',
    votes: 0,
  },
  {
    id: 'hb-4',
    fullName: 'Prince Yadav',
    house: 'Blue', // Moved to Nicon (Blue)
    post: 'head_boy',
    photo: generateHologramAvatar('Prince Yadav', 'Blue'),
    motto: 'Fostering excellence, transparency, and a strong student voice across all Houses.',
    votes: 0,
  },

  // --- Head Girl ---
  {
    id: 'hg-1',
    fullName: 'Elena Rostova',
    house: 'Blue',
    post: 'head_girl',
    photo: generateHologramAvatar('Elena Rostova', 'Blue'),
    motto: 'Reimagining leadership with complete transparency, academic-social balance, and inclusive representation.',
    votes: 0,
  },
  {
    id: 'hg-2',
    fullName: 'Sophia Patel',
    house: 'Yellow',
    post: 'head_girl',
    photo: generateHologramAvatar('Sophia Patel', 'Yellow'),
    motto: 'Nurturing talent, organizing student guilds, and establishing peer-led support systems for exams.',
    votes: 0,
  },
  {
    id: 'hg-3',
    fullName: 'Meera Nair',
    house: 'Green',
    post: 'head_girl',
    photo: generateHologramAvatar('Meera Nair', 'Green'),
    motto: 'Sustainability at the core. Pushing for campus carbon-neutrality and active mental welfare channels.',
    votes: 0,
  },
  {
    id: 'hg-4',
    fullName: 'Zoe Carter',
    house: 'Maxims',
    post: 'head_girl',
    photo: generateHologramAvatar('Zoe Carter', 'Maxims'),
    motto: 'Fostering safe spaces, interactive peer mental-health help, and student voice representation.',
    votes: 0,
  },

  // --- Sports Captain ---
  {
    id: 'sc-1',
    fullName: 'Marcus Kane',
    house: 'Maxims',
    post: 'sports_captain',
    photo: generateHologramAvatar('Marcus Kane', 'Maxims'),
    motto: 'Instilling house pride, organizing weekly bootcamps, and providing adaptive coaching models.',
    votes: 0,
  },
  {
    id: 'sc-2',
    fullName: 'Clara Oswald',
    house: 'Yellow',
    post: 'sports_captain',
    photo: generateHologramAvatar('Clara Oswald', 'Yellow'),
    motto: 'Diversifying sports, introducing e-athletics, and developing premium inter-house tournament grids.',
    votes: 0,
  },
  {
    id: 'sc-3',
    fullName: 'Ethan Hunt',
    house: 'Blue',
    post: 'sports_captain',
    photo: generateHologramAvatar('Ethan Hunt', 'Blue'),
    motto: 'Revamping training fields, modernizing health analytics, and adding daily workout plans.',
    votes: 0,
  },
  {
    id: 'sc-4',
    fullName: 'Sarah Jenkins',
    house: 'Green',
    post: 'sports_captain',
    photo: generateHologramAvatar('Sarah Jenkins', 'Green'),
    motto: 'Encouraging mixed-gender leagues, high-intensity intervals, and premium tracking gear.',
    votes: 0,
  },

  // --- Cultural Secretary ---
  {
    id: 'cs-1',
    fullName: 'Tariq Al-Faye',
    house: 'Green',
    post: 'cultural_secretary',
    photo: generateHologramAvatar('Tariq Al-Faye', 'Green'),
    motto: 'A platform for real creators. Introducing high-tech digital design, cinema nights, and electronic music.',
    votes: 0,
  },
  {
    id: 'cs-2',
    fullName: 'Aria Takahashi',
    house: 'Blue',
    post: 'cultural_secretary',
    photo: generateHologramAvatar('Aria Takahashi', 'Blue'),
    motto: 'Unleashing creative limits. Melding physical fine arts, slam poetry clubs, and theater symposia.',
    votes: 0,
  },
  {
    id: 'cs-3',
    fullName: 'Zendaya Maree',
    house: 'Maxims',
    post: 'cultural_secretary',
    photo: generateHologramAvatar('Zendaya Maree', 'Maxims'),
    motto: 'Expanding inter-school dance tournaments, street art workshops, and film editing bootcamps.',
    votes: 0,
  },
  {
    id: 'cs-4',
    fullName: 'Aiden Cross',
    house: 'Yellow',
    post: 'cultural_secretary',
    photo: generateHologramAvatar('Aiden Cross', 'Yellow'),
    motto: 'Cultivating digital orchestrations, visual production masterclasses, and music production suites.',
    votes: 0,
  },
];

const generateVoters = (): Voter[] => {
  const votersList: Voter[] = [];
  for (let i = 1001; i <= 1500; i++) {
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

export const DEFAULT_VOTERS: Voter[] = generateVoters();
