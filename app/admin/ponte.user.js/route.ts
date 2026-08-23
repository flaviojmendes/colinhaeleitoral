import { TSE_PAGE_ORIGIN } from "@/lib/tse";
import { ponteUserscript } from "@/lib/tse-ponte-script";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  return new Response(ponteUserscript(origin), {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": TSE_PAGE_ORIGIN,
    },
  });
}
