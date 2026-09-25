import QRCode from "qrcode";
import type { Item } from "@/types";

/**
 * Conteúdo da etiqueta — mesmo formato do protótipo ("COD:0001|NOME:..."),
 * então etiquetas já impressas continuam sendo lidas.
 */
export function textoQR(item: Item, local: string): string {
  return [
    "COD:" + String(item.codigo).padStart(4, "0"),
    "NOME:" + item.nome,
    "SETOR:" + item.setor,
    "LOCAL:" + (local || "-"),
    "ESTADO:" + item.estado,
  ].join("|");
}

/** Extrai o código de um QR lido: "COD:0001|..." ou só o número. */
export function codigoDoQR(raw: string): number | null {
  const m = raw.match(/COD:(\d+)/) ?? raw.match(/\b(\d{1,10})\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function qrDataUrl(texto: string, tamanho = 240): Promise<string> {
  return QRCode.toDataURL(texto, { width: tamanho, margin: 1, errorCorrectionLevel: "M" });
}
