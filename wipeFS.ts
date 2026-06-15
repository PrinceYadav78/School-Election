import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, deleteDoc, doc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';

async function wipeFirestore() {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(configData);
  const db = getFirestore(app, configData.firestoreDatabaseId);

  const collectionsToWipe = ['posts', 'candidates'];
  
  for (const cName of collectionsToWipe) {
    const snap = await getDocs(collection(db, cName));
    console.log(`Deleting ${snap.size} docs from ${cName}`);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  
  // also need to write the new ones
  console.log("Wiped posts and candidates in firestore.");

  // now force the server to rewrite
}

wipeFirestore().catch(console.error);
