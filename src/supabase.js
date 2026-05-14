import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = supabaseUrl && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('your-project');

export const supabase = (supabaseUrl && supabaseAnonKey && isValidUrl)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;