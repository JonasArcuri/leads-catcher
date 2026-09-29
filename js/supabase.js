import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey, isConfigured } from './config.js';

export const supabase = isConfigured ? createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null;
