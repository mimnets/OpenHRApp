/**
 * Database Connection Configuration
 *
 * Supabase is the backend (migrated from PocketBase, May 2026).
 * The old PocketBase PRODUCTION_URL and config resolution are kept here
 * only for backward compatibility — pocketbase.ts is now a stub.
 *
 * All active backend operations go through src/services/supabase.ts.
 */

// Legacy PocketBase URL — NOT the active backend.
// Supabase URL is configured via VITE_SUPABASE_URL in .env.
export const PRODUCTION_URL = '';

// Environment Variable Detection (Supabase)
export const getEnvUrl = () => {
  const metaEnv = (import.meta as any).env;
  const procEnv = typeof process !== 'undefined' ? process.env : {};

  return (
    metaEnv?.VITE_SUPABASE_URL ||
    procEnv?.VITE_SUPABASE_URL ||
    ''
  );
};

// Configuration Resolver
export const getDatabaseUrl = () => {
  const envUrl = getEnvUrl();

  if (envUrl && envUrl.length > 5) {
    return { url: envUrl, source: 'ENV' };
  }

  return { url: '', source: 'MISSING' };
};
