
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xxxavdtfkfyfouvoenyx.supabase.co';
const supabaseAnonKey = 'sb_publishable_w_A9KccGBVoUTxCTHrK8YA_do_WMqTs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
