import PocketBase from 'https://esm.sh/pocketbase@0.25.0';

/**
 * PocketBase Configuration Service
 * Optimized for Production Builds
 */

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
  // Priority 1: Environment Variable (Injected at Build Time)
  if (ENV_POCKETBASE_URL && ENV_POCKETBASE_URL.length > 5) {
    return { url: ENV_POCKETBASE_URL, source: 'ENV' };
  }

  // Priority 2: localStorage (Manual Runtime Override)
  const saved = localStorage.getItem('pocketbase_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.url) return parsed;
    } catch (e) {
      console.error("Failed to parse local PocketBase config", e);
    }
  }

  // Priority 3: Development Fallback - https://pbase.vclbd.net / https://pocketbase.mimnets.com
  return {
    url: 'https://pbase.vclbd.net',
    source: 'NONE'
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

export const isPocketBaseConfigured = () => {
  const currentConfig = getPocketBaseConfig();
  return !!(currentConfig.url && currentConfig.url.trim().length > 5);
};

export const updatePocketBaseConfig = (newConfig: any, shouldReload = true) => {
  const finalConfig = {
    ...newConfig,
    url: getCleanUrl(newConfig.url)
  };
  localStorage.setItem('pocketbase_config', JSON.stringify(finalConfig));
  if (shouldReload) window.location.reload();
};