/** Erro do Supabase → mensagem que o usuário entende. */
export function mensagemErro(e: unknown): string {
  const msg =
    typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (msg.includes("pat_itens_codigo_uk")) return "Código já cadastrado.";
  if (msg.includes("pat_locais_nome_uk")) return "Já existe uma obra com esse nome.";
  if (msg.includes("pat_itens_local_id_fkey")) return "A obra ainda tem patrimônios. Mova os itens antes de remover.";
  if (msg.includes("row-level security")) return "Você não tem permissão para esta ação.";
  if (msg.includes("Failed to fetch")) return "Sem conexão. Tente de novo.";
  return msg;
}
