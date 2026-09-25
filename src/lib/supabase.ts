import { createClient } from "@supabase/supabase-js";

// Banco do Controle de Obras — o Patrimônio vive nas tabelas pat_*,
// com papéis próprios em pat_usuarios.
const SUPABASE_URL = "https://vxwyizedcanxjukcmtfd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1xFzEwaoQSicdMHSbgFrcA_zqSACQkj";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
