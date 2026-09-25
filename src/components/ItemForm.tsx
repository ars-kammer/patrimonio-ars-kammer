import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import type { Estado, Item, Local, Setor } from "@/types";
import { ESTADOS, input, label, parseValor } from "@/lib/ui";

export interface ItemFormValores {
  codigo: string;
  setor: Setor;
  nome: string;
  marca: string;
  modelo: string;
  responsavel: string;
  local_id: string;
  data_aquisicao: string;
  valor: string;
  fornecedor: string;
  nota_fiscal: string;
  serie: string;
  estado: Estado;
  especificacoes: string;
  garantia_inicio: string;
  garantia_fim: string;
  observacoes: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function valoresIniciais(item?: Item): ItemFormValores {
  return {
    codigo: item ? String(item.codigo).padStart(4, "0") : "",
    setor: item?.setor ?? "ENG",
    nome: item?.nome ?? "",
    marca: item?.marca ?? "",
    modelo: item?.modelo ?? "",
    responsavel: item?.responsavel ?? "",
    local_id: item?.local_id ?? "",
    data_aquisicao: item?.data_aquisicao ?? "",
    valor: item?.valor != null ? String(item.valor).replace(".", ",") : "",
    fornecedor: item?.fornecedor ?? "",
    nota_fiscal: item?.nota_fiscal ?? "",
    serie: item?.serie ?? "",
    estado: item?.estado ?? "Bom",
    especificacoes: item?.especificacoes ?? "",
    garantia_inicio: item?.garantia_inicio ?? "",
    garantia_fim: item?.garantia_fim ?? "",
    observacoes: item?.observacoes ?? "",
  };
}

/** Valida e converte para as colunas do banco. Devolve a mensagem de erro, se houver. */
// eslint-disable-next-line react-refresh/only-export-components
export function paraBanco(v: ItemFormValores): { erro: string } | { dados: Omit<Partial<Item>, "id"> } {
  const codigo = parseInt(v.codigo, 10);
  if (!Number.isFinite(codigo) || codigo <= 0) return { erro: "Informe o código." };
  if (!v.nome.trim()) return { erro: "Informe o nome." };
  if (!v.local_id) return { erro: "Selecione a obra." };
  const valor = parseValor(v.valor);
  if (Number.isNaN(valor)) return { erro: "Valor inválido." };
  if (v.garantia_inicio && v.garantia_fim && v.garantia_fim < v.garantia_inicio) {
    return { erro: "O fim da garantia é antes do início." };
  }
  const t = (s: string) => s.trim() || null;
  return {
    dados: {
      codigo,
      setor: v.setor,
      nome: v.nome.trim(),
      marca: t(v.marca),
      modelo: t(v.modelo),
      responsavel: t(v.responsavel),
      local_id: v.local_id,
      data_aquisicao: v.data_aquisicao || null,
      valor,
      fornecedor: t(v.fornecedor),
      nota_fiscal: t(v.nota_fiscal),
      serie: t(v.serie),
      estado: v.estado,
      especificacoes: t(v.especificacoes),
      garantia_inicio: v.garantia_inicio || null,
      garantia_fim: v.garantia_fim || null,
      observacoes: t(v.observacoes),
    },
  };
}

function Secao({ titulo }: { titulo: string }) {
  return (
    <p className="col-span-full mt-2 border-b border-[#e5e7eb] pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9ca3af]">
      {titulo}
    </p>
  );
}

/**
 * Campos do patrimônio (cadastro e edição). O código e o local ficam fora
 * quando `semCodigoELocal`: na edição o local só muda por movimentação.
 */
export default function ItemForm({
  v,
  set,
  locais,
  fotoUrl,
  onFoto,
  onLimparFoto,
  cabecalhoCodigo,
  semCodigoELocal = false,
}: {
  v: ItemFormValores;
  set: (patch: Partial<ItemFormValores>) => void;
  locais: Local[];
  fotoUrl: string | null;
  onFoto: (f: File) => void;
  onLimparFoto: () => void;
  cabecalhoCodigo?: React.ReactNode;
  semCodigoELocal?: boolean;
}) {
  const arquivo = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const campo = (k: keyof ItemFormValores, rotulo: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className={label} htmlFor={`f-${k}`}>{rotulo}</label>
      <input id={`f-${k}`} value={v[k]} onChange={(e) => set({ [k]: e.target.value })} className={input} {...extra} />
    </div>
  );

  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-4">
        {!semCodigoELocal && cabecalhoCodigo}

        <div>
          <span className={label}>Setor</span>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#e5e7eb] bg-[#f7f8f9] p-1">
            {(["ENG", "ADM"] as Setor[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ setor: s })}
                className={`rounded-md py-1.5 text-sm font-medium transition ${
                  v.setor === s ? "bg-[#1a1a1a] text-white" : "text-[#6b7280] hover:text-[#1a1a1a]"
                }`}
              >
                {s === "ENG" ? "Engenharia" : "Administrativo"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={label}>Foto do produto</span>
          <div
            onClick={() => arquivo.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              const f = e.dataTransfer.files[0];
              if (f) onFoto(f);
            }}
            className={`relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition ${
              arrastando ? "border-[#1a1a1a] bg-[#f0f1f3]" : "border-[#d1d5db] bg-[#f7f8f9] hover:border-[#9ca3af]"
            }`}
          >
            {fotoUrl ? (
              <>
                <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLimparFoto();
                    if (arquivo.current) arquivo.current.value = "";
                  }}
                  aria-label="Remover foto"
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="text-center text-xs text-[#9ca3af]">
                <Camera size={22} className="mx-auto mb-1.5" />
                Tirar foto ou escolher
              </div>
            )}
          </div>
          <input
            ref={arquivo}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFoto(f);
            }}
          />
        </div>
      </div>

      <div className="grid content-start gap-3 sm:grid-cols-2">
        <Secao titulo="Identificação" />
        <div className="sm:col-span-2">{campo("nome", "Nome *", { placeholder: "Ex: Furadeira de impacto" })}</div>
        {campo("marca", "Marca")}
        {campo("modelo", "Modelo")}
        {campo("responsavel", "Responsável")}
        {!semCodigoELocal && (
          <div>
            <label className={label} htmlFor="f-local">Obra / Local *</label>
            <select id="f-local" value={v.local_id} onChange={(e) => set({ local_id: e.target.value })} className={input}>
              <option value="">Selecione…</option>
              {locais.map((l) => (
                <option key={l.id} value={l.id}>{l.nome}</option>
              ))}
            </select>
          </div>
        )}

        <Secao titulo="Aquisição" />
        {campo("data_aquisicao", "Data de aquisição", { type: "date" })}
        {campo("valor", "Valor (R$)", { inputMode: "decimal", placeholder: "0,00" })}
        {campo("fornecedor", "Fornecedor")}
        {campo("nota_fiscal", "Nota fiscal")}

        <Secao titulo="Especificações" />
        {campo("serie", "Nº de série")}
        <div>
          <label className={label} htmlFor="f-estado">Estado</label>
          <select id="f-estado" value={v.estado} onChange={(e) => set({ estado: e.target.value as Estado })} className={input}>
            {ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">{campo("especificacoes", "Especificações", { placeholder: "Potência, dimensões…" })}</div>

        <Secao titulo="Garantia" />
        {campo("garantia_inicio", "Início", { type: "date" })}
        {campo("garantia_fim", "Fim", { type: "date" })}
        <div className="sm:col-span-2">
          <label className={label} htmlFor="f-obs">Observações</label>
          <textarea
            id="f-obs"
            rows={3}
            value={v.observacoes}
            onChange={(e) => set({ observacoes: e.target.value })}
            className={input}
          />
        </div>
      </div>
    </div>
  );
}
