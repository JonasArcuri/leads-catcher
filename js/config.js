const env = import.meta.env ?? {};
export const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? '';
export const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

function isPublicKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role === 'anon';
  } catch { return false; }
}

export const isConfigured = /^https:\/\/[\w.-]+(?::\d+)?\/?$/.test(supabaseUrl) && isPublicKey(supabaseKey);
