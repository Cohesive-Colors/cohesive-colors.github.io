import type { Auth } from 'firebase/auth';
import type { Database } from 'firebase/database';
import { FIREBASE_CONFIG } from './config';

interface Handles {
  db: Database;
  auth: Auth;
  uid: string;
}

let pending: Promise<Handles | null> | null = null;

/**
 * Loads the SDK on first use and signs in anonymously.
 *
 * Dynamic imports keep ~150 KB of Firebase out of the initial bundle: the feed
 * renders from the static seed immediately and upgrades to live data once this
 * resolves. Returns null when Firebase is not configured or sign-in fails, and
 * every caller treats null as "stay local".
 */
export function getFirebase(): Promise<Handles | null> {
  if (pending) return pending;
  if (!FIREBASE_CONFIG || typeof window === 'undefined') return Promise.resolve(null);

  pending = (async () => {
    try {
      const [{ initializeApp, getApps }, authMod, dbMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/database'),
      ]);

      const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      const db = dbMod.getDatabase(app);

      const user = auth.currentUser ?? (await authMod.signInAnonymously(auth)).user;
      return { db, auth, uid: user.uid };
    } catch (error) {
      console.warn('[cohesive-colors] Firebase unavailable, staying local:', error);
      return null;
    }
  })();

  return pending;
}
