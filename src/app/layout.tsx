import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import React from "react";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://koululounaslaskuri.fi"),
  title: {
    default: "Koululounaslaskuri - Kouluruoka, Ruokalistat & Makrot",
    template: "%s | Koululounaslaskuri",
  },
  description: "Katso koulusi ruokalista ja laske kouluruoan kalorit ja makrot (proteiini, hiilihydraatit, rasvat) helposti. Tuetut koulut: Muhos, Utajärvi, Vaala, Helsinki ja kymmeniä muita!",
  openGraph: {
    title: "Koululounaslaskuri - Kouluruoka, Ruokalistat & Makrot",
    description: "Laske kouluruoan kalorit ja makrot helposti. Katso koulusi lounasruokalista!",
    type: "website",
    url: "https://koululounaslaskuri.fi",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "Koululounaslaskuri logo",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Koululounaslaskuri",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script src="/config.js"></script>
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Koululounaslaskuri",
          "url": "https://koululounaslaskuri.fi",
          "description": "Kouluruoan ruokalistat ja makrolaskuri. Laske kalorit, proteiini, hiilihydraatit ja rasvat.",
          "applicationCategory": "HealthApplication",
          "inLanguage": "fi",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "EUR"
          }
        })}} />
      </head>
      <body className={manrope.className}>
        {children}
      </body>
    </html>
  );
}
