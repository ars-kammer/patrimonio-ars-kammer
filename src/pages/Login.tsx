import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { btnPrimario, input, label } from "@/lib/ui";

export default function Login() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) {
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <p className="text-xl font-bold tracking-tight">ARS Kammer</p>
          <p className="mt-0.5 text-sm text-[#6b7280]">Gestão de Patrimônios</p>
        </div>

        <form onSubmit={entrar} className="rounded-xl border border-[#e5e7eb] bg-white p-6">
          <div className="mb-4">
            <label htmlFor="email" className={label}>E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
            />
          </div>

          <div className="mb-5">
            <label htmlFor="senha" className={label}>Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className={input}
            />
          </div>

          {erro && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {erro}
            </p>
          )}

          <button type="submit" disabled={enviando} className={`${btnPrimario} w-full justify-center`}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        {/* Entrada é por convite — não existe cadastro aberto para a equipe. */}
        <p className="mt-4 text-center text-xs text-[#9ca3af]">
          Acesso liberado pelo administrador. Esqueceu a senha? Fale com ele.
        </p>
      </div>
    </div>
  );
}
