
import { createClient } from '@supabase/supabase-js';
import { getEnv } from './utils/env';

const envUrl = getEnv('VITE_SUPABASE_URL');
const envKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Fallback seguro. Se não tiver URL, usa um dummy que não quebra o JS, apenas falha as requisições de rede.
const supabaseUrl = envUrl || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = envKey || 'placeholder-key';

if (!envUrl) {
    console.warn('⚠️ Supabase URL não encontrada. O login falhará, mas o app deve abrir.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
