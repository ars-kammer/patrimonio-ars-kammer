import { useState } from "react";
import { ArrowRight, Bell, MapPin } from "lucide-react";
import Layout, { Vazio } from "@/components/Layout";
import { Miniatura } from "@/components/Foto";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useItens, useLocais, useMovimentacoes, useRecarregar, useUsuarios } from "@/lib/dados";
import { useFotos } from "@/lib/foto";
import { mensagemErro } from "@/lib/erros";
import { btnPrimario, card, fmtCodigo, fmtDateTime, input, label } from "@/lib/ui";

export default function Movimentacoes() {
  const { data: itens = [] } = useItens();
  const { data: locais = [] } = useLocais();
  const { data: usuarios = [] } = useUsuarios();
  const { data: movs = [] } = useMovimentacoes();
  const recarregar = useRecarregar();
  const toast = useToast();
  const [itemId, setItemId] = useState("");
  const [destino, setDestino] = useState("");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const item = itens.find((i) => i.id === itemId);
  const { data: fotos } = useFotos([item?.foto_path ?? null]);
  const nomeLocal = (id: string) => locais.find((l) => l.id === id)?.nome ?? "sem local";
  const localDestino = locais.find((l) => l.id === destino);
  const respDestino = usuarios.find((u) => u.user_id === localDestino?.responsavel_id && u.ativo);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return toast("Selecione um patrimônio.", "erro");
    if (!destino) return toast("Selecione o destino.", "erro");
    if (item.local_id === destino) return toast("Origem e destino iguais.", "erro");
    setSalvando(true);
    const { error } = await supabase.rpc("pat_movimentar", { p_item: item.id, p_destino: destino, p_obs: obs });
    setSalvando(false);
    if (error) return toast(mensagemErro(error), "erro");
    toast(respDestino ? `Transferência registrada! ${respDestino.nome} foi avisado.` : "Transferência registrada!");
    setItemId("");
    setDestino("");
    setObs("");
    recarregar();
  }

  return (
    <Layout titulo="Movimentações">
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <form onSubmit={registrar} className={`${card} flex h-fit flex-col gap-4 p-5`}>
          <h2 className="text-sm font-semibold">Nova transferência</h2>
          <div>
            <label className={label} htmlFor="m-item">Patrimônio</label>
            <select id="m-item" value={itemId} onChange={(e) => setItemId(e.target.value)} className={input}>
              <option value="">Selecione…</option>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {fmtCodigo(i.codigo)} — {i.nome} ({nomeLocal(i.local_id)})
                </option>
              ))}
            </select>
          </div>

          {item && (
            <div className="flex items-center gap-3 rounded-lg bg-[#f7f8f9] p-3">
              <Miniatura url={item.foto_path ? fotos?.[item.foto_path] : undefined} />
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{item.nome}</p>
                <p className="flex items-center gap-1 text-xs text-[#6b7280]">
                  <MapPin size={12} /> Local atual: <strong className="text-[#1a1a1a]">{nomeLocal(item.local_id)}</strong>
                </p>
              </div>
            </div>
          )}

          <div>
            <label className={label} htmlFor="m-destino">Obra de destino</label>
            <select id="m-destino" value={destino} onChange={(e) => setDestino(e.target.value)} className={input}>
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id} disabled={l.id === item?.local_id}>{l.nome}</option>
              ))}
            </select>
          </div>

          {localDestino &&
            (respDestino ? (
              <p className="flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
                <Bell size={14} className="mt-px shrink-0" />
                <span><strong>{respDestino.nome}</strong> recebe o pedido de confirmação de recebimento no app.</span>
              </p>
            ) : (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Esta obra não tem responsável: ninguém vai confirmar o recebimento.
              </p>
            ))}

          <div>
            <label className={label} htmlFor="m-obs">Observação</label>
            <input id="m-obs" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Motivo…" className={input} />
          </div>

          <button type="submit" disabled={salvando} className={`${btnPrimario} justify-center`}>
            {salvando ? "Registrando…" : "Registrar transferência"}
          </button>
        </form>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Histórico</h2>
          {!movs.length ? (
            <Vazio titulo="Nenhuma movimentação" />
          ) : (
            <div className={`${card} divide-y divide-[#f0f1f3]`}>
              {movs.slice(0, 100).map((m) => {
                const it = itens.find((i) => i.id === m.item_id);
                return (
                  <div key={m.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="font-medium">{it ? `${fmtCodigo(it.codigo)} — ${it.nome}` : "Item excluído"}</span>
                      <span className="ml-auto text-xs text-[#9ca3af]">{fmtDateTime(m.criado_em)}</span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[#6b7280]">{m.origem_nome ?? "—"}</span>
                      <ArrowRight size={12} className="text-[#C0392B]" />
                      <span className="font-semibold text-emerald-700">{m.destino_nome}</span>
                      {m.responsavel_notificado && (
                        <span className="flex items-center gap-1 text-violet-700">
                          · <Bell size={11} /> {m.responsavel_notificado}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#9ca3af]">
                      {m.feito_por_nome}
                      {m.observacao && ` · “${m.observacao}”`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
