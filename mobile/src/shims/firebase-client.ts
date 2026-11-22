/**
 * Mobile stand-in for `src/lib/firebase/client.ts`.
 *
 * The one real difference from the web version is auth persistence. On the web
 * Firebase keeps the anonymous user in IndexedDB; in React Native it would keep
 * it in memory only, so every app launch would sign in as a NEW anonymous user
 * — and a new uid can like the same palette again. AsyncStorage persistence
 * keeps one uid per install, which is what the database rules assume.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';
import { FIREBASE_CONFIG } from './firebase-config';

interface Handles {
  db: Database;
  auth: Auth;
  uid: string;
}

let pending: Promise<Handles | null> | null = null;

export function getFirebase(): Promise<Handles | null> {
  if (pending) return pending;
  if (!FIREBASE_CONFIG) return Promise.resolve(null);

  pending = (async () => {
    try {
      const [{ initializeApp, getApps }, authMod, dbMod] = await Promise.all([
        import('firebase/app'),
        import('@firebase/auth'),
        import('firebase/database'),
      ]);

      const existing = getApps()[0];
      const app = existing ?? initializeApp(FIREBASE_CONFIG);

      let auth: Auth;
      if (existing) {
        auth = authMod.getAuth(app) as unknown as Auth;
      } else if (Platform.OS === 'web') {
        auth = authMod.initializeAuth(app, {
          persistence: authMod.browserLocalPersistence,
        }) as unknown as Auth;
      } else {
        auth = authMod.initializeAuth(app, {
          // Exported only from the react-native build of @firebase/auth.
          persistence: (authMod as unknown as RnAuth).getReactNativePersistence(AsyncStorage),
        }) as unknown as Auth;
      }

      // Wait for the persisted user to load before deciding to sign in again.
      await (auth as unknown as { authStateReady: () => Promise<void> }).authStateReady();
      const user = auth.currentUser ?? (await authMod.signInAnonymously(auth as never)).user;
      const db = dbMod.getDatabase(app);
      return { db, auth, uid: user.uid };
    } catch (error) {
      console.warn('[cohesive-colors] Firebase unavailable, staying local:', error);
      pending = null; // allow a retry on the next call, e.g. after going online
      return null;
    }
  })();

  return pending;
}

interface RnAuth {
  getReactNativePersistence: (storage: typeof AsyncStorage) => never;
}
