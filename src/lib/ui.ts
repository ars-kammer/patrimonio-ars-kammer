import type { Estado, Papel, Setor } from "@/types";

type Badge = { label: string; cls: string };

export const PAPEIS: Record<Papel, { label: string; paginas: string[] }> = {
  admin: {
    label: "Administrador",
    paginas: ["/", "/patrimonios", "/consulta", "/inventario", "/movimentacoes", "/obras", "/cadastro", "/usuarios"],
  },
  eng: { label: "Engenharia", paginas: ["/", "/patrimonios", "/consulta", "/inventario", "/cadastro"] },
  adm: { label: "Administrativo", paginas: ["/", "/patrimonios", "/consulta", "/inventario", "/cadastro"] },
  enc: { label: "Encarregado de obra", paginas: ["/", "/consulta", "/inventario"] },
};

export const SETORES: Record<Setor, Badge> = {
  ENG: { label: "Engenharia", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ADM: { label: "Administrativo", cls: "bg-violet-50 text-violet-700 border-violet-200" },
};

export const ESTADOS: Estado[] = ["Ótimo", "Bom", "Regular", "Ruim", "Inativo"];

export const ESTADO_BADGE: Record<Estado, string> = {
  Ótimo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Bom: "bg-blue-50 text-blue-700 border-blue-200",
  Regular: "bg-amber-50 text-amber-700 border-amber-200",
  Ruim: "bg-red-50 text-red-600 border-red-200",
  Inativo: "bg-[#f0f1f3] text-[#6b7280] border-[#e5e7eb]",
};

export const ESTADO_COR: Record<Estado, string> = {
  Ótimo: "#15803d",
  Bom: "#1d4ed8",
  Regular: "#b45309",
  Ruim: "#b91c1c",
  Inativo: "#9ca3af",
};

export const FREQUENCIAS: { dias: number; label: string }[] = [
  { dias: 7, label: "Semanal (7d)" },
  { dias: 15, label: "Quinzenal (15d)" },
  { dias: 30, label: "Mensal (30d)" },
  { dias: 60, label: "Bimestral (60d)" },
  { dias: 90, label: "Trimestral (90d)" },
];

export const PRAZOS = [1, 2, 3, 7];

export function freqLabel(dias: number): string {
  return FREQUENCIAS.find((f) => f.dias === dias)?.label.replace(/ \(.*\)/, "") ?? `${dias} dias`;
}

// ---------- formatação ----------

export function fmtCodigo(codigo: number): string {
  return "#" + String(codigo).padStart(4, "0");
}

/** "YYYY-MM-DD" como data local, sem fuso. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function fmtMoeda(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", minimumFractionDigits: casas, maximumFractionDigits: casas,
  });
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes[partes.length - 1][0] : "")).toUpperCase();
}

/** Texto para busca: sem acento, minúsculo. */
export function normaliza(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** "1.234,56" ou "1234.56" → número; vazio → null. */
export function parseValor(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/**
 * Data de hoje no fuso local, como "YYYY-MM-DD".
 * `toISOString()` devolve UTC: depois das 21h em Brasília já é o dia seguinte.
 */
export function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dias até a data (negativo = passou), contando em dias de calendário locais. */
export function diasAte(data: Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

// ---------- classes compartilhadas (Bonsai preto + vermelho ARS) ----------

export const card = "rounded-xl border border-[#e5e7eb] bg-white";
export const btnPrimario =
  "inline-flex items-center gap-2 rounded-lg bg-[#1a1a1a] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-black disabled:opacity-50";
export const btnSecundario =
  "inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#f7f8f9] disabled:opacity-50";
export const btnPerigo =
  "inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50";
export const input =
  "w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#1a1a1a]";
export const label = "mb-1.5 block text-xs font-medium text-[#6b7280]";
export const badge = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium";
export const codChip =
  "inline-flex items-center rounded-md bg-[#1a1a1a] px-2 py-0.5 font-mono text-xs font-semibold text-white";
