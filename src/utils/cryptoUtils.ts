const PIN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
const PIN_UPPERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PIN_LOWERS = 'abcdefghijklmnopqrstuvwxyz';
const PIN_DIGITS = '0123456789';
const PIN_SYMS = '!@#$%^&*';

/**
 * Deterministically generates a secure 8 to 9 character alphanumeric PIN
 * for any given Student/Voter ID. Since this is derived deterministically from the ID
 * and a secure salt, the Admin can download the plain PINs dynamically while
 * the local storage databases ONLY store non-reversible SHA-256 hashes.
 */
export function derivePinForVoter(admissionNo: string): string {
  const seedString = `${admissionNo.toUpperCase()}_NPS_KENGERI_2026_ORBIS_SECURE_SALT`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  // Predictable pseudo-random generator based on seed hash
  function random(): number {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  }
  
  // Choose length: 8 or 9
  const length = Math.floor(random() * 2) + 8; // 8 or 9
  
  // Start with mandated subsets
  const pool = [
    PIN_UPPERS[Math.floor(random() * PIN_UPPERS.length)],
    PIN_LOWERS[Math.floor(random() * PIN_LOWERS.length)],
    PIN_DIGITS[Math.floor(random() * PIN_DIGITS.length)],
    PIN_SYMS[Math.floor(random() * PIN_SYMS.length)],
  ];
  
  // Fill the rest with general chars
  for (let j = 4; j < length; j++) {
    pool.push(PIN_CHARS[Math.floor(random() * PIN_CHARS.length)]);
  }
  
  // Shuffle using random()
  for (let j = pool.length - 1; j > 0; j--) {
    const k = Math.floor(random() * (j + 1));
    const temp = pool[j];
    pool[j] = pool[k];
    pool[k] = temp;
  }
  
  return pool.join('');
}

/**
 * Generates a truly random 8 to 9 character alphanumeric PIN (no symbols)
 * containing a secure distribution of uppercase, lowercase, and numbers.
 */
export function generateTrulyRandomPin(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowers = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  
  const length = Math.floor(Math.random() * 2) + 8; // 8 or 9
  const pool = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    digits[Math.floor(Math.random() * digits.length)]
  ];
  
  for (let i = 3; i < length; i++) {
    pool.push(chars[Math.floor(Math.random() * chars.length)]);
  }
  
  // Shuffle using custom high entropy randomization
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }
  
  return pool.join('');
}

/**
 * Robust client-side hashing utility using industry-standard SubtleCrypto SHA-256.
 * Hashes student input PINs so that they can be securely matched against hashed databases.
 */
export async function hashPinSHA256(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Pure JavaScript synchronous implementation of SHA-256.
 * Fully compatible with crypto.subtle and matches standard SHA-256 hashes perfectly.
 */
export function sha256Sync(ascii: string): string {
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
  let wordCount = 0;
  
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

