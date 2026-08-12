import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Colinha Eleitoral",
    short_name: "Colinha",
    description:
      "Pesquise candidatos e monte sua colinha para imprimir nas Eleições Gerais de 2026.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c211f",
    theme_color: "#1c211f",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
