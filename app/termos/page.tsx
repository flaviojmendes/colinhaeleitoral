import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal-page";
import { CONTROLLER_NAME, PRIVACY_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de uso",
  description:
    "Condições de uso do Colinha Eleitoral, um lembrete independente para o dia da votação.",
  robots: { index: true, follow: true },
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de uso">
      <p>
        Ao usar o {CONTROLLER_NAME}, você concorda com estes termos. O app é
        um lembrete pessoal para o dia da votação, feito para ser simples.
      </p>

      <h2>1. O que este aplicativo é</h2>
      <p>
        O {CONTROLLER_NAME} ajuda você a consultar informações públicas de
        candidatas e candidatos das Eleições Gerais de 2026, montar uma lista
        e imprimir um papel para levar à seção eleitoral.
      </p>
      <p>
        É um serviço <strong>independente</strong>. Não é o TSE, não é urna
        eletrônica, não registra voto e não substitui o título de eleitor nem
        a votação oficial.
      </p>

      <h2>2. O que este aplicativo não é</h2>
      <ul>
        <li>Não é propaganda eleitoral e não pede voto em ninguém.</li>
        <li>Não garante que um candidato estará apto no dia da eleição.</li>
        <li>Não é certidão judicial, antecedente criminal nem assessoria jurídica.</li>
        <li>Não é jornalismo: as notícias vêm de busca automática e podem falar de outra pessoa com o mesmo nome.</li>
      </ul>

      <h2>3. Suas responsabilidades</h2>
      <ul>
        <li>Confira número, nome e situação no TSE antes de votar.</li>
        <li>Celular não é permitido na cabine: leve papel ou anote os números.</li>
        <li>Não use o app para disseminar informação falsa ou atacar pessoas.</li>
        <li>
          Se você compartilhar um candidato, a outra pessoa verá dados
          públicos daquele candidato. Não compartilhe a tela da sua lista se
          não quiser mostrar as suas escolhas.
        </li>
      </ul>

      <h2>4. Dados e fontes</h2>
      <p>
        As informações de candidatura, bens e contas vêm principalmente do
        DivulgaCandContas do TSE. Processos judiciais, quando consultados,
        vêm do Datajud/CNJ e podem incluir homônimos. Os dados podem atrasar,
        falhar ou mudar até a eleição.
      </p>
      <p>
        O tratamento de dados pessoais segue a{" "}
        <Link href="/privacidade">Política de Privacidade</Link> e a LGPD.
      </p>

      <h2>5. Lista salva neste aparelho</h2>
      <p>
        A sua colinha fica neste celular ou computador, depois do seu ok. Você
        pode apagar tudo a qualquer momento, inclusive na página de
        privacidade. Se limpar o navegador, a lista some.
      </p>

      <h2>6. Compartilhamento de candidatos</h2>
      <p>
        A função “Enviar para alguém” cria um link com estado, cargo e número
        públicos. Quem abre o link vê o candidato e pode salvá-lo na própria
        lista. Isso não envia a sua colinha completa.
      </p>

      <h2>7. Disponibilidade</h2>
      <p>
        O app depende da internet e de sistemas oficiais. Pode sair do ar,
        demorar ou mostrar erro. Não prometemos funcionamento ininterrupto.
      </p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>
        Na medida permitida pela lei brasileira, o {CONTROLLER_NAME} não
        responde por voto errado, candidato indeferido, informação desatualizada
        de terceiros, homônimos em processos ou notícias, nem por uso do app
        em desacordo com estes termos. O serviço é oferecido como ferramenta
        gratuita de consulta e lembrete.
      </p>

      <h2>9. Propriedade e marcas</h2>
      <p>
        O nome, o visual e o código do aplicativo pertencem aos seus
        responsáveis. Marcas do TSE, partidos e candidatos pertencem aos
        respectivos donos. Fotos e dados oficiais seguem as regras das fontes
        públicas.
      </p>

      <h2>10. Mudanças e lei aplicável</h2>
      <p>
        Estes termos podem ser atualizados. A data aparece no topo da página.
        Vale a lei brasileira. Fica eleito o foro do domicílio do usuário, no
        Brasil, para resolver conflitos, sem prejuízo de direitos do
        consumidor.
      </p>

      {PRIVACY_EMAIL ? (
        <p>
          Dúvidas: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        </p>
      ) : (
        <p>
          Dúvidas sobre privacidade estão na{" "}
          <Link href="/privacidade">Política de Privacidade</Link>.
        </p>
      )}
    </LegalPage>
  );
}
