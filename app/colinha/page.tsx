import type { Metadata } from "next";

import { PrintSheet } from "@/components/print-sheet";

export const metadata: Metadata = {
  title: "Colinha para impressão",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ColinhaPage() {
  return <PrintSheet />;
}
