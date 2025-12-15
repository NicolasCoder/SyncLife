
import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env.
// O 'as any' é usado para evitar erros de TypeScript caso os tipos não tenham sido gerados.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO CRÍTICO: Variáveis do Supabase não encontradas. O site não conseguirá conectar ao banco.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
