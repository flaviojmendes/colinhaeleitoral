import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsConsentToggle } from "@/components/analytics-consent-toggle";
import { DeleteLocalDataButton } from "@/components/delete-local-data-button";
import { LegalPage } from "@/components/legal-page";
import { CONTROLLER_NAME, PRIVACY_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Como o Colinha Eleitoral trata dados pessoais, em conformidade com a LGPD.",
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica, em linguagem simples, quais dados o{" "}
        {CONTROLLER_NAME} usa, por quê, onde eles ficam e quais são os seus
        direitos pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
        LGPD).
      </p>

      <h2>1. Quem é o responsável</h2>
      <p>
        O controlador dos dados tratados por este aplicativo é o{" "}
        <strong>{CONTROLLER_NAME}</strong>, um serviço independente, sem
        vínculo com o TSE, o CNJ, partidos ou candidatos.
      </p>
      {PRIVACY_EMAIL ? (
        <p>
          Canal para exercer seus direitos:{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        </p>
      ) : (
        <p>
          Você pode exercer o direito de exclusão agora, neste aparelho, pelo
          botão no final desta página. Para os demais direitos, use o canal de
          contato publicado pelo responsável pelo aplicativo.
        </p>
      )}

      <h2>2. Quais dados usamos</h2>
      <p>Há três tipos de informação neste serviço:</p>
      <ul>
        <li>
          <strong>Dados públicos de candidatos</strong>, publicados pelo TSE e,
          se você pedir, por tribunais (CNJ/Datajud) e notícias da internet.
          Não são dados seus.
        </li>
        <li>
          <strong>A sua lista de votos</strong>, se você escolher candidatos.
          Isso pode indicar preferência política e, pela LGPD, é dado pessoal
          sensível. Essa lista fica <strong>somente neste celular ou
          computador</strong>. Nós não recebemos essa lista em um servidor
          nosso.
        </li>
        <li>
          <strong>Estatísticas de uso</strong>, só se você autorizar o Google
          Analytics. Nesse caso o Google pode registrar páginas visitadas,
          tipo de aparelho, navegador, origem do acesso e localização
          aproximada (cidade). Isso <strong>não inclui</strong> a sua lista de
          votos, nome, CPF nem conta.
        </li>
      </ul>
      <p>Não pedimos nome, CPF, e-mail, telefone nem criamos conta.</p>

      <h2>3. Por que usamos e com qual base legal</h2>
      <ul>
        <li>
          <strong>Guardar a lista neste aparelho:</strong> consentimento (arts.
          7º, I, e 11, I, da LGPD), para você montar e imprimir um lembrete de
          votação.
        </li>
        <li>
          <strong>Buscar candidato, partido, notícias ou processos:</strong>
          interesse legítimo e execução do serviço que você pediu (art. 7º, V
          e IX), usando só dados públicos da pessoa candidata.
        </li>
        <li>
          <strong>Registros técnicos do site</strong> (como endereço IP e
          horário de acesso, comuns em hospedagem): cumprimento de obrigação
          legal e segurança (art. 7º, II e VI), pelo tempo necessário do
          provedor.
        </li>
        <li>
          <strong>Estatísticas de uso (Google Analytics):</strong>
          consentimento (art. 7º, I, da LGPD). Sem o seu ok, o script do
          Google não é carregado e não gravamos cookies de medição.
        </li>
      </ul>
      <p>
        Você pode recusar o armazenamento da lista. Nesse caso o app ainda
        funciona nesta visita, mas a lista some se você fechar a página.
      </p>

      <h2>4. O que não fazemos</h2>
      <ul>
        <li>Não vendemos dados.</li>
        <li>Não usamos a sua lista para propaganda eleitoral.</li>
        <li>Não rastreamos você com cookies de publicidade nem Google Ads.</li>
        <li>Não enviamos a sua colinha para WhatsApp, e-mail ou redes — só você pode compartilhar um candidato, se quiser.</li>
      </ul>

      <h2>5. Compartilhamento e terceiros</h2>
      <p>
        Quando você pesquisa, o aplicativo consulta fontes públicas. Isso pode
        enviar UF, cargo, número ou nome do candidato (não o seu nome) para:
      </p>
      <ul>
        <li>Tribunal Superior Eleitoral (DivulgaCandContas);</li>
        <li>CNJ / Datajud, só se você abrir processos judiciais;</li>
        <li>Google Notícias, só se você abrir a seção de notícias.</li>
        <li>
          Google LLC (Google Analytics), só se você autorizar as estatísticas
          de uso.
        </li>
      </ul>
      <p>
        O site é hospedado em infraestrutura de nuvem (por exemplo, Vercel).
        Esses provedores podem processar dados técnicos fora do Brasil. Quando
        isso ocorre, buscamos salvaguardas compatíveis com os arts. 33 a 36 da
        LGPD.
      </p>
      <p>
        Se você autorizar o Google Analytics, o Google processa os dados de
        medição, inclusive fora do Brasil (em especial nos Estados Unidos),
        segundo a política e os termos de processamento deles. Essa
        transferência internacional depende do seu consentimento (arts. 7º, I,
        e 33 da LGPD). Você pode recusar ou retirar o ok a qualquer momento,
        neste aparelho.
      </p>
      <p>
        Se você toca em <strong>Enviar para alguém</strong>, o link contém só
        dados públicos do candidato (estado, cargo e número). Quem recebe o
        link vê as mesmas informações oficiais.
      </p>

      <h2>6. Cookies e armazenamento local</h2>
      <p>
        Não usamos cookies de marketing nem de publicidade. Depois do seu ok,
        o aplicativo grava no armazenamento local do navegador (localStorage):
      </p>
      <ul>
        <li>o estado que você escolheu;</li>
        <li>os candidatos ou partidos da sua lista;</li>
        <li>a data do seu consentimento para guardar a lista;</li>
        <li>a sua escolha sobre estatísticas de uso, se você decidir.</li>
      </ul>
      <p>
        Isso não viaja com você para outro celular. Se você limpar os dados do
        site no navegador, a lista some.
      </p>
      <p>
        Cookies do Google Analytics (_ga e similares) só são gravados se você
        autorizar a medição. Sem esse ok, o tag do Google nem chega a
        carregar. A medição é usada para entender quais páginas funcionam, com
        IP truncado, sem sinais de anúncio e sem cruzar com a sua colinha.
      </p>
      <AnalyticsConsentToggle />

      <h2>7. Por quanto tempo</h2>
      <p>
        A lista permanece neste aparelho até você apagar, tocar em Recomeçar
        ou recusar/retirar o consentimento. Não definimos prazo em servidor
        porque a lista não é enviada para nós.
      </p>
      <p>
        Os dados de estatística, se autorizados, ficam no Google Analytics
        pelo prazo da conta de medição e nos cookies do navegador até você
        desligar a medição, apagar os dados do site ou limpar os cookies.
      </p>

      <h2>8. Seus direitos (art. 18 da LGPD)</h2>
      <p>Você pode, a qualquer momento:</p>
      <ul>
        <li>confirmar se tratamos dados e acessar o que está neste aparelho;</li>
        <li>corrigir candidatos na própria lista;</li>
        <li>apagar os dados deste celular;</li>
        <li>retirar o consentimento da lista e, à parte, o das estatísticas;</li>
        <li>pedir informação sobre compartilhamentos;</li>
        <li>revisar decisões e reclamar à ANPD.</li>
      </ul>
      <p>
        A portabilidade da lista pode ser feita por você ao imprimir ou
        anotar os números. Como não guardamos a lista em servidor, não há
        cadastro nosso para exportar.
      </p>
      <DeleteLocalDataButton />

      <h2>9. Crianças e adolescentes</h2>
      <p>
        O serviço é feito para eleitoras e eleitores. No Brasil, o voto é
        facultativo a partir dos 16 anos. Não coletamos dados de identificação
        de crianças. Se você tem menos de 16 anos, use o app só com uma pessoa
        responsável.
      </p>

      <h2>10. Segurança</h2>
      <p>
        Como a lista fica no seu aparelho, a segurança também depende de você:
        use bloqueio de tela e não compartilhe o celular desbloqueado. As
        consultas públicas passam pela internet; não dá para garantir que
        sites oficiais nunca saiam do ar.
      </p>

      <h2>11. Mudanças nesta política</h2>
      <p>
        Se a forma de tratar dados mudar de maneira relevante, vamos pedir um
        novo ok na tela inicial e atualizar a data no topo desta página.
      </p>

      <h2>12. Reclamações</h2>
      <p>
        Além do canal acima, você pode reclamar à Autoridade Nacional de
        Proteção de Dados (ANPD). Leia também os{" "}
        <Link href="/termos">Termos de uso</Link>.
      </p>
    </LegalPage>
  );
}
