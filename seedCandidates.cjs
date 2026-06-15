const fs = require('fs');

const HOUSE_COLORS = {
  Red: { primary: '#ef4444', secondary: '#f87171' },
  Blue: { primary: '#3b82f6', secondary: '#60a5fa' },
  Green: { primary: '#10b981', secondary: '#34d399' },
  Yellow: { primary: '#eab308', secondary: '#facc15' },
};

function generateHologramAvatar(seed, house) {
  const colors = HOUSE_COLORS[house] || HOUSE_COLORS.Blue;
  const prim = colors.primary;
  const sec = colors.secondary;
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20200%22%20width%3D%22100%25%22%20height%3D%22100%25%22%3E%0A%20%20%20%20%3Cdefs%3E%0A%20%20%20%20%20%20%3CradialGradient%20id%3D%22grad1%22%20cx%3D%2250%25%22%20cy%3D%2250%25%22%20r%3D%2250%25%22%20fx%3D%2230%25%22%20fy%3D%2230%25%22%3E%0A%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23111827%22%20%2F%3E%0A%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23030712%22%20%2F%3E%0A%20%20%20%20%20%20%3C%2FradialGradient%3E%0A%20%20%20%20%20%20%3ClinearGradient%20id%3D%22grad2%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%22100%25%22%3E%0A%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23${prim.replace('#', '')}%22%20stop-opacity%3D%220.8%22%20%2F%3E%0A%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%2250%25%22%20stop-color%3D%22%23${sec.replace('#', '')}%22%20stop-opacity%3D%220.4%22%20%2F%3E%0A%20%20%20%20%20%20%20%20%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23000000%22%20stop-opacity%3D%220.1%22%20%2F%3E%0A%20%20%20%20%20%20%3C%2FlinearGradient%3E%0A%20%20%20%20%3C%2Fdefs%3E%0A%20%20%20%20%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22url(%23grad1)%22%20rx%3D%2220%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2020%2C40%20L%20180%2C40%20M%2020%2C80%20L%20180%2C80%20M%2020%2C120%20L%20180%2C120%20M%2020%2C160%20L%20180%2C160%22%20stroke%3D%22%23${prim.replace('#', '')}%22%20stroke-width%3D%220.5%22%20opacity%3D%220.15%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2040%2C20%20L%2040%2C180%20M%2080%2C20%20L%2080%2C180%20M%20120%2C20%20L%20120%2C180%20M%20160%2C20%20L%20160%2C180%22%20stroke%3D%22%23${prim.replace('#', '')}%22%20stroke-width%3D%220.5%22%20opacity%3D%220.15%22%20%2F%3E%0A%20%20%20%20%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2275%22%20stroke%3D%22%23${prim.replace('#', '')}%22%20stroke-width%3D%221%22%20stroke-dasharray%3D%224%208%22%20fill%3D%22none%22%20opacity%3D%220.3%22%3E%0A%20%20%20%20%20%20%3CanimateTransform%20attributeName%3D%22transform%22%20type%3D%22rotate%22%20from%3D%220%20100%20100%22%20to%3D%22360%20100%20100%22%20dur%3D%2240s%22%20repeatCount%3D%22indefinite%22%20%2F%3E%0A%20%20%20%20%3C%2Fcircle%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2245%22%20fill%3D%22url(%23grad2)%22%20opacity%3D%220.8%22%20%2F%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2255%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20stroke-dasharray%3D%2210%205%22%20opacity%3D%220.6%22%3E%0A%20%20%20%20%20%20%20%20%3CanimateTransform%20attributeName%3D%22transform%22%20type%3D%22rotate%22%20from%3D%220%20100%20100%22%20to%3D%22360%20100%20100%22%20dur%3D%2220s%22%20repeatCount%3D%22indefinite%22%20%2F%3E%0A%20%20%20%20%20%20%3C%2Fcircle%3E%0A%20%20%20%20%20%20%3Ccircle%20cx%3D%22100%22%20cy%3D%22100%22%20r%3D%2230%22%20fill%3D%22none%22%20stroke%3D%22%23${prim.replace('#', '')}%22%20stroke-width%3D%223%22%20opacity%3D%220.9%22%20%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M%2070%2C100%20L%20130%2C100%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%221%22%20opacity%3D%220.5%22%20%2F%3E%0A%20%20%20%20%20%20%3Cpath%20d%3D%22M%20100%2C70%20L%20100%2C130%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%221%22%20opacity%3D%220.5%22%20%2F%3E%0A%20%20%20%20%3Crect%20x%3D%2225%22%20y%3D%2225%22%20width%3D%22150%22%20height%3D%22150%22%20rx%3D%2210%22%20fill%3D%22none%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%220.5%22%20opacity%3D%220.2%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2020%2C30%20L%2020%2C20%20L%2030%2C20%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20opacity%3D%220.7%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%20180%2C30%20L%20180%2C20%20L%20170%2C20%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20opacity%3D%220.7%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%2020%2C170%20L%2020%2C180%20L%2030%2C180%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20opacity%3D%220.7%22%20%2F%3E%0A%20%20%20%20%3Cpath%20d%3D%22M%20180%2C170%20L%20180%2C180%20L%20170%2C180%22%20stroke%3D%22%23${sec.replace('#', '')}%22%20stroke-width%3D%222%22%20fill%3D%22none%22%20opacity%3D%220.7%22%20%2F%3E%0A%20%20%20%20%3Ctext%20x%3D%22100%22%20y%3D%22182%22%20fill%3D%22%23${sec.replace('#', '')}%22%20font-family%3D%22monospace%22%20font-size%3D%228%22%20text-anchor%3D%22middle%22%20letter-spacing%3D%221%22%20opacity%3D%220.8%22%3EHOLO_SYS%20v1.82%3C%2Ftext%3E%0A%20%20%3C%2Fsvg%3E`;
}

const db = JSON.parse(fs.readFileSync('src/data/database.json', 'utf8'));

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
function getName() {
  const result = names[nameIdx++] + " " + names[nameIdx++];
  if(nameIdx > 100) nameIdx = 0;
  return result;
}

const houses = ['Red', 'Blue', 'Green', 'Yellow'];
const generalPosts = ['head_boy', 'head_girl', 'school_captain', 'school_vice_captain', 'sports_captain', 'sports_vice_captain'];

const housePosts = [
  { prefix: 'house_captain_', postName: 'House Captain' },
  { prefix: 'house_vice_captain_', postName: 'House Vice Captain' },
  { prefix: 'house_prefects_', postName: 'House Prefects' }
];

let cands = [];
let idCounter = 1;

// General Posts
for (const p of generalPosts) {
  for (const h of houses) {
    const fullName = getName();
    cands.push({
      id: `cand_${idCounter++}`,
      fullName,
      house: h,
      post: p,
      photo: generateHologramAvatar(fullName, h),
      motto: 'Leadership and dedication for all.',
      votes: 0
    });
  }
}

// House Posts
for (const hp of housePosts) {
  for (const h of houses) {
    let houseSuffix = h === 'Yellow' ? 'pericles' : h === 'Blue' ? 'nicon' : h === 'Green' ? 'maxims' : 'regulus';
    const postId = `${hp.prefix}${houseSuffix}`;
    for (let i = 0; i < 4; i++) {
        const fullName = getName();
        cands.push({
            id: `cand_${idCounter++}`,
            fullName,
            house: h,
            post: postId,
            photo: generateHologramAvatar(fullName, h),
            motto: `${hp.postName} working for ${h} pride.`,
            votes: 0
        });
    }
  }
}

db.candidates = cands;
fs.writeFileSync('src/data/database.json', JSON.stringify(db, null, 2));

console.log(`Generated ${cands.length} candidates.`);
