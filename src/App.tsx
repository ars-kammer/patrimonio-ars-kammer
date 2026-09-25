import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRecarregar } from "@/lib/dados";
import { PAPEIS } from "@/lib/ui";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Patrimonios from "@/pages/Patrimonios";
import Cadastro from "@/pages/Cadastro";
import Consulta from "@/pages/Consulta";
import Inventario from "@/pages/Inventario";
import Movimentacoes from "@/pages/Movimentacoes";
import Obras from "@/pages/Obras";
import Usuarios from "@/pages/Usuarios";
import Conta from "@/pages/Conta";

/**
 * Ciclos de inventário vencidos são gerados ao abrir o app (regra do
 * protótipo), agora no banco e uma vez por sessão.
 */
// Fora do componente: cada rota monta seu próprio Gate.
let ciclosGeradosPara: string | null = null;

function useGerarCiclos(userId: string | null) {
  const recarregar = useRecarregar();
  useEffect(() => {
    if (!userId || ciclosGeradosPara === userId) return;
    ciclosGeradosPara = userId;
    supabase.rpc("pat_gerar_ciclos", { p_forcar: false }).then(({ data }) => {
      if (data && data > 0) recarregar();
    });
  }, [userId, recarregar]);
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, papel, loading } = useAuth();
  const { pathname } = useLocation();
  useGerarCiclos(papel && user ? user.id : null);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[#6b7280]">Carregando…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!papel) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="text-sm font-medium">Seu acesso ao Patrimônio não está liberado</p>
          <p className="mt-1 text-xs text-[#6b7280]">Fale com o administrador do sistema.</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-xs font-medium text-[#374151] underline"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }
  // Esconder a rota é usabilidade; quem barra de verdade é o RLS.
  if (pathname !== "/conta" && !PAPEIS[papel].paginas.includes(pathname)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Gate><Dashboard /></Gate>} />
        <Route path="/patrimonios" element={<Gate><Patrimonios /></Gate>} />
        <Route path="/cadastro" element={<Gate><Cadastro /></Gate>} />
        <Route path="/consulta" element={<Gate><Consulta /></Gate>} />
        <Route path="/inventario" element={<Gate><Inventario /></Gate>} />
        <Route path="/movimentacoes" element={<Gate><Movimentacoes /></Gate>} />
        <Route path="/obras" element={<Gate><Obras /></Gate>} />
        <Route path="/usuarios" element={<Gate><Usuarios /></Gate>} />
        <Route path="/conta" element={<Gate><Conta /></Gate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
