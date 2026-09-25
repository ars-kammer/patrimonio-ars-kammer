-- Patrimônio ARS Kammer — módulo pat_* no banco do Controle de Obras.
--
-- Mora no mesmo Supabase do Obras (vxwyizedcanxjukcmtfd), mas com papéis
-- próprios: quem acessa o Patrimônio é decidido por pat_usuarios, não por
-- profiles.perfil. Usuário criado só para o Patrimônio nasce como 'visitante'
-- sem obras no Obras, ou seja, não enxerga nada de lá.
--
-- Escrita de ciclo, pendência e movimentação só por RPC (SECURITY DEFINER),
-- para manter as regras atômicas e fora do navegador.

-- ---------------------------------------------------------------- papéis

create type public.pat_papel as enum ('admin', 'eng', 'adm', 'enc');

create table public.pat_usuarios (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (btrim(nome) <> ''),
  email text not null,
  papel public.pat_papel not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Papel do usuário logado; null = sem acesso (ou desativado).
create or replace function public.pat_meu_papel()
returns public.pat_papel
language sql stable security definer
set search_path = public, pg_temp
as $$
  select papel from public.pat_usuarios where user_id = auth.uid() and ativo
$$;

create or replace function public.pat_is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.pat_meu_papel() = 'admin', false)
$$;

-- Engenharia e Administrativo cadastram; encarregado só confirma.
create or replace function public.pat_pode_cadastrar()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.pat_meu_papel() in ('admin', 'eng', 'adm'), false)
$$;

-- ---------------------------------------------------------------- tabelas

create table public.pat_locais (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (btrim(nome) <> ''),
  responsavel_id uuid references public.pat_usuarios(user_id) on delete set null,
  freq_dias int not null default 15 check (freq_dias in (7, 15, 30, 60, 90)),
  prazo_dias int not null default 3 check (prazo_dias between 1 and 30),
  ultimo_ciclo_em timestamptz,
  criado_em timestamptz not null default now()
);
create unique index pat_locais_nome_uk on public.pat_locais (lower(btrim(nome)));

create table public.pat_itens (
  id uuid primary key default gen_random_uuid(),
  codigo int not null check (codigo > 0),
  setor text not null check (setor in ('ENG', 'ADM')),
  nome text not null check (btrim(nome) <> ''),
  marca text,
  modelo text,
  responsavel text,
  local_id uuid not null references public.pat_locais(id) on delete restrict,
  data_aquisicao date,
  valor numeric(14, 2) check (valor >= 0),
  fornecedor text,
  nota_fiscal text,
  serie text,
  estado text not null default 'Bom' check (estado in ('Ótimo', 'Bom', 'Regular', 'Ruim', 'Inativo')),
  especificacoes text,
  garantia_inicio date,
  garantia_fim date,
  observacoes text,
  foto_path text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint pat_itens_codigo_uk unique (codigo)
);
create index pat_itens_local_idx on public.pat_itens (local_id);

create table public.pat_ciclos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.pat_locais(id) on delete cascade,
  freq_dias int not null,
  prazo date not null,
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  criado_em timestamptz not null default now()
);
create index pat_ciclos_local_idx on public.pat_ciclos (local_id, criado_em desc);

-- recv = recebimento após transferência; inv = check-in do inventário periódico.
create table public.pat_pendencias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('recv', 'inv')),
  item_id uuid not null references public.pat_itens(id) on delete cascade,
  local_id uuid references public.pat_locais(id) on delete cascade,
  responsavel_id uuid references public.pat_usuarios(user_id) on delete set null,
  ciclo_id uuid references public.pat_ciclos(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  confirmado_por uuid references auth.users(id) on delete set null,
  confirmado_por_nome text,
  confirmado_em timestamptz,
  criado_em timestamptz not null default now()
);
create index pat_pendencias_resp_idx on public.pat_pendencias (responsavel_id) where status = 'pending';
create index pat_pendencias_ciclo_idx on public.pat_pendencias (ciclo_id);
create index pat_pendencias_item_idx on public.pat_pendencias (item_id);

