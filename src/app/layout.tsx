import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import React from "react";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Koululounaslaskuri - Kouluruoka, Ruokalistat & Makrot",
  description: "Katso koulusi ruokalista ja laske kouluruoan kalorit ja makrot (proteiini, hiilihydraatit, rasvat) helposti. Tuetut koulut: Muhos, Utajärvi, Vaala, ja kymmeniä muita!",
  keywords: "kouluruoka macrot, kouluruoka makrot, kouluruoka ravintoarvot, koulu kalorit, kouluruoka kalorit, lounaslaskuri, koululounas, muhos kouluruoka macrot, muhos ruokalista, alavus kouluruoka, eurajoki kouluruoka, kauniainen kouluruoka, utajärvi ruokalista, vaala ruokalista",
  openGraph: {
    title: "Koululounaslaskuri - Kouluruoka, Ruokalistat & Makrot",
    description: "Laske kouluruoan kalorit ja makrot helposti. Katso koulusi lounasruokalista!",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Koululounaslaskuri",
  },
  icons: {
    icon: "/Koululounaslaskurilogo.png",
    apple: "/Koululounaslaskurilogo.png",
  }
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
          "description": "Kouluruoan ruokalistat ja makrolaskuri. Laske kalorit, proteiini, hiilihydraatit ja rasvat.",
          "applicationCategory": "HealthApplication",
          "offers": {
            "@type": "Offer",
            "price": "0"
          }
        })}} />
      </head>
      <body className={manrope.className}>
        {children}
      </body>
    </html>
  );
}
