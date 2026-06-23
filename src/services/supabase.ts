import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing. ' +
    'Please configure them in a .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Converts a simple custom username (e.g. "vendedor01")
 * into a unique mock email address compatible with Supabase Auth.
 */
export const formatUsernameToEmail = (username: string): string => {
  const cleanUsername = username.trim().toLowerCase();
  // Standardize with a dedicated domain
  return `${cleanUsername}@pesquisa.guaracamp.pwa`;
};
