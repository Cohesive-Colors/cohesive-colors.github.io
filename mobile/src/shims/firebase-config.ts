/**
 * Mobile stand-in for `src/lib/firebase/config.ts` (swapped in by metro.config.js
 * and tsconfig paths). Same exports, but read from EXPO_PUBLIC_* variables —
 * Expo inlines those at build time, the way Astro inlines PUBLIC_*.
 *
 * Each variable must be read as a literal `process.env.EXPO_PUBLIC_X`, or Expo
 * cannot inline it.
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
}

const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;

export const FIREBASE_CONFIG: FirebaseConfig | null =
  apiKey && databaseURL
    ? {
        apiKey,
        authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        databaseURL,
        projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
        appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
      }
    : null;

export const isFirebaseConfigured = FIREBASE_CONFIG !== null;
