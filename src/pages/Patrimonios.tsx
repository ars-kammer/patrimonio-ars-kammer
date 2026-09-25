import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Search } from "lucide-react";
import Layout, { Carregando, Vazio } from "@/components/Layout";
import ItemDetalhe from "@/components/ItemDetalhe";
import { Miniatura } from "@/components/Foto";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth";
import { useItens, useLocais } from "@/lib/dados";
import { useFotos } from "@/lib/foto";
import { abrirRelatorio } from "@/lib/relatorio";
import {
  badge, btnPrimario, btnSecundario, card, codChip, ESTADO_BADGE, ESTADOS, fmtCodigo, fmtMoeda, input, normaliza, SETORES,
} from "@/lib/ui";

export default function Patrimonios() {
  const { nome, podeCadastrar } = useAuth();
  const { data: itens, isLoading } = useItens();
  const { data: locais = [] } = useLocais();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [setor, setSetor] = useState("");
  const [estado, setEstado] = useState("");
  const [local, setLocal] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  const nomeLocal = (id: string) => locais.find((l) => l.id === id)?.nome ?? "—";

  const visiveis = useMemo(() => {
    const t = normaliza(q.trim());
    return (itens ?? []).filter(
      (i) =>
        (!t ||
          normaliza(i.nome).includes(t) ||
          String(i.codigo).padStart(4, "0").includes(t) ||
          normaliza(i.modelo ?? "").includes(t) ||
          normaliza(i.marca ?? "").includes(t)) &&
        (!setor || i.setor === setor) &&
        (!estado || i.estado === estado) &&
        (!local || i.local_id === local),
    );
  }, [itens, q, setor, estado, local]);

  const { data: fotos } = useFotos(visiveis.map((i) => i.foto_path));
  const itemAberto = itens?.find((i) => i.id === aberto);
  const total = visiveis.reduce((s, i) => s + (Number(i.valor) || 0), 0);

  function relatorio() {
    if (!visiveis.length) return toast("Nenhum item para o relatório.", "erro");
    const filtros =
      [
        q && `busca "${q}"`,
        setor && `setor ${SETORES[setor as "ENG"].label}`,
        estado && `estado ${estado}`,
        local && `local ${nomeLocal(local)}`,
      ]
        .filter(Boolean)
        .join(" · ") || "todos os itens";
    if (!abrirRelatorio(visiveis, nomeLocal, nome ?? "—", filtros)) toast("Permita pop-ups para gerar o relatório.", "erro");
  }

  return (
    <Layout
      titulo="Patrimônios"
      acao={
        <>
          <button onClick={relatorio} className={btnSecundario}>
            <FileText size={15} /> <span className="hidden sm:inline">Relatório PDF</span>
          </button>
          {podeCadastrar && (
            <Link to="/cadastro" className={btnPrimario}>
              <Plus size={15} /> <span className="hidden sm:inline">Cadastrar</span>
            </Link>
          )}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, código, modelo…" className={`${input} pl-9`} />
        </div>
        <select value={setor} onChange={(e) => setSetor(e.target.value)} className={`${input} w-auto`}>
          <option value="">Todos os setores</option>
          <option value="ENG">Engenharia</option>
          <option value="ADM">Administrativo</option>
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={`${input} w-auto`}>
          <option value="">Todos os estados</option>
          {ESTADOS.map((e) => <option key={e}>{e}</option>)}
        </select>
        <select value={local} onChange={(e) => setLocal(e.target.value)} className={`${input} w-auto`}>
          <option value="">Todas as obras</option>
          {locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>

      {isLoading ? (
        <Carregando />
      ) : !visiveis.length ? (
        <Vazio
          titulo={itens?.length ? "Nenhum patrimônio com esses filtros" : "Nenhum patrimônio cadastrado"}
          acao={podeCadastrar && !itens?.length ? <Link to="/cadastro" className={btnPrimario}><Plus size={15} /> Cadastrar o primeiro</Link> : undefined}
        />
      ) : (
        <>
          <p className="mb-2 text-xs text-[#6b7280]">
            {visiveis.length} {visiveis.length === 1 ? "item" : "itens"} · {fmtMoeda(total, 0)}
          </p>
          <div className={`${card} overflow-hidden`}>
            <table className="w-full text-sm">
              <thead className="hidden border-b border-[#e5e7eb] bg-[#f7f8f9] text-left text-xs text-[#6b7280] md:table-header-group">
                <tr>
                  <th className="w-14 px-4 py-2.5 font-medium"></th>
                  <th className="px-2 py-2.5 font-medium">Código</th>
                  <th className="px-2 py-2.5 font-medium">Patrimônio</th>
                  <th className="px-2 py-2.5 font-medium">Setor</th>
                  <th className="px-2 py-2.5 font-medium">Local</th>
                  <th className="px-2 py-2.5 font-medium">Estado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setAberto(i.id)}
                    className="cursor-pointer border-b border-[#f0f1f3] last:border-0 hover:bg-[#f7f8f9]"
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <Miniatura url={i.foto_path ? fotos?.[i.foto_path] : undefined} />
                    </td>
                    <td className="hidden px-2 md:table-cell"><span className={codChip}>{fmtCodigo(i.codigo)}</span></td>
                    <td className="px-2 py-2.5">
                      <p className="font-medium">
                        <span className={`${codChip} mr-1.5 md:hidden`}>{fmtCodigo(i.codigo)}</span>
                        {i.nome}
                      </p>
                      <p className="text-xs text-[#9ca3af]">
                        {[i.marca, i.modelo].filter(Boolean).join(" · ") || "—"}
                        <span className="md:hidden"> · {nomeLocal(i.local_id)}</span>
                      </p>
                    </td>
                    <td className="hidden px-2 md:table-cell">
                      <span className={`${badge} ${SETORES[i.setor].cls}`}>{i.setor === "ENG" ? "Eng" : "Adm"}</span>
                    </td>
                    <td className="hidden px-2 text-xs text-[#6b7280] md:table-cell">{nomeLocal(i.local_id)}</td>
                    <td className="px-2"><span className={`${badge} ${ESTADO_BADGE[i.estado]}`}>{i.estado}</span></td>
                    <td className="hidden px-4 text-right text-xs text-[#374151] md:table-cell">{fmtMoeda(i.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {itemAberto && <ItemDetalhe item={itemAberto} onFechar={() => setAberto(null)} />}
    </Layout>
  );
}
