# Component Diagram — BFF e orquestração

Os route handlers são o único ponto que sai para a internet de dados. A chave
do Datajud e as URLs do TSE ficam no servidor.

```mermaid
C4Component
  title Component diagram for the Colinha BFF

  Container_Boundary(bff, "Next.js App - servidor") {
    Component(candRoute, "/api/candidatos", "Route Handler", "Valida, timeout 8s, cache e fallback")
    Component(procRoute, "/api/processos", "Route Handler", "Nome + UF, TJ e TRF em paralelo")
    Component(newsRoute, "/api/noticias", "Route Handler", "Top 3 do RSS, sem curadoria")
    Component(fotoRoute, "/api/foto", "Route Handler", "Proxy HTTPS com host allowlist")
    Component(tseLib, "lib/tse.ts", "TypeScript", "Lista, detalhe, contas, partido e certidoes")
    Component(datajudLib, "lib/datajud.ts", "TypeScript", "POST _search e mapeia polos")
    Component(newsLib, "lib/noticias.ts", "rss-parser", "Parse XML e limpa sufixo da fonte")
    Component(kvLib, "lib/kv.ts", "Adapter", "Vercel KV ou Map em memoria")
    Component(tmnt, "lib/tmnt-mocks.ts", "TypeScript", "Easter egg 99* fora das listagens")
  }

  ContainerDb(kv, "Cache KV", "Upstash Redis", "cand, cand-list, legenda, partido-list")
  System_Ext(tse, "TSE", "REST DivulgaCandContas")
  System_Ext(datajud, "Datajud", "api-publica.datajud.cnj.jus.br")
  System_Ext(gnews, "Google News", "news.google.com/rss/search")

  Rel(candRoute, tmnt, "Intercepta numero 99*")
  Rel(candRoute, tseLib, "list, lookupCandidate, lookupParty")
  Rel(candRoute, kvLib, "set no sucesso, get no catch")
  Rel(tseLib, tse, "4 endpoints + diretorio de partidos")
  Rel(kvLib, kv, "get/set")
  Rel(procRoute, tmnt, "Intercepta nomes TMNT")
  Rel(procRoute, datajudLib, "searchJudicialProcesses")
  Rel(datajudLib, datajud, "APIKey no header")
  Rel(newsRoute, newsLib, "fetchCandidateNews")
  Rel(newsLib, gnews, "q=nome eleicoes hl=pt-BR")
  Rel(fotoRoute, tse, "Baixa imagem se host permitido")
```

## Chaves de cache

| Chave | Conteúdo |
|-------|----------|
| `cand:2026:{uf}:{tseCode}:{numero}` | Candidato completo |
| `cand-list:2026:{uf}:{tseCode}` | Lista do cargo |
| `legenda:2026:{uf}:{tseCode}:{partido}` | Voto de legenda |
| `partido-list:2026:{uf}:{tseCode}` | Partidos com candidato no cargo |

## Orquestração `lookupCandidate`

1. Lista do partido no cargo (`?partido=` + filtro local).
2. Em paralelo: detalhe do candidato, prestação de contas e gastos do
   diretório (`prestador/consulta/partido/...`).
3. Normaliza bens, despesas, limite, situação e PDFs de `arquivos` em
   certidões agrupadas por nome de arquivo.

Timeout ou corpo inválido do TSE vira erro; o route handler tenta o KV antes
de responder 500.

## Datajud

`tribunalsForUf(uf)` escolhe o TJ estadual e o TRF da região. Cada tribunal é
consultado em paralelo (`size: 50`, `match` em `partes.nome`). Tribunal fora
não derruba o outro: volta `disponivel: false`. Sem `DATAJUD_API_KEY`, a rota
responde 503.
