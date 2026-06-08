// PocketBase stub — migrated to Supabase (2026-05).
// Kept for backward compatibility with remaining references to isPocketBaseConfigured / pb.
// All backend operations now go through src/services/supabase.ts.

export const pb = null;

export const isPocketBaseConfigured = (): boolean => {
  // Always return true — backend is Supabase which is always configured.
  return true;
};

export const getPocketBaseConfig = () => {
  return { url: '', source: 'SUPABASE' };
};

export const updatePocketBaseConfig = (_newConfig: unknown, _shouldReload = true) => {
  console.log('Backend is Supabase — config managed via environment variables.');
};
