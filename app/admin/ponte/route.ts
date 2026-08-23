import { TSE_PAGE_ORIGIN, TSE_PAGE_URL } from "@/lib/tse";
import {
  ponteBookmarklet,
  ponteInjectorSource,
  shouldServePonteScript,
} from "@/lib/tse-ponte-script";

export const runtime = "nodejs";

function scriptResponse(origin: string) {
  return new Response(ponteInjectorSource(origin), {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": TSE_PAGE_ORIGIN,
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function installPage(origin: string) {
  const bookmarklet = ponteBookmarklet(origin);
  const userscript = `${origin}/admin/ponte.user.js`;
  const sync = `${origin}/admin/sync`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Ponte TSE · Colinha</title>
    <style>
      :root { color-scheme: dark; }
      body { margin:0; font-family: system-ui, sans-serif; background:#1c211f; color:#f4f7f4; }
      main { max-width:40rem; margin:0 auto; padding:1.25rem; }
      h1 { font-size:1.5rem; line-height:1.2; }
      p, li { color:#c5cec8; line-height:1.5; }
      ol { padding-left:1.25rem; }
      a.btn, button.btn {
        display:flex; align-items:center; justify-content:center;
        min-height:3rem; margin-top:.75rem; padding:.75rem 1rem;
        border:0; border-radius:.75rem; font-weight:700; text-decoration:none; color:#fff;
      }
      .accent { background:#2f6b4f; }
      .coral { background:#c47a32; color:#2a1c0c; }
      .ghost { background:#2a312e; color:#f4f7f4; }
      .card { margin-top:1rem; padding:1rem; border:1px solid #3a4440; border-radius:1rem; background:#252b28; }
    </style>
  </head>
  <body>
    <main>
      <h1>Ponte do TSE no tablet</h1>
      <p>
        O Chrome no Android <strong>não executa atalho javascript</strong>.
        Por isso o script não abre. Use o Firefox ou um script automático.
      </p>

      <section class="card">
        <h2>Opção 1 · Firefox (mais simples)</h2>
        <ol>
          <li>Instale o Firefox e abra esta mesma página nele.</li>
          <li>Pressione e segure o botão laranja abaixo → Adicionar aos favoritos.</li>
          <li>Abra o site do TSE no Firefox.</li>
          <li>Toque no favorito <strong>Ponte TSE</strong>. A tela da Colinha deve cobrir o TSE.</li>
        </ol>
        <a class="btn coral" href="${escapeHtml(bookmarklet)}">Segure aqui: Ponte TSE</a>
        <a class="btn ghost" href="https://play.google.com/store/apps/details?id=org.mozilla.firefox">Instalar Firefox</a>
        <a class="btn ghost" href="${escapeHtml(TSE_PAGE_URL)}">Abrir site do TSE</a>
      </section>

      <section class="card">
        <h2>Opção 2 · Kiwi + Tampermonkey</h2>
        <p>No Chrome isso também não roda. O Kiwi aceita extensão e liga a ponte sozinho.</p>
        <ol>
          <li>Instale o Kiwi Browser.</li>
          <li>Instale o Tampermonkey na loja de extensões do Kiwi.</li>
          <li>Toque em instalar o script. Confirme no Tampermonkey.</li>
          <li>Abra o site do TSE no Kiwi. A ponte deve aparecer sozinha.</li>
        </ol>
        <a class="btn accent" href="${escapeHtml(userscript)}">Instalar script da ponte</a>
        <a class="btn ghost" href="https://play.google.com/store/apps/details?id=com.kiwibrowser.browser">Instalar Kiwi Browser</a>
      </section>

      <p><a class="btn ghost" href="${escapeHtml(sync)}">Voltar à sincronização</a></p>
    </main>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  if (shouldServePonteScript(request)) {
    return scriptResponse(origin);
  }

  return new Response(installPage(origin), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
