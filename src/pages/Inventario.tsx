import { useState } from "react";
import { CheckCircle2, ChevronDown, ClipboardCheck, MapPin, PackageCheck, RefreshCw, ScanLine } from "lucide-react";
import Layout, { Carregando } from "@/components/Layout";
import Modal from "@/components/Modal";
import ScannerQR, { StatusLeitura } from "@/components/ScannerQR";
import { Miniatura } from "@/components/Foto";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { minhasAbertas, useCiclos, useItens, useLocais, usePendencias, useRecarregar, useUsuarios } from "@/lib/dados";
import { useFotos } from "@/lib/foto";
import { codigoDoQR } from "@/lib/qr";
import { mensagemErro } from "@/lib/erros";
import { btnPrimario, btnSecundario, card, fmtCodigo, fmtDate, fmtDateTime, freqLabel, hojeISO } from "@/lib/ui";
import type { Ciclo, Item, Pendencia } from "@/types";

export default function Inventario() {
  const { user, isAdmin } = useAuth();
  const { data: pendencias, isLoading } = usePendencias();
  const { data: itens = [] } = useItens();
  const { data: ciclos = [] } = useCiclos();
  const recarregar = useRecarregar();
  const toast = useToast();
  const [confirmando, setConfirmando] = useState<Pendencia | null>(null);
  const [forcando, setForcando] = useState(false);

  const { abertas, recv, inv } = minhasAbertas(pendencias ?? [], user?.id);
  const minhas = [...recv, ...inv];
  // Item com check-in aberto em ciclo de prazo vencido: ainda dá para confirmar.
  const hoje = hojeISO();
  const atrasados = new Set(
    abertas
      .filter((p) => p.tipo === "inv" && (ciclos.find((c) => c.id === p.ciclo_id)?.prazo ?? hoje) < hoje)
      .map((p) => p.item_id),
  );
  const itemDe = (p: Pendencia) => itens.find((i) => i.id === p.item_id);
  const { data: fotos } = useFotos(minhas.map((p) => itemDe(p)?.foto_path ?? null));

  async function forcar() {
    if (!window.confirm("Gerar agora um novo ciclo de inventário em todas as obras com itens? Os ciclos em andamento serão encerrados.")) return;
    setForcando(true);
    const { data, error } = await supabase.rpc("pat_gerar_ciclos", { p_forcar: true });
    setForcando(false);
    if (error) return toast(mensagemErro(error), "erro");
    toast(data ? `${data} ciclo${data > 1 ? "s" : ""} gerado${data > 1 ? "s" : ""}.` : "Nenhuma obra com itens.");
    recarregar();
  }

  const lista = (titulo: string, icone: React.ReactNode, cor: string, ps: Pendencia[], tag: string) =>
    ps.length > 0 && (
      <div>
        <div className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${cor}`}>
          {icone} {titulo} ({ps.length})
        </div>
        <div className={`${card} divide-y divide-[#f0f1f3]`}>
          {ps.map((p) => {
            const it = itemDe(p);
            if (!it) return null;
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Miniatura url={it.foto_path ? fotos?.[it.foto_path] : undefined} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.nome}</p>
                  <p className="text-xs text-[#9ca3af]">
                    {fmtCodigo(it.codigo)}
                    {it.modelo ? ` · ${it.modelo}` : ""} · {tag}
                  </p>
                  {p.tipo === "inv" && atrasados.has(p.item_id) && (
                    <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                      Atrasado
                    </span>
                  )}
                </div>
                <button onClick={() => setConfirmando(p)} className={btnPrimario}>
                  <ScanLine size={15} /> <span className="hidden sm:inline">Escanear</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );

  return (
    <Layout
      titulo="Inventário / Check-in"
      acao={
        isAdmin && (
          <button onClick={forcar} disabled={forcando} className={btnSecundario}>
            <RefreshCw size={15} /> <span className="hidden sm:inline">{forcando ? "Gerando…" : "Gerar ciclos agora"}</span>
          </button>
        )
      }
    >
      {isLoading ? (
        <Carregando />
      ) : (
        <div className="flex flex-col gap-6">
          {(!isAdmin || minhas.length > 0) && (
            <section className="flex flex-col gap-4">
              <p className="text-sm text-[#6b7280]">Confirme os equipamentos escaneando o QR Code da etiqueta.</p>
              {minhas.length === 0 ? (
                <div className={`${card} px-6 py-14 text-center`}>
                  <CheckCircle2 size={40} strokeWidth={1.5} className="mx-auto text-emerald-600" />
                  <p className="mt-2 font-semibold text-emerald-700">Tudo em dia!</p>
                  <p className="mt-0.5 text-sm text-[#9ca3af]">Nenhum check-in pendente.</p>
                </div>
              ) : (
                <>
                  {lista("Recebimentos pendentes", <PackageCheck size={16} />, "bg-violet-50 text-violet-800", recv, "Recebimento")}
                  {lista("Inventário periódico", <ClipboardCheck size={16} />, "bg-blue-50 text-blue-800", inv, "Inventário")}
                </>
              )}
            </section>
          )}

          {isAdmin && <Acompanhamento pendencias={pendencias ?? []} itens={itens} />}
        </div>
      )}

      {confirmando && itemDe(confirmando) && (
        <ConfirmarQR
          pendencia={confirmando}
          item={itemDe(confirmando)!}
          onFechar={() => setConfirmando(null)}
          onOk={() => {
            setConfirmando(null);
            recarregar();
          }}
        />
      )}
    </Layout>
  );
}

function ConfirmarQR({
  pendencia, item, onFechar, onOk,
}: { pendencia: Pendencia; item: Item; onFechar: () => void; onOk: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<{ tipo: "info" | "ok" | "erro"; msg: string }>({
    tipo: "info", msg: `Aponte para o QR Code ${fmtCodigo(item.codigo)}`,
  });
  const [enviando, setEnviando] = useState(false);

  async function conferir(codigo: number | null) {
    if (enviando) return;
    if (codigo !== item.codigo) {
      setStatus({ tipo: "erro", msg: `QR errado! Esperado ${fmtCodigo(item.codigo)}` });
      return;
    }
    setEnviando(true);
    setStatus({ tipo: "ok", msg: "Confirmado!" });
    const { error } = await supabase.rpc("pat_confirmar", { p_pendencia: pendencia.id });
    if (error) {
      setEnviando(false);
      setStatus({ tipo: "erro", msg: mensagemErro(error) });
      return;
    }
    toast(`Check-in ${fmtCodigo(item.codigo)} confirmado!`);
    onOk();
  }

  return (
    <Modal titulo={pendencia.tipo === "recv" ? "Confirmar recebimento" : "Check-in de inventário"} onFechar={onFechar}>
      <p className="mb-3 text-sm">
        <span className="text-[#6b7280]">Esperado:</span> <strong>{fmtCodigo(item.codigo)}</strong> — {item.nome}
      </p>
      {!enviando && (
        <ScannerQR onLer={(raw) => conferir(codigoDoQR(raw))} status={<StatusLeitura tipo={status.tipo}>{status.msg}</StatusLeitura>} />
      )}
      {enviando && <StatusLeitura tipo={status.tipo}>{status.msg}</StatusLeitura>}
      <p className="mt-4 border-t border-[#e5e7eb] pt-4 text-xs text-[#6b7280]">
        Etiqueta ilegível ou danificada? Peça ao administrador para reimprimir — a confirmação é só pelo QR Code.
      </p>
    </Modal>
  );
}

/** Data local (BRT) de um timestamp, para comparar com o prazo sem cair no dia seguinte do UTC. */
function diaLocal(ts: string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function statusCiclo(c: Ciclo, ps: Pendencia[]): { label: string; cor: string } {
  const pendente = ps.some((p) => p.status === "pending");
  const vencido = c.prazo < hojeISO();
  if (c.status === "completed") {
    const tarde = ps.some((p) => p.status === "confirmed" && p.confirmado_em && diaLocal(p.confirmado_em) > c.prazo);
    return tarde
      ? { label: "Concluído com atraso", cor: "bg-emerald-600" }
      : { label: "Concluído", cor: "bg-emerald-600" };
  }
  if (pendente && (c.status === "expired" || vencido)) {
    return { label: `Atrasado · prazo ${fmtDate(c.prazo)}`, cor: "bg-amber-500" };
  }
  if (c.status === "active") return { label: `Em andamento · prazo ${fmtDate(c.prazo)}`, cor: "bg-[#C0392B]" };
  return { label: "Expirado", cor: "bg-[#9ca3af]" };
}

function Acompanhamento({ pendencias, itens }: { pendencias: Pendencia[]; itens: Item[] }) {
  const { data: ciclos = [] } = useCiclos();
  const { data: locais = [] } = useLocais();
  const { data: usuarios = [] } = useUsuarios();
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const porLocal = locais
    .map((l) => ({ local: l, ciclos: ciclos.filter((c) => c.local_id === l.id).slice(0, 5) }))
    .filter((g) => g.ciclos.length > 0);

  if (!porLocal.length) {
    return (
      <div className={`${card} px-6 py-12 text-center text-sm text-[#9ca3af]`}>
        Nenhum ciclo gerado ainda. Os ciclos nascem sozinhos para obras com itens, conforme a frequência de cada uma.
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">Acompanhamento por obra</h2>
      <div className="flex flex-col gap-5">
        {porLocal.map(({ local, ciclos: cs }) => {
          const resp = usuarios.find((u) => u.user_id === local.responsavel_id);
          return (
            <div key={local.id}>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                <MapPin size={15} className="text-[#6b7280]" />
                <span className="font-semibold">{local.nome}</span>
                {resp ? (
                  <span className="rounded-md border border-[#e5e7eb] bg-white px-2 py-0.5 text-xs text-[#374151]">{resp.nome}</span>
                ) : (
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Sem responsável</span>
                )}
                <span className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[10px] font-semibold text-white">{freqLabel(local.freq_dias)}</span>
              </div>
              <div className="flex flex-col gap-2">
                {cs.map((c) => {
                  // Cancelada = ciclo encerrado (ou item transferido) sem confirmação.
                  const ps = pendencias.filter((p) => p.ciclo_id === c.id);
                  const feitos = ps.filter((p) => p.status === "confirmed").length;
                  const pct = ps.length ? Math.round((feitos / ps.length) * 100) : 0;
                  const st = statusCiclo(c, ps);
                  const aberto = abertos.has(c.id) || (c.status === "active" && !abertos.has("x" + c.id));
                  const alternar = () =>
                    setAbertos((s) => {
                      const n = new Set(s);
                      const k = c.status === "active" ? "x" + c.id : c.id;
                      if (n.has(k)) n.delete(k);
                      else n.add(k);
                      return n;
                    });
                  return (
                    <div key={c.id} className={card}>
                      <button onClick={alternar} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${st.cor}`} />
                        <span className="flex-1 text-sm">
                          <span className="font-medium">Ciclo {fmtDate(c.criado_em)}</span>
                          <span className="ml-2 text-xs text-[#9ca3af]">
                            {st.label}
                          </span>
                        </span>
                        <span className="text-xs text-[#6b7280]">{feitos}/{ps.length}</span>
                        <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-[#f0f1f3] sm:block">
                          <span
                            className={`block h-full ${pct === 100 ? "bg-emerald-600" : "bg-[#1a1a1a]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <ChevronDown size={16} className={`text-[#9ca3af] transition ${aberto ? "rotate-180" : ""}`} />
                      </button>
                      {aberto && (
                        <div className="divide-y divide-[#f0f1f3] border-t border-[#e5e7eb]">
                          {ps.map((p) => {
                            const it = itens.find((i) => i.id === p.item_id);
                            if (!it) return null;
                            return (
                              <div key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                                <span className="font-mono text-xs text-[#6b7280]">{fmtCodigo(it.codigo)}</span>
                                <span className="min-w-0 flex-1 truncate">{it.nome}</span>
                                {p.status === "confirmed" ? (
                                  <span className="text-right text-xs text-emerald-700">
                                    ✓ {p.confirmado_por_nome} · {fmtDateTime(p.confirmado_em)}
                                    {p.confirmado_em && diaLocal(p.confirmado_em) > c.prazo && (
                                      <span className="ml-1 text-amber-700">(atrasado)</span>
                                    )}
                                  </span>
                                ) : p.status === "cancelled" ? (
                                  <span className="text-xs text-[#9ca3af]">Não confirmado</span>
                                ) : (
                                  <span className="text-xs text-amber-700">
                                    {c.prazo < hojeISO() ? "Atrasado" : "Pendente"}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