-- Nomes gravados como texto: o histórico sobrevive à obra ou pessoa removida.
create table public.pat_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.pat_itens(id) on delete cascade,
  origem_id uuid references public.pat_locais(id) on delete set null,
  origem_nome text,
  destino_id uuid references public.pat_locais(id) on delete set null,
  destino_nome text not null,
  observacao text,
  responsavel_notificado text,
  feito_por uuid references auth.users(id) on delete set null,
  feito_por_nome text,
  criado_em timestamptz not null default now()
);
create index pat_movimentacoes_item_idx on public.pat_movimentacoes (item_id, criado_em desc);
create index pat_movimentacoes_criado_idx on public.pat_movimentacoes (criado_em desc);

-- Feed de atividade. Sem FK para item: a exclusão também é registrada aqui.
create table public.pat_eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('cadastro', 'exclusao', 'movimentacao', 'recebimento', 'inventario')),
  texto text not null,
  item_id uuid,
  local_id uuid,
  setor text,
  usuario_nome text,
  criado_em timestamptz not null default now()
);
create index pat_eventos_criado_idx on public.pat_eventos (criado_em desc);

-- ---------------------------------------------------------------- triggers

create or replace function public.pat_nome_usuario(p_id uuid)
returns text
language sql stable security definer
set search_path = public, pg_temp
as $$
  select nome from public.pat_usuarios where user_id = p_id
$$;

-- criado_por vem do login, não do cliente; e não muda depois.
create or replace function public.pat_itens_autoria()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.criado_por := auth.uid();
    end if;
    new.criado_em := now();
  else
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create trigger pat_itens_autoria
before insert or update on public.pat_itens
for each row execute function public.pat_itens_autoria();

create or replace function public.pat_itens_evento()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.pat_eventos (tipo, texto, item_id, local_id, setor, usuario_nome)
    values ('cadastro', '#' || lpad(new.codigo::text, 4, '0') || ' — ' || new.nome,
            new.id, new.local_id, new.setor, public.pat_nome_usuario(auth.uid()));
    return new;
  end if;
  insert into public.pat_eventos (tipo, texto, item_id, local_id, setor, usuario_nome)
  values ('exclusao', 'Excluído: #' || lpad(old.codigo::text, 4, '0') || ' — ' || old.nome,
          old.id, old.local_id, old.setor, public.pat_nome_usuario(auth.uid()));
  return old;
end $$;

create trigger pat_itens_evento
after insert or delete on public.pat_itens
for each row execute function public.pat_itens_evento();

-- Nunca ficar sem administrador (desativar ou rebaixar o último trava o módulo).
create or replace function public.pat_usuarios_guarda()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if old.papel = 'admin' and old.ativo and (new.papel <> 'admin' or not new.ativo) then
    if not exists (
      select 1 from public.pat_usuarios
      where papel = 'admin' and ativo and user_id <> old.user_id
    ) then
      raise exception 'Precisa existir ao menos um administrador ativo.';
    end if;
  end if;
  new.user_id := old.user_id;
  new.email := old.email;
  new.criado_em := old.criado_em;
  return new;
end $$;

create trigger pat_usuarios_guarda
before update on public.pat_usuarios
for each row execute function public.pat_usuarios_guarda();

-- ---------------------------------------------------------------- RPCs

-- Gera ciclo de inventário para cada local vencido. Chamado ao abrir o app
-- (como no protótipo); a trava por linha evita ciclo duplicado quando duas
-- pessoas abrem ao mesmo tempo. p_forcar (admin) ignora a frequência.
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
    -- Revalida após a trava: outra sessão pode ter acabado de gerar.
    if not p_forcar and l.ultimo_ciclo_em is not null
       and l.ultimo_ciclo_em + make_interval(days => l.freq_dias) > now() then
      continue;
    end if;
    if not exists (select 1 from public.pat_itens where local_id = l.id) then
      continue;
    end if;

    update public.pat_pendencias p set status = 'cancelled'
      from public.pat_ciclos c
     where p.ciclo_id = c.id and c.local_id = l.id and c.status = 'active' and p.status = 'pending';
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

