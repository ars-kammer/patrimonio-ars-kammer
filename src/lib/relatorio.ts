import type { Item } from "@/types";
import { fmtCodigo, fmtMoeda, SETORES } from "@/lib/ui";

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Relatório para imprimir / salvar em PDF (mesmo layout do protótipo).
 * A janela nova herda a CSP do app (sem script inline), então quem chama o
 * print() é o app, não a página do relatório.
 */
export function abrirRelatorio(itens: Item[], nomeLocal: (id: string) => string, emitidoPor: string, filtros: string) {
  const w = window.open("", "_blank");
  if (!w) return false;

  const total = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const conta = (f: (i: Item) => string) =>
    itens.reduce<Record<string, number>>((acc, i) => ((acc[f(i)] = (acc[f(i)] ?? 0) + 1), acc), {});
  const resumo = (obj: Record<string, number>) =>
    Object.entries(obj)
      .map(([k, v]) => `<span class="chip">${esc(k)}: <b>${v}</b></span>`)
      .join("");

  const linhas = itens
    .map(
      (i) => `<tr><td>${fmtCodigo(i.codigo)}</td><td>${esc(i.nome)}</td><td>${esc(
        [i.marca, i.modelo].filter(Boolean).join(" "),
      )}</td><td>${i.setor === "ENG" ? "Eng" : "Adm"}</td><td>${esc(nomeLocal(i.local_id))}</td><td>${esc(
        i.estado,
      )}</td><td>${esc(i.responsavel)}</td><td class="r">${fmtMoeda(i.valor ?? 0)}</td></tr>`,
    )
    .join("");

  w.document.open();
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Patrimônio — ARS Kammer</title><style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",system-ui,sans-serif;color:#1a1a1a;padding:32px;font-size:12px}
.h{border-bottom:3px solid #C0392B;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
.h h1{font-size:20px;letter-spacing:.02em}.h .sub{font-size:11px;color:#6b6b6b;text-transform:uppercase;letter-spacing:.12em;font-weight:600;margin-top:4px}
.meta{text-align:right;font-size:11px;color:#6b6b6b;line-height:1.6}
.cards{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}.card{border:.5px solid #e0e0dc;border-top:2px solid #C0392B;border-radius:4px;padding:10px 16px;min-width:130px}
.card .lbl{font-size:10px;color:#6b6b6b;text-transform:uppercase;letter-spacing:.06em}.card .val{font-size:18px;font-weight:700;margin-top:2px}
.group{margin-bottom:12px}.group h3{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#4a4a4a;margin-bottom:6px}
.chip{display:inline-block;background:#f5f5f3;border:.5px solid #e0e0dc;border-radius:2px;padding:3px 9px;margin:0 6px 6px 0;font-size:11px}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:.5px solid #e0e0dc;font-size:11px}
th{background:#1a1a1a;color:#fff;text-transform:uppercase;letter-spacing:.04em;font-size:10px}.r{text-align:right}
tfoot td{font-weight:700;border-top:1.5px solid #1a1a1a}
.foot{margin-top:24px;font-size:10px;color:#9a9a9a;text-align:center;border-top:.5px solid #e0e0dc;padding-top:10px}@media print{body{padding:0}}
</style></head><body>
<div class="h"><div><h1>ARS KAMMER</h1><div class="sub">Relatório de Patrimônio</div></div>
<div class="meta">Emitido em ${esc(new Date().toLocaleString("pt-BR"))}<br>Por: ${esc(emitidoPor)}<br>Filtros: ${esc(filtros)}</div></div>
<div class="cards"><div class="card"><div class="lbl">Itens</div><div class="val">${itens.length}</div></div>
<div class="card"><div class="lbl">Valor total</div><div class="val">${fmtMoeda(total)}</div></div></div>
<div class="group"><h3>Por setor</h3>${resumo(conta((i) => SETORES[i.setor].label))}</div>
<div class="group"><h3>Por estado</h3>${resumo(conta((i) => i.estado))}</div>
<div class="group"><h3>Por local / obra</h3>${resumo(conta((i) => nomeLocal(i.local_id)))}</div>
<table><thead><tr><th>Código</th><th>Nome</th><th>Marca/Modelo</th><th>Setor</th><th>Local</th><th>Estado</th><th>Responsável</th><th class="r">Valor</th></tr></thead>
<tbody>${linhas}</tbody>
<tfoot><tr><td colspan="7">Total — ${itens.length} ${itens.length === 1 ? "item" : "itens"}</td><td class="r">${fmtMoeda(total)}</td></tr></tfoot></table>
<div class="foot">ARS Kammer · Sistema de Gestão de Patrimônios · documento gerado automaticamente</div>
</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 400);
  return true;
}
