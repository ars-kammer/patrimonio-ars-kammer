// Gestão de usuários do Patrimônio (só administrador do módulo).
//
// O banco é o do Controle de Obras: conta criada aqui nasce com perfil
// 'visitante' e sem obras no Obras, ou seja, não enxerga nada de lá.
// Conta que já existe (ex.: alguém do Obras) só ganha o papel no Patrimônio;
// a senha dela não é tocada.
//
// Ações:
//   { acao: "criar", nome, email, senha, papel }
//   { acao: "senha", user_id, senha }   — só para contas exclusivas do Patrimônio
import { createClient } from "npm:@supabase/supabase-js@2";

const PAPEIS = ["admin", "eng", "adm", "enc"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return resposta(405, { erro: "Método não permitido." });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Quem chama precisa ser admin ativo do Patrimônio.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: quem } = await service.auth.getUser(token);
  if (!quem?.user) return resposta(401, { erro: "Sessão inválida." });
  const { data: chamador } = await service
    .from("pat_usuarios")
    .select("papel, ativo")
    .eq("user_id", quem.user.id)
    .maybeSingle();
  if (!chamador || !chamador.ativo || chamador.papel !== "admin") {
    return resposta(403, { erro: "Só o administrador do Patrimônio gerencia usuários." });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return resposta(400, { erro: "Requisição inválida." });
  }

  if (corpo.acao === "criar") {
    const nome = String(corpo.nome ?? "").trim();
    const email = String(corpo.email ?? "").trim().toLowerCase();
    const senha = String(corpo.senha ?? "");
    const papel = String(corpo.papel ?? "");
    if (!nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return resposta(400, { erro: "Informe nome e e-mail válidos." });
    }
    if (!PAPEIS.includes(papel)) return resposta(400, { erro: "Perfil inválido." });

    const { data: existente } = await service.rpc("pat_user_id_por_email", { p_email: email });
    let userId = existente as string | null;
    let jaExistia = !!userId;

    if (!userId) {
      if (senha.length < 8) return resposta(400, { erro: "A senha precisa de ao menos 8 caracteres." });
      const { data: criado, error } = await service.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        // handle_new_user do Obras lê 'perfil': visitante sem obras = nada no Obras.
        user_metadata: { nome, perfil: "visitante" },
      });
      if (error || !criado.user) {
        return resposta(400, { erro: error?.message ?? "Não foi possível criar a conta." });
      }
      userId = criado.user.id;
      jaExistia = false;
    }

    const { data: jaNoModulo } = await service
      .from("pat_usuarios")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (jaNoModulo) {
      return resposta(409, { erro: "Este e-mail já tem acesso ao Patrimônio." });
    }

    const { error: errIns } = await service
      .from("pat_usuarios")
      .insert({ user_id: userId, nome, email, papel });
    if (errIns) return resposta(400, { erro: errIns.message });

    return resposta(200, { ok: true, user_id: userId, ja_existia: jaExistia });
  }

  if (corpo.acao === "senha") {
    const userId = String(corpo.user_id ?? "");
    const senha = String(corpo.senha ?? "");
    if (senha.length < 8) return resposta(400, { erro: "A senha precisa de ao menos 8 caracteres." });

    const { data: alvo } = await service
      .from("pat_usuarios")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!alvo) return resposta(404, { erro: "Usuário não encontrado no Patrimônio." });

    // Conta que também usa o Obras não é do Patrimônio para redefinir:
    // senão um admin daqui trocaria a senha de um admin de lá.
    const { data: perfil } = await service
      .from("profiles")
      .select("perfil, obras_ids")
      .eq("id", userId)
      .maybeSingle();
    const soPatrimonio =
      !perfil || (perfil.perfil === "visitante" && (perfil.obras_ids ?? []).length === 0);
    if (!soPatrimonio) {
      return resposta(403, {
        erro: "Esta conta também usa o Controle de Obras. A senha é trocada por lá.",
      });
    }

    const { error } = await service.auth.admin.updateUserById(userId, { password: senha });
    if (error) return resposta(400, { erro: error.message });
    return resposta(200, { ok: true });
  }

  return resposta(400, { erro: "Ação desconhecida." });
});
