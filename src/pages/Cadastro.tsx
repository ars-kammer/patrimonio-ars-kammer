import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle } from "lucide-react";
import Layout from "@/components/Layout";
import ItemForm, { paraBanco, valoresIniciais, type ItemFormValores } from "@/components/ItemForm";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { proximoCodigo, useItens, useLocais, useRecarregar } from "@/lib/dados";
import { enviarFoto, removerFoto } from "@/lib/foto";
import { mensagemErro } from "@/lib/erros";
import { btnPrimario, btnSecundario, card, input, label } from "@/lib/ui";

export default function Cadastro() {
  const { data: itens = [] } = useItens();
  const { data: locais = [] } = useLocais();
  const recarregar = useRecarregar();
  const toast = useToast();
  const navigate = useNavigate();

  const [v, setV] = useState<ItemFormValores>(valoresIniciais());
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const set = (patch: Partial<ItemFormValores>) => setV((a) => ({ ...a, ...patch }));

  const proximo = proximoCodigo(itens);
  const codigoNum = parseInt(v.codigo, 10);
  const codigoStatus = !v.codigo.trim()
    ? null
    : !Number.isFinite(codigoNum) || codigoNum <= 0
      ? "invalido"
      : itens.some((i) => i.codigo === codigoNum)
        ? "usado"
        : "livre";

  async function salvar() {
    const r = paraBanco(v);
    if ("erro" in r) return toast(r.erro, "erro");
    if (codigoStatus === "usado") return toast("Código já cadastrado.", "erro");
    setSalvando(true);
    let caminho: string | null = null;
    try {
      if (foto) caminho = await enviarFoto(foto);
      const { error } = await supabase.from("pat_itens").insert({ ...r.dados, foto_path: caminho });
      if (error) throw error;
      toast(`Patrimônio #${String(r.dados.codigo).padStart(4, "0")} cadastrado!`);
      recarregar();
      navigate("/patrimonios");
    } catch (e) {
      // Foto subiu mas o item não: não deixar arquivo órfão no bucket.
      if (caminho) removerFoto(caminho);
      toast(mensagemErro(e), "erro");
    } finally {
      setSalvando(false);
    }
  }

  const blocoCodigo = (
    <div>
      <label className={label} htmlFor="f-codigo">Código *</label>
      <input
        id="f-codigo"
        inputMode="numeric"
        value={v.codigo}
        onChange={(e) => set({ codigo: e.target.value.replace(/\D/g, "") })}
        placeholder="0001"
        className={`${input} font-mono text-base ${
          codigoStatus === "livre" ? "border-emerald-500" : codigoStatus ? "border-red-400" : ""
        }`}
      />
      <div className="mt-1.5 text-xs">
        {codigoStatus === "livre" && (
          <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={13} /> Disponível</span>
        )}
        {codigoStatus === "usado" && (
          <span className="flex items-center gap-1 text-red-600"><AlertCircle size={13} /> Já cadastrado</span>
        )}
        {codigoStatus === null && (
          <span className="text-[#9ca3af]">
            Próximo livre:{" "}
            <button
              type="button"
              onClick={() => set({ codigo: String(proximo).padStart(4, "0") })}
              className="font-mono font-semibold text-[#1a1a1a] underline"
            >
              {String(proximo).padStart(4, "0")}
            </button>
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Layout titulo="Cadastrar patrimônio">
      <div className={`${card} p-5`}>
        <ItemForm
          v={v}
          set={set}
          locais={locais}
          fotoUrl={preview}
          onFoto={(f) => {
            setFoto(f);
            setPreview(URL.createObjectURL(f));
          }}
          onLimparFoto={() => {
            setFoto(null);
            setPreview(null);
          }}
          cabecalhoCodigo={blocoCodigo}
        />
        <div className="mt-6 flex justify-end gap-2 border-t border-[#e5e7eb] pt-4">
          <button type="button" onClick={() => navigate(-1)} className={btnSecundario}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando} className={btnPrimario}>
            {salvando ? "Salvando…" : "Cadastrar patrimônio"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
