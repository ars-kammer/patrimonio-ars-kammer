import { useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Package, ScanLine, ClipboardCheck, Truck, Building2, PlusSquare, Users, LogOut, Menu, X, KeyRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { usePendencias } from "@/lib/dados";
import { iniciais, PAPEIS } from "@/lib/ui";

const ITENS = [
  { to: "/", label: "Visão geral", icon: LayoutGrid },
  { to: "/patrimonios", label: "Patrimônios", icon: Package },
  { to: "/consulta", label: "Consultar QR", icon: ScanLine },
  { to: "/inventario", label: "Inventário", icon: ClipboardCheck },
  { to: "/movimentacoes", label: "Movimentações", icon: Truck },
  { to: "/obras", label: "Obras", icon: Building2 },
  { to: "/cadastro", label: "Cadastrar", icon: PlusSquare },
  { to: "/usuarios", label: "Usuários", icon: Users },
];

export default function Layout({ children, titulo, acao }: { children: ReactNode; titulo: string; acao?: ReactNode }) {
  const { nome, papel, user } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const { data: pendencias = [] } = usePendencias();
  const minhas = pendencias.filter((p) => p.status === "pending" && p.responsavel_id === user?.id).length;

  const permitidas = papel ? PAPEIS[papel].paginas : [];

  async function sair() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {ITENS.filter((i) => permitidas.includes(i.to)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={() => setMenuAberto(false)}
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
              isActive ? "bg-[#1a1a1a] font-medium text-white" : "text-[#374151] hover:bg-[#f0f1f3]"
            }`
          }
        >
          <item.icon size={16} strokeWidth={1.75} />
          <span className="flex-1">{item.label}</span>
          {item.to === "/inventario" && minhas > 0 && (
            <span className="rounded-full bg-[#C0392B] px-1.5 py-px text-[10px] font-semibold text-white">{minhas}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const rodape = (
    <div className="border-t border-[#e5e7eb] pt-3">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] font-semibold text-white">
          {iniciais(nome ?? "?")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{nome ?? "—"}</p>
          <p className="text-[10px] text-[#9ca3af]">{papel ? PAPEIS[papel].label : ""}</p>
        </div>
        <NavLink
          to="/conta"
          onClick={() => setMenuAberto(false)}
          aria-label="Minha senha"
          title="Minha senha"
          className="text-[#9ca3af] transition hover:text-[#1a1a1a]"
        >
          <KeyRound size={15} />
        </NavLink>
        <button onClick={sair} aria-label="Sair" title="Sair" className="text-[#9ca3af] transition hover:text-[#1a1a1a]">
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  const marca = (
    <div className="px-3">
      <p className="text-sm font-bold tracking-tight">
        ARS Kammer<span className="text-[#C0392B]">.</span>
      </p>
      <p className="text-xs text-[#9ca3af]">Gestão de Patrimônios</p>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Topo mobile — o encarregado usa pelo celular, no canteiro */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setMenuAberto(true)} aria-label="Abrir menu" className="relative text-[#374151]">
          <Menu size={20} />
          {minhas > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#C0392B]" />}
        </button>
        <span className="truncate font-semibold">{titulo}</span>
        <div className="ml-auto flex items-center gap-2">{acao}</div>
      </header>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMenuAberto(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col gap-5 overflow-y-auto bg-white p-4">
            <div className="flex items-start justify-between">
              {marca}
              <button onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
                <X size={18} />
              </button>
            </div>
            {nav}
            <div className="mt-auto">{rodape}</div>
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 border-r border-[#e5e7eb] bg-white p-4 lg:flex">
        {marca}
        {nav}
        <div className="mt-auto">{rodape}</div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-5 lg:px-8 lg:py-7">
          <div className="mb-5 hidden items-center justify-between lg:flex">
            <h1 className="text-xl font-bold tracking-tight">{titulo}</h1>
            <div className="flex items-center gap-2">{acao}</div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white px-6 py-14 text-center">
      <p className="text-sm font-medium text-[#374151]">{titulo}</p>
      {descricao && <p className="mt-1 text-xs text-[#9ca3af]">{descricao}</p>}
      {acao && <div className="mt-4 flex justify-center">{acao}</div>}
    </div>
  );
}

export function Carregando() {
  return <div className="py-16 text-center text-sm text-[#9ca3af]">Carregando…</div>;
}
