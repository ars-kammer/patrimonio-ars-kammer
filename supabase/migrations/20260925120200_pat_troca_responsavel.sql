-- Trocou o responsável da obra: o que ainda está pendente passa para o novo,
-- senão o check-in do ciclo em andamento fica com quem não responde mais.
create or replace function public.pat_locais_troca_responsavel()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  update public.pat_pendencias
     set responsavel_id = new.responsavel_id
   where local_id = new.id and status = 'pending';
  return new;
end $$;

create trigger pat_locais_troca_responsavel
after update of responsavel_id on public.pat_locais
for each row when (old.responsavel_id is distinct from new.responsavel_id)
execute function public.pat_locais_troca_responsavel();

revoke execute on function public.pat_locais_troca_responsavel() from public, anon, authenticated;
