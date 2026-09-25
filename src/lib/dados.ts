import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Ciclo, Evento, Item, Local, Movimentacao, Pendencia, Usuario } from "@/types";

/**
 * Leituras do módulo. O volume é de centenas de itens, então cada lista vem
 * inteira e o filtro é feito na tela, como no protótipo do João.
 */

async function tudo<T>(tabela: string, ordem: string, asc = true): Promise<T[]> {
  const { data, error } = await supabase.from(tabela).select("*").order(ordem, { ascending: asc });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useItens = () =>
  useQuery({ queryKey: ["pat", "itens"], queryFn: () => tudo<Item>("pat_itens", "codigo") });

export const useLocais = () =>
  useQuery({ queryKey: ["pat", "locais"], queryFn: () => tudo<Local>("pat_locais", "nome") });

export const useUsuarios = () =>
  useQuery({ queryKey: ["pat", "usuarios"], queryFn: () => tudo<Usuario>("pat_usuarios", "nome") });

export const useCiclos = () =>
  useQuery({ queryKey: ["pat", "ciclos"], queryFn: () => tudo<Ciclo>("pat_ciclos", "criado_em", false) });

export const usePendencias = () =>
  useQuery({
    queryKey: ["pat", "pendencias"],
    queryFn: async () => {
      // As mais recentes bastam: cobrem as abertas e os ciclos mostrados na tela.
      const { data, error } = await supabase
        .from("pat_pendencias")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Pendencia[];
    },
    // O encarregado deixa o app aberto no canteiro: o aviso novo aparece sozinho.
    refetchInterval: 60_000,
  });

export const useMovimentacoes = () =>
  useQuery({
    queryKey: ["pat", "movimentacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pat_movimentacoes")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Movimentacao[];
    },
  });

export const useEventos = () =>
  useQuery({
    queryKey: ["pat", "eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pat_eventos")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as Evento[];
    },
  });

export function useHistoricoItem(itemId: string) {
  return useQuery({
    queryKey: ["pat", "historico", itemId],
    queryFn: async () => {
      const [movs, recebs] = await Promise.all([
        supabase.from("pat_movimentacoes").select("*").eq("item_id", itemId).order("criado_em"),
        supabase
          .from("pat_pendencias")
          .select("*, pat_locais(nome)")
          .eq("item_id", itemId)
          .eq("tipo", "recv")
          .eq("status", "confirmed"),
      ]);
      if (movs.error) throw movs.error;
      if (recebs.error) throw recebs.error;
      return {
        movs: (movs.data ?? []) as Movimentacao[],
        recebimentos: (recebs.data ?? []) as (Pendencia & { pat_locais: { nome: string } | null })[],
      };
    },
  });
}

/** Tudo do módulo muda junto (item move → pendência, evento, ciclo). */
export function useRecarregar() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["pat"] });
}

/** Próximo código livre, preenchendo buracos (mesma regra do protótipo). */
export function proximoCodigo(itens: Item[]): number {
  const usados = new Set(itens.map((i) => i.codigo));
  let n = 1;
  while (usados.has(n)) n++;
  return n;
}
