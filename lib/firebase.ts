import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Validate required Firebase environment variables
const requiredEnvVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const envVarNames: Record<string, string> = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => envVarNames[key]);

if (missingVars.length > 0) {
  const errorMessage = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                   🔥 FIREBASE CONFIGURATION ERROR 🔥                      ║
╚═══════════════════════════════════════════════════════════════════════════╝

Missing required Firebase environment variables:
${missingVars.map(v => `  ❌ ${v}`).join('\n')}

📝 To fix this:

1. Copy the example environment file:
   cp .env.example .env.local

2. Get your Firebase credentials:
   → Go to https://console.firebase.google.com/
   → Select your project (or create a new one)
   → Click the gear icon ⚙️  → Project Settings
   → Scroll to "Your apps" → Click on your web app (or add one)
   → Copy the config values

3. Add them to .env.local:
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   ... (and the rest)

4. Restart the development server:
   npm run dev

For more details, see: README.md

═══════════════════════════════════════════════════════════════════════════
`;
  
  if (typeof window === 'undefined') {
    // Server-side: log to console
    console.error(errorMessage);
  } else {
    // Client-side: show in browser console and alert
    console.error(errorMessage);
  }
  
  throw new Error(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