-- Confirma recebimento ou check-in (o QR é conferido no app antes de chamar).
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
   where id = p.id;

  if p.tipo = 'inv' and p.ciclo_id is not null then
    update public.pat_ciclos set status = 'completed'
     where id = p.ciclo_id and status = 'active'
       and not exists (
         select 1 from public.pat_pendencias
          where ciclo_id = p.ciclo_id and status = 'pending'
       );
  end if;

  select * into v_item from public.pat_itens where id = p.item_id;
  insert into public.pat_eventos (tipo, texto, item_id, local_id, setor, usuario_nome)
  values (case p.tipo when 'recv' then 'recebimento' else 'inventario' end,
          case p.tipo when 'recv' then 'Recebimento: #' else 'Inventário: #' end
            || lpad(v_item.codigo::text, 4, '0') || ' — ' || v_item.nome,
          p.item_id, p.local_id, v_item.setor, v_nome);
end $$;

-- Transfere o item e avisa o responsável do destino (pendência de recebimento).
create or replace function public.pat_movimentar(p_item uuid, p_destino uuid, p_obs text default null)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.pat_itens;
  v_origem public.pat_locais;
  v_destino public.pat_locais;
  v_resp text;
  v_nome text;
begin
  if not public.pat_is_admin() then
    raise exception 'Só o administrador registra movimentações.';
  end if;

  select * into v_item from public.pat_itens where id = p_item for update;
  if not found then
    raise exception 'Patrimônio não encontrado.';
  end if;
  select * into v_destino from public.pat_locais where id = p_destino;
  if not found then
    raise exception 'Obra de destino não encontrada.';
  end if;
  if v_item.local_id = p_destino then
    raise exception 'Origem e destino iguais.';
  end if;
  select * into v_origem from public.pat_locais where id = v_item.local_id;

  v_nome := public.pat_nome_usuario(auth.uid());
  v_resp := public.pat_nome_usuario(v_destino.responsavel_id);

  update public.pat_itens set local_id = p_destino where id = p_item;

  -- O item saiu: recebimento/check-in que ainda esperavam por ele perdem o sentido.
  update public.pat_pendencias set status = 'cancelled'
   where item_id = p_item and status = 'pending';

  insert into public.pat_movimentacoes
    (item_id, origem_id, origem_nome, destino_id, destino_nome, observacao,
     responsavel_notificado, feito_por, feito_por_nome)
  values
    (p_item, v_origem.id, v_origem.nome, v_destino.id, v_destino.nome, nullif(btrim(p_obs), ''),
     v_resp, auth.uid(), v_nome);

  if v_destino.responsavel_id is not null then
    insert into public.pat_pendencias (tipo, item_id, local_id, responsavel_id)
    values ('recv', p_item, p_destino, v_destino.responsavel_id);
  end if;

  insert into public.pat_eventos (tipo, texto, item_id, local_id, setor, usuario_nome)
  values ('movimentacao',
          '#' || lpad(v_item.codigo::text, 4, '0') || ' → ' || v_destino.nome
            || coalesce(' · ' || v_resp || ' notificado', ''),
          p_item, p_destino, v_item.setor, v_nome);
end $$;

-- Usado só pela edge function (service_role) para achar conta já existente.
create or replace function public.pat_user_id_por_email(p_email text)
returns uuid
language sql stable security definer
set search_path = public, auth, pg_temp
as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1
$$;

-- ---------------------------------------------------------------- RLS

