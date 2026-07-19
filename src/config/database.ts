/**
 * Database Connection Configuration
 *
 * Supabase is the backend. The Supabase URL is configured via
 * VITE_SUPABASE_URL in .env.
 */

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
