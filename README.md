# Patrimônio — ARS Kammer

Gestão de patrimônio: cadastro com foto, movimentação entre obras com confirmação
de recebimento, inventário periódico por obra e consulta por QR Code.

Protótipo original do João (HTML + localStorage) em [`legado/`](legado/) —
a versão mais recente é `legado/index-v3-atual.html`.

## Stack
- Vite + React 19 + TypeScript + Tailwind 4 + TanStack Query
- Supabase do **Controle de Obras** (`vxwyizedcanxjukcmtfd`), tabelas `pat_*`
  - papéis próprios em `pat_usuarios` (admin / eng / adm / enc) — independem do perfil do Obras
  - escrita de ciclo, pendência e movimentação só por RPC (`pat_gerar_ciclos`, `pat_confirmar`, `pat_movimentar`)
  - fotos no bucket privado `patrimonio`
  - usuários criados pela edge function `pat-usuarios` (nascem `visitante` no Obras = sem acesso lá)
- Deploy: Vercel, push na `main` = produção

## Rodar
```bash
npm install
npm run dev
```

Validar antes de subir: `npx tsc -b && npx eslint src && npm run build`.
