# Dynamic — consulta de candidato

Fluxo mais crítico: o eleitor informa UF, cargo e número (ou escolhe na
lista). O BFF tenta o TSE ao vivo e só usa o KV se essa chamada falhar.

```mermaid
C4Dynamic
  title Dynamic diagram - candidate lookup

  Container(ui, "SlotInput / Picker", "React", "Dispara GET /api/candidatos")
  Container(api, "/api/candidatos", "Route Handler", "Valida e orquestra")
  Container(tseLib, "lib/tse.ts", "TypeScript", "Agrega lista, detalhe e contas")
  System_Ext(tse, "TSE", "DivulgaCandContas")
  ContainerDb(kv, "KV", "Redis ou memoria", "Ultimo hit conhecido")

  Rel(ui, api, "1. GET uf, cargo, numero", "HTTPS")
  Rel(api, tseLib, "2. lookupCandidate ou lookupParty")
  Rel(tseLib, tse, "3. Lista do partido")
  Rel(tseLib, tse, "4. Detalhe, contas e gastos do orgao")
  Rel(tseLib, api, "5. CandidatoColinha normalizado")
  Rel(api, kv, "6. set cache key")
  Rel(api, ui, "7. JSON + X-Data-Source: tse")
```

## Fallback (TSE fora ou timeout)

```mermaid
sequenceDiagram
  participant UI as Browser
  participant API as /api/candidatos
  participant TSE as TSE REST
  participant KV as Vercel KV

  UI->>API: GET ?uf=SP&cargo=governador&numero=45
  API->>API: AbortController 8s
  alt numero comeca com 99
    API-->>UI: mock TMNT, X-Data-Source: tmnt-mock
  else TSE responde
    API->>TSE: listar + buscar + prestador
    TSE-->>API: JSON
    API->>KV: set cand:2026:SP:3:45
    API-->>UI: 200 X-Data-Source: tse
  else TSE falha
    API->>KV: get cand:2026:SP:3:45
    alt cache hit
      KV-->>API: CandidatoColinha
      API-->>UI: 200 X-Data-Source: kv-fallback
    else cache miss
      API-->>UI: 500 TSE indisponivel
    end
  end
```

## Modos da mesma rota

| Query | Função | Erros típicos |
|-------|--------|----------------|
| `lista=true` | Todos os candidatos do cargo na UF | 500 se TSE e KV falharem |
| `partidos=true` | Siglas com candidato no cargo proporcional | 400 se cargo majoritário |
| `numero` + `legenda=true` | Voto nos 2 dígitos do partido | 404 se o partido não lança ninguém |
| `numero` | Candidato completo | 404 se o número não existe |

Listagens **nunca** incluem o mock TMNT. O mock só entra em consulta pontual
de número ou de nome.
