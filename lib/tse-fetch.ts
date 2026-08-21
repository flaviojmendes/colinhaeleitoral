/** Origem oficial do DivulgaCandContas. */
export const TSE_ORIGIN = "https://divulgacandcontas.tse.jus.br";

/**
 * Headers no padrão do site do TSE. Não furam o Akamai em ASN de
 * datacenter (Vercel/AWS, Zscaler); só ajudam em IP de ISP.
 */
export const TSE_REQUEST_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Origin: TSE_ORIGIN,
  Referer: `${TSE_ORIGIN}/divulga/`,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
};

export function tseFetch(
  url: string,
  init: RequestInit & { next?: { revalidate: number } } = {},
) {
  return fetch(url, {
    ...init,
    headers: {
      ...TSE_REQUEST_HEADERS,
      ...init.headers,
    },
  });
}
