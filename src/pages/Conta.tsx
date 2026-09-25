import { useState } from "react";
import Layout from "@/components/Layout";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { mensagemErro } from "@/lib/erros";
import { btnPrimario, card, input, label } from "@/lib/ui";

export default function Conta() {
  const { user } = useAuth();
  const toast = useToast();
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) return toast("A senha precisa de ao menos 8 caracteres.", "erro");
    if (senha !== repetir) return toast("As senhas não conferem.", "erro");
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return toast(mensagemErro(error), "erro");
    setSenha("");
    setRepetir("");
    toast("Senha alterada.");
  }

  return (
    <Layout titulo="Minha senha">
      <form onSubmit={salvar} className={`${card} mx-auto flex max-w-sm flex-col gap-4 p-5`}>
        <p className="text-sm text-[#6b7280]">{user?.email}</p>
        <div>
          <label className={label} htmlFor="s1">Nova senha</label>
          <input id="s1" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="s2">Repita a nova senha</label>
          <input id="s2" type="password" autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} className={input} />
        </div>
        <p className="text-xs text-[#9ca3af]">Se você também usa o Controle de Obras, a senha muda lá também (é a mesma conta).</p>
        <button type="submit" disabled={salvando} className={`${btnPrimario} justify-center`}>
          {salvando ? "Salvando…" : "Alterar senha"}
        </button>
      </form>
    </Layout>
  );
}
