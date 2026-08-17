# System Context — Colinha Eleitoral

O eleitor usa um único sistema. Colinha agrega dados públicos, explica origem
e limites, e devolve uma lista imprimível. Nenhuma identidade é criada no
servidor.

```mermaid
C4Context
  title System Context diagram for Colinha Eleitoral

  Person(eleitor, "Eleitor", "Pesquisa candidatos no celular e imprime a colinha")

  System(colinha, "Colinha Eleitoral", "PWA que consulta dados oficiais e monta a lista de voto")

  System_Ext(tse, "TSE DivulgaCandContas", "Candidatos, bens, gastos, fotos e PDFs")
  System_Ext(datajud, "Datajud CNJ", "Processos nos tribunais estadual e federal da UF")
  System_Ext(gnews, "Google Noticias", "RSS das 3 materias mais recentes")
  System_Ext(print, "Impressora ou PDF", "Saida fisica para a cabine")
  System_Ext(share, "Compartilhamento", "Web Share, clipboard ou imagem 1080x1920")

  Rel(eleitor, colinha, "Pesquisa, confirma cargos e imprime")
  Rel(colinha, tse, "Lista, detalha e baixa arquivos", "HTTPS REST")
  Rel(colinha, datajud, "Busca processos pelo nome", "HTTPS + APIKey")
  Rel(colinha, gnews, "Busca noticias por nome de urna", "HTTPS RSS")
  Rel(eleitor, print, "Leva a lista impressa")
  Rel(eleitor, share, "Envia candidato ou colinha")
  Rel(colinha, share, "Gera texto, URL e imagem")
```

## Atores

| Elemento | Tipo | Papel |
|----------|------|--------|
| Eleitor | Pessoa | Público-alvo: celular, pouco tempo, português claro |
| Colinha Eleitoral | Sistema | Único produto. Sem login. Sem banco de usuários |
| TSE DivulgaCandContas | Externo | Fonte oficial de candidatura e contas |
| Datajud / CNJ | Externo | Índice público de processos; não é certidão |
| Google Notícias | Externo | Busca automática, sem curadoria |
| Impressora / PDF | Externo | Folha alto contraste, sem fotos |
| Compartilhamento | Externo | Link `/c/{uf}/{cargo}/{numero}` ou imagem canvas |
