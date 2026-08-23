import { TSE_PAGE_ORIGIN } from "@/lib/tse";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const script = `(() => {
  const APP = ${JSON.stringify(origin)};
  const TSE = ${JSON.stringify(TSE_PAGE_ORIGIN)};
  if (location.origin !== TSE) {
    alert("Abra o DivulgaCandContas do TSE e toque no atalho de novo.");
    return;
  }
  if (document.getElementById("colinha-ponte-frame")) {
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.id = "colinha-ponte-frame";
  iframe.src = APP + "/admin/sync?ponte=1";
  iframe.setAttribute(
    "style",
    "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:#1c211f",
  );
  document.documentElement.appendChild(iframe);
  window.addEventListener("message", async (event) => {
    if (event.origin !== APP) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== "colinha-tse-fetch") {
      return;
    }
    try {
      const response = await fetch(data.url, { credentials: "omit" });
      const text = await response.text();
      iframe.contentWindow &&
        iframe.contentWindow.postMessage(
          {
            type: "colinha-tse-result",
            id: data.id,
            ok: response.ok,
            status: response.status,
            text: text,
          },
          APP,
        );
    } catch (error) {
      iframe.contentWindow &&
        iframe.contentWindow.postMessage(
          {
            type: "colinha-tse-result",
            id: data.id,
            ok: false,
            status: 0,
            error: error instanceof Error ? error.message : String(error),
          },
          APP,
        );
    }
  });
})();`;

  return new Response(script, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": TSE_PAGE_ORIGIN,
    },
  });
}
