
import PocketBase from 'https://esm.sh/pocketbase@0.25.0';

/**
 * PocketBase Configuration Service
 * Optimized for Production Builds
 */

// 1. DEFINE YOUR PRODUCTION URL HERE
// This is the "Right Way" to set it if you aren't using .env files. https://pbase.vclbd.net and https://pocketbase.mimnets.com
const PRODUCTION_URL = 'https://pocketbase.mimnets.com'; 

// Detect environment variables across different bundlers (Vite/CRA)
const getEnvUrl = () => {
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

const ENV_POCKETBASE_URL = getEnvUrl();

export const getPocketBaseConfig = () => {
  // Priority 1: Environment Variable (CI/CD / Build Time)
  if (ENV_POCKETBASE_URL && ENV_POCKETBASE_URL.length > 5) {
    return { url: ENV_POCKETBASE_URL, source: 'ENV' };
  }

  // Priority 2: Hardcoded Production URL (The "Simple" Right Way)
  return {
    url: PRODUCTION_URL,
    source: 'HARDCODED'
  };
};

const getCleanUrl = (url: string) => {
  if (!url) return '';
  
  // Normalize whitespace and remove trailing slashes
  let cleaned = url.trim().replace(/\/+$/, '');
  
  // Strip trailing /api if added manually (SDK appends it)
  cleaned = cleaned.replace(/\/api$/, '');

  // Force HTTPS in production unless it's a local/development IP
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    const isLocal = cleaned.includes('localhost') || cleaned.includes('127.0.0.1') || cleaned.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
    cleaned = (isLocal ? 'http://' : 'https://') + cleaned;
  }
  
  return cleaned;
};

const config = getPocketBaseConfig();
const finalUrl = getCleanUrl(config.url);

// Initialize the PocketBase client
export const pb = finalUrl ? new PocketBase(finalUrl) : null;

if (pb) {
  // CRITICAL: Disable autoCancellation to prevent concurrent requests from killing each other
  pb.autoCancellation(false);
}

// In this strict mode, we always return true because the URL is hardcoded.
export const isPocketBaseConfigured = () => {
  return true; 
};

// This function is kept for compatibility but does nothing in Hardcoded mode
export const updatePocketBaseConfig = (newConfig: any, shouldReload = true) => {
  console.log("Configuration is managed by the build, not user settings.");
};
