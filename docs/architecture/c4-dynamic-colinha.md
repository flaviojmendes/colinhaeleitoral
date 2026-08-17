# Dynamic — montar, imprimir e compartilhar

A colinha é um documento local de seis slots. O servidor não a armazena.

```mermaid
C4Dynamic
  title Dynamic diagram - build print and share

  Person(eleitor, "Eleitor", "Monta a lista no celular")
  Container(builder, "ColinhaBuilder", "React", "Confirma cargos")
  Container(store, "Zustand store", "persist", "uf + 6 slots")
  ContainerDb(ls, "localStorage", "Browser", "colinha-eleitoral-2026")
  Container(print, "PrintSheet", "React", "/colinha")
  Container(share, "Share buttons", "Web Share / canvas", "Link, texto ou imagem")
  Container(bff, "/api/candidatos", "BFF", "Resolve candidato compartilhado")

  Rel(eleitor, builder, "1. Escolhe UF e preenche cargos")
  Rel(builder, store, "2. setCandidate apos LGPD")
  Rel(store, ls, "3. Persiste JSON")
  Rel(eleitor, print, "4. Abre /colinha e imprime")
  Rel(print, store, "5. Le slots, sem fotos")
  Rel(eleitor, share, "6. Compartilha candidato ou lista")
  Rel(share, bff, "7. Pagina /c/... busca o mesmo numero")
```

## Jornada do eleitor

```mermaid
flowchart TD
  start([Abre o app]) --> consent{Consentimento LGPD?}
  consent -->|Aceita| persist[localStorage liberado]
  consent -->|Agora nao| session[sessionStorage: defer]
  consent -->|Recusa| ephemeral[Usa sem gravar]
  persist --> uf[Escolhe UF]
  session --> uf
  ephemeral --> uf
  uf --> cargo[Preenche um cargo]
  cargo --> modo{Como escolhe?}
  modo -->|Digita como a urna| numero[2 dígitos: legenda se proporcional]
  modo -->|Lista| picker[Filtra nome, numero ou partido]
  numero --> bff[GET /api/candidatos]
  picker --> bff
  bff --> card[Card com bens, gastos e docs]
  card --> more{Quer mais contexto?}
  more -->|Noticias| news[GET /api/noticias]
  more -->|Processos| proc[GET /api/processos]
  more -->|Nao| confirm[Confirma no slot]
  news --> confirm
  proc --> confirm
  confirm --> next{Faltam cargos?}
  next -->|Sim| cargo
  next -->|Nao| out{Saida}
  out -->|Imprimir| print["/colinha CSS print"]
  out -->|Compartilhar| share[URL /c/uf/cargo/numero ou PNG]
```

## O que a folha impressa omite de propósito

Fotos, notícias, processos e PDFs ficam fora da colinha. A folha traz cargo,
número, nome de urna ou `VOTO DE LEGENDA`, partido e UF — o que cabe na cabine.
