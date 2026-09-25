import { useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import Layout from "@/components/Layout";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLocais, useRecarregar, useUsuarios } from "@/lib/dados";
import { mensagemErro } from "@/lib/erros";
import { badge, btnPrimario, btnSecundario, card, iniciais, input, label, PAPEIS } from "@/lib/ui";
import type { Papel, Usuario } from "@/types";

const ORDEM: Papel[] = ["admin", "eng", "adm", "enc"];

/** Erro da edge function vem no corpo JSON; o supabase-js só expõe o status. */
async function chamar(corpo: Record<string, unknown>): Promise<{ ok: true; ja_existia?: boolean } | { erro: string }> {
  const { data, error } = await supabase.functions.invoke("pat-usuarios", { body: corpo });
  if (error) {
    const ctx = (error as { context?: Response }).context;
    try {
      const j = await ctx?.json();
      if (j?.erro) return { erro: j.erro };
    } catch {
      /* corpo não era JSON */
    }
    return { erro: mensagemErro(error) };
  }
  return data;
}

export default function Usuarios() {
  const { user } = useAuth();
  const { data: usuarios = [] } = useUsuarios();
  const { data: locais = [] } = useLocais();
  const recarregar = useRecarregar();
  const toast = useToast();
  const [novo, setNovo] = useState(false);
  const [senhaDe, setSenhaDe] = useState<Usuario | null>(null);

  const ordenados = [...usuarios].sort(
    (a, b) => Number(b.ativo) - Number(a.ativo) || ORDEM.indexOf(a.papel) - ORDEM.indexOf(b.papel) || a.nome.localeCompare(b.nome),
  );

  async function atualizar(u: Usuario, patch: Partial<Usuario>) {
    const { error } = await supabase.from("pat_usuarios").update(patch).eq("user_id", u.user_id);
    if (error) return toast(mensagemErro(error), "erro");
    toast("Usuário atualizado.");
    recarregar();
  }

  return (
    <Layout
      titulo="Usuários"
      acao={
        <button onClick={() => setNovo(true)} className={btnPrimario}>
          <UserPlus size={15} /> <span className="hidden sm:inline">Novo usuário</span>
        </button>
      }
    >
      <div className={`${card} divide-y divide-[#f0f1f3]`}>
        {ordenados.map((u) => {
          const obras = locais.filter((l) => l.responsavel_id === u.user_id).map((l) => l.nome);
          const eu = u.user_id === user?.id;
          return (
            <div key={u.user_id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${u.ativo ? "" : "opacity-50"}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-semibold text-white">
                {iniciais(u.nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {u.nome} {eu && <span className="text-xs font-normal text-[#9ca3af]">(você)</span>}
                  {!u.ativo && <span className={`${badge} ml-2 border-[#e5e7eb] bg-[#f0f1f3] text-[#6b7280]`}>Desativado</span>}
                </p>
                <p className="truncate text-xs text-[#9ca3af]">
                  {u.email}
                  {obras.length > 0 && <span className="text-violet-700"> · {obras.join(", ")}</span>}
                </p>
              </div>
              <select
                value={u.papel}
                disabled={eu}
                onChange={(e) => atualizar(u, { papel: e.target.value as Papel })}
                className={`${input} w-auto`}
              >
                {ORDEM.map((p) => <option key={p} value={p}>{PAPEIS[p].label}</option>)}
              </select>
              <button onClick={() => setSenhaDe(u)} title="Redefinir senha" aria-label="Redefinir senha" className={btnSecundario}>
                <KeyRound size={14} />
              </button>
              {!eu && (
                <button onClick={() => atualizar(u, { ativo: !u.ativo })} className={btnSecundario}>
                  {u.ativo ? "Desativar" : "Reativar"}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[#9ca3af]">
        Desativar tira o acesso na hora e mantém o histórico. O responsável de obra recebe os pedidos de check-in.
      </p>

      {novo && <NovoUsuario onFechar={() => setNovo(false)} onOk={() => { setNovo(false); recarregar(); }} />}
      {senhaDe && <RedefinirSenha usuario={senhaDe} onFechar={() => setSenhaDe(null)} />}
    </Layout>
  );
}

function NovoUsuario({ onFechar, onOk }: { onFechar: () => void; onOk: () => void }) {
  const toast = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<Papel>("enc");
  const [enviando, setEnviando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await chamar({ acao: "criar", nome, email, senha, papel });
    setEnviando(false);
    if ("erro" in r) return toast(r.erro, "erro");
    toast(r.ja_existia ? "Conta já existia: acesso liberado com a senha atual dela." : "Usuário criado!");
    onOk();
  }

  return (
    <Modal titulo="Novo usuário" onFechar={onFechar}>
      <form onSubmit={criar} className="flex flex-col gap-3">
        <div>
          <label className={label} htmlFor="u-nome">Nome</label>
          <input id="u-nome" required value={nome} onChange={(e) => setNome(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="u-email">E-mail (é o login)</label>
          <input id="u-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="u-senha">Senha inicial (mín. 8)</label>
          <input id="u-senha" type="text" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} className={`${input} font-mono`} />
          <p className="mt-1 text-xs text-[#9ca3af]">Passe para a pessoa; ela troca em “Minha senha”. Se o e-mail já tem conta (ex.: usa o Controle de Obras), a senha dela continua a mesma.</p>
        </div>
        <div>
          <label className={label} htmlFor="u-papel">Perfil</label>
          <select id="u-papel" value={papel} onChange={(e) => setPapel(e.target.value as Papel)} className={input}>
            {ORDEM.map((p) => <option key={p} value={p}>{PAPEIS[p].label}</option>)}
          </select>
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={btnSecundario}>Cancelar</button>
          <button type="submit" disabled={enviando} className={btnPrimario}>{enviando ? "Criando…" : "Criar usuário"}</button>
        </div>
      </form>
    </Modal>
  );
}

function RedefinirSenha({ usuario, onFechar }: { usuario: Usuario; onFechar: () => void }) {
  const toast = useToast();
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await chamar({ acao: "senha", user_id: usuario.user_id, senha });
    setEnviando(false);
    if ("erro" in r) return toast(r.erro, "erro");
    toast(`Senha de ${usuario.nome} redefinida.`);
    onFechar();
  }

  return (
    <Modal titulo={`Nova senha — ${usuario.nome}`} onFechar={onFechar}>
      <form onSubmit={salvar} className="flex flex-col gap-3">
        <input
          type="text"
          autoComplete="off"
          minLength={8}
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          className={`${input} font-mono`}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={btnSecundario}>Cancelar</button>
          <button type="submit" disabled={enviando} className={btnPrimario}>{enviando ? "Salvando…" : "Redefinir"}</button>
        </div>
      </form>
    </Modal>
  );
}
