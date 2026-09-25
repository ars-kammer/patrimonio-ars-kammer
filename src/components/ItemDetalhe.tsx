import { useState } from "react";
import { ArrowRight, PackageCheck, PlusCircle, Printer, Pencil, Trash2, Truck } from "lucide-react";
import Modal from "@/components/Modal";
import ItemForm, { paraBanco, valoresIniciais, type ItemFormValores } from "@/components/ItemForm";
import { QrImagem } from "@/components/Foto";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useHistoricoItem, useLocais, useRecarregar } from "@/lib/dados";
import { enviarFoto, removerFoto, useFotos } from "@/lib/foto";
import { qrDataUrl, textoQR } from "@/lib/qr";
import { mensagemErro } from "@/lib/erros";
import {
  badge, btnPerigo, btnPrimario, btnSecundario, codChip, ESTADO_BADGE, fmtCodigo, fmtDate, fmtDateTime, fmtMoeda, SETORES,
} from "@/lib/ui";
import type { Item } from "@/types";

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#f0f1f3] py-2 text-sm last:border-0">
      <span className="shrink-0 text-[#6b7280]">{rotulo}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

async function imprimirEtiqueta(item: Item, local: string) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const src = await qrDataUrl(textoQR(item, local), 400);
  const nome = item.nome.replace(/[<>&"]/g, "");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Etiqueta ${fmtCodigo(item.codigo)}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;justify-content:center;padding:24px}
.e{border:1px solid #1a1a1a;border-radius:8px;padding:14px 18px;text-align:center;width:220px}
.c{font:700 22px monospace;margin-top:6px}.n{font-size:12px;margin-top:2px}.m{font-size:9px;letter-spacing:.14em;color:#C0392B;font-weight:700;margin-bottom:6px}
img{width:170px;height:170px}</style></head><body><div class="e"><div class="m">ARS KAMMER · PATRIMÔNIO</div>
<img src="${src}"><div class="c">${fmtCodigo(item.codigo)}</div><div class="n">${nome}</div></div></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 300);
  return true;
}

export default function ItemDetalhe({ item, onFechar }: { item: Item; onFechar: () => void }) {
  const { isAdmin } = useAuth();
  const { data: locais = [] } = useLocais();
  const { data: fotos } = useFotos([item.foto_path]);
  const { data: hist } = useHistoricoItem(item.id);
  const recarregar = useRecarregar();
  const toast = useToast();
  const [aba, setAba] = useState<"dados" | "hist">("dados");
  const [editando, setEditando] = useState(false);

  const local = locais.find((l) => l.id === item.local_id)?.nome ?? "—";
  const fotoUrl = item.foto_path ? fotos?.[item.foto_path] : undefined;

  // Linha do tempo: cadastro + transferências + recebimentos confirmados.
  const linhaTempo = [
    ...(hist?.movs ?? []).map((m) => ({
      em: m.criado_em,
      icone: <Truck size={14} />,
      cor: "bg-blue-50 text-blue-700",
      titulo: "Transferência",
      corpo: (
        <>
          {m.origem_nome ?? "—"} <ArrowRight size={12} className="inline" /> <strong>{m.destino_nome}</strong>
          {m.observacao && <span className="block text-[#6b7280]">“{m.observacao}”</span>}
        </>
      ),
      quem: m.feito_por_nome,
    })),
    ...(hist?.recebimentos ?? []).map((r) => ({
      em: r.confirmado_em ?? r.criado_em,
      icone: <PackageCheck size={14} />,
      cor: "bg-emerald-50 text-emerald-700",
      titulo: "Recebimento confirmado",
      corpo: <>{r.pat_locais?.nome ?? "—"}</>,
      quem: r.confirmado_por_nome,
    })),
  ].sort((a, b) => b.em.localeCompare(a.em));

  async function excluir() {
    if (!window.confirm("Excluir este patrimônio? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("pat_itens").delete().eq("id", item.id);
    if (error) return toast(mensagemErro(error), "erro");
    if (item.foto_path) removerFoto(item.foto_path);
    toast("Patrimônio excluído.");
    recarregar();
    onFechar();
  }

  if (editando) return <EditarItem item={item} fotoUrl={fotoUrl ?? null} onFechar={() => setEditando(false)} />;

  return (
    <Modal titulo={item.nome} onFechar={onFechar}>
      {fotoUrl && <img src={fotoUrl} alt="" className="mb-4 max-h-64 w-full rounded-xl object-cover" />}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`${codChip} px-2.5 py-1 text-sm`}>{fmtCodigo(item.codigo)}</span>
        <span className={`${badge} ${SETORES[item.setor].cls}`}>{SETORES[item.setor].label}</span>
        <span className={`${badge} ${ESTADO_BADGE[item.estado]}`}>{item.estado}</span>
      </div>

      <div className="mb-3 flex gap-1 border-b border-[#e5e7eb]">
        {(
          [
            ["dados", "Dados"],
            ["hist", `Movimentações${hist && linhaTempo.length ? ` (${linhaTempo.length})` : ""}`],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            onClick={() => setAba(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              aba === k ? "border-[#1a1a1a] text-[#1a1a1a]" : "border-transparent text-[#9ca3af]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {aba === "dados" ? (
        <>
          <Linha rotulo="Marca/Modelo">{[item.marca, item.modelo].filter(Boolean).join(" ") || "—"}</Linha>
          <Linha rotulo="Responsável">{item.responsavel || "—"}</Linha>
          <Linha rotulo="Local atual"><span className="text-[#C0392B]">{local}</span></Linha>
          <Linha rotulo="Aquisição">{fmtDate(item.data_aquisicao)}</Linha>
          <Linha rotulo="Valor">{fmtMoeda(item.valor)}</Linha>
          <Linha rotulo="Fornecedor">{item.fornecedor || "—"}</Linha>
          <Linha rotulo="NF">{item.nota_fiscal || "—"}</Linha>
          <Linha rotulo="Série">{item.serie || "—"}</Linha>
          <Linha rotulo="Especificações">{item.especificacoes || "—"}</Linha>
          <Linha rotulo="Garantia">
            {item.garantia_inicio && item.garantia_fim
              ? `${fmtDate(item.garantia_inicio)} até ${fmtDate(item.garantia_fim)}`
              : "—"}
          </Linha>
          {item.observacoes && <Linha rotulo="Observações">{item.observacoes}</Linha>}

          <div className="mt-4 border-t border-[#e5e7eb] pt-4 text-center">
            <QrImagem texto={textoQR(item, local)} />
            <p className="mt-1.5 text-xs text-[#9ca3af]">QR Code — {fmtCodigo(item.codigo)}</p>
            <button
              onClick={async () => {
                if (!(await imprimirEtiqueta(item, local))) toast("Permita pop-ups para imprimir.", "erro");
              }}
              className={`${btnSecundario} mt-3`}
            >
              <Printer size={15} /> Imprimir etiqueta
            </button>
          </div>

          {isAdmin && (
            <div className="mt-4 flex justify-between gap-2 border-t border-[#e5e7eb] pt-4">
              <button onClick={excluir} className={btnPerigo}>
                <Trash2 size={15} /> Excluir
              </button>
              <button onClick={() => setEditando(true)} className={btnPrimario}>
                <Pencil size={15} /> Editar
              </button>
            </div>
          )}
        </>
      ) : (
        <ol className="flex flex-col gap-3">
          {linhaTempo.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${e.cor}`}>{e.icone}</span>
              <div className="text-sm">
                <p className="font-medium">{e.titulo}</p>
                <p className="text-[#374151]">{e.corpo}</p>
                <p className="text-xs text-[#9ca3af]">{[e.quem, fmtDateTime(e.em)].filter(Boolean).join(" · ")}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-[#374151]">
              <PlusCircle size={14} />
            </span>
            <div className="text-sm">
              <p className="font-medium">Cadastrado</p>
              <p className="text-xs text-[#9ca3af]">{fmtDateTime(item.criado_em)}</p>
            </div>
          </li>
        </ol>
      )}
    </Modal>
  );
}

function EditarItem({ item, fotoUrl, onFechar }: { item: Item; fotoUrl: string | null; onFechar: () => void }) {
  const { data: locais = [] } = useLocais();
  const recarregar = useRecarregar();
  const toast = useToast();
  const [v, setV] = useState<ItemFormValores>(valoresIniciais(item));
  const [novaFoto, setNovaFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(fotoUrl);
  const [tirarFoto, setTirarFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const r = paraBanco(v);
    if ("erro" in r) return toast(r.erro, "erro");
    setSalvando(true);
    let caminho: string | null = null;
    try {
      if (novaFoto) caminho = await enviarFoto(novaFoto);
      // Código e local não entram: local só muda por movimentação.
      const { codigo: _c, local_id: _l, ...campos } = r.dados;
      void _c;
      void _l;
      const foto_path = caminho ?? (tirarFoto ? null : item.foto_path);
      const { error } = await supabase.from("pat_itens").update({ ...campos, foto_path }).eq("id", item.id);
      if (error) throw error;
      if (item.foto_path && foto_path !== item.foto_path) removerFoto(item.foto_path);
      toast("Patrimônio atualizado.");
      recarregar();
      onFechar();
    } catch (e) {
      if (caminho) removerFoto(caminho);
      toast(mensagemErro(e), "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={`Editar ${fmtCodigo(item.codigo)}`} onFechar={onFechar} largura="max-w-3xl">
      <ItemForm
        v={v}
        set={(p) => setV((a) => ({ ...a, ...p }))}
        locais={locais}
        fotoUrl={preview}
        onFoto={(f) => {
          setNovaFoto(f);
          setTirarFoto(false);
          setPreview(URL.createObjectURL(f));
        }}
        onLimparFoto={() => {
          setNovaFoto(null);
          setTirarFoto(true);
          setPreview(null);
        }}
        semCodigoELocal
      />
      <div className="mt-6 flex justify-end gap-2 border-t border-[#e5e7eb] pt-4">
        <button onClick={onFechar} className={btnSecundario}>Cancelar</button>
        <button onClick={salvar} disabled={salvando} className={btnPrimario}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </Modal>
  );
}
