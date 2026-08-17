# Container Diagram — Colinha Eleitoral

Um único deploy Next.js (App Router) serve a PWA e o BFF. O cache de API e o
armazenamento do eleitor são containers separados porque vivem em processos
distintos.

```mermaid
C4Container
  title Container diagram for Colinha Eleitoral

  Person(eleitor, "Eleitor", "Usa o celular no navegador ou PWA")

  System_Boundary(colinha, "Colinha Eleitoral") {
    Container(web, "Next.js App", "Next 16, React 19, Node.js", "PWA, paginas e BFF /api")
    ContainerDb(kv, "Cache de respostas", "Vercel KV ou Map em memoria", "Ultima lista ou candidato do TSE")
    ContainerDb(local, "Colinha do eleitor", "localStorage + sessionStorage", "Slots, UF e consentimento LGPD")
  }

  System_Ext(tse, "TSE DivulgaCandContas", "REST v1 da eleicao 2026")
  System_Ext(datajud, "Datajud CNJ", "POST _search por tribunal")
  System_Ext(gnews, "Google Noticias RSS", "Busca por nome de urna")
  System_Ext(cdn, "Arquivos de foto", "TSE, ui-avatars, Wikia")

  Rel(eleitor, web, "Navega, confirma e imprime", "HTTPS")
  Rel(web, local, "Le e grava apos consentimento", "Zustand persist")
  Rel(web, kv, "Grava hit e le fallback", "REST Redis")
  Rel(web, tse, "Lista, detalhe, contas e PDFs", "HTTPS JSON")
  Rel(web, datajud, "Consulta TJ e TRF da UF", "HTTPS JSON")
  Rel(web, gnews, "Baixa feed RSS", "HTTPS XML")
  Rel(web, cdn, "Proxy allowlist de fotos", "HTTPS imagem")
```

## Containers

| Container | Tecnologia | Por que existe |
|-----------|------------|----------------|
| Next.js App | Next 16 App Router, runtime `nodejs`, região `gru1` | UI + BFF no mesmo artefato. Timeout de 8s nas rotas de dados |
| Cache de respostas | `@vercel/kv` se `KV_REST_API_*` existir; senão `Map` com TTL de 30 dias | Fallback quando o TSE falha. Header `X-Data-Source: kv-fallback` |
| Colinha do eleitor | Zustand persist + `localStorage` | Seis slots de cargo + UF. Sem consentimento LGPD, não persiste |

## Cache do TSE (duas camadas)

1. **Next.js Data Cache** no `fetch` de `lib/tse.ts`: listas e diretório de
   partidos revalidam em 3600s; detalhes, contas e gastos do partido em 900s.
2. **KV / memória** escrito após sucesso do BFF. Só é lido no `catch` (TSE
   fora, timeout, JSON inválido). Respostas ao browser vão com
   `Cache-Control: private, no-store`.

Notícias usam Data Cache de 1h e `max-age=300` no cliente. Processos e o mock
TMNT não passam pelo KV.

## Superfície do BFF

```text
GET /api/candidatos?uf=&cargo=&lista=true
GET /api/candidatos?uf=&cargo=&partidos=true
GET /api/candidatos?uf=&cargo=&numero=&legenda=true
GET /api/candidatos?uf=&cargo=&numero=
GET /api/processos?uf=&nome=
GET /api/noticias?nome=
GET /api/foto?src=
```
