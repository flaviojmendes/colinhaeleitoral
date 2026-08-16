import { NextResponse } from "next/server";

export const preferredRegion = "gru1";
export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "divulgacandcontas.tse.jus.br",
  "ui-avatars.com",
  "static.wikia.nocookie.net",
]);

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src")?.trim();

  if (!src) {
    return NextResponse.json({ error: "Informe a foto." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: "Foto não permitida." }, { status: 400 });
  }

  try {
    const response = await fetch(target.toString(), {
      headers: { Accept: "image/*" },
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Foto indisponível." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 502 });
    }

    const bytes = await response.arrayBuffer();

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar a foto." }, {
      status: 502,
    });
  }
}