alter table public.pat_usuarios enable row level security;
alter table public.pat_locais enable row level security;
alter table public.pat_itens enable row level security;
alter table public.pat_ciclos enable row level security;
alter table public.pat_pendencias enable row level security;
alter table public.pat_movimentacoes enable row level security;
alter table public.pat_eventos enable row level security;

-- Leitura: qualquer usuário ativo do Patrimônio (dado interno, sem dado pessoal).
create policy pat_usuarios_select on public.pat_usuarios for select to authenticated
  using (public.pat_meu_papel() is not null or user_id = auth.uid());
create policy pat_usuarios_update on public.pat_usuarios for update to authenticated
  using (public.pat_is_admin()) with check (public.pat_is_admin());

create policy pat_locais_select on public.pat_locais for select to authenticated
  using (public.pat_meu_papel() is not null);
create policy pat_locais_admin on public.pat_locais for all to authenticated
  using (public.pat_is_admin()) with check (public.pat_is_admin());

create policy pat_itens_select on public.pat_itens for select to authenticated
  using (public.pat_meu_papel() is not null);
create policy pat_itens_insert on public.pat_itens for insert to authenticated
  with check (public.pat_pode_cadastrar());
create policy pat_itens_update on public.pat_itens for update to authenticated
  using (public.pat_is_admin()) with check (public.pat_is_admin());
create policy pat_itens_delete on public.pat_itens for delete to authenticated
  using (public.pat_is_admin());

create policy pat_ciclos_select on public.pat_ciclos for select to authenticated
  using (public.pat_meu_papel() is not null);
create policy pat_pendencias_select on public.pat_pendencias for select to authenticated
  using (public.pat_meu_papel() is not null);
create policy pat_movimentacoes_select on public.pat_movimentacoes for select to authenticated
  using (public.pat_meu_papel() is not null);
create policy pat_eventos_select on public.pat_eventos for select to authenticated
  using (public.pat_meu_papel() is not null);

-- ---------------------------------------------------------------- grants

-- O Supabase dá tudo a anon por default privilege: fechar explicitamente.
revoke all on public.pat_usuarios, public.pat_locais, public.pat_itens, public.pat_ciclos,
  public.pat_pendencias, public.pat_movimentacoes, public.pat_eventos from anon, public;
grant select, update on public.pat_usuarios to authenticated;
grant select, insert, update, delete on public.pat_locais, public.pat_itens to authenticated;
grant select on public.pat_ciclos, public.pat_pendencias, public.pat_movimentacoes, public.pat_eventos to authenticated;

revoke execute on function
  public.pat_meu_papel(), public.pat_is_admin(), public.pat_pode_cadastrar(),
  public.pat_nome_usuario(uuid), public.pat_itens_autoria(), public.pat_itens_evento(),
  public.pat_usuarios_guarda(), public.pat_gerar_ciclos(boolean), public.pat_confirmar(uuid),
  public.pat_movimentar(uuid, uuid, text), public.pat_user_id_por_email(text)
from public, anon, authenticated;

-- Helpers das policies rodam como o usuário: precisam de EXECUTE.
grant execute on function public.pat_meu_papel(), public.pat_is_admin(), public.pat_pode_cadastrar()
  to authenticated;
grant execute on function public.pat_gerar_ciclos(boolean), public.pat_confirmar(uuid),
  public.pat_movimentar(uuid, uuid, text) to authenticated;
grant execute on function public.pat_user_id_por_email(text) to service_role;

-- ---------------------------------------------------------------- storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patrimonio', 'patrimonio', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy pat_fotos_select on storage.objects for select to authenticated
  using (bucket_id = 'patrimonio' and public.pat_meu_papel() is not null);
create policy pat_fotos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'patrimonio' and public.pat_pode_cadastrar());
create policy pat_fotos_update on storage.objects for update to authenticated
  using (bucket_id = 'patrimonio' and public.pat_is_admin());
create policy pat_fotos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'patrimonio' and public.pat_is_admin());
