import type { Metadata } from "next";
import type { Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AnalyticsConsentBanner } from "@/components/analytics-consent-banner";
import { AppToaster } from "@/components/app-toaster";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PrivacyConsent } from "@/components/privacy-consent";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Colinha Eleitoral",
    template: "%s · Colinha Eleitoral",
  },
  description:
    "Escolha candidatos das Eleições 2026 e imprima uma lista simples para levar no dia da votação.",
  applicationName: "Colinha Eleitoral",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c211f",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <AppToaster />
        <PrivacyConsent />
        <AnalyticsConsentBanner />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
