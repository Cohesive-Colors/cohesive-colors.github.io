import { shortAge } from '@/lib/time';

/** The site renders ages against a fixed build date; the app has a real clock. */
export const age = (iso: string) => shortAge(iso, Date.now());
