/**
 * O Akamai do TSE bloqueia ASN de datacenter. Funções na Vercel (mesmo
 * gru1) saem por AWS e levam 403; tentar ao vivo só gasta o timeout.
 *
 * Produção lê o Vercel KV. Quem popula o KV é `npm run sync:tse`, rodando
 * numa rede de ISP (Wi-Fi de casa, sem VPN/Zscaler).
 *
 * TSE_LIVE=1 força a consulta ao vivo; TSE_LIVE=0 força só o cache.
 */
export function isTseLiveEnabled(): boolean {
  const explicit = process.env.TSE_LIVE?.trim().toLowerCase();

  if (explicit === "1" || explicit === "true") {
    return true;
  }

  if (explicit === "0" || explicit === "false") {
    return false;
  }

  return !process.env.VERCEL;
}
