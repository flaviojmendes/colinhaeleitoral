"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      duration={4500}
      toastOptions={{
        classNames: {
          toast: "border-console-edge! bg-console! text-console-ink! shadow-lg!",
          title: "text-base! font-semibold!",
          description: "text-sm! text-console-muted!",
        },
      }}
    />
  );
}
