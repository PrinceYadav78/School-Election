const fs = require('fs');

const INITIAL_POSTS = [
  { id: 'head_boy', title: 'Head Boy', description: 'Overall student leadership, school representative, and council coordinator (Male candidates)' },
  { id: 'head_girl', title: 'Head Girl', description: 'Overall student leadership, school representative, and council coordinator (Female candidates)' },
  { id: 'school_captain', title: 'School Captain', description: 'School representative' },
  { id: 'school_vice_captain', title: 'School Vice Captain', description: 'School assistant representative' },
  { id: 'house_captain_maxims', title: 'House Captain (Maxims)', description: 'House leadership' },
  { id: 'house_captain_nicon', title: 'House Captain (Nicon)', description: 'House leadership' },
  { id: 'house_captain_green', title: 'House Captain (Green)', description: 'House leadership' },
  { id: 'house_captain_pericles', title: 'House Captain (Pericles)', description: 'House leadership' },
  { id: 'house_vice_captain_maxims', title: 'House Vice Captain (Maxims)', description: 'House vice leadership' },
  { id: 'house_vice_captain_nicon', title: 'House Vice Captain (Nicon)', description: 'House vice leadership' },
  { id: 'house_vice_captain_green', title: 'House Vice Captain (Green)', description: 'House vice leadership' },
  { id: 'house_vice_captain_pericles', title: 'House Vice Captain (Pericles)', description: 'House vice leadership' },
  { id: 'house_prefect_maxims', title: 'House Prefects (Maxims)', description: 'House discipline' },
  { id: 'house_prefect_nicon', title: 'House Prefects (Nicon)', description: 'House discipline' },
  { id: 'house_prefect_green', title: 'House Prefects (Green)', description: 'House discipline' },
  { id: 'house_prefect_pericles', title: 'House Prefects (Pericles)', description: 'House discipline' },
  { id: 'sports_captain', title: 'Sports Captain', description: 'Organizing inter-house sports meets' },
  { id: 'sports_vice_captain', title: 'Sports Vice Captain', description: 'Managing sports gear and fields' }
];

const mockCands = [];

function generateHologramAvatar(seed, house) {
    return ""; // Mocked
}

const db = JSON.parse(fs.readFileSync('src/data/database.json', 'utf8'));
db.posts = INITIAL_POSTS;
// remove cultural secretary candidates
db.candidates = db.candidates.filter(c => c.post !== 'cultural_secretary');

fs.writeFileSync('src/data/database.json', JSON.stringify(db, null, 2));
console.log("Updated database.json posts list and removed cult sec candidates.");

