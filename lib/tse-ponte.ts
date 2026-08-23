import { TSE_PAGE_ORIGIN, type TseFetch } from "@/lib/tse";

interface PonteResult {
  type: "colinha-tse-result";
  id: string;
  ok?: boolean;
  status?: number;
  text?: string;
  error?: string;
}

function isPonteResult(value: unknown): value is PonteResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.type === "colinha-tse-result" && typeof record.id === "string";
}

export function isPonteWindow(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

export function createPonteFetch(): TseFetch {
  return (url, init) => {
    return new Promise((resolve, reject) => {
      const target = window.parent !== window ? window.parent : window.opener;
      if (!target) {
        reject(
          new Error(
            "Ponte TSE não encontrada. Abra esta tela pelo atalho no site do TSE.",
          ),
        );
        return;
      }

      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const timer = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("A ponte com o TSE não respondeu."));
      }, 60_000);

      function onMessage(event: MessageEvent) {
        if (event.origin !== TSE_PAGE_ORIGIN || !isPonteResult(event.data)) {
          return;
        }

        if (event.data.id !== id) {
          return;
        }

        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);

        if (event.data.error && !event.data.text) {
          reject(new Error(event.data.error));
          return;
        }

        resolve(
          new Response(event.data.text ?? "", {
            status:
              event.data.status ||
              (event.data.ok ? 200 : 502),
            headers: { "content-type": "application/json" },
          }),
        );
      }

      window.addEventListener("message", onMessage);
      target.postMessage(
        { type: "colinha-tse-fetch", id, url, method: init?.method ?? "GET" },
        TSE_PAGE_ORIGIN,
      );
    });
  };
}
