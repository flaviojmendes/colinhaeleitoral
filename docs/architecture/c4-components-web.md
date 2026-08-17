# Component Diagram — PWA no cliente

Tudo abaixo roda no browser. Páginas RSC só montam o casco; a colinha é
client-side porque depende de `localStorage` e de impressão.

```mermaid
C4Component
  title Component diagram for the Colinha PWA

  Container_Boundary(web, "Next.js App - cliente") {
    Component(builder, "ColinhaBuilder", "React client", "Seis cargos, UF e acoes da lista")
    Component(slot, "SlotInput / CandidatePicker", "React + fetch", "Numero da urna, lista e voto de legenda")
    Component(card, "CandidateCard", "React", "Patrimonio, gastos, docs, noticias e processos")
    Component(print, "PrintSheet", "React + CSS print", "Folha alto contraste sem fotos")
    Component(shareView, "SharedCandidateView", "React + fetch", "Pagina publica /c/uf/cargo/numero")
    Component(consent, "PrivacyConsent", "React", "Banner LGPD: aceitar, adiar ou recusar")
    Component(store, "candidatos-store", "Zustand persist", "uf + slots, gated por consentimento")
    Component(shareImg, "share-canvas", "Canvas 2D", "Imagem 1080x1920 para stories")
  }

  ContainerDb(local, "Storage do browser", "localStorage / sessionStorage", "Colinha, consentimento e defer")
  Container(bff, "Route handlers", "Next.js /api", "Candidatos, processos, noticias, foto")

  Rel(consent, local, "Grava ou revoga LGPD")
  Rel(builder, store, "Confirma, limpa e troca UF")
  Rel(store, local, "Persiste se houver consentimento")
  Rel(slot, bff, "Consulta candidato, lista ou partido", "GET /api/candidatos")
  Rel(slot, builder, "Devolve CandidatoColinha")
  Rel(builder, card, "Renderiza candidato confirmado")
  Rel(card, bff, "Abre noticias e processos sob demanda")
  Rel(shareView, bff, "Resolve o candidato compartilhado")
  Rel(print, store, "Le os slots para imprimir")
  Rel(shareImg, bff, "Proxy da foto via /api/foto")
```

## Páginas

| Rota | Componente | Render |
|------|------------|--------|
| `/` | `ColinhaBuilder` | Client. Fluxo principal |
| `/colinha` | `PrintSheet` | Client. `robots: noindex` |
| `/c/[uf]/[cargo]/[numero]` | `SharedCandidateView` | RSC de casco + fetch no cliente |
| `/privacidade`, `/termos` | páginas legais | Estáticas |

## Regras no cliente

- **Consentimento.** `hasValidLgpdConsent()` libera o storage do Zustand.
  Adiar usa `sessionStorage`; recusar apaga colinha e consentimento.
- **Voto de legenda.** Em cargos proporcionais, 2 dígitos confirmam o partido;
  completar o número troca para o candidato. Majoritários rejeitam `legenda`.
- **SWR.** Só `/api/noticias` usa SWR, e só com a seção aberta.
- **PWA.** `app/manifest.ts` (`standalone`). Não há service worker customizado
  além do que o Next/PWA do host oferecer.
