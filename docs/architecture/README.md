# Arquitetura — Colinha Eleitoral

PWA mobile-first que ajuda eleitores a pesquisar candidatos das Eleições
Gerais de 2026 e imprimir uma lista compacta para o dia da votação.

O sistema **não guarda cadastro de usuário**. Dados oficiais vêm de APIs
públicas; a colinha do eleitor fica só no navegador, depois do consentimento
LGPD.

## Modelo C4

| Nível | Arquivo | O que mostra |
|-------|---------|--------------|
| 1 | [c4-context.md](./c4-context.md) | Eleitor, Colinha e sistemas externos |
| 2 | [c4-containers.md](./c4-containers.md) | App Next.js, cache e armazenamento local |
| 3 | [c4-components-web.md](./c4-components-web.md) | Componentes da PWA no cliente |
| 3 | [c4-components-bff.md](./c4-components-bff.md) | Route handlers e orquestração das APIs |
| 4 | [c4-deployment.md](./c4-deployment.md) | Vercel `gru1`, KV e o celular do eleitor |
| Fluxo | [c4-dynamic-candidate-lookup.md](./c4-dynamic-candidate-lookup.md) | Consulta de candidato com cache e fallback |
| Fluxo | [c4-dynamic-colinha.md](./c4-dynamic-colinha.md) | Montar, persistir, imprimir e compartilhar |

## Decisões de desenho

- **BFF no próprio Next.js.** O browser nunca chama TSE, Datajud ou Google
  News. As rotas `/api/*` validam entrada, aplicam timeout de 8s, traduzem
  payloads e escondem a chave `DATAJUD_API_KEY`.
- **Cache em duas camadas para o TSE.** `fetch` do Next.js revalida (1h nas
  listas, 15 min nos detalhes). Em falha, o BFF devolve a última resposta
  gravada no Vercel KV (ou um `Map` em memória no `dev` local).
- **Fonte da verdade no cliente.** Zustand + `localStorage`
  (`colinha-eleitoral-2026`), gated por consentimento LGPD. Sem conta, sem
  backend de usuário.
- **Consultas onerosas sob demanda.** Notícias (SWR) e processos judiciais só
  disparam quando o eleitor abre a seção. Homônimos são avisados na UI.
- **Região `gru1`.** Funções e KV preferem São Paulo, perto das APIs
  brasileiras.
- **Mocks TMNT.** Números `99*` e nomes de personagens ativam dados fictícios
  (`X-Data-Source: tmnt-mock`) sem poluir listagens oficiais.

## Superfície HTTP

| Rota | Papel |
|------|--------|
| `GET /` | Montar a colinha (client component) |
| `GET /colinha` | Folha de impressão, `noindex` |
| `GET /c/{uf}/{cargo}/{numero}` | Página pública de compartilhamento |
| `GET /privacidade`, `GET /termos` | Textos legais |
| `GET /api/candidatos` | Lista, partidos, candidato ou legenda |
| `GET /api/processos` | Datajud no TJ e TRF da UF |
| `GET /api/noticias` | RSS do Google Notícias (top 3) |
| `GET /api/foto` | Proxy allowlist de fotos (TSE, avatares, mock) |
