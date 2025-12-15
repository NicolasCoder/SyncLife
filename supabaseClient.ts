
import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env.
// Adicionamos valores de fallback (placeholder) para evitar que o createClient lance um erro 
// fatal e trave a tela branca (crash) caso as variáveis ainda não tenham propagado no Netlify.

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// Se não tiver chave, usamos um placeholder seguro para o app carregar (e falhar graciosamente nas requisições)
// em vez de nem abrir.
const supabaseUrl = envUrl && envUrl.length > 0 ? envUrl : 'https://setup-missing.supabase.co';
const supabaseAnonKey = envKey && envKey.length > 0 ? envKey : 'missing-key';

if (supabaseUrl === 'https://setup-missing.supabase.co') {
    console.warn('⚠️ AVISO: Variáveis do Supabase (VITE_SUPABASE_URL) não detectadas. O app carregará, mas não salvará dados.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
