"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { revokeLgpdConsent } from "@/lib/lgpd";
import { useCandidatosStore } from "@/store/candidatos-store";

export function DeleteLocalDataButton() {
  const router = useRouter();
  const resetColinha = useCandidatosStore((state) => state.resetColinha);

  function handleDelete() {
    const confirmed = window.confirm(
      "Isso apaga a lista salva neste celular, o seu ok de privacidade e desliga o Google Analytics. Não dá para desfazer.",
    );

    if (!confirmed) {
      return;
    }

    resetColinha();
    useCandidatosStore.persist.clearStorage();
    revokeLgpdConsent();
    toast.success("Dados deste celular apagados.");
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="mt-4 flex h-14 w-full items-center justify-center rounded-xl bg-coral px-5 text-base font-bold text-coral-ink transition-colors duration-150 hover:bg-coral-deep sm:w-auto"
    >
      Apagar dados deste celular
    </button>
  );
}
