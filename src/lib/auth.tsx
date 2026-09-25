import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Papel } from "@/types";

interface AuthState {
  user: User | null;
  nome: string | null;
  /** null = sem acesso ao Patrimônio (ou desativado): o banco já não entrega nada. */
  papel: Papel | null;
  isAdmin: boolean;
  podeCadastrar: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null, nome: null, papel: null, isAdmin: false, podeCadastrar: false, loading: true,
});

interface PerfilCarregado {
  userId: string;
  nome: string | null;
  papel: Papel | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessaoLida, setSessaoLida] = useState(false);
  const [perfil, setPerfil] = useState<PerfilCarregado | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setSessaoLida(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    (async () => {
      const { data } = await supabase
        .from("pat_usuarios")
        .select("nome, papel, ativo")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!vivo) return;
      setPerfil({
        userId: user.id,
        nome: data?.nome ?? user.email ?? null,
        papel: data?.ativo ? (data.papel as Papel) : null,
      });
    })();
    return () => {
      vivo = false;
    };
  }, [user]);

  // Perfil só vale para o usuário logado agora — trocar de conta descarta o antigo.
  const atual = user && perfil?.userId === user.id ? perfil : null;
  const papel = atual?.papel ?? null;

  const value: AuthState = {
    user,
    nome: atual?.nome ?? null,
    papel,
    isAdmin: papel === "admin",
    podeCadastrar: papel === "admin" || papel === "eng" || papel === "adm",
    loading: !sessaoLida || (!!user && !atual),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
