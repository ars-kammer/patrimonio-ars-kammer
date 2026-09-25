import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { RefreshCcw } from "lucide-react";

/**
 * Câmera + leitura contínua de QR. Chama onLer a cada QR novo (o mesmo
 * conteúdo só é repetido depois de 3s). Desmontar o componente desliga a câmera.
 */
export default function ScannerQR({ onLer, status }: { onLer: (raw: string) => void; status?: React.ReactNode }) {
  const video = useRef<HTMLVideoElement>(null);
  const [frente, setFrente] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const onLerRef = useRef(onLer);

  useEffect(() => {
    onLerRef.current = onLer;
  }, [onLer]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let ativo = true;
    let ultimo = "";
    let ultimoEm = 0;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

    function tick() {
      const v = video.current;
      if (!ativo || !v) return;
      if (v.readyState === v.HAVE_ENOUGH_DATA) {
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          const agora = Date.now();
          if (code.data !== ultimo || agora - ultimoEm > 3000) {
            ultimo = code.data;
            ultimoEm = agora;
            onLerRef.current(code.data);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: frente ? "user" : "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!ativo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        setErro(null);
        raf = requestAnimationFrame(tick);
      } catch {
        if (ativo) setErro("Câmera não disponível. Libere o acesso à câmera no navegador ou digite o código.");
      }
    })();

    return () => {
      ativo = false;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [frente]);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#111]">
        <video ref={video} playsInline muted className="h-full w-full object-cover" />
        {!erro && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-1/2 max-w-56 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
            {erro}
          </div>
        )}
        <button
          type="button"
          onClick={() => setFrente((f) => !f)}
          aria-label="Trocar câmera"
          className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white"
        >
          <RefreshCcw size={16} />
        </button>
      </div>
      {status && <div className="mt-3">{status}</div>}
    </div>
  );
}

export function StatusLeitura({ tipo, children }: { tipo: "info" | "ok" | "erro"; children: React.ReactNode }) {
  const cls = {
    info: "border-[#e5e7eb] bg-[#f7f8f9] text-[#374151]",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
    erro: "border-red-200 bg-red-50 text-red-600",
  }[tipo];
  return <p className={`rounded-lg border px-3 py-2 text-center text-sm font-medium ${cls}`}>{children}</p>;
}
