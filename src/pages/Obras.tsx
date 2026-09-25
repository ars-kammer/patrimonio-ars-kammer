import { useState } from "react";
import { Building2, CalendarClock, Package, Save, Trash2, UserRound } from "lucide-react";
import Layout, { Vazio } from "@/components/Layout";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useItens, useLocais, useRecarregar, useUsuarios } from "@/lib/dados";
import { mensagemErro } from "@/lib/erros";
import { btnPrimario, btnSecundario, card, diasAte, FREQUENCIAS, input, label, PRAZOS } from "@/lib/ui";
import type { Local } from "@/types";

function proximoCiclo(l: Local): { txt: string; cls: string } {
  if (!l.ultimo_ciclo_em) return { txt: "Sem ciclos", cls: "text-[#9ca3af]" };
  const p = new Date(l.ultimo_ciclo_em);
  p.setDate(p.getDate() + l.freq_dias);
  const d = diasAte(p);
  if (d <= 0) return { txt: "Ciclo vencido", cls: "text-[#C0392B]" };
  if (d <= 2) return { txt: `Próximo ciclo em ${d} dia${d > 1 ? "s" : ""}`, cls: "text-amber-700" };
  return { txt: `Próximo ciclo em ${d} dias`, cls: "text-[#6b7280]" };
}

export default function Obras() {
  const { data: locais = [] } = useLocais();
  const { data: itens = [] } = useItens();
  const { data: usuarios = [] } = useUsuarios();
  const recarregar = useRecarregar();
  const toast = useToast();
  const ativos = usuarios.filter((u) => u.ativo);

  const [nome, setNome] = useState("");
  const [resp, setResp] = useState("");
  const [freq, setFreq] = useState(15);
  const [prazo, setPrazo] = useState(3);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast("Informe o nome.", "erro");
    const { error } = await supabase
      .from("pat_locais")
      .insert({ nome: nome.trim(), responsavel_id: resp || null, freq_dias: freq, prazo_dias: prazo });
    if (error) return toast(mensagemErro(error), "erro");
    toast("Obra cadastrada!");
    setNome("");
    setResp("");
    recarregar();
  }

  return (
    <Layout titulo="Obras e locais">
      <form onSubmit={adicionar} className={`${card} mb-5 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_160px_130px_auto] lg:items-end`}>
        <div>
          <label className={label} htmlFor="o-nome">Nome</label>
          <input id="o-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Depósito central" className={input} />
        </div>
        <div>
          <label className={label} htmlFor="o-resp">Responsável</label>
          <select id="o-resp" value={resp} onChange={(e) => setResp(e.target.value)} className={input}>
            <option value="">Nenhum</option>
            {ativos.map((u) => <option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="o-freq">Frequência do inventário</label>
          <select id="o-freq" value={freq} onChange={(e) => setFreq(Number(e.target.value))} className={input}>
            {FREQUENCIAS.map((f) => <option key={f.dias} value={f.dias}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label} htmlFor="o-prazo">Prazo p/ confirmar</label>
          <select id="o-prazo" value={prazo} onChange={(e) => setPrazo(Number(e.target.value))} className={input}>
            {PRAZOS.map((p) => <option key={p} value={p}>{p} dia{p > 1 ? "s" : ""}</option>)}
          </select>
        </div>
        <button type="submit" className={`${btnPrimario} justify-center`}>Adicionar</button>
      </form>

      {!locais.length ? (
        <Vazio titulo="Nenhuma obra cadastrada" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {locais.map((l) => (
            <CartaoObra
              key={`${l.id}-${l.responsavel_id}-${l.freq_dias}-${l.prazo_dias}`}
              local={l}
              qtdItens={itens.filter((i) => i.local_id === l.id).length}
              usuarios={ativos}
              nomeResp={usuarios.find((u) => u.user_id === l.responsavel_id)?.nome}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

function CartaoObra({
  local, qtdItens, usuarios, nomeResp,
}: { local: Local; qtdItens: number; usuarios: { user_id: string; nome: string }[]; nomeResp?: string }) {
  const recarregar = useRecarregar();
  const toast = useToast();
  const [resp, setResp] = useState(local.responsavel_id ?? "");
  const [freq, setFreq] = useState(local.freq_dias);
  const [prazo, setPrazo] = useState(local.prazo_dias);
  const mudou = resp !== (local.responsavel_id ?? "") || freq !== local.freq_dias || prazo !== local.prazo_dias;
  const prox = proximoCiclo(local);

  async function salvar() {
    const { error } = await supabase
      .from("pat_locais")
      .update({ responsavel_id: resp || null, freq_dias: freq, prazo_dias: prazo })
      .eq("id", local.id);
    if (error) return toast(mensagemErro(error), "erro");
    toast(`"${local.nome}" atualizada.`);
    recarregar();
  }

  async function remover() {
    if (qtdItens > 0) return toast("A obra ainda tem patrimônios. Mova os itens antes de remover.", "erro");
    if (!window.confirm(`Remover "${local.nome}"?`)) return;
    const { error } = await supabase.from("pat_locais").delete().eq("id", local.id);
    if (error) return toast(mensagemErro(error), "erro");
    recarregar();
  }

  return (
    <div className={`${card} p-4`}>
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-white">
          <Building2 size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{local.nome}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#6b7280]">
            <span className="flex items-center gap-1"><UserRound size={12} /> {nomeResp ?? "Sem responsável"}</span>
            <span className="flex items-center gap-1"><Package size={12} /> {qtdItens} {qtdItens === 1 ? "item" : "itens"}</span>
            <span className={`flex items-center gap-1 ${prox.cls}`}><CalendarClock size={12} /> {prox.txt}</span>
          </p>
        </div>
        <button onClick={remover} aria-label="Remover obra" className="text-[#9ca3af] hover:text-red-600">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_90px_auto] sm:items-end">
        <div className="col-span-2 sm:col-span-1">
          <label className={label}>Responsável</label>
          <select value={resp} onChange={(e) => setResp(e.target.value)} className={input}>
            <option value="">Nenhum</option>
            {usuarios.map((u) => <option key={u.user_id} value={u.user_id}>{u.nome}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Frequência</label>
          <select value={freq} onChange={(e) => setFreq(Number(e.target.value))} className={input}>
            {FREQUENCIAS.map((f) => <option key={f.dias} value={f.dias}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Prazo</label>
          <select value={prazo} onChange={(e) => setPrazo(Number(e.target.value))} className={input}>
            {PRAZOS.map((p) => <option key={p} value={p}>{p}d</option>)}
          </select>
        </div>
        <button onClick={salvar} disabled={!mudou} className={`${mudou ? btnPrimario : btnSecundario} col-span-2 justify-center sm:col-span-1`}>
          <Save size={14} /> Salvar
        </button>
      </div>
    </div>
  );
}
