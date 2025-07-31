import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://dggmyssboghmwytvuuqq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ215c3Nib2dobXd5dHZ1dXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5Nzc5NTksImV4cCI6MjA2OTU1Mzk1OX0.0z6fhbbSTLu5xnU9D9wt7yrw-_7c58InfYrcNWWEkTE";

export function getSupabaseClient(serviceRoleKey?: string) {
  const key = serviceRoleKey || SUPABASE_ANON_KEY;
  
  return createClient<Database>(SUPABASE_URL, key, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: true,
    }
  });
}

// Export the default client for browser usage
export const supabase = getSupabaseClient(); 