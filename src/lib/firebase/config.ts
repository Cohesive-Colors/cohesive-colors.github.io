/**
 * Firebase is optional. With no env vars the app runs exactly as before —
 * local seed feed, likes kept in this browser — so a clone without secrets
 * still works and the dev server never blocks on network.
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
}

const env = import.meta.env;

export const FIREBASE_CONFIG: FirebaseConfig | null =
  env.PUBLIC_FIREBASE_API_KEY && env.PUBLIC_FIREBASE_DATABASE_URL
    ? {
        apiKey: env.PUBLIC_FIREBASE_API_KEY,
        authDomain: env.PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        databaseURL: env.PUBLIC_FIREBASE_DATABASE_URL,
        projectId: env.PUBLIC_FIREBASE_PROJECT_ID ?? '',
        appId: env.PUBLIC_FIREBASE_APP_ID ?? '',
      }
    : null;

export const isFirebaseConfigured = FIREBASE_CONFIG !== null;
