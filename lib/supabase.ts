import { createClient } from '@supabase/supabase-js';

// Initialize the client once as a constant
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Export this specific constant
export const supabase = createClient(supabaseUrl, supabaseAnonKey);