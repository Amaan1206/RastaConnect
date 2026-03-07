import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://swxocqjjfyfhwacioanc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_V300DA7k688pqzKkBUYFdA_KSPnvkl0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
