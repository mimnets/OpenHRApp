import PocketBase from 'pocketbase';
import { getDatabaseUrl } from '../config/database';

/**
 * PocketBase Client Service
 * 
 * Initializes the PocketBase client using the configuration
 * defined in config/database.ts
 */

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

// Resolve Configuration from the config module
const dbConfig = getDatabaseUrl();
const finalUrl = getCleanUrl(dbConfig.url);

// Initialize the PocketBase client
export const pb = finalUrl ? new PocketBase(finalUrl) : null;

if (pb) {
  // CRITICAL: Disable autoCancellation to prevent concurrent requests from killing each other
  pb.autoCancellation(false);
}

// In this strict mode, we always return true because the URL is hardcoded in config/database.ts
export const isPocketBaseConfigured = () => {
  return true; 
};

// Export the config getter for UI components that need to display it
export const getPocketBaseConfig = () => {
  return getDatabaseUrl();
};

// This function is kept for compatibility but does nothing in Hardcoded mode
export const updatePocketBaseConfig = (_newConfig: unknown, _shouldReload = true) => {
  console.log("Configuration is managed by the build, not user settings.");
};
