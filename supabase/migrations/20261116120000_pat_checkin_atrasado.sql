-- Check-in atrasado (2026-11-16).
-- Antes: o ciclo novo cancelava o que faltava do anterior ("Expirado") e o
-- encarregado não conseguia mais confirmar. Agora o que falta continua
-- pendente (aparece como atrasado) e um único scan do item confirma o item em
-- todos os ciclos abertos dele. "Gerar ciclos agora" (forçado pelo admin)
-- continua encerrando de vez, como o aviso da tela diz.

create or replace function public.pat_gerar_ciclos(p_forcar boolean default false)
returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  l record;
  v_ciclo uuid;
  v_gerados int := 0;
begin
  if public.pat_meu_papel() is null then
    raise exception 'Sem acesso ao Patrimônio.';
  end if;
  if p_forcar and not public.pat_is_admin() then
    raise exception 'Só o administrador força ciclos.';
  end if;

  for l in
    select * from public.pat_locais
    where p_forcar
       or ultimo_ciclo_em is null
       or ultimo_ciclo_em + make_interval(days => freq_dias) <= now()
    order by nome
    for update skip locked
  loop
    if not p_forcar and l.ultimo_ciclo_em is not null
       and l.ultimo_ciclo_em + make_interval(days => l.freq_dias) > now() then
      continue;
    end if;
    if not exists (select 1 from public.pat_itens where local_id = l.id) then
      continue;
    end if;

    if p_forcar then
      update public.pat_pendencias p set status = 'cancelled'
        from public.pat_ciclos c
       where p.ciclo_id = c.id and c.local_id = l.id and c.status = 'active' and p.status = 'pending';
    end if;
    update public.pat_ciclos set status = 'expired'
     where local_id = l.id and status = 'active';

    insert into public.pat_ciclos (local_id, freq_dias, prazo)
    values (l.id, l.freq_dias, (now() at time zone 'America/Sao_Paulo')::date + l.prazo_dias)
    returning id into v_ciclo;

    insert into public.pat_pendencias (tipo, item_id, local_id, responsavel_id, ciclo_id)
    select 'inv', i.id, l.id, l.responsavel_id, v_ciclo
      from public.pat_itens i where i.local_id = l.id;

    update public.pat_locais set ultimo_ciclo_em = now() where id = l.id;
    v_gerados := v_gerados + 1;
  end loop;

  return v_gerados;
end $$;

-- Confirma recebimento ou check-in. No check-in, o scan vale para o item em
-- todos os ciclos ainda abertos (o atual e os atrasados).
create or replace function public.pat_confirmar(p_pendencia uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  p public.pat_pendencias;
  v_nome text;
  v_item public.pat_itens;
begin
  if public.pat_meu_papel() is null then
    raise exception 'Sem acesso ao Patrimônio.';
  end if;

  select * into p from public.pat_pendencias where id = p_pendencia for update;
  if not found then
    raise exception 'Pendência não encontrada.';
  end if;
  if p.status <> 'pending' then
    raise exception 'Esta pendência já foi resolvida.';
  end if;
  if p.responsavel_id is distinct from auth.uid() and not public.pat_is_admin() then
    raise exception 'Só o responsável pela obra confirma este item.';
  end if;

  v_nome := public.pat_nome_usuario(auth.uid());
  update public.pat_pendencias
     set status = 'confirmed', confirmado_por = auth.uid(),
         confirmado_por_nome = v_nome, confirmado_em = now()
   where status = 'pending'
     and (id = p.id
          or (p.tipo = 'inv' and tipo = 'inv' and item_id = p.item_id
              and (responsavel_id = auth.uid() or public.pat_is_admin())));

  if p.tipo = 'inv' then
    update public.pat_ciclos c set status = 'completed'
     where c.status in ('active', 'expired')
       and c.id in (select ciclo_id from public.pat_pendencias
                     where item_id = p.item_id and tipo = 'inv' and status = 'confirmed'
                       and confirmado_em = now() and ciclo_id is not null)
       and not exists (
         select 1 from public.pat_pendencias
          where ciclo_id = c.id and status = 'pending'
       );
  end if;

  select * into v_item from public.pat_itens where id = p.item_id;
  insert into public.pat_eventos (tipo, texto, item_id, local_id, setor, usuario_nome)
  values (case p.tipo when 'recv' then 'recebimento' else 'inventario' end,
          case p.tipo when 'recv' then 'Recebimento: #' else 'Inventário: #' end
            || lpad(v_item.codigo::text, 4, '0') || ' — ' || v_item.nome,
          p.item_id, p.local_id, v_item.setor, v_nome);
end $$;

-- Reabre o que o ciclo automático cancelou (próximo ciclo nasceu depois da
-- frequência cheia). O que foi encerrado por "Gerar ciclos agora" (antes da
-- frequência) ou por transferência (item saiu da obra) continua cancelado.
update public.pat_pendencias p
   set status = 'pending', responsavel_id = l.responsavel_id
  from public.pat_ciclos c
  join public.pat_locais l on l.id = c.local_id
 where p.ciclo_id = c.id and p.tipo = 'inv' and p.status = 'cancelled'
   and c.status = 'expired'
   and exists (select 1 from public.pat_itens i where i.id = p.item_id and i.local_id = c.local_id)
   and exists (select 1 from public.pat_ciclos n
                where n.local_id = c.local_id and n.criado_em > c.criado_em
                  and n.criado_em >= c.criado_em + make_interval(days => c.freq_dias)
                  and not exists (select 1 from public.pat_ciclos m
                                   where m.local_id = c.local_id
                                     and m.criado_em > c.criado_em and m.criado_em < n.criado_em));
