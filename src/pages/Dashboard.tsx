import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ClipboardCheck, PackageCheck, PackagePlus, Trash2, Truck } from "lucide-react";
import Layout, { Carregando } from "@/components/Layout";
import ItemDetalhe from "@/components/ItemDetalhe";
import { Miniatura } from "@/components/Foto";
import { useAuth } from "@/lib/auth";
import { useCiclos, useEventos, useItens, useLocais, usePendencias } from "@/lib/dados";
import { useFotos } from "@/lib/foto";
import { badge, card, codChip, ESTADO_BADGE, ESTADO_COR, ESTADOS, fmtCodigo, fmtDateTime, fmtMoeda, SETORES } from "@/lib/ui";
import type { Evento, Item } from "@/types";

const ICONE_EVENTO: Record<Evento["tipo"], React.ReactNode> = {
  cadastro: <PackagePlus size={14} />,
  exclusao: <Trash2 size={14} />,
  movimentacao: <Truck size={14} />,
  recebimento: <PackageCheck size={14} />,
  inventario: <ClipboardCheck size={14} />,
};

function saudacao(nome: string | null) {
  const h = new Date().getHours();
  return `${h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"}, ${(nome ?? "").split(" ")[0]}!`;
}

function Metrica({ rotulo, valor, sub }: { rotulo: string; valor: React.ReactNode; sub?: string }) {
  return (
    <div className={`${card} border-t-2 border-t-[#C0392B] p-4`}>
      <p className="text-xs text-[#6b7280]">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{valor}</p>
      {sub && <p className="truncate text-xs text-[#9ca3af]">{sub}</p>}
    </div>
  );
}

