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
- `DATAJUD_API_KEY`: chave privada do CNJ para consultar processos judiciais.

## Arquitetura

- `lib/tse.ts`: orquestração dos endpoints do TSE, com busca por partido,
  detalhes/bens e prestação de contas.
- `app/api/candidatos/route.ts`: BFF com timeout de 8 segundos, cache de
  primeira chamada por 1 hora e fallback do KV.
- `store/candidatos-store.ts`: slots da colinha persistidos no navegador com
  Zustand.
- `app/colinha/page.tsx`: folha de impressão em alto contraste, sem fotos.
- `lib/datajud.ts`: consulta do Datajud nos tribunais estadual e federal da UF.
- Os documentos PDF publicados no registro do candidato pelo TSE são exibidos
  na mesma seção jurídica, agrupados por categoria e com o nome original quando
  disponível.

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

## Voto de legenda

Deputado Federal e Deputado Estadual/Distrital são eleições proporcionais e
aceitam voto de legenda: o eleitor digita apenas os dois dígitos do partido.

O campo desses cargos acompanha a digitação como a urna faz, sem alternador de
modo: ao completar os 2 primeiros dígitos o partido aparece logo abaixo, já
confirmável; se o eleitor continuar digitando até o número completo, o
candidato substitui a legenda. Apagar dígitos volta para a legenda. A colinha
impressa marca a linha como `VOTO DE LEGENDA`. Os cargos majoritários
(Senador, Governador e Presidente) rejeitam o modo com HTTP 400.

```text
GET /api/candidatos?uf={UF}&cargo={cargo}&partidos=true
GET /api/candidatos?uf={UF}&cargo={cargo}&numero={partido}&legenda=true
```

A lista de partidos é derivada dos candidatos registrados para o cargo naquela
UF, então só aparecem siglas que de fato podem receber o voto; o nome completo
vem do diretório de partidos da eleição. Um número sem candidatos no cargo
retorna 404 em vez de aceitar um voto que seria nulo.

## Notícias recentes

A seção “Notícias recentes” do card do candidato busca as 3 matérias mais
novas no RSS do Google Notícias Brasil, pelo nome de urna entre aspas somado ao
termo `eleições`:

```text
GET /api/noticias?nome={nomeDeUrna}
```

O parse do XML acontece no servidor com `rss-parser`, o fetch usa Data Cache de
1 hora e a resposta é um array de `{ titulo, link, dataPublicacao, fonte }` já
ordenado da mais recente para a mais antiga. O sufixo com o nome do veículo,
que o Google repete no título, é removido porque a fonte vai em campo próprio.
No cliente, o SWR só dispara a requisição quando a seção é aberta.

A busca é automática e não há curadoria: a interface diz isso explicitamente,
porque homônimos e matérias fora de contexto podem aparecer.

O botão “Consultar processos judiciais” consulta o TJ e o TRF correspondentes
à UF selecionada. A busca é feita por nome completo, pode conter homônimos e
não substitui certidão oficial. A chave do Datajud deve ficar apenas no
ambiente do servidor, nunca no código ou no navegador.

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
