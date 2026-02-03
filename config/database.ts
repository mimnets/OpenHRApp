
/**
 * Database Connection Configuration
 * 
 * Centralized location for managing the PocketBase instance URL.
 * Change PRODUCTION_URL to point to your specific backend instance.
 */

// 1. DEFINE YOUR PRODUCTION URL HERE: https://pocketbase.mimnets.com and https://pbase.vclbd.net
export const PRODUCTION_URL = 'https://pbase.vclbd.net';

// 2. Environment Variable Detection
export const getEnvUrl = () => {
  const metaEnv = (import.meta as any).env;
  const procEnv = typeof process !== 'undefined' ? process.env : {};

  return (
    metaEnv?.VITE_POCKETBASE_URL || 
    metaEnv?.REACT_APP_POCKETBASE_URL || 
    procEnv?.VITE_POCKETBASE_URL || 
    procEnv?.REACT_APP_POCKETBASE_URL || 
    ''
  );
};

// 3. Configuration Resolver
export const getDatabaseUrl = () => {
  const envUrl = getEnvUrl();
  
  // Priority 1: Environment Variable (CI/CD / Build Time)
  if (envUrl && envUrl.length > 5) {
    return { url: envUrl, source: 'ENV' };
  }

  // Priority 2: Hardcoded Production URL
  return {
    url: PRODUCTION_URL,
    source: 'HARDCODED'
  };
};