function Aviso({ cor, icone, titulo, texto }: { cor: string; icone: React.ReactNode; titulo: string; texto: string }) {
  return (
    <Link to="/inventario" className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:brightness-95 ${cor}`}>
      {icone}
      <div className="flex-1">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="text-xs opacity-80">{texto}</p>
      </div>
      <ChevronRight size={16} />
    </Link>
  );
}

function Atividade({ eventos }: { eventos: Evento[] }) {
  return (
    <div className={`${card} p-4`}>
      <h2 className="mb-3 text-sm font-semibold">Atividade recente</h2>
      {!eventos.length ? (
        <p className="py-6 text-center text-xs text-[#9ca3af]">Sem atividade.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {eventos.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-[#374151]">
                {ICONE_EVENTO[e.tipo]}
              </span>
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{e.texto}</p>
                <p className="text-xs text-[#9ca3af]">{[e.usuario_nome, fmtDateTime(e.criado_em)].filter(Boolean).join(" · ")}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { papel, nome, user } = useAuth();
  const { data: itens, isLoading } = useItens();
  const { data: pendencias = [] } = usePendencias();

  const minhas = pendencias.filter((p) => p.status === "pending" && p.responsavel_id === user?.id);
  const recv = minhas.filter((p) => p.tipo === "recv").length;
  const inv = minhas.filter((p) => p.tipo === "inv").length;

  return (
    <Layout titulo="Visão geral">
      <p className="mb-4 text-lg font-semibold">{saudacao(nome)}</p>
      {(recv > 0 || inv > 0) && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {recv > 0 && (
            <Aviso
              cor="border-violet-200 bg-violet-50 text-violet-800"
              icone={<PackageCheck size={20} />}
              titulo={`${recv} equipamento${recv > 1 ? "s" : ""} aguardando recebimento`}
              texto="Confirme via QR Code"
            />
          )}
          {inv > 0 && (
            <Aviso
              cor="border-blue-200 bg-blue-50 text-blue-800"
              icone={<ClipboardCheck size={20} />}
              titulo={`${inv} ${inv > 1 ? "itens" : "item"} para check-in`}
              texto="Confirme via QR Code"
            />
          )}
        </div>
      )}
      {isLoading ? <Carregando /> : papel === "enc" ? <PainelEncarregado itens={itens ?? []} recv={recv} inv={inv} /> : <PainelGeral itens={itens ?? []} />}
    </Layout>
  );
}

function PainelGeral({ itens }: { itens: Item[] }) {
  const { data: eventos = [] } = useEventos();
  const { data: ciclos = [] } = useCiclos();
  const { data: pendencias = [] } = usePendencias();
  const total = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const porEstado = ESTADOS.map((e) => ({ e, n: itens.filter((i) => i.estado === e).length }));
  const max = Math.max(1, ...porEstado.map((x) => x.n));

  const ativos = ciclos.filter((c) => c.status === "active");
  const doCiclo = pendencias.filter((p) => ativos.some((c) => c.id === p.ciclo_id) && p.status !== "cancelled");
  const feitos = doCiclo.filter((p) => p.status === "confirmed").length;

  return (
    <div className="flex flex-col gap-4">
      {ativos.length > 0 && (
        <Aviso
          cor="border-orange-200 bg-orange-50 text-orange-800"
          icone={<ClipboardCheck size={20} />}
          titulo={`Inventário em andamento — ${ativos.length} obra${ativos.length > 1 ? "s" : ""}`}
          texto={`${feitos}/${doCiclo.length} confirmados`}
        />
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica rotulo="Total de itens" valor={itens.length} />
        <Metrica rotulo="Engenharia" valor={itens.filter((i) => i.setor === "ENG").length} />
        <Metrica rotulo="Administrativo" valor={itens.filter((i) => i.setor === "ADM").length} />
        <Metrica rotulo="Valor total" valor={fmtMoeda(total, 0)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Por estado</h2>
          <div className="flex flex-col gap-2.5">
            {porEstado.map(({ e, n }) => (
              <div key={e} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-xs text-[#6b7280]">{e}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f0f1f3]">
                  <span className="block h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: ESTADO_COR[e] }} />
                </span>
                <span className="w-8 text-right text-xs font-semibold">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <Atividade eventos={eventos.slice(0, 8)} />
      </div>
    </div>
  );
}

function PainelEncarregado({ itens, recv, inv }: { itens: Item[]; recv: number; inv: number }) {
  const { user } = useAuth();
  const { data: locais = [] } = useLocais();
  const { data: eventos = [] } = useEventos();
  const [aberto, setAberto] = useState<string | null>(null);

  const minhasObras = locais.filter((l) => l.responsavel_id === user?.id);
  const ids = new Set(minhasObras.map((l) => l.id));
  const naObra = itens.filter((i) => ids.has(i.local_id));
  const { data: fotos } = useFotos(naObra.map((i) => i.foto_path));
  const total = naObra.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const itemAberto = itens.find((i) => i.id === aberto);

  if (!minhasObras.length) {
    return (
      <div className={`${card} px-6 py-12 text-center text-sm text-[#6b7280]`}>
        Nenhuma obra está vinculada a você ainda. O administrador define o responsável de cada obra.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica rotulo="Equipamentos na obra" valor={naObra.length} sub={minhasObras.map((l) => l.nome).join(", ")} />
        <Metrica rotulo="Aguardando recebimento" valor={recv} />
        <Metrica rotulo="Check-in pendente" valor={inv} />
        <Metrica rotulo="Valor na obra" valor={fmtMoeda(total, 0)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className={`${card} overflow-hidden`}>
          <h2 className="border-b border-[#e5e7eb] px-4 py-3 text-sm font-semibold">Equipamentos</h2>
          {!naObra.length ? (
            <p className="py-8 text-center text-xs text-[#9ca3af]">Nenhum equipamento ainda.</p>
          ) : (
            <div className="divide-y divide-[#f0f1f3]">
              {naObra.map((i) => (
                <button key={i.id} onClick={() => setAberto(i.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f7f8f9]">
                  <Miniatura url={i.foto_path ? fotos?.[i.foto_path] : undefined} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.nome}</p>
                    <p className="text-xs text-[#9ca3af]">
                      <span className={codChip}>{fmtCodigo(i.codigo)}</span> {[i.marca, i.modelo].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className={`${badge} hidden sm:inline-flex ${SETORES[i.setor].cls}`}>{i.setor === "ENG" ? "Eng" : "Adm"}</span>
                  <span className={`${badge} ${ESTADO_BADGE[i.estado]}`}>{i.estado}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Atividade eventos={eventos.filter((e) => e.local_id && ids.has(e.local_id)).slice(0, 10)} />
      </div>
      {itemAberto && <ItemDetalhe item={itemAberto} onFechar={() => setAberto(null)} />}
    </div>
  );
}
