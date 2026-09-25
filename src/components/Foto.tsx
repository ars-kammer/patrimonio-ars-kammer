import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { qrDataUrl } from "@/lib/qr";

/** Miniatura do item; sem foto, mostra o ícone de pacote. */
export function Miniatura({ url, tamanho = "h-10 w-10" }: { url?: string; tamanho?: string }) {
  return (
    <div className={`${tamanho} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f0f1f3] text-[#9ca3af]`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <Package size={16} />}
    </div>
  );
}

export function QrImagem({ texto, tamanho = 140 }: { texto: string; tamanho?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    qrDataUrl(texto, tamanho * 2).then((u) => vivo && setSrc(u));
    return () => {
      vivo = false;
    };
  }, [texto, tamanho]);
  return src ? (
    <img src={src} alt="QR Code" width={tamanho} height={tamanho} className="mx-auto" />
  ) : (
    <div style={{ width: tamanho, height: tamanho }} className="mx-auto rounded bg-[#f0f1f3]" />
  );
}
