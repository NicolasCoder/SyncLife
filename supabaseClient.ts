
import { createClient } from '@supabase/supabase-js';

// Tenta ler do processo (padrão) ou do Vite (caso esteja usando Vite no build)
const supabaseUrl = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URLs/Keys are missing. Check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
