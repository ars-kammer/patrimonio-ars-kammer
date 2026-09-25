import { useState } from "react";
import { ScanLine, Search } from "lucide-react";
import Layout from "@/components/Layout";
import ScannerQR, { StatusLeitura } from "@/components/ScannerQR";
import ItemDetalhe from "@/components/ItemDetalhe";
import { useItens } from "@/lib/dados";
import { codigoDoQR } from "@/lib/qr";
import { btnPrimario, btnSecundario, card, input, label } from "@/lib/ui";

export default function Consulta() {
  const { data: itens = [] } = useItens();
  const [camera, setCamera] = useState(false);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState<{ tipo: "info" | "ok" | "erro"; msg: string } | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  function buscar(codigo: number | null, origem: string) {
    if (!codigo) {
      setStatus({ tipo: "erro", msg: "QR não reconhecido." });
      return;
    }
    const item = itens.find((i) => i.codigo === codigo);
    if (!item) {
      setStatus({ tipo: "erro", msg: `Código #${String(codigo).padStart(4, "0")} não encontrado.` });
      return;
    }
    setStatus({ tipo: "ok", msg: `Encontrado: ${item.nome}` });
    if (origem === "camera") setCamera(false);
    setAberto(item.id);
  }

  const itemAberto = itens.find((i) => i.id === aberto);

  return (
    <Layout titulo="Consultar por QR Code">
      <div className="mx-auto grid max-w-xl gap-4">
        <div className={`${card} p-4`}>
          {camera ? (
            <>
              <ScannerQR
                onLer={(raw) => buscar(codigoDoQR(raw), "camera")}
                status={<StatusLeitura tipo={status?.tipo ?? "info"}>{status?.msg ?? "Aponte para o QR Code"}</StatusLeitura>}
              />
              <button onClick={() => setCamera(false)} className={`${btnSecundario} mt-3 w-full justify-center`}>
                Desativar câmera
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setStatus(null);
                setCamera(true);
              }}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] text-white"
            >
              <ScanLine size={36} strokeWidth={1.5} />
              <span className="text-sm font-medium">Ativar câmera</span>
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseInt(manual, 10);
            buscar(Number.isFinite(n) && n > 0 ? n : null, "manual");
          }}
          className={`${card} p-4`}
        >
          <label className={label} htmlFor="manual">Ou digite o código</label>
          <div className="flex gap-2">
            <input
              id="manual"
              inputMode="numeric"
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
              placeholder="Ex: 0001"
              className={`${input} font-mono`}
            />
            <button type="submit" className={btnPrimario}>
              <Search size={15} /> Buscar
            </button>
          </div>
          {!camera && status && <div className="mt-3"><StatusLeitura tipo={status.tipo}>{status.msg}</StatusLeitura></div>}
        </form>
      </div>

      {itemAberto && <ItemDetalhe item={itemAberto} onFechar={() => setAberto(null)} />}
    </Layout>
  );
}
