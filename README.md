# Colinha Eleitoral

PWA mobile-first para pesquisar candidatos das Eleições Gerais de 2026 e
imprimir uma lista simples para levar à cabine de votação.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

O app consulta a API pública DivulgaCandContas do TSE através de um BFF em
`/api/candidatos`. O cache em memória é usado localmente quando o Vercel KV não
está configurado.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` se precisar configurar um endpoint
alternativo ou o Redis da Vercel:

- `TSE_BASE_URL`: base da API DivulgaCandContas.
- `KV_REST_API_URL` e `KV_REST_API_TOKEN`: credenciais do Vercel KV/Upstash.

## Arquitetura

- `lib/tse.ts`: orquestração dos endpoints do TSE, com busca por partido,
  detalhes/bens e prestação de contas.
- `app/api/candidatos/route.ts`: BFF com timeout de 8 segundos, cache de
  primeira chamada por 1 hora e fallback do KV.
- `store/candidatos-store.ts`: slots da colinha persistidos no navegador com
  Zustand.
- `app/colinha/page.tsx`: folha de impressão em alto contraste, sem fotos.

Os endpoints usados são:

```text
GET /candidatura/listar/2026/{UF}/20322002026/{cargo}/candidatos?partido={n}
GET /candidatura/buscar/2026/{UF}/20322002026/candidato/{id}
GET /prestador/consulta/20322002026/2026/{UF}/{cargo}/{partido}/{numero}/{id}
GET /prestador/consulta/partido/20322002026/2026/{UF}/{codigoOrgao}/{partido}
```

Na interface, o botão “Escolher pela lista de candidatos” usa
`/api/candidatos?uf={UF}&cargo={cargo}&lista=true`, filtra por nome, número ou
partido e busca os detalhes completos somente depois da escolha. Os detalhes
financeiros também incluem, quando publicados pelo TSE, os gastos do
diretório partidário do candidato.

Em produção, a função fica preferencialmente na região `gru1` (São Paulo).
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
