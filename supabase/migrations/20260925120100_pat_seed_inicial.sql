-- Admins iniciais (Artur e João) e as obras reais do Controle de Obras como locais.
insert into public.pat_usuarios (user_id, nome, email, papel)
select id, case when email like 'artur@%' then 'Artur Coelho' else 'João (Engenharia)' end, email, 'admin'
from auth.users where email in ('artur@arskammer.com.br', 'engenharia.joao@arskammer.com.br')
on conflict (user_id) do nothing;

insert into public.pat_locais (nome)
select initcap(lower(nome)) from public.obras
on conflict do nothing;
